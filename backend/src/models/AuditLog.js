import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    action: {
        type: String,
        required: true,
        enum: ["upload", "reconcile", "edit", "delete", "system_load", "create", "update"]
    },
    entityType: {
        type: String,
        required: true,
        enum: ["Record", "UploadJob", "SystemRecord", "User"]
    },
    entityId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    oldValue: {
        type: mongoose.Schema.Types.Mixed
    },
    newValue: {
        type: mongoose.Schema.Types.Mixed
    },
    description: {
        type: String,
        required: true
    },
    source: {
        type: String,
        enum: ["api", "ui", "system"],
        default: "api"
    },
    ipAddress: String,
    userAgent: String,
    timestamp: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Index for faster queries
auditLogSchema.index({ entityType: 1, entityId: 1 });
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ timestamp: -1 });

export default mongoose.model("AuditLog", auditLogSchema);
