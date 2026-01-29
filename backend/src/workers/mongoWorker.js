import fs from 'fs/promises'
import path from 'path'
import { parse } from 'csv-parse/sync'
import XLSX from 'xlsx'
import dotenv from 'dotenv'
import connectDB from '../config/db.js'
import Upload from '../models/Upload.js'
import AuditLog from '../models/AuditLog.js'
import { saveRecordsToDatabase, runReconciliation, updateUploadJobWithResults } from '../utils/reconciliation.js'

dotenv.config()

const SLEEP_MS = Number(process.env.WORKER_POLL_MS)

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function processJob(job) {
  const { _id: uploadJobId, fileBuffer, fileExtension, filename, uploadedBy, columnMapping } = job
  const ext = fileExtension || (filename ? filename.split('.').pop().toLowerCase() : 'csv')

  try {
    // Use fileBuffer from MongoDB instead of reading from disk
    const buffer = fileBuffer
    if (!buffer) {
      throw new Error('No file buffer found in job')
    }

    let records = []
    if (ext === 'csv') {
      const text = buffer.toString()
      records = parse(text, { columns: true })
    } else {
      const workbook = XLSX.read(buffer, { type: 'buffer' })
      const sheetName = workbook.SheetNames[0]
      records = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName])
    }

    // Apply column mapping if provided
    if (columnMapping && Object.keys(columnMapping).length > 0) {
      records = records.map(record => {
        const mappedRecord = {}

        // Map transaction ID
        if (columnMapping.transactionId) {
          mappedRecord.transactionId = record[columnMapping.transactionId]
        }

        // Map amount
        if (columnMapping.amount) {
          const amountValue = record[columnMapping.amount]
          mappedRecord.amount = typeof amountValue === 'string'
            ? parseFloat(amountValue)
            : amountValue
        }

        // Map reference number
        if (columnMapping.referenceNumber) {
          mappedRecord.referenceNumber = record[columnMapping.referenceNumber]
        }

        return mappedRecord
      })
    }

    await saveRecordsToDatabase(records, uploadJobId)
    const results = await runReconciliation(uploadJobId)
    await updateUploadJobWithResults(uploadJobId, results)

    // Clear the fileBuffer from MongoDB to save space after processing
    await Upload.findByIdAndUpdate(uploadJobId, { $unset: { fileBuffer: 1 } })

    try {
      await AuditLog.create({
        userId: uploadedBy || null,
        action: 'reconcile',
        entityType: 'UploadJob',
        entityId: uploadJobId,
        oldValue: null,
        newValue: results.summary,
        description: `Reconciliation run for upload ${uploadJobId}`,
        source: 'system'
      })
    } catch (e) {
      console.error('Failed to write audit log', e)
    }

    console.log(`Processed upload ${uploadJobId}: ${results.summary ? JSON.stringify(results.summary) : 'no summary'}`)
  } catch (err) {
    console.error('Job processing error', err)
    await Upload.findByIdAndUpdate(uploadJobId, { status: 'Failed', processedAt: new Date() })
  }
}

export async function runWorker() {
  console.log('Mongo worker started, polling for queued uploads...')

  while (true) {
    try {
      const job = await Upload.findOneAndUpdate(
        { status: 'Queued' },
        { $set: { status: 'Processing', processingAt: new Date() } },
        { sort: { createdAt: 1 }, returnDocument: 'after' }
      )

      if (!job) {
        await sleep(SLEEP_MS)
        continue
      }

      await processJob(job)
    } catch (err) {
      console.error('Worker loop error', err)
      await sleep(SLEEP_MS)
    }
  }
}
