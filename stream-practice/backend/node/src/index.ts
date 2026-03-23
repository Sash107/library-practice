import express from "express";
import { router as chatRoutes } from "./routes/message.router.js"
import cors from "cors";

const PORT=5000
const app=express()

app.use(express.json())
app.use(express.text())
app.use(cors())

app.use("/api",chatRoutes)
app.listen(PORT,()=>{
    console.log(`server is running on port ${PORT}`)
})