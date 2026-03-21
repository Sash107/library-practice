import {Sandbox} from "e2b";

export async function getSandbox(sandboxID:string){
    const sandbox=Sandbox.connect(sandboxID);
    return sandbox;
}