import { getInstanceMetadata } from "../services/metadataService.js";
import { logger } from "../utils/logger.js";

/**
 * GET /v1/metadata
 * Returns cloud instance metadata (public endpoint, no auth required).
 * Returns 400 if request body is present.
 * Returns 503 if platform detection or metadata retrieval fails.
 */
export async function metadataCheck(req, res) {
  logger.debug({
    message: 'Metadata endpoint request received',
    method: req.method,
    path: req.originalUrl.split('?')[0]
  });

  // Reject requests with a body
  if (
    req.body &&
    (typeof req.body === "object"
      ? Object.keys(req.body).length > 0
      : req.body.length > 0)
  ) {
    logger.warn({
      message: 'Metadata request rejected - request body not allowed',
      method: req.method,
      path: req.originalUrl.split('?')[0]
    });
    return res.status(400).json({
      error: "Bad Request",
      message: "Request body is not allowed",
      timestamp: new Date().toISOString(),
      path: req.originalUrl,
    });
  }

  // Set cache control headers
  res.set({
    "Cache-Control": "no-cache, no-store, must-revalidate",
    Pragma: "no-cache",
    "X-Content-Type-Options": "nosniff",
  });

  try {
    const metadata = await getInstanceMetadata();
    logger.info({
      message: 'Metadata retrieved successfully',
      platform: metadata.cloud_platform
    });
    return res.status(200).json(metadata);
  } catch (error) {
    logger.error({
      message: 'Metadata retrieval failed',
      error: error.message,
      stack: error.stack
    });
    return res.status(503).json({
      error: "Service Unavailable",
      message: "Unable to retrieve instance metadata. The application may not be running on a supported cloud platform.",
      timestamp: new Date().toISOString(),
      path: req.originalUrl,
    });
  }
}