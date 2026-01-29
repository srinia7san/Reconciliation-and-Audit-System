import express from "express";
import Upload from "../models/Upload.js";
import { authenticateJWT } from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";

import User from "../models/User.js";
const router = express.Router();

router.get("/upload-jobs", authenticateJWT, requireRole('admin', 'analyst', 'viewer'), async (req, res) => {
    try {
        const { startDate, endDate, status, uploadedBy } = req.query;

        // Build filter object
        const filter = { isSystemLoad: { $ne: true } }; // Exclude system loads from regular upload jobs

        if (status) {
            filter.status = status;
        }

        if (uploadedBy) {
            filter.uploadedBy = uploadedBy;
        }

        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) {
                filter.createdAt.$gte = new Date(startDate);
            }
            if (endDate) {
                // Add 1 day to include the end date fully
                const end = new Date(endDate);
                end.setDate(end.getDate() + 1);
                filter.createdAt.$lte = end;
            }
        }

        const uploadJobs = await Upload.find(filter)
            .populate('uploadedBy', 'name email')
            .sort({ createdAt: -1 })
            .limit(50);

        res.json(uploadJobs);
    } catch (err) {
        console.error("Dashboard Error:", err)
        res.status(500).json({ message: err.message });
    }
});

router.get("/stats", authenticateJWT, requireRole('admin', 'analyst', 'viewer'), async (req, res) => {
    try {
        const { startDate, endDate, status, uploadedBy } = req.query;

        // Build filter object (excluding system loads)
        const filter = { isSystemLoad: { $ne: true } };

        if (uploadedBy) {
            filter.uploadedBy = uploadedBy;
        }

        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) {
                filter.createdAt.$gte = new Date(startDate);
            }
            if (endDate) {
                const end = new Date(endDate);
                end.setDate(end.getDate() + 1);
                filter.createdAt.$lte = end;
            }
        }

        const totalJobs = await Upload.countDocuments(filter);
        const completedJobs = await Upload.countDocuments({ ...filter, status: "Completed" });
        const processingJobs = await Upload.countDocuments({ ...filter, status: "Processing" });
        const failedJobs = await Upload.countDocuments({ ...filter, status: "Failed" });

        res.json({
            totalJobs,
            completedJobs,
            processingJobs,
            failedJobs
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

export default router;