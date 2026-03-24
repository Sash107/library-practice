import {Sandbox} from "@e2b/code-interpreter";
import { Inngest } from "inngest";

export const inngest=new Inngest({id:"my-app"})

const e2b_sandbox=inngest.createFunction({id:"create-sandbox",triggers:[{event:"start/sandbox"}]},async({event,step})=>{
    const sandboxId=await step.run("getSandbox",async()=>{
        const sandbox= await Sandbox.create("stream-practice")
        return sandbox.sandboxId
    })


    const sandboxUrl=await step.run("get-url-nextApp",async()=>{
        const sandbox=await Sandbox.connect(sandboxId);
        const files= await sandbox.files.list("/home/user/myapp")
        console.log(files)
        return (await sandbox).getHost(3000);
    })

    return {sandboxId,sandboxUrl}
})

export const functions:ReturnType<typeof inngest.createFunction>[]=[e2b_sandbox];