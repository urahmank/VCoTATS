# -*- coding: utf-8 -*-
"""llm_reasoner_server.ipynb

Original file is located at
    https://colab.research.google.com/drive/1oWHrCrB-paIeI7-Sqb3TBhZGOC3BYq2A
"""

!pip install transformers accelerate fastapi uvicorn pyngrok

from transformers import AutoTokenizer, AutoModelForCausalLM
import torch

model_name = "microsoft/Phi-3-mini-4k-instruct"

tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForCausalLM.from_pretrained(
    model_name,
    device_map="auto",
    torch_dtype=torch.float16
)

model.eval()

SYSTEM_PROMPT = """
You are an AML compliance reasoning engine.

You MUST return ONLY valid JSON.
NO explanations.
NO markdown.
NO extra text.

If you violate this format, the response is invalid.

JSON schema:
{
  "steps": [string],
  "final_verdict": "FLAG" | "CLEAR",
  "confidence": number
}

Rules:
- Base reasoning ONLY on provided data
- If data is insufficient, say so in steps
- Negative amounts may indicate refunds or reversals
"""

from fastapi import FastAPI
from pydantic import BaseModel
import torch
import uvicorn

app = FastAPI()

class ReasoningRequest(BaseModel):
    transaction: dict
    rules: list

SYSTEM_PROMPT = """You are an AML compliance analyst.
Explain the reasoning clearly.
"""

@app.post("/reason")
def reason(req: ReasoningRequest):

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {
            "role": "user",
            "content": f"""
Transaction data:
{req.transaction}

Triggered rules:
{req.rules}

Explain why this transaction might be suspicious.
"""
        }
    ]

    inputs = tokenizer.apply_chat_template(
        messages,
        add_generation_prompt=True,
        return_tensors="pt"
    ).to(model.device)

    with torch.no_grad():
        outputs = model.generate(
            inputs,
            max_new_tokens=200,
            do_sample=False,
            temperature=0.0
        )

    raw_output = tokenizer.decode(outputs[0], skip_special_tokens=True)

    return {
        "raw_output": raw_output
    }

from pyngrok import ngrok
import uvicorn
import nest_asyncio
import threading
import asyncio # Required for the thread to manage its own event loop

# Apply nest_asyncio to allow nested event loops
nest_asyncio.apply()

ngrok.set_auth_token("36sjHV6KwCczuisuunfil9GZvq5_5ic1cYNe9WDUpj2uNKvmU")

public_url = ngrok.connect(8000)
print("Public LLM API URL:", public_url)

# Define a function to run the Uvicorn server in its own event loop
def run_uvicorn_server():
    config = uvicorn.Config(app, host="0.0.0.0", port=8000, log_level="info")
    server = uvicorn.Server(config)
    asyncio.run(server.serve())

# Run the Uvicorn server in a separate thread
# This prevents it from blocking the main Colab event loop
server_thread = threading.Thread(target=run_uvicorn_server)
server_thread.start()

print("Uvicorn server started in a background thread.")
print("The Colab cell has finished execution, but the server should still be running.")
print("You can access the API at:", public_url)