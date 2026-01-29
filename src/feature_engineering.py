import pandas as pd
import numpy as np

def add_features(df):
    df['txn_hour'] = df['date'].dt.hour
    df['txn_day'] = df['date'].dt.dayofweek

    df['account_age_years'] = 2025 - pd.to_datetime(df['acct_open_date'], errors='coerce').dt.year
    df['account_age_days'] = (pd.to_datetime('2025-01-01') - pd.to_datetime(df['acct_open_date'], errors='coerce')).dt.days

    df['debt_to_income_ratio'] = df['total_debt'] / df['yearly_income']
    df['high_amount_flag'] = df['amount'] > (df['amount'].median() * 3)

    df['error_flag'] = df['errors'].notnull()

    df['merchant_mcc_risk'] = df['mcc'].isin(["4829", "6011", "6051", "6211"])

    df['unusual_location_flag'] = (df['merchant_state'] != df['address'].astype(str))

    # R1: High-risk jurisdiction (using merchant_state as proxy, or add country field if available)
    # High-risk jurisdictions: IR (Iran), KP (North Korea), SY (Syria), RU (Russia)
    # Note: This is a placeholder - actual implementation requires country codes
    # For now, we'll use a risk flag based on merchant_state if country data is not available
    high_risk_states = []  # Can be populated if state-level risk data is available
    df['high_risk_jurisdiction'] = False  # Placeholder - requires country field
    
    # R2: Structuring/smurfing - Count small transactions within 24h
    df = df.sort_values(['client_id', 'date'])
    df['amount_abs'] = df['amount'].abs()
    df['small_tx_flag'] = df['amount_abs'] < 10000
    
    # Count small transactions within 24 hours for each client
    df['txn_datetime'] = pd.to_datetime(df['date'])
    df['small_tx_24h_count'] = 0
    
    # Optimized: Use groupby and rolling window
    for client_id in df['client_id'].unique():
        client_mask = df['client_id'] == client_id
        client_indices = df[client_mask].index
        
        if len(client_indices) == 0:
            continue
            
        client_df = df.loc[client_indices].copy()
        client_df = client_df.sort_values('txn_datetime')
        
        # Use vectorized operations with rolling window
        for i, (idx, row) in enumerate(client_df.iterrows()):
            # Find transactions within 24 hours before current transaction
            time_window = client_df[
                (client_df['txn_datetime'] >= row['txn_datetime'] - pd.Timedelta(hours=24)) &
                (client_df['txn_datetime'] < row['txn_datetime']) &
                (client_df['small_tx_flag'] == True)
            ]
            df.loc[idx, 'small_tx_24h_count'] = len(time_window)
    
    df['structuring_flag'] = (df['small_tx_24h_count'] >= 3) & (df['small_tx_flag'] == True)
    
    # R3: Rapid movement of funds - New account with high amount
    # Using account_age_days (if receiver is same as sender, use account_age_days)
    # Note: Actual implementation requires receiver account info
    df['rapid_funds_movement'] = (df['account_age_days'] < 30) & (df['amount_abs'] > 5000)
    
    # R4: Mismatch between source and destination types
    # Note: Requires account type information (personal vs corporate) - placeholder
    df['account_type_mismatch'] = False  # Placeholder - requires account type field
    
    # R5: Repeated counterparties - Count transactions to same merchant in 3 days
    df['repeated_counterparty_count'] = 0
    
    for client_id in df['client_id'].unique():
        client_mask = df['client_id'] == client_id
        client_indices = df[client_mask].index
        
        if len(client_indices) == 0:
            continue
            
        client_df = df.loc[client_indices].copy()
        client_df = client_df.sort_values('txn_datetime')
        
        for i, (idx, row) in enumerate(client_df.iterrows()):
            # Find transactions to same merchant within 3 days before current transaction
            time_window = client_df[
                (client_df['txn_datetime'] >= row['txn_datetime'] - pd.Timedelta(days=3)) &
                (client_df['txn_datetime'] < row['txn_datetime']) &
                (client_df['merchant_id'] == row['merchant_id'])
            ]
            df.loc[idx, 'repeated_counterparty_count'] = len(time_window)
    
    df['repeated_counterparty_flag'] = df['repeated_counterparty_count'] > 5
    
    # R6: Use of high-risk channels
    # Note: Requires channel field (crypto, offshore, etc.) - placeholder
    df['high_risk_channel'] = False  # Placeholder - requires channel field
    
    # R7: Unusually high volume for customer
    # Calculate mean amount per user
    user_mean_amount = df.groupby('client_id')['amount_abs'].mean()
    df['user_mean_amount'] = df['client_id'].map(user_mean_amount)
    df['unusual_high_volume'] = df['amount_abs'] > (df['user_mean_amount'] * 5)
    
    # R8: Beneficiary in sanction list
    # Note: Requires beneficiary_risk_score field - placeholder
    df['beneficiary_sanctioned'] = False  # Placeholder - requires beneficiary_risk_score field
    
    # R9: Dormant - sudden activity
    # Count previous transactions for each client
    df['previous_tx_count'] = 0
    
    for client_id in df['client_id'].unique():
        client_mask = df['client_id'] == client_id
        client_indices = df[client_mask].index
        
        if len(client_indices) == 0:
            continue
            
        client_df = df.loc[client_indices].copy()
        client_df = client_df.sort_values('txn_datetime')
        
        # Use cumcount for efficient counting
        client_df['txn_order'] = range(len(client_df))
        df.loc[client_indices, 'previous_tx_count'] = client_df['txn_order'].values
    
    df['dormant_sudden_activity'] = (df['account_age_days'] > 300) & (df['previous_tx_count'] == 0)

    df.to_csv("data/processed/enriched.csv", index=False)
    return df

