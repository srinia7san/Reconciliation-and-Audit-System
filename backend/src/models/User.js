import mongoose from "mongoose"

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    name: {
        type: String,
        default: ""
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ["admin", "analyst", "viewer"],
        default: "analyst"
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
})

export default mongoose.model("User", userSchema)