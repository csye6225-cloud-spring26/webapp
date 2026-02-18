import http from "http";
import { logger } from "../utils/logger.js";

const TIMEOUT_MS = 1500;

// Cached platform detection result (persists for process lifetime)
let cachedPlatform = null;
let awsToken = null;

/**
 * Generic HTTP GET with short timeout
 */
function httpGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, { headers, timeout: TIMEOUT_MS }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data.trim());
        } else {
          reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        }
      });
    });
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error(`Request timed out: ${url}`));
    });
  });
}

/**
 * HTTP PUT request (used for IMDSv2 token retrieval)
 */
function httpPut(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const opts = {
      ...new URL(url),
      method: "PUT",
      headers,
      timeout: TIMEOUT_MS,
    };
    // Use hostname/path from URL for http.request
    const req = http.request(
      {
        hostname: new URL(url).hostname,
        path: new URL(url).pathname,
        method: "PUT",
        headers,
        timeout: TIMEOUT_MS,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data.trim());
          } else {
            reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          }
        });
      }
    );
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error(`Request timed out: ${url}`));
    });
    req.end();
  });
}

// ─── Platform Detection ──────────────────────────────────────────────

async function detectGCP() {
  await httpGet("http://metadata.google.internal/computeMetadata/v1/", {
    "Metadata-Flavor": "Google",
  });
  return "gcp";
}

async function detectAWS() {
  // IMDSv2: obtain session token first
  const token = await httpPut(
    "http://169.254.169.254/latest/api/token",
    { "X-aws-ec2-metadata-token-ttl-seconds": "21600" }
  );
  // Verify metadata service is reachable
  await httpGet("http://169.254.169.254/latest/meta-data/", {
    "X-aws-ec2-metadata-token": token,
  });
  awsToken = token;
  return "aws";
}

/**
 * Detect cloud platform by probing metadata endpoints concurrently.
 * Result is cached for the lifetime of the process.
 */
export async function detectPlatform() {
  if (cachedPlatform) return cachedPlatform;

  const results = await Promise.allSettled([detectGCP(), detectAWS()]);

  if (results[0].status === "fulfilled") {
    cachedPlatform = "gcp";
    logger.info("Cloud platform detected: GCP");
    return cachedPlatform;
  }
  if (results[1].status === "fulfilled") {
    cachedPlatform = "aws";
    logger.info("Cloud platform detected: AWS");
    return cachedPlatform;
  }

  logger.warn("No supported cloud platform detected");
  return null;
}

// ─── GCP Metadata ────────────────────────────────────────────────────

function gcpGet(path) {
  return httpGet(`http://metadata.google.internal${path}`, {
    "Metadata-Flavor": "Google",
  });
}

/** Extract last segment from fully qualified GCP path */
function extractLastSegment(fqPath) {
  return fqPath.split("/").pop();
}

async function getGCPMetadata() {
  const [instanceId, zoneFQ, machineTypeFQ, hostname, projectId, cpuPlatform, imageFQ] =
    await Promise.all([
      gcpGet("/computeMetadata/v1/instance/id"),
      gcpGet("/computeMetadata/v1/instance/zone"),
      gcpGet("/computeMetadata/v1/instance/machine-type"),
      gcpGet("/computeMetadata/v1/instance/hostname"),
      gcpGet("/computeMetadata/v1/project/project-id"),
      gcpGet("/computeMetadata/v1/instance/cpu-platform"),
      gcpGet("/computeMetadata/v1/instance/image").catch(() => null),
    ]);

  // Enumerate network interfaces
  const ifaceListRaw = await gcpGet("/computeMetadata/v1/instance/network-interfaces/");
  const indices = ifaceListRaw
    .split("\n")
    .map((l) => l.replace("/", "").trim())
    .filter((l) => l.length > 0);

  const networkInterfaces = await Promise.all(
    indices.map(async (idx) => {
      const base = `/computeMetadata/v1/instance/network-interfaces/${idx}`;
      const [privateIp, networkFQ] = await Promise.all([
        gcpGet(`${base}/ip`),
        gcpGet(`${base}/network`),
      ]);

      let publicIp = null;
      try {
        publicIp = await gcpGet(`${base}/access-configs/0/external-ip`);
      } catch {
        // No public IP assigned
      }

      return {
        private_ip: privateIp,
        public_ip: publicIp,
        network: extractLastSegment(networkFQ),
      };
    })
  );

  const zone = extractLastSegment(zoneFQ);
  // Extract region from zone (e.g., us-east1-b -> us-east1)
  const region = zone.split("-").slice(0, -1).join("-");

  return {
    cloud_platform: "gcp",
    instance_id: instanceId,
    region: zone,
    availability_zone: zone,
    machine_type: extractLastSegment(machineTypeFQ),
    hostname,
    project_id: projectId,
    cpu_platform: cpuPlatform,
    image: imageFQ ? extractLastSegment(imageFQ) : null,
    network_interfaces: networkInterfaces,
  };
}

