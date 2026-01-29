import express from "express";
import multer from "multer";
import { parse } from "csv-parse";
import XLSX from "xlsx";
import Record from "../models/Record.js";
import Upload from "../models/Upload.js";
import AuditLog from "../models/AuditLog.js";
import { authenticateJWT } from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";

import User from "../models/User.js";

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Get all system record uploads (batches)
router.get("/uploads", authenticateJWT, requireRole('admin', 'analyst', 'viewer'), async (req, res) => {
  try {
    const uploads = await Upload.find({ isSystemLoad: true })
      .sort({ createdAt: -1 })
      .populate('uploadedBy', 'name email')
      .lean();

    // Get record counts for each upload
    const uploadsWithCounts = await Promise.all(uploads.map(async (u) => {
      const count = await Record.countDocuments({ uploadJobId: u._id, isSystemRecord: true });
      return { ...u, recordCount: count };
    }));

    res.json(uploadsWithCounts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete a specific system record batch by uploadJobId
router.delete("/uploads/:id", authenticateJWT, requireRole('admin', 'analyst'), async (req, res) => {
  try {
    const uploadDoc = await Upload.findById(req.params.id);
    if (!uploadDoc) {
      return res.status(404).json({ message: "Upload batch not found" });
    }
    if (!uploadDoc.isSystemLoad) {
      return res.status(400).json({ message: "This is not a system records upload" });
    }

    // Count records to be deleted
    const deleteCount = await Record.countDocuments({ uploadJobId: req.params.id, isSystemRecord: true });

    // Delete records associated with this upload
    await Record.deleteMany({ uploadJobId: req.params.id, isSystemRecord: true });

    // Delete the upload job
    await Upload.findByIdAndDelete(req.params.id);

    // Create audit log
    await AuditLog.create({
      userId: req.user?.id,
      action: 'delete',
      entityType: 'UploadJob',
      entityId: req.params.id,
      oldValue: { filename: uploadDoc.filename, recordCount: deleteCount },
      newValue: null,
      description: `Deleted system records batch: ${uploadDoc.filename} (${deleteCount} records)`,
      source: 'ui',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent') || ''
    });

    res.json({
      message: `Deleted ${deleteCount} system records from batch: ${uploadDoc.filename}`,
      deletedCount: deleteCount
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Load system records from CSV/Excel
router.post("/load-system-records", upload.single("file"), authenticateJWT, requireRole('admin', 'analyst'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No File Uploaded" });

  const ext = req.file.originalname.split(".").pop().toLowerCase();

  try {
    // Create Upload record first to get the ID
    const uploadDoc = await Upload.create({
      filename: req.file.originalname || `system_load_${Date.now()}`,
      status: 'Processing',
      uploadedBy: req.user?.id,
      isSystemLoad: true
    });

    let data = [];

    if (ext === "csv") {
      const text = req.file.buffer.toString();
      parse(text, { columns: true }, async (err, records) => {
        if (err) {
          await Upload.findByIdAndUpdate(uploadDoc._id, { status: 'Failed' });
          return res.status(500).json({ message: err.message });
        }
        data = records;

        await saveSystemRecords(data, uploadDoc._id);
        await Upload.findByIdAndUpdate(uploadDoc._id, {
          status: 'Completed',
          totalRecords: data.length,
          processedAt: new Date()
        });

        await AuditLog.create({
          userId: req.user?.id,
          action: 'system_load',
          entityType: 'UploadJob',
          entityId: uploadDoc._id,
          oldValue: null,
          newValue: { count: data.length },
          description: `System records load: ${uploadDoc.filename}`,
          source: 'ui',
          ipAddress: req.ip,
          userAgent: req.get('User-Agent') || ''
        });

        res.json({
          message: "System records loaded successfully",
          count: data.length,
          uploadId: uploadDoc._id,
          filename: uploadDoc.filename
        });
      });
    } else if (ext === "xlsx" || ext === "xls") {
      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
      data = sheet;

      await saveSystemRecords(data, uploadDoc._id);
      await Upload.findByIdAndUpdate(uploadDoc._id, {
        status: 'Completed',
        totalRecords: data.length,
        processedAt: new Date()
      });

      await AuditLog.create({
        userId: req.user?.id,
        action: 'system_load',
        entityType: 'UploadJob',
        entityId: uploadDoc._id,
        oldValue: null,
        newValue: { count: data.length },
        description: `System records load: ${uploadDoc.filename}`,
        source: 'ui',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent') || ''
      });

      res.json({
        message: "System records loaded successfully",
        count: data.length,
        uploadId: uploadDoc._id,
        filename: uploadDoc.filename
      });
    } else {
      await Upload.findByIdAndDelete(uploadDoc._id);
      res.status(400).json({ message: "Unsupported file type" });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

async function saveSystemRecords(records, uploadJobId) {
  const recordDocs = records.map(record => ({
    uploadJobId,
    transactionId: record.transactionId || record.TransactionID || record['Transaction ID'] || '',
    amount: parseFloat(record.amount || record.Amount || 0),
    referenceNumber: record.referenceNumber || record.ReferenceNumber || record['Reference Number'] || '',
    raw: record,
    isSystemRecord: true,
    matchStatus: "system"
  }));

  // Insert new system records (no longer deleting all existing ones)
  await Record.insertMany(recordDocs);
}

export default router;