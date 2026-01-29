import express from 'express'
import Record from '../models/Record.js'
import AuditLog from '../models/AuditLog.js'
import { authenticateJWT } from '../middleware/auth.js'
import { requireRole } from '../middleware/requireRole.js'

const router = express.Router()

// Partial update for a record (manual edit)
router.patch('/:id', authenticateJWT, requireRole('admin','analyst'), async (req, res) => {
  try {
    const record = await Record.findById(req.params.id)
    if (!record) return res.status(404).json({ message: 'Record not found' })

    const oldValue = record.toObject()

    // Allowed fields to update
    const { transactionId, amount, referenceNumber, raw } = req.body
    if (transactionId !== undefined) record.transactionId = transactionId
    if (amount !== undefined) record.amount = Number(amount)
    if (referenceNumber !== undefined) record.referenceNumber = referenceNumber
    if (raw !== undefined) record.raw = raw

    // Reset match info so reconciliation can re-evaluate
    record.matchStatus = 'pending'
    record.matchedWith = undefined
    record.confidenceScore = undefined

    await record.save()

    // write audit log for manual edit
    try {
      await AuditLog.create({
        userId: req.user?.id,
        action: 'edit',
        entityType: 'Record',
        entityId: record._id,
        oldValue,
        newValue: record.toObject(),
        description: `Manual edit of record ${record._id}`,
        source: 'ui',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent') || ''
      })
    } catch (e) {
      console.error('Failed to write record edit audit log', e)
    }

    res.json({ message: 'Record updated', record })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: err.message })
  }
})

// Re-run reconciliation for a single record
router.post('/:id/reconcile', authenticateJWT, requireRole('admin','analyst'), async (req, res) => {
  try {
    const { default: reconcileUtil } = await import('../utils/reconciliation.js')
    // the module exports runReconciliationForRecord
    const { runReconciliationForRecord } = await import('../utils/reconciliation.js')
    const results = await runReconciliationForRecord(req.params.id)
    res.json({ message: 'Reconciliation re-run', results })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: err.message })
  }
})

export default router
