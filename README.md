# Verifiable Chain-of-Thought Arbitrer for Transaction Screening (VCoTATS)

## Project Purpose

This project implements a verifiable Chain-of-Thought (CoT) reasoning system for Anti-Money Laundering (AML) transaction screening. The system combines rule-based detection with Large Language Model (LLM) reasoning to identify suspicious transactions, while providing verifiable explanations for each decision.

## Project Structure

```
VCoTATS/
├── src/                          # Main Python source code
│   ├── api/                      # FastAPI backend
│   │   └── main.py              # API endpoints for frontend
│   ├── data_preprocessing.py    # Data loading and merging
│   ├── feature_engineering.py   # Feature generation
│   ├── rule_engine.py           # AML rule-based detection
│   ├── llm_reasoner.py          # LLM reasoning client (connects to Colab)
│   ├── verifier.py              # Reasoning verification
│   └── pipeline.py              # Full pipeline orchestration
│
├── llm_colab/                    # Google Colab LLM server
│   └── llm_reasoner_server.py   # LLM server to run on Google Colab
│
├── frontend/                     # Next.js frontend application
│   ├── app/                     # Next.js app directory
│   ├── components/              # React components
│   ├── lib/                     # Utilities and API client
│   └── README.md                # Frontend documentation
│
├── data/                         # Data directory
│   ├── raw/                     # Raw input data (CSV files)
│   └── processed/               # Processed data outputs
│
├── outputs/                      # Pipeline outputs
│   └── verified_chains/         # Verified reasoning chains
│
├── run_api.py                   # API server startup script
├── requirements.txt             # Python dependencies
└── README.md                    # This file
```

## Pipeline Steps

The system follows a multi-stage pipeline:

1. **Data Preprocessing** (`src/data_preprocessing.py`)
   - Loads raw transaction, card, and user data from CSV files
   - Merges datasets based on card and client relationships
   - Cleans date formats and converts numeric fields
   - Handles missing values and saves processed data

2. **Feature Engineering** (`src/feature_engineering.py`)
   - Generates temporal features (transaction hour, day of week)
   - Calculates account age and financial ratios (debt-to-income)
   - Creates risk flags (high amount, error transactions, risky MCC codes)
   - Identifies unusual location patterns

3. **Rule Engine** (`src/rule_engine.py`)
   - Applies AML detection rules (high amounts, risky merchants, high debt ratios)
   - Flags transactions based on multiple risk indicators
   - Generates a list of triggered rules for each transaction

4. **LLM Reasoning** (`src/llm_reasoner.py`)
   - Connects to Google Colab LLM server via HTTP API
   - Sends flagged transactions for Chain-of-Thought reasoning
   - Receives step-by-step explanations for risk assessment
   - Returns structured reasoning chains with final verdicts

5. **Verification** (`src/verifier.py`)
   - Validates LLM reasoning against actual transaction data
   - Ensures consistency between reasoning steps and transaction attributes
   - Returns verification status (PASS/FAIL)

6. **Full Pipeline** (`src/pipeline.py`)
   - Orchestrates all stages sequentially
   - Processes all transactions through the complete workflow
   - Generates comprehensive results with rules, reasoning, and verification

## Setup

### 1. Install Python Dependencies

```bash
pip install -r requirements.txt
```

### 2. Setup Google Colab LLM Server

The LLM reasoning service runs on Google Colab to leverage GPU resources. Follow these steps:

1. **Open Google Colab**: Go to [Google Colab](https://colab.research.google.com/)

2. **Upload the LLM Server File**:
   - Upload `llm_colab/llm_reasoner_server.py` to your Colab notebook
   - Or copy the contents into a new Colab cell

3. **Run the Server**:
   - Execute the cell in Colab
   - The server will:
     - Install required packages (transformers, fastapi, uvicorn, pyngrok)
     - Load the Phi-3-mini-4k-instruct model
     - Start a FastAPI server on port 8000
     - Create an ngrok tunnel for public access
     - Display the public URL (e.g., `https://xxxxx.ngrok-free.app`)

4. **Configure the Backend**:
   - Copy the ngrok public URL from Colab
   - Set it as an environment variable:
     ```bash
     # Windows PowerShell
     $env:COLAB_LLM_URL="https://xxxxx.ngrok-free.app/reason"
     
     # Linux/Mac
     export COLAB_LLM_URL="https://xxxxx.ngrok-free.app/reason"
     ```
   - Or update `src/llm_reasoner.py` directly with the URL

**Note**: The ngrok URL changes each time you restart the Colab notebook. You'll need to update the `COLAB_LLM_URL` environment variable accordingly.

### 3. Run the Pipeline

Run the complete pipeline:

```bash
python src/pipeline.py
```

## Output

Results are saved in:
- `data/processed/merged.csv` - Preprocessed and merged data
- `data/processed/enriched.csv` - Feature-engineered dataset
- `data/processed/flagged.csv` - Transactions with rule flags
- `outputs/verified_chains/` - Verified reasoning outputs (JSON files)

## Frontend (Next.js)

A lightweight Next.js frontend is available in the `frontend/` directory for visualizing and managing transaction screening runs.

### Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file (optional, defaults to `http://localhost:8000`):
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

4. Start the development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`

### Features

- **Dashboard**: Run screening pipeline and view statistics
- **Transaction List**: Browse all transactions with filtering
- **Transaction Detail**: View detailed LLM reasoning and verification status

See `frontend/README.md` for more details.

## API Backend

The FastAPI backend provides REST endpoints for the frontend and orchestrates the pipeline.

### Start the Backend Server

Before using the frontend, start the FastAPI backend server:

```bash
# Option 1: Use the run script (recommended)
python run_api.py

# Option 2: Run directly with uvicorn
python -m uvicorn src.api.main:app --host 0.0.0.0 --port 8000 --reload

# Option 3: Run the main.py file directly
python src/api/main.py
```

The backend will be available at `http://localhost:8000`

You can verify it's running by visiting `http://localhost:8000/docs` to see the API documentation.

## Complete System Workflow

1. **Start Google Colab LLM Server**: Run `llm_colab/llm_reasoner_server.py` in Google Colab and note the ngrok URL
2. **Configure LLM URL**: Set `COLAB_LLM_URL` environment variable with the ngrok URL
3. **Start Backend API**: Run `python run_api.py` to start the FastAPI server
4. **Start Frontend**: Navigate to `frontend/` and run `npm run dev`
5. **Access System**: Open `http://localhost:3000` in your browser to use the dashboard

## API Endpoints

- `POST /api/run-pipeline` - Start a new screening run
- `GET /api/runs` - List all runs
- `GET /api/run/{id}/summary` - Get run summary statistics
- `GET /api/run/{id}` - Get transactions for a run
- `GET /api/run/{id}/transaction/{txn}` - Get a specific transaction

## Dependencies

**Python**: See `requirements.txt` for all Python dependencies

**Node.js**: Required for the frontend (see `frontend/package.json`)