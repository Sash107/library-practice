import "dotenv/config"
import express from "express";
import {inngest,functions} from "./inngest/index.js"
import { serve } from "inngest/express";
const PORT=3000;

const app=express();


app.use(express.json());
app.use("/api/inngest",serve({client:inngest,functions}))

app.listen(PORT,()=>{
    console.log(`server is running on port ${PORT}`);
})