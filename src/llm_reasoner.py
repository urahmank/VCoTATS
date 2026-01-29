import requests
import json
import os

COLAB_LLM_URL = os.getenv(
    "COLAB_LLM_URL",
    "https://qiana-ungesticulating-acervately.ngrok-free.dev/reason"
)

TIMEOUT = 30

def generate_reasoning(row):
    """
    Sends structured transaction evidence to the Colab LLM
    and receives strict JSON reasoning.
    """

    # payload = {
    #     "transaction": {
    #         "amount": float(row["amount"]),
    #         "txn_hour": int(row["txn_hour"]),
    #         "merchant_mcc": str(row["mcc"]),
    #         "unusual_location": bool(row.get("unusual_location_flag", False)),
    #         "debt_to_income_ratio": float(row.get("debt_to_income_ratio", 0)),
    #         "card_on_dark_web": bool(row.get("card_on_dark_web", False)),
    #     },
    #     "rules": row["rules_triggered"]
    # }

    # try:
    #     response = requests.post(
    #         COLAB_LLM_URL,
    #         json=payload,
    #         timeout=TIMEOUT
    #     )
    #     response.raise_for_status()
    #     return response.json()

    # except Exception as e:
    #     return {
    #         "steps": ["LLM call failed"],
    #         "final_verdict": "FLAG",
    #         "confidence": 0.0,
    #         "error": str(e)
    #     }

    payload = {
        "transaction": {
            "amount": float(row["amount"]),
            "txn_hour": int(row["txn_hour"]),
            "merchant_mcc": str(row["mcc"]),
            "unusual_location": bool(row.get("unusual_location_flag", False)),
            "debt_to_income_ratio": float(row.get("debt_to_income_ratio", 0)),
            "card_on_dark_web": bool(row.get("card_on_dark_web", False)),
        },
        "rules": row["rules_triggered"]
    }

    try:
        response = requests.post(COLAB_LLM_URL, json=payload, timeout=30)
        response.raise_for_status()
        return response.json()   # ← contains raw_output

    except Exception as e:
        return {
            "raw_output": f"LLM call failed: {str(e)}"
        }