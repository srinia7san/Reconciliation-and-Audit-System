import express from "express"
import cors from "cors"
import uploadRouter from "./routes/upload.js"
import systemRecordsRouter from "./routes/systemRecords.js"
import dashboardRouter from "./routes/dashboard.js"
import authRouter from "./routes/auth.js"
import recordsRouter from "./routes/records.js"
import matchingRulesRouter from "./routes/matchingRules.js"
import auditRouter from "./routes/audit.js"

const app = express()

app.use(cors())
app.use(express.json())

app.get("/api/check", (req, res) => {
    res.json({ status: "ok" })
})
app.use("/api/upload", uploadRouter)
app.use("/api/system-records", systemRecordsRouter)
app.use("/api/dashboard", dashboardRouter)
app.use("/api/auth", authRouter)
app.use("/api/records", recordsRouter)
app.use("/api/matching-rules", matchingRulesRouter)
app.use("/api/audit", auditRouter)

export default app