import pandas as pd
import numpy as np
from src.data_preprocessing import preprocess
from src.feature_engineering import add_features
from src.rule_engine import run_rule_engine
from src.llm_reasoner import generate_reasoning
from src.verifier import verify_reasoning

def full_pipeline():
    df = preprocess()
    df = add_features(df)
    df = run_rule_engine(df)

    results = []

    for _, row in df.iterrows():
        if row["flagged"]:
            llm_output = generate_reasoning(row)
            verification = verify_reasoning(row, llm_output)
        else:
            llm_output = {
                "steps": [],
                "final_verdict": "CLEAR",
                "confidence": 1.0
            }
            verification = "SKIPPED"

        # Extract llm_output text safely
        if isinstance(llm_output, dict):
            llm_text = llm_output.get("raw_output") or llm_output.get("explanation") or str(llm_output)
        else:
            llm_text = str(llm_output)
        
        # Build result with all transaction attributes
        result = {
            "transaction_id": int(row["id"]),
            "amount": float(row["amount"]),
            "rules": row["rules_triggered"],
            "llm_output": llm_text,
            "verification": verification
        }
        
        # Add ALL available transaction attributes (exclude already added fields and internal pandas fields)
        exclude_fields = {"id", "transaction_id", "amount", "rules", "rules_triggered", "llm_output", "verification", "flagged"}
        
        for field in row.index:
            # Skip excluded fields and internal pandas fields
            if field in exclude_fields or field.startswith("_"):
                continue
                
            # Skip if value is null/NaN
            if pd.isna(row[field]):
                continue
            
            value = row[field]
            
            # Handle datetime objects
            if isinstance(value, pd.Timestamp):
                result[field] = str(value)
            # Handle boolean values
            elif isinstance(value, (bool, np.bool_)):
                result[field] = bool(value)
            # Handle numeric values
            elif pd.api.types.is_integer_dtype(type(value)) or isinstance(value, (int, np.integer)):
                result[field] = int(value)
            elif pd.api.types.is_float_dtype(type(value)) or isinstance(value, (float, np.floating)):
                result[field] = float(value)
            # Handle everything else as string
            else:
                result[field] = str(value)
        
        results.append(result)

    return results

if __name__ == "__main__":
    output = full_pipeline()
    print("Pipeline executed. Total transactions:", len(output))

