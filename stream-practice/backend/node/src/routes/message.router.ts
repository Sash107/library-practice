import { Router } from "express";
import axios from "axios";
export const router=Router();

router.post("/chat",async(req,res)=>{
    const {my_message}=req.body
    try{
        const python_response=await fetch("http://localhost:8000/ask-llm",{
            method:"POST",
            headers:{"content-type":"application/json"},
            body: JSON.stringify({
                messages: [
                    { role: "user", content: my_message }
                ],
            })
        })

        const reader=python_response.body?.getReader();
        const decoder=new TextDecoder();

        if(!reader){
            res.status(500).json({error:"No response body"})
            return
        }
        while(true){

            const {done,value}=await reader.read();
            if(done) break;
            const chunk=decoder.decode(value,{stream:true});
            res.write(chunk);
        }
        res.end();
    }catch(error){
        console.error("Error connecting to Python backend:",error);
        res.status(502).json({error:"Failed to connect to Python backend. Is it running on port 8000?"})
    }
})
