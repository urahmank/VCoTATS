from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import uuid
import json
import os
import asyncio

from src.pipeline import full_pipeline
from src.llm_reasoner import generate_reasoning
from src.verifier import verify_reasoning

app = FastAPI(title="Verifiable CoT Arbiter Backend")

# Allow Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OUTPUT_DIR = "outputs/verified_chains"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# -----------------------------
# Models
# -----------------------------
class RunPipelineResponse(BaseModel):
    run_id: str
    total_transactions: int
    flagged_transactions: int


# -----------------------------
# Routes
# -----------------------------

@app.post("/api/run-pipeline", response_model=RunPipelineResponse)
def run_pipeline():
    run_id = str(uuid.uuid4())

    results = full_pipeline()

    flagged = [r for r in results if r["rules"]]

    # Save run output
    output_path = os.path.join(OUTPUT_DIR, f"{run_id}.json")
    with open(output_path, "w") as f:
        json.dump(results, f, indent=2)

    return {
        "run_id": run_id,
        "total_transactions": len(results),
        "flagged_transactions": len(flagged)
    }


@app.get("/api/runs")
def list_runs():
    files = [f for f in os.listdir(OUTPUT_DIR) if f.endswith('.json')]
    # Return files sorted by modification time (newest first)
    files.sort(key=lambda f: os.path.getmtime(os.path.join(OUTPUT_DIR, f)), reverse=True)
    return files


@app.get("/api/run/{run_id}/summary")
async def get_run_summary(run_id: str):
    """Get summary statistics without loading full data"""
    path = os.path.join(OUTPUT_DIR, f"{run_id}.json")
    if not os.path.exists(path):
        return {"error": "Run not found"}
    
    file_size = os.path.getsize(path)
    
    def get_summary():
        try:
            # Only read first and last few lines to estimate, or read full file if small
            if file_size > 10 * 1024 * 1024:  # > 10MB
                # For large files, we need to load to count, but we'll limit this
                return {"error": "File too large. Use pagination with small limits."}, None
            
            with open(path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            if not isinstance(data, list):
                return {"error": "Invalid data format"}, None
            
            total = len(data)
            flagged_count = sum(1 for r in data if r.get("rules"))
            
            return {
                "total_transactions": total,
                "flagged_transactions": flagged_count,
                "file_size_mb": round(file_size / (1024 * 1024), 2)
            }, None
        except Exception as e:
            return {"error": f"Error loading file: {str(e)}"}, None
    
    result, _ = await asyncio.to_thread(get_summary)
    return result


@app.get("/api/run/{run_id}")
async def get_run(
    run_id: str,
    limit: Optional[int] = Query(100, description="Limit number of transactions returned (default: 100, max: 1000)"),
    offset: Optional[int] = Query(0, description="Offset for pagination"),
    flagged_only: Optional[bool] = Query(False, description="Return only flagged transactions")
):
    path = os.path.join(OUTPUT_DIR, f"{run_id}.json")
    if not os.path.exists(path):
        return {"error": "Run not found"}

    # Check file size and warn if too large
    file_size = os.path.getsize(path)
    if file_size > 50 * 1024 * 1024:  # > 50MB
        return {"error": "File too large. Please use smaller limit parameter or /summary endpoint."}
    
    # Enforce maximum limit
    if limit and limit > 1000:
        limit = 1000

    # Load JSON efficiently with error handling
    def load_and_process_json():
        try:
            with open(path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            if not isinstance(data, list):
                return {"error": "Invalid data format"}, 0
            
            total = len(data)
            
            # Filter flagged transactions if requested
            if flagged_only:
                data = [r for r in data if r.get("rules")]
                total = len(data)
            
            # Apply pagination
            if limit is not None and limit > 0:
                data = data[offset:offset + limit]
            elif offset > 0:
                data = data[offset:]
            
            return data, total
        except json.JSONDecodeError as e:
            return {"error": f"Invalid JSON: {str(e)}"}, 0
        except MemoryError:
            return {"error": "File too large to load. Use /summary endpoint or smaller limit."}, 0
        except Exception as e:
            return {"error": f"Error loading file: {str(e)}"}, 0
    
    data, total = await asyncio.to_thread(load_and_process_json)
    
    if isinstance(data, dict) and "error" in data:
        return data
    
    return {
        "total": total,
        "returned": len(data),
        "offset": offset,
        "limit": limit,
        "transactions": data
    }


@app.get("/api/run/{run_id}/transaction/{txn_id}")
async def get_transaction(run_id: str, txn_id: int):
    path = os.path.join(OUTPUT_DIR, f"{run_id}.json")
    if not os.path.exists(path):
        return {"error": "Run not found"}

    def find_transaction():
        try:
            with open(path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            if not isinstance(data, list):
                return {"error": "Invalid data format"}
            
            for row in data:
                if isinstance(row, dict) and row.get("transaction_id") == txn_id:
                    return row
            
            return {"error": "Transaction not found"}
        except Exception as e:
            return {"error": f"Error loading file: {str(e)}"}
    
    result = await asyncio.to_thread(find_transaction)
    return result


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)