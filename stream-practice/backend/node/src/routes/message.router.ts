import { Router } from "express";
import axios from "axios";
import { buffer } from "node:stream/consumers";
import Sandbox from "@e2b/code-interpreter";
import { connectSandbox } from "../utils/connectSandbox.js";
export const router=Router();

const OPEN_TAG_REGEX=/<vibe-write file_path="([^"]+)">/;
const CLOSE_TAG="</vibe-write>";

router.post("/chat",async(req,res)=>{
    const {my_message,sandboxID}=req.body
    console.log(my_message)
    try{
        const sandbox=await connectSandbox(sandboxID);
        await sandbox.files.write(
        "/home/user/myapp/lib/utils.ts",
        `import { clsx, type ClassValue } from "clsx";
        import { twMerge } from "tailwind-merge";

        export function cn(...inputs: ClassValue[]) {
        return twMerge(clsx(inputs));
        }`
        );
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

        let mycode=""
        while(true){
            const {done,value}=await reader.read();
            if(done) break;
            const chunk=decoder.decode(value,{stream:true});
            res.write(chunk);
            mycode+=chunk;

            while(mycode.includes(CLOSE_TAG)){
                const closeIndex=mycode.indexOf(CLOSE_TAG);
                const block=mycode.slice(0,closeIndex+CLOSE_TAG.length);
                mycode=mycode.slice(closeIndex+CLOSE_TAG.length)

                const openMatch=block.match(OPEN_TAG_REGEX);
                if(!openMatch)continue;

                const file_path=openMatch[1]?.trim();
                if(!file_path) continue;
                const openTagEnd=block.indexOf(">",block.indexOf(openMatch[0]))+1;
                
                const content=block.slice(openTagEnd,closeIndex).trim();
                console.log(file_path+"\n\n");
                console.log(content);
                console.log("------------------------------------------------------")

                try{
                    const PROTECTED_FILES = [
                    "app/globals.css",
                    "styles/globals.css",
                    "tailwind.config.js",
                    "tailwind.config.ts",
                    "postcss.config.js",
                    "next.config.js",
                    "next.config.ts",
                    "tsconfig.json",
                    ];
                    const fullPath=`/home/user/myapp/${file_path}`;

                    if (PROTECTED_FILES.includes(file_path)) {
                        console.log(`⏭ Skipped protected file: ${file_path}`);
                        continue;
                        }

                    await sandbox.commands.run(`mkdir -p $(dirname ${fullPath})`);
                    await sandbox.files.write(fullPath,content);
                    console.log(`✓ Written: ${file_path}`);
                }catch(err){
                    console.error("Error writing to sandbox:", err);
                }

            }
        }
        await sandbox.commands.run(
            `cd /home/user/myapp && npm install`,
            { timeoutMs: 60000 }
        );
        res.end();
    }catch(error: any){
        console.error("Error in chat route:",error);
        if (error?.message?.includes('sandbox')) {
             res.status(502).json({error: "Virtual Sandbox expired or invalid ID."})
        } else {
             res.status(502).json({error:"Failed to connect to Python backend. Is it running on port 8000?"})
        }
    }
})
