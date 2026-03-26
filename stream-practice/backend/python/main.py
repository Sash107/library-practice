from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain.messages import HumanMessage, AIMessage, SystemMessage
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Literal
from system_prompt import SYSTEM_PROMPT
from langchain_openrouter import ChatOpenRouter
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_deepseek import ChatDeepSeek

class Chat(BaseModel):
    role: Literal["user","assistant","system"]
    content:str
class ChatRequest(BaseModel):
    messages: List[Chat]

app=FastAPI()
load_dotenv()

llm=ChatGroq(
    model="openai/gpt-oss-120b",
    temperature=0,
    max_tokens=8000
)
model = ChatOpenRouter(
    model="stepfun/step-3.5-flash:free",
    temperature=0,
)

model2=ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    )

llm2 = ChatDeepSeek(
    model="deepseek-reasoner",
    temperature=0,
    max_tokens=None,
    timeout=None,
)

def convert_messages(messages):
    result = []
    for msg in messages:
        if msg.role == "user":
            result.append(HumanMessage(content=msg.content))
        elif msg.role == "assistant":
            result.append(AIMessage(content=msg.content))
        elif msg.role == "system":
            result.append(SystemMessage(content=msg.content))
    return result

def ask_llm(message):
    buffer=""
    final_messages = [SystemMessage(content=SYSTEM_PROMPT)] + message
    for chunk in llm2.stream(final_messages):
        if chunk.content:
            buffer+=chunk.content
            lines=buffer.split("\n")

            for line in lines[:-1]:
                yield line +"\n"
                print(line)
            buffer=lines[-1]
    if buffer:
        yield buffer

@app.post("/ask-llm")
def stream(request:ChatRequest):
    lc_messages = convert_messages(request.messages)
    print(lc_messages)
    return StreamingResponse(ask_llm(lc_messages),media_type="text/plain")

@app.post("/test")
def test(request:ChatRequest):
    res=llm.invoke(input="What is the capital of UAE")
    return res.content