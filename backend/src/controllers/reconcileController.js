import UploadJob from "../models/UploadJob.js";
import Record from "../models/Record.js";
import ReconciliationResult from "../models/ReconciliationResult.js";
import AuditLog from "../models/AuditLog.js";
import { matchTransactions } from "../utils/matchTransactions.js";
import { matchingRules } from "../utils/matchingRules.js";

export const reconcile = async (req, res) => {
  const { normalizedSource, normalizedTarget } = req.body;

  const uploadJob = await UploadJob.create({
    filename: "uploaded_file.csv",
    status: "PROCESSING",
    uploadedBy: req.user?.id
  });

  try {
    // Save records
    await Record.insertMany(
      normalizedSource.map(r => ({
        ...r,
        uploadJobId: uploadJob._id
      }))
    );

    // Run reconciliation
    const result = matchTransactions(
      normalizedSource,
      normalizedTarget,
      matchingRules
    );

    // Save result
    const savedResult = await ReconciliationResult.create({
      uploadJobId: uploadJob._id,
      ...result
    });

    // Audit log
    await AuditLog.create({
      entityType: "Reconciliation",
      entityId: savedResult._id,
      action: "CREATE",
      newValue: result.summary,
      performedBy: req.user?.id,
      source: "SYSTEM"
    });

    uploadJob.status = "COMPLETED";
    await uploadJob.save();

    res.json(result.summary);
  } catch (err) {
    uploadJob.status = "FAILED";
    await uploadJob.save();
    throw err;
  }
};
