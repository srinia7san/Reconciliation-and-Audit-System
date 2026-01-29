import Record from "../models/Record.js";
import Upload from "../models/Upload.js";
import MatchingRule from "../models/MatchingRule.js";
import { matchTransactions } from "./matchTransaction.js";

export async function saveRecordsToDatabase(records, uploadJobId) {
  const recordDocs = records.map(record => ({
    uploadJobId,
    transactionId: record.transactionId || record.TransactionID || record['Transaction ID'] || '',
    amount: parseFloat(record.amount || record.Amount || 0),
    referenceNumber: record.referenceNumber || record.ReferenceNumber || record['Reference Number'] || '',
    raw: record,
    isSystemRecord: false,
    matchStatus: "pending"
  }));
  
  await Record.insertMany(recordDocs);
  await Upload.findByIdAndUpdate(uploadJobId, {
    totalRecords: records.length
  });
}

export async function runReconciliation(uploadJobId) {
  // load matching rules from DB (fallback to defaults)
  const ruleDoc = await MatchingRule.findOne({ name: 'default' })
  const rules = ruleDoc ? {
    transactionIdField: 'transactionId',
    amountField: 'amount',
    referenceField: 'referenceNumber',
    amountTolerancePercent: ruleDoc.amountTolerancePercent || 2,
    considerReference: ruleDoc.considerReference !== false
  } : {
    transactionIdField: 'transactionId',
    amountField: 'amount',
    referenceField: 'referenceNumber',
    amountTolerancePercent: 2,
    considerReference: true
  }

  // Get uploaded records for this job (lean for performance)
  const uploadedRecords = await Record.find({ uploadJobId }).lean();

  // Get system records (lean)
  const systemRecords = await Record.find({ isSystemRecord: true }).lean();

  const results = matchTransactions(uploadedRecords, systemRecords, rules);

  // Bulk update individual record statuses for performance
  await bulkUpdateRecordStatuses(uploadJobId, results);

  return results;
}

async function updateRecordStatuses(uploadJobId, results) {
  // Update exact matches
  for (const match of results.exactMatches) {
    await Record.findOneAndUpdate(
      { uploadJobId, transactionId: match.source.transactionId },
      { 
        matchStatus: "matched",
        matchedWith: match.target._id,
        confidenceScore: 100
      }
    );
  }
  
  // Update partial matches
  for (const match of results.partialMatches) {
    await Record.findOneAndUpdate(
      { uploadJobId, transactionId: match.source.transactionId },
      { 
        matchStatus: "partial",
        matchedWith: match.target._id,
        confidenceScore: parseFloat(match.differencePercent)
      }
    );
  }
  
  // Update duplicates
  for (const duplicate of results.duplicates) {
    await Record.findOneAndUpdate(
      { uploadJobId, transactionId: duplicate.transactionId },
      { 
        matchStatus: "duplicate"
      }
    );
  }
  
  // Update unmatched
  for (const unmatched of results.unmatched) {
    await Record.findOneAndUpdate(
      { uploadJobId, transactionId: unmatched.transactionId },
      { 
        matchStatus: "unmatched"
      }
    );
  }
}

async function bulkUpdateRecordStatuses(uploadJobId, results) {
  const ops = []

  for (const match of results.exactMatches) {
    ops.push({
      updateOne: {
        filter: { uploadJobId, transactionId: match.source.transactionId },
        update: { $set: { matchStatus: 'matched', matchedWith: match.target._id, confidenceScore: 100 } }
      }
    })
  }

  for (const match of results.partialMatches) {
    ops.push({
      updateOne: {
        filter: { uploadJobId, transactionId: match.source.transactionId },
        update: { $set: { matchStatus: 'partial', matchedWith: match.target._id, confidenceScore: parseFloat(match.differencePercent) } }
      }
    })
  }

  for (const duplicate of results.duplicates) {
    ops.push({
      updateOne: {
        filter: { uploadJobId, transactionId: duplicate.transactionId },
        update: { $set: { matchStatus: 'duplicate' } }
      }
    })
  }

  for (const unmatched of results.unmatched) {
    ops.push({
      updateOne: {
        filter: { uploadJobId, transactionId: unmatched.transactionId },
        update: { $set: { matchStatus: 'unmatched' } }
      }
    })
  }

  if (ops.length > 0) {
    const BATCH = 500
    for (let i = 0; i < ops.length; i += BATCH) {
      const slice = ops.slice(i, i + BATCH)
      await Record.bulkWrite(slice)
    }
  }
}

export async function runReconciliationForRecord(recordId) {
  const record = await Record.findById(recordId).lean()
  if (!record) throw new Error('Record not found')

  const ruleDoc = await MatchingRule.findOne({ name: 'default' })
  const rules = ruleDoc ? { amountTolerancePercent: ruleDoc.amountTolerancePercent || 2, considerReference: ruleDoc.considerReference !== false } : { amountTolerancePercent: 2, considerReference: true }

  const systemRecords = await Record.find({ isSystemRecord: true }).lean()

  const results = matchTransactions([record], systemRecords, {
    transactionIdField: 'transactionId',
    amountField: 'amount',
    referenceField: 'referenceNumber',
    amountTolerancePercent: rules.amountTolerancePercent,
    considerReference: rules.considerReference
  })

  await bulkUpdateRecordStatuses(record.uploadJobId, results)

  return results
}

export async function updateUploadJobWithResults(uploadJobId, results) {
  const accuracy = results.summary.totalSource > 0 
    ? ((results.summary.exact + results.summary.partial) / results.summary.totalSource * 100).toFixed(2)
    : 0;
    
  await Upload.findByIdAndUpdate(uploadJobId, {
    status: "Completed",
    matchedRecords: results.summary.exact,
    partialMatches: results.summary.partial,
    unmatchedRecords: results.summary.unmatched,
    duplicates: results.summary.duplicate,
    accuracy: parseFloat(accuracy),
    processedAt: new Date()
  });
}