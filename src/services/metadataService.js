import http from "http";
import { logger } from "../utils/logger.js";

const TIMEOUT_MS = 1500;

let cachedPlatform = null;
let awsToken = null;

/**
 * Performs an HTTP GET request with a short timeout
 * Used to query cloud metadata service endpoints
 * @param {string} url - The URL to request
 * @param {Object} headers - Optional request headers
 * @returns {string} Trimmed response body
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
 * Performs an HTTP PUT request with a short timeout
 * Used for AWS IMDSv2 session token retrieval
 * @param {string} url - The URL to request
 * @param {Object} headers - Optional request headers
 * @returns {string} Trimmed response body
 */
function httpPut(url, headers = {}) {
  return new Promise((resolve, reject) => {
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

/**
 * Probes the GCP metadata service to check if running on Google Cloud
 * Requires the Metadata-Flavor: Google header per GCP specifications
 * @returns {string} "gcp" if detection succeeds
 */
async function detectGCP() {
  await httpGet("http://metadata.google.internal/computeMetadata/v1/", {
    "Metadata-Flavor": "Google",
  });
  return "gcp";
}

/**
 * Probes the AWS metadata service using IMDSv2 token-based approach
 * Caches the session token for subsequent metadata requests
 * @returns {string} "aws" if detection succeeds
 */
async function detectAWS() {
  const token = await httpPut(
    "http://169.254.169.254/latest/api/token",
    { "X-aws-ec2-metadata-token-ttl-seconds": "21600" }
  );

  await httpGet("http://169.254.169.254/latest/meta-data/", {
    "X-aws-ec2-metadata-token": token,
  });

  awsToken = token;
  return "aws";
}

/**
 * Detects the cloud platform by probing GCP and AWS metadata endpoints concurrently
 * Result is cached for the lifetime of the process to avoid redundant probes
 * @returns {string|null} "gcp", "aws", or null if no platform detected
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

/**
 * Helper to perform a GET request to the GCP metadata service
 * Automatically includes the required Metadata-Flavor header
 * @param {string} path - The metadata path to query
 * @returns {string} Metadata value
 */
function gcpGet(path) {
  return httpGet(`http://metadata.google.internal${path}`, {
    "Metadata-Flavor": "Google",
  });
}

/**
 * Extracts the last segment from a fully qualified GCP resource path
 * Example: "projects/123/zones/us-east1-b" returns "us-east1-b"
 * @param {string} fqPath - Fully qualified resource path
 * @returns {string} Last segment of the path
 */
function extractLastSegment(fqPath) {
  return fqPath.split("/").pop();
}

/**
 * Retrieves instance metadata from the GCP metadata service
 * Parses fully qualified paths for zone and machine-type into short-form values
 * Enumerates all network interfaces with private IP, public IP, and network name
 * @returns {Object} GCP metadata response object
 */
async function getGCPMetadata() {
  try {
    logger.info("Retrieving GCP instance metadata");

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

    logger.info("GCP metadata retrieved successfully");

    return {
      cloud_platform: "gcp",
      instance_id: instanceId,
      region: region,
      availability_zone: zone,
      machine_type: extractLastSegment(machineTypeFQ),
      hostname,
      project_id: projectId,
      cpu_platform: cpuPlatform,
      image: imageFQ ? extractLastSegment(imageFQ) : null,
      network_interfaces: networkInterfaces,
    };
  } catch (error) {
    logger.error("Error retrieving GCP metadata", { error: error.message, stack: error.stack });
    throw error;
  }
}

/**
 * Helper to perform a GET request to the AWS metadata service
 * Automatically includes the IMDSv2 session token header
 * @param {string} path - The metadata path to query
 * @returns {string} Metadata value
 */
function awsGet(path) {
  return httpGet(`http://169.254.169.254${path}`, {
    "X-aws-ec2-metadata-token": awsToken,
  });
}

/**
 * Retrieves instance metadata from the AWS metadata service
 * Extracts region from availability zone and enumerates network interfaces by MAC address
 * Includes additional fields: hostname, AMI ID, account ID, and architecture
 * @returns {Object} AWS metadata response object
 */
async function getAWSMetadata() {
  try {
    logger.info("Retrieving AWS instance metadata");

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

    // Get processor architecture
    let architecture = null;
    try {
      architecture = await awsGet("/latest/meta-data/system/processor/architecture");
    } catch {
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

    logger.info("AWS metadata retrieved successfully");

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
  } catch (error) {
    logger.error("Error retrieving AWS metadata", { error: error.message, stack: error.stack });
    throw error;
  }
}

/**
 * Retrieves instance metadata based on the detected cloud platform
 * Throws with status 503 if platform is not detected or metadata retrieval fails
 * @returns {Object} Metadata response conforming to the MetadataResponse schema
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