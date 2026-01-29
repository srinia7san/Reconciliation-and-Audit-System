import express from "express";
import AuditLog from "../models/AuditLog.js";
import { authenticateJWT } from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";

const router = express.Router();

// Get audit logs for a specific record
router.get("/record/:recordId", authenticateJWT, requireRole('admin', 'analyst', 'viewer'), async (req, res) => {
    try {
        const logs = await AuditLog.find({
            entityType: 'Record',
            entityId: req.params.recordId
        })
            .populate('userId', 'name email')
            .sort({ timestamp: -1 })
            .lean();

        res.json(logs);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get all audit logs with filters
router.get("/", authenticateJWT, requireRole('admin', 'analyst', 'viewer'), async (req, res) => {
    try {
        const { entityType, entityId, userId, startDate, endDate, action, limit = 100 } = req.query;

        const filter = {};
        if (entityType) filter.entityType = entityType;
        if (entityId) filter.entityId = entityId;
        if (userId) filter.userId = userId;
        if (action) filter.action = action;
        if (startDate || endDate) {
            filter.timestamp = {};
            if (startDate) filter.timestamp.$gte = new Date(startDate);
            if (endDate) filter.timestamp.$lte = new Date(endDate);
        }

        const logs = await AuditLog.find(filter)
            .populate('userId', 'name email')
            .sort({ timestamp: -1 })
            .limit(parseInt(limit))
            .lean();

        res.json(logs);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get audit logs for an upload job
router.get("/upload/:uploadId", authenticateJWT, requireRole('admin', 'analyst', 'viewer'), async (req, res) => {
    try {
        const logs = await AuditLog.find({
            entityType: 'UploadJob',
            entityId: req.params.uploadId
        })
            .populate('userId', 'name email')
            .sort({ timestamp: -1 })
            .lean();

        res.json(logs);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

export default router;
