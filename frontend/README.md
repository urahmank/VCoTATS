# VCoTATS Frontend

Next.js frontend for the Verifiable Chain-of-Thought Arbitrer for Transaction Screening (VCoTATS) system.

## Project Structure

```
frontend/
├── app/                          # Next.js app directory
│   ├── page.tsx                 # Dashboard page
│   ├── layout.tsx               # Root layout
│   ├── globals.css              # Global styles
│   ├── transactions/            # Transaction list page
│   │   ├── page.tsx
│   │   └── layout.tsx
│   └── transaction/             # Transaction detail pages
│       └── [runId]/
│           └── [txnId]/
│               └── page.tsx
│
├── components/                   # React components
│   ├── ui/                      # shadcn/ui components
│   │   ├── badge.tsx
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   └── table.tsx
│   └── json-viewer.tsx          # JSON display component
│
├── lib/                         # Utilities
│   ├── api.ts                   # API client functions
│   └── utils.ts                 # Helper utilities
│
├── package.json                 # Dependencies
├── tsconfig.json                # TypeScript config
├── tailwind.config.js           # Tailwind CSS config
└── README.md                    # This file
```

## Features

- **Dashboard**: Overview of all screening runs with statistics
- **Transaction List**: Table view of all transactions with filtering
- **Transaction Detail**: Detailed view with LLM reasoning and verification status

## Setup

### Prerequisites

1. **Backend API Server**: The FastAPI backend must be running (see main README.md)
2. **Google Colab LLM Server**: The LLM server must be running on Google Colab (see main README.md)
3. **Node.js**: Version 18 or higher

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env.local` file (optional, defaults to `http://localhost:8000`):
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

3. Run the development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`

## Pages

### Dashboard (`/`)
- Run transaction screening pipeline
- View statistics: total transactions, flagged transactions, verified transactions
- List of recent runs with links to transaction details

### Transaction List (`/transactions?runId={runId}`)
- Table view of all transactions in a run
- Color-coded badges for flags and verification status
- Links to detailed transaction views

### Transaction Detail (`/transaction/{runId}/{txnId}`)
- Split view showing:
  - Left: Transaction attributes and triggered AML rules
  - Right: Verification status, confidence score, and LLM raw reasoning

## Tech Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Reusable UI components
- **Lucide React** - Icon library

## API Endpoints Used

The frontend communicates with the FastAPI backend at the URL specified in `NEXT_PUBLIC_API_URL`:

- `POST /api/run-pipeline` - Start a new screening run
- `GET /api/runs` - List all runs
- `GET /api/run/{id}/summary` - Get run summary statistics
- `GET /api/run/{id}` - Get transactions for a run
- `GET /api/run/{id}/transaction/{txn}` - Get a specific transaction

## Development

### Build for Production

```bash
npm run build
npm start
```

### Type Checking

```bash
npm run type-check
```

### Linting

```bash
npm run lint
```

## System Integration

This frontend is part of the VCoTATS system. For complete setup instructions including:
- Backend API server configuration
- Google Colab LLM server setup
- Environment variables

See the main [README.md](../README.md) in the project root.
