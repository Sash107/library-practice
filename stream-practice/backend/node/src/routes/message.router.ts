import { Router } from "express";
import {Sandbox} from "@e2b/code-interpreter";
import { connectSandbox } from "../utils/connectSandbox.js";

import { Agent } from "undici";
const longTimeoutDispatcher = new Agent({ bodyTimeout: 0, headersTimeout: 0 });
export const router=Router();

async function waitForAppReady(sandbox: Sandbox) {
  const MAX_RETRIES = 15;

  for (let i = 0; i < MAX_RETRIES; i++) {
    const res = await sandbox.commands.run(
      `curl -s http://localhost:3000 || true`
    );

    const html = res.stdout || "";

    const hasHTML = html.includes("<html");
    const hasClasses = html.includes("class=");
    const hasTailwind =
      html.includes("bg-") ||
      html.includes("flex") ||
      html.includes("grid");

    if (hasHTML && hasClasses && hasTailwind) {
      console.log("✅ App fully ready (UI + CSS)");
      return true;
    }

    console.log(`⏳ Waiting for UI... (${i + 1})`);
    await new Promise(r => setTimeout(r, 2000));
  }

  return false;
}

const OPEN_TAG_REGEX=/<vibe-write file_path="([^"]+)">/;
const CLOSE_TAG="</vibe-write>";

function isValidResponse(curlOutput: string): boolean {
    return curlOutput.trim() === "200";
}

async function getSandboxContext(sandbox: Sandbox): Promise<string> {
    const tree = await sandbox.commands.run(
        `find /home/user/myapp/src -type f | head -30`
    );
    return `Current file structure:\n${tree.stdout}`;
}

async function streamAndWriteFiles(sandbox:Sandbox,res:any,messages:any){
    const python_response=await fetch("http://localhost:8000/ask-llm",{
        method:"POST",
        headers:{"content-type":"application/json"},
        body: JSON.stringify({
            messages
        }),
        // @ts-ignore - dispatcher is a valid undici option for Node's built-in fetch
        dispatcher: longTimeoutDispatcher
    })

    const reader=python_response.body?.getReader();
    const decoder=new TextDecoder();

    if(!reader){
        res.status(500).json({error:"No response body"})
        return
    }

    let mycode=""
    let fullcode=""
    while(true){
        const {done,value}=await reader.read();
        if(done) break;
        const chunk=decoder.decode(value,{stream:true});
        res.write(chunk);
        mycode+=chunk;
        fullcode+=chunk;
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
                const fullPath=`/home/user/myapp/${file_path}`;

                await sandbox.commands.run(`mkdir -p $(dirname "${fullPath}")`);
                await sandbox.files.write(fullPath,content);
                console.log(`✓ Written: ${file_path}`); 
            }catch(err){
                console.error("Error writing to sandbox:", err);
            }

        }
    }
    messages.push({
        role:"assistant",
        content:fullcode
    })

}

router.post("/chat",async(req,res)=>{
    const {my_message,sandboxID}=req.body
    console.log(my_message)
    try{
        const sandbox=await connectSandbox(sandboxID);
        await sandbox.commands.run("npm install", {cwd: "/home/user/myapp", timeoutMs: 120_000});
        const messages: { role: string; content: string }[] = [
            { role: "user", content: my_message },
        ];

        await streamAndWriteFiles(sandbox, res, messages);

        await sandbox.commands.run(
            `cd /home/user/myapp && npm install`,
            { timeoutMs: 120_000 }
        );
        const MAX_ITERATIONS = 15;
        let iteration = 0;
        let isValid = false;

        while(iteration<MAX_ITERATIONS && !isValid){
            iteration++;
            console.log(`\n--- Curl check iteration ${iteration} ---`);

            await sandbox.commands.run(`fuser -k 3000/tcp 2>/dev/null || true`)

            await sandbox.commands.run(`cd /home/user/myapp && nohup npm run dev >> /tmp/server.log 2>&1 & PID=$! && echo $PID > /tmp/server.pid`);
            await new Promise((r) => setTimeout(r, 12000));

            const serverResponse= await sandbox.commands.run(`curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://localhost:3000 || true`)

            console.log(
                `Curl result (iteration ${iteration}):`,
                serverResponse.stdout
            );

            if (isValidResponse(serverResponse.stdout)) {
                const ready = await waitForAppReady(sandbox);
                if (ready) {
                isValid = true;
                console.log("✓ App is running correctly with UI");
                break;
                }
                console.log("✓ App is running correctly");
                break;
            }

            if (iteration >= MAX_ITERATIONS) {
                console.log("Max iterations reached without success");
                break;
            }

            const errorBlock = await sandbox.commands.run(`
            tail -n 800 /tmp/server.log | tac | grep -m 1 -B 50 -A 30 -i -E "
            error|exception|fail|fatal|
            typeerror|referenceerror|syntaxerror|
            cannot find module|module not found|
            err!|errno|eaddrinuse|econnrefused|enoent|eacces|
            build failed|compilation failed|module parse failed|
            unexpected token|invalid
            " | tac || true
            `);

            const fullLogs = await sandbox.commands.run(`
            tail -n 1000 /tmp/server.log || true
            `);
            const logs = fullLogs.stdout;

            const match = logs.match(/Cannot find module '(.*?)'|Module not found.*?'(.*?)'/);
            if (match) {
            const pkg = match[1] || match[2];
            console.log(`📦 Auto-installing missing package: ${pkg}`);
            await sandbox.commands.run(`cd /home/user/myapp && npm install ${pkg}`);
            }

            const installLogs = await sandbox.commands.run(`
            cd /home/user/myapp && npm install 2>&1 || true
            `);

            const systemInfo = await sandbox.commands.run(`
            echo "Node: $(node -v)"
            echo "NPM: $(npm -v)"
            echo "PWD: $(pwd)"
            `);

            const processInfo = await sandbox.commands.run(`
            ps aux | grep node | grep -v grep || true
            `);

            const context=await getSandboxContext(sandbox);

            messages.push({
                role:"user",
                content:`The app failed to start.
                === SERVER STATUS ===
                ${serverResponse.stdout}

                === MOST RELEVANT ERROR ===
                ${errorBlock.stdout || "No direct error match found"}

                === FULL SERVER LOGS ===
                ${fullLogs.stdout}

                === INSTALL LOGS ===
                ${installLogs.stdout}

                === SYSTEM INFO ===
                ${systemInfo.stdout}

                === RUNNING PROCESSES ===
                ${processInfo.stdout}

                === PROJECT CONTEXT ===
                ${context}

                Instructions:
                1. Identify the root cause (be precise)
                2. Fix the issue
                3. Rewrite ONLY affected files
                4. If a dependency is missing, update package.json`
            })
            
            res.write(`\n\n[Fix attempt ${iteration + 1}]\n\n`);

            await streamAndWriteFiles(sandbox, res, messages);
            
            console.log("Running npm install...");
            await sandbox.commands.run(
                `cd /home/user/myapp && npm install`,
                { timeoutMs: 600_000 }
            );
        }


        console.log("Done");
        res.end();
    }catch(error: any){
        console.error("Error in chat route:",error);
        if (res.headersSent) {
            res.end();
        } else if (error?.message?.includes('sandbox')) {
             res.status(502).json({error: "Virtual Sandbox expired or invalid ID."})
        } else {
             res.status(502).json({error:"Failed to connect to Python backend. Is it running on port 8000?"})
        }
    }
})
