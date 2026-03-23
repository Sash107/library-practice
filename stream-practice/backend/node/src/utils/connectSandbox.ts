import {Sandbox} from "@e2b/code-interpreter"

export const connectSandbox =async(SandboxId:string)=>{
    const sandbox=await Sandbox.connect(SandboxId);
    return sandbox
}