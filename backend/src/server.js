import dotenv from "dotenv"
import app from "./app.js"
import connectDB from "./config/db.js"
import { runWorker } from "./workers/mongoWorker.js"

dotenv.config()

const PORT = process.env.PORT

connectDB()

app.listen(PORT, () => {
    console.log(`app started at ${PORT}`)
    // Start the background worker (runs concurrently, non-blocking)
    runWorker().catch(err => {
        console.error('Worker failed:', err)
    })
})