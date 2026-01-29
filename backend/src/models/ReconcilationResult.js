import mongoose from "mongoose"

const reconcilationResultSchema = new mongoose.Schema({
    uploadJobId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"uploadJob",
        index:true
    },
    summary:Object,
    exactMatches:Array,
    partialmatches:Array,
    duplicates:Array,
    unmatched:Array,
    createdAt:{
        type:Date,
        default:Date.now
    }
})

export default mongoose.model("ReconciliationResult",reconciliationResultSchema)