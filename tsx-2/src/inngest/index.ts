import {Sandbox} from "e2b";
import { Inngest } from "inngest";

export const inngest=new Inngest({id:"something-new"})

const e2b_function=inngest.createFunction({id:"e2b-sandbox",triggers:[{event:"/e2b"}]},
    async({event,step})=>{
        const sandboxId=await step.run("create-sandbox",async()=>{
            const sandbox=await Sandbox.create("test-again")
            return sandbox.sandboxId
        })
        await step.sleep("wait-some-time",3000);

        const sandboxUrl=await step.run("getSandboxUrl",async()=>{
            const sandbox=Sandbox.connect(sandboxId);
            const host=(await sandbox).getHost(3000);
            return `https://${host}`
        })
        return sandboxUrl
    }
)

export const functions:any[]=[e2b_function];