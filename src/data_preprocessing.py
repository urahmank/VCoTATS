import pandas as pd

def load_raw_data():
    transactions = pd.read_csv("data/raw/transaction_data_small.csv")

    cards = (
        pd.read_csv("data/raw/cards_data.csv")
        .rename(columns={"id": "card_id_ref"})
    )

    users = (
        pd.read_csv("data/raw/users_data.csv")
        .rename(columns={"id": "user_id_ref"})
    )

    return transactions, cards, users

def merge_data(transactions, cards, users):
    # Drop client_id from cards to avoid column conflict
    cards_clean = cards.drop(columns=['client_id'], errors='ignore')
    
    df = transactions.merge(
        cards_clean,
        left_on="card_id",
        right_on="card_id_ref",
        how="left"
    )

    df = df.merge(
        users,
        left_on="client_id",
        right_on="user_id_ref",
        how="left"
    )

    return df

def clean_data(df):
    df['date'] = pd.to_datetime(df['date'], errors='coerce')

    # Remove dollar signs and convert to numeric
    df['amount'] = df['amount'].astype(str).str.replace('$', '', regex=False)
    df['amount'] = pd.to_numeric(df['amount'], errors='coerce')

    # Convert other numeric fields that may have dollar signs
    numeric_fields = ["credit_limit", "per_capita_income", "yearly_income", "total_debt"]
    for col in numeric_fields:
        if col in df.columns:
            df[col] = df[col].astype(str).str.replace('$', '', regex=False)
            df[col] = pd.to_numeric(df[col], errors='coerce')

    df = df[df['amount'].notnull()]

    return df

def preprocess():
    t, c, u = load_raw_data()

    print("Transactions:", len(t))
    print("Cards:", len(c))
    print("Users:", len(u))

    df = merge_data(t, c, u)
    print("After merge:", len(df))

    df = clean_data(df)
    print("After clean:", len(df))

    df.to_csv("data/processed/merged.csv", index=False)
    return df

