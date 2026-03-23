'use client'
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useRef, useState } from "react"


export default function TextareaButton() {
  const [message,createMessage]=useState("");
  const [result,setResult]=useState("");
  const ref=useRef<HTMLTextAreaElement>(null);

  const handleInput = () => {
    const el = ref.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = el.scrollHeight + 'px';
    }
  };

  const handleSubmit=async (e:any)=>{
    e.preventDefault();
    if(!message.trim())return
    setResult("");
    const response=await fetch("http://localhost:5000/api/chat",{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({
        my_message:message
      })}
    )
    const reader=response.body?.getReader();
    const decoder=new TextDecoder();

    while (true && reader) {
      const {done,value}=await reader.read()
      if(done)break;
      const chunk=decoder.decode(value,{stream:true});
      setResult((prev:string)=>{return(prev+chunk)})
      console.log(chunk)
    }

    console.log(response.body)
  }
  return (
    <div className="grid w-full gap-2 p-5">
      <Textarea rows={2} ref={ref} onInput={handleInput} className="resize-none" placeholder="Type your message here." value={message} onChange={(e) => createMessage(e.target.value)} />
      <Button className="hover:cursor-pointer w-[150px]" onClick={handleSubmit}>Send message</Button>
      <div className="mt-[32px]">
        <p className="text-2xl">Output :</p>
        <p className={`${result.trim()?"":"hidden"} border-2 whitespace-pre-wrap p-[8px]`}>
          {result}
        </p>
      </div>
    </div>
  )
}
