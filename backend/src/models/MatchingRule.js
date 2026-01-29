import mongoose from 'mongoose'

const matchingRuleSchema = new mongoose.Schema({
  name: { type: String, default: 'default' },
  amountTolerancePercent: { type: Number, default: 2 },
  considerReference: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

matchingRuleSchema.index({ name: 1 })

export default mongoose.model('MatchingRule', matchingRuleSchema)
