import mongoose from "mongoose"

const recordSchema = new mongoose.Schema({
    uploadJobId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"uploadJob",
        index:true
    },
    transactionId :{type:String,index:true},
    amount:Number,
    referenceNumber:{type:String,index:true},
    raw:Object,
    isSystemRecord: {
        type: Boolean,
        default: false,
        index: true
    },
    matchStatus: {
        type: String,
        enum: ["matched", "partial", "unmatched", "duplicate", "pending", "system"],
        default: "pending"
    },
    matchedWith: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Record"
    },
    confidenceScore: Number
})

// Compound indexes to improve matching/query performance
recordSchema.index({ isSystemRecord: 1, transactionId: 1, amount: 1 })
recordSchema.index({ uploadJobId: 1, matchStatus: 1 })

export default mongoose.model("Record",recordSchema)