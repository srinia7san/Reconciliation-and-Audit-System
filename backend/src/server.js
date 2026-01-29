import dotenv from "dotenv"
import app from "./app.js"
import connectDB from "./config/db.js"

dotenv.config()

const PORT = process.env.PORT

connectDB()

app.listen(PORT,()=>{
    console.log(`app started at ${PORT}`)
})