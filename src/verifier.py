def verify_reasoning(row, llm_output):
    # Extract text from llm_output dictionary
    if isinstance(llm_output, dict):
        # Try to get raw_output or explanation field, or convert entire dict to string
        text = llm_output.get("raw_output", "") or llm_output.get("explanation", "") or str(llm_output)
    else:
        text = str(llm_output)
    
    text = text.lower()

    if "high dti" in text or "debt" in text:
        return "PASS"

    if "card" in text or "dark web" in text:
        return "PASS"

    return "WEAK_REASONING"