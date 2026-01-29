import express from 'express'
import MatchingRule from '../models/MatchingRule.js'
import { authenticateJWT } from '../middleware/auth.js'
import { requireRole } from '../middleware/requireRole.js'

const router = express.Router()

// Get rules (admin/analyst/viewer)
router.get('/', authenticateJWT, requireRole('admin','analyst','viewer'), async (req, res) => {
  try {
    let rule = await MatchingRule.findOne({ name: 'default' })
    if (!rule) {
      rule = await MatchingRule.create({ name: 'default' })
    }
    res.json(rule)
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

// Update rules (admin only)
router.put('/', authenticateJWT, requireRole('admin'), async (req, res) => {
  try {
    const { amountTolerancePercent, considerReference } = req.body
    let rule = await MatchingRule.findOne({ name: 'default' })
    if (!rule) rule = new MatchingRule({ name: 'default' })
    if (amountTolerancePercent !== undefined) rule.amountTolerancePercent = Number(amountTolerancePercent)
    if (considerReference !== undefined) rule.considerReference = Boolean(considerReference)
    rule.updatedAt = new Date()
    await rule.save()
    res.json(rule)
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

export default router
