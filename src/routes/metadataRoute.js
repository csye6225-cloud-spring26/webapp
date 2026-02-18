import express from "express";
import { metadataCheck } from "../controllers/metadataController.js";
import { rejectNonGetMethods } from "../middleware/errorHandler.js";

const router = express.Router();

// Apply middleware to reject non-GET methods, then handle metadata request
// Note: No rejectAuthHeaders — endpoint is public but doesn't reject auth headers per spec
router.all("/", rejectNonGetMethods, metadataCheck);

export default router;