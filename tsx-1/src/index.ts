import "dotenv/config"
import express, { type Request, type Response }  from "express";
import { inngest,functions } from "./inngest/index.js";
import { serve } from "inngest/express";
const PORT=3000;

const app=express();

app.use(express.json())

app.use("/api/inngest",serve({client:inngest,functions}))

app.get("/api/hello",async(req:Request,res:Response)=>{
    await inngest.send({
        name:"my-demo-1",
        data:{
            email:"email_from_code"
        }
    }).catch(err=>{console.log(err)})
    res.json({
        message:"event sent successfully"
    })
})

app.listen(PORT,()=>{
    console.log(`Server is running on port ${PORT}`);
})