// ─── AWS Metadata ────────────────────────────────────────────────────

function awsGet(path) {
  return httpGet(`http://169.254.169.254${path}`, {
    "X-aws-ec2-metadata-token": awsToken,
  });
}

async function getAWSMetadata() {
  const [instanceId, az, instanceType, hostname, amiId, publicHostname] =
    await Promise.all([
      awsGet("/latest/meta-data/instance-id"),
      awsGet("/latest/meta-data/placement/availability-zone"),
      awsGet("/latest/meta-data/instance-type"),
      awsGet("/latest/meta-data/hostname"),
      awsGet("/latest/meta-data/ami-id"),
      awsGet("/latest/meta-data/public-hostname").catch(() => null),
    ]);

  // Region is AZ without the trailing letter (e.g., us-east-1a -> us-east-1)
  const region = az.replace(/[a-z]$/, "");

  // Get account ID from instance identity document
  let accountId = null;
  try {
    const identityDoc = await awsGet("/latest/dynamic/instance-identity/document");
    const parsed = JSON.parse(identityDoc);
    accountId = parsed.accountId || null;
  } catch {
    // Could not retrieve identity document
  }

  // Get architecture
  let architecture = null;
  try {
    architecture = await awsGet("/latest/meta-data/system/processor/architecture");
  } catch {
    // Fallback: extract from identity document
    try {
      const identityDoc = await awsGet("/latest/dynamic/instance-identity/document");
      architecture = JSON.parse(identityDoc).architecture || null;
    } catch {
      // Could not retrieve architecture
    }
  }

  // Enumerate network interfaces by MAC address
  const macsRaw = await awsGet("/latest/meta-data/network/interfaces/macs/");
  const macs = macsRaw
    .split("\n")
    .map((m) => m.replace("/", "").trim())
    .filter((m) => m.length > 0);

  const networkInterfaces = await Promise.all(
    macs.map(async (mac) => {
      const base = `/latest/meta-data/network/interfaces/macs/${mac}`;
      const [privateIp, vpcId] = await Promise.all([
        awsGet(`${base}/local-ipv4s`),
        awsGet(`${base}/vpc-id`),
      ]);

      let publicIp = null;
      try {
        publicIp = await awsGet(`${base}/public-ipv4s`);
      } catch {
        // No public IP assigned
      }

      return {
        private_ip: privateIp,
        public_ip: publicIp,
        network: vpcId,
      };
    })
  );

  return {
    cloud_platform: "aws",
    instance_id: instanceId,
    region,
    availability_zone: az,
    machine_type: instanceType,
    hostname,
    public_hostname: publicHostname,
    ami_id: amiId,
    account_id: accountId,
    architecture,
    network_interfaces: networkInterfaces,
  };
}

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Retrieve instance metadata based on detected platform.
 * Throws if platform is not detected or metadata retrieval fails.
 */
export async function getInstanceMetadata() {
  const platform = await detectPlatform();

  if (!platform) {
    const err = new Error("No supported cloud platform detected");
    err.status = 503;
    throw err;
  }

  try {
    if (platform === "gcp") return await getGCPMetadata();
    if (platform === "aws") return await getAWSMetadata();
  } catch (error) {
    logger.error("Failed to retrieve instance metadata", {
      platform,
      error: error.message,
    });
    const err = new Error("Failed to retrieve instance metadata");
    err.status = 503;
    throw err;
  }
}