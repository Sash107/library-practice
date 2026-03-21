import {Sandbox} from "e2b";
import { Inngest, step } from "inngest";
import {getSandbox} from "../utils/connectSandbox.js"
export const inngest= new Inngest({id:"my-practice-app"})

const demo=inngest.createFunction({id:"demo-hello",triggers:[{event:"my-demo-1"}]},
    async ({event,step})=>{
        await step.sleep("wait a moment",6000)
        return {message:`Hello my email ${event.data.email}`}
    }
)

const snadboxTrial=inngest.createFunction({id:"sb",triggers:[{event:"start-sandbox"}]},
    async ({step,event})=>{
        const sandbox_ID= await step.run("get-sandbox-id",async()=>{
            const sandbox = await Sandbox.create('my-new-e2b')
            return sandbox.sandboxId  
        })

        await step.sleep("waiting some time",6000);

        const sandboxUrl= await step.run("get-sandbox-url",async()=>{
            const sandbox=await getSandbox(sandbox_ID)
            const host= sandbox.getHost(3000); 
            return `https://${host}`
        })
        return sandboxUrl
    }
)

export const functions:ReturnType<typeof inngest.createFunction>[] =[demo,snadboxTrial]