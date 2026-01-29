def apply_rules(row):
    """
    Apply all AML rules (R1-R9) to a transaction row.
    
    Rule ID | Description
    --------|-------------
    R1      | High-risk jurisdiction
    R2      | Structuring/smurfing
    R3      | Rapid movement of funds
    R4      | Mismatch between source and destination types
    R5      | Repeated counterparties
    R6      | Use of high-risk channels
    R7      | Unusually high volume for customer
    R8      | Beneficiary in sanction list
    R9      | Dormant - sudden activity
    """
    rules = []

    # R1: High-risk jurisdiction
    # If sender_country or receiver_country in ["IR", "KP", "SY", "RU"]
    # Note: This requires country field - currently using placeholder
    if row.get('high_risk_jurisdiction', False):
        rules.append("R1_HIGH_RISK_JURISDICTION")

    # R2: Structuring/smurfing
    # If amount < 10,000 but multiple small tx within 24h
    if row.get('structuring_flag', False):
        rules.append("R2_STRUCTURING_SMURFING")

    # R3: Rapid movement of funds
    # If receiver_account_age_days < 30 and amount > 5000
    if row.get('rapid_funds_movement', False):
        rules.append("R3_RAPID_FUNDS_MOVEMENT")

    # R4: Mismatch between source and destination types
    # e.g., personal - corporate with high volume
    # Note: Requires account type information - placeholder
    if row.get('account_type_mismatch', False):
        rules.append("R4_ACCOUNT_TYPE_MISMATCH")

    # R5: Repeated counterparties
    # More than 5 transactions to same receiver in 3 days
    if row.get('repeated_counterparty_flag', False):
        rules.append("R5_REPEATED_COUNTERPARTIES")

    # R6: Use of high-risk channels
    # If channel = crypto or offshore
    # Note: Requires channel field - placeholder
    if row.get('high_risk_channel', False):
        rules.append("R6_HIGH_RISK_CHANNEL")

    # R7: Unusually high volume for customer
    # amount > mean(amount_user)*5
    if row.get('unusual_high_volume', False):
        rules.append("R7_UNUSUAL_HIGH_VOLUME")

    # R8: Beneficiary in sanction list
    # If beneficiary_risk_score > 0.9
    # Note: Requires beneficiary_risk_score field - placeholder
    if row.get('beneficiary_sanctioned', False):
        rules.append("R8_BENEFICIARY_SANCTIONED")

    # R9: Dormant - sudden activity
    # sender_account_age_days > 300 and previous_tx = 0
    if row.get('dormant_sudden_activity', False):
        rules.append("R9_DORMANT_SUDDEN_ACTIVITY")

    # Legacy rules (keeping for backward compatibility)
    if row.get('high_amount_flag', False):
        rules.append("HIGH_AMOUNT")

    if row.get('merchant_mcc_risk', False):
        rules.append("HIGH_RISK_MCC")

    if row.get('debt_to_income_ratio', 0) > 0.8:
        rules.append("HIGH_DTI")

    if row.get('error_flag', False):
        rules.append("ERROR_TRANSACTION")

    if row.get('card_on_dark_web', False):
        rules.append("CARD_COMPROMISED")

    return rules

def run_rule_engine(df):
    df['rules_triggered'] = df.apply(apply_rules, axis=1)
    df['flagged'] = df['rules_triggered'].apply(lambda x: len(x) > 0)
    df.to_csv("data/processed/flagged.csv", index=False)
    return df

