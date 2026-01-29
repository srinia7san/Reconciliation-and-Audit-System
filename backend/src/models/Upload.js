import mongoose from "mongoose"

const uploadJobSchema = new mongoose.Schema({
    filename: String,
    status: {
        type: String,
        enum: ["Queued", "Processing", "Completed", "Failed"],
        default: "Queued",
    },
    fileHash: { type: String, index: true },
    filePath: String,
    fileBuffer: Buffer,  // Store file data directly in MongoDB
    fileExtension: String,  // csv, xlsx, xls
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    processingAt: Date,
    columnMapping: {
        transactionId: String,
        amount: String,
        referenceNumber: String
    },
    totalRecords: Number,
    matchedRecords: Number,
    unmatchedRecords: Number,
    partialMatches: Number,
    duplicates: Number,
    processedAt: Date,
    accuracy: Number,
    isSystemLoad: {
        type: Boolean,
        default: false
    }
})

export default mongoose.model("uploadJob", uploadJobSchema)