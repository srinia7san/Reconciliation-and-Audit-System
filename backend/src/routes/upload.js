import multer from "multer"
import { parse } from "csv-parse"
import XLSX from "xlsx"
import express from "express"
import Upload from "../models/Upload.js"
import AuditLog from "../models/AuditLog.js"
import crypto from "crypto"
import Record from "../models/Record.js"
import { saveRecordsToDatabase, runReconciliation, updateUploadJobWithResults } from "../utils/reconciliation.js"
import { authenticateJWT } from "../middleware/auth.js"
import { requireRole } from "../middleware/requireRole.js"
import fs from "fs"
import path from "path"

const router = express.Router()

const storage = multer.memoryStorage()
const upload = multer({ storage })

router.post("/", upload.single("file"), authenticateJWT, requireRole('admin', 'analyst'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No File Uploaded" })

  const ext = req.file.originalname.split(".").pop().toLowerCase()
  let uploadJob
  let { columnMapping } = req.body

  if (typeof columnMapping === 'string') {
    try {
      columnMapping = JSON.parse(columnMapping)
    } catch (e) {
      return res.status(400).json({ message: "Invalid JSON in columnMapping" })
    }
  }

  // validate column mapping
  if (!columnMapping || !columnMapping.transactionId || !columnMapping.amount || !columnMapping.referenceNumber) {
    return res.status(400).json({ message: "Column mapping is required. Please map transactionId, amount, and referenceNumber." })
  }

  // compute file hash for idempotency
  const fileHash = crypto.createHash('sha256').update(req.file.buffer).digest('hex')

  // detect existing job by hash
  try {
    const existing = await Upload.findOne({ fileHash })
    if (existing) {
      // If already completed, return existing job id
      if (existing.status === 'Completed') {
        return res.json({ message: 'File already processed', jobId: existing._id })
      }

      // If queued or processing, return existing job id to avoid duplicate jobs
      if (existing.status === 'Queued' || existing.status === 'Processing') {
        return res.json({ message: 'File already queued or processing', jobId: existing._id })
      }
      // For Failed or other states, allow requeue by creating a new Upload record
    }
  } catch (err) {
    // ignore lookup errors and continue; we'll handle during save
    console.error('Hash lookup failed', err)
  }

  try {
    // Create upload job record (status defaults to 'Queued')
    uploadJob = new Upload({
      filename: req.file.originalname,
      totalRecords: 0,
      uploadedBy: req.user?.id,
      fileHash,
      columnMapping
    })
    await uploadJob.save()

    // ensure uploads folder exists
    const uploadsDir = path.join(process.cwd(), 'uploads')
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })

    // save file to disk
    const filename = `${uploadJob._id}_${Date.now()}.${ext}`
    const filePath = path.join(uploadsDir, filename)
    await fs.promises.writeFile(filePath, req.file.buffer)

    // save file path to upload job so worker can pick it up
    await Upload.findByIdAndUpdate(uploadJob._id, { filePath, status: 'Queued' })

    // write audit log for upload acceptance
    try {
      await AuditLog.create({
        userId: req.user?.id,
        action: 'upload',
        entityType: 'UploadJob',
        entityId: uploadJob._id,
        oldValue: null,
        newValue: { filename: uploadJob.filename, fileHash, columnMapping },
        description: `Upload accepted: ${uploadJob.filename}`,
        source: 'ui',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent') || ''
      })
    } catch (e) {
      console.error('Failed to write upload audit log', e)
    }

    res.json({ message: 'File accepted for processing', jobId: uploadJob._id })
  } catch (err) {
    if (uploadJob) {
      await Upload.findByIdAndUpdate(uploadJob._id, {
        status: "Failed",
        processedAt: new Date()
      })
    }
    res.status(500).json({ message: err.message })
  }
})

// Preview endpoint - parse file and return columns + sample rows
router.post("/preview", upload.single("file"), authenticateJWT, requireRole('admin', 'analyst'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No File Uploaded" })

  const ext = req.file.originalname.split(".").pop().toLowerCase()
  const sampleRows = []
  const headers = []

  try {
    if (ext === 'csv') {
      // Parse CSV
      const parser = parse({ columns: true, skip_empty_lines: true })
      let rowCount = 0

      parser.on('readable', function () {
        let record
        while ((record = parser.read()) !== null) {
          if (rowCount === 0) {
            Object.keys(record).forEach(key => headers.push(key))
          }
          if (rowCount < 20) {
            sampleRows.push(record)
          }
          rowCount++
        }
      })

      await new Promise((resolve, reject) => {
        parser.on('error', reject)
        parser.on('end', resolve)
        parser.write(req.file.buffer)
        parser.end()
      })
    } else if (['xls', 'xlsx'].includes(ext)) {
      // Parse Excel
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const data = XLSX.utils.sheet_to_json(sheet)

      if (data.length > 0) {
        Object.keys(data[0]).forEach(key => headers.push(key))
        sampleRows.push(...data.slice(0, 20))
      }
    } else {
      return res.status(400).json({ message: "Unsupported file format. Use CSV or XLSX." })
    }

    res.json({
      columns: headers,
      sampleRows: sampleRows,
      totalRows: sampleRows.length
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// Add results endpoint
router.get("/results/:jobId", authenticateJWT, requireRole('admin', 'analyst', 'viewer'), async (req, res) => {
  try {
    const uploadJob = await Upload.findById(req.params.jobId);
    if (!uploadJob) {
      return res.status(404).json({ message: "Upload job not found" });
    }

    res.json({
      jobId: uploadJob._id,
      filename: uploadJob.filename,
      status: uploadJob.status,
      totalRecords: uploadJob.totalRecords,
      matchedRecords: uploadJob.matchedRecords,
      partialMatches: uploadJob.partialMatches,
      unmatchedRecords: uploadJob.unmatchedRecords,
      duplicates: uploadJob.duplicates,
      accuracy: uploadJob.accuracy,
      processedAt: uploadJob.processedAt
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get records for a specific upload job with optional status filter and pagination
router.get('/records/:jobId', authenticateJWT, requireRole('admin', 'analyst', 'viewer'), async (req, res) => {
  try {
    const { status = 'all', page = 1, limit = 50 } = req.query;
    const filter = { uploadJobId: req.params.jobId };
    if (status && status !== 'all') filter.matchStatus = status;

    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
      Record.find(filter).populate('matchedWith').skip(skip).limit(Number(limit)).lean(),
      Record.countDocuments(filter)
    ]);

    res.json({ total, page: Number(page), limit: Number(limit), data });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
// Delete upload job and associated records
router.delete("/:jobId", authenticateJWT, requireRole('admin', 'analyst'), async (req, res) => {
  try {
    const job = await Upload.findById(req.params.jobId);
    if (!job) return res.status(404).json({ message: "Job not found" });

    // Delete associated records
    await Record.deleteMany({ uploadJobId: job._id });

    // Delete file if exists
    if (job.filePath && fs.existsSync(job.filePath)) {
      try {
        fs.unlinkSync(job.filePath);
      } catch (e) {
        console.error("Failed to delete file:", e);
      }
    }

    // Delete job
    await Upload.findByIdAndDelete(job._id);

    // Create Audit Log
    await AuditLog.create({
      userId: req.user?.id,
      action: 'delete',
      entityType: 'UploadJob',
      entityId: job._id,
      oldValue: { filename: job.filename, totalRecords: job.totalRecords },
      newValue: null,
      description: `Deleted upload job: ${job.filename}`,
      source: 'ui',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent') || ''
    });

    res.json({ message: "Job deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router
