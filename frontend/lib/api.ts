const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export interface RunPipelineResponse {
  run_id: string
  total_transactions: number
  flagged_transactions: number
}

export interface RunSummary {
  total_transactions: number
  flagged_transactions: number
  file_size_mb?: number
}

export interface Transaction {
  transaction_id: number
  amount: number
  rules: string[]
  llm_output: string
  verification: 'PASS' | 'FAIL' | 'WEAK_REASONING' | 'SKIPPED'
  // Transaction attributes
  date?: string
  client_id?: number
  card_id?: number
  merchant_id?: number
  merchant_city?: string
  merchant_state?: string
  zip?: string
  mcc?: string
  use_chip?: boolean | string
  errors?: string | null
  txn_hour?: number
  txn_day?: number
  account_age_years?: number
  account_age_days?: number
  debt_to_income_ratio?: number
  high_amount_flag?: boolean
  error_flag?: boolean
  merchant_mcc_risk?: boolean
  unusual_location_flag?: boolean
  structuring_flag?: boolean
  rapid_funds_movement?: boolean
  repeated_counterparty_flag?: boolean
  unusual_high_volume?: boolean
  dormant_sudden_activity?: boolean
  small_tx_24h_count?: number
  repeated_counterparty_count?: number
  previous_tx_count?: number
  user_mean_amount?: number
  amount_abs?: number
  small_tx_flag?: boolean
  [key: string]: any // Allow additional fields
}

export interface RunData {
  total: number
  returned: number
  offset: number
  limit: number
  transactions: Transaction[]
}

export async function runPipeline(): Promise<RunPipelineResponse> {
  const response = await fetch(`${API_BASE_URL}/api/run-pipeline`, {
    method: 'POST',
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || 'Failed to run pipeline')
  }
  return response.json()
}

export async function listRuns(): Promise<string[]> {
  const response = await fetch(`${API_BASE_URL}/api/runs`)
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || 'Failed to list runs')
  }
  return response.json()
}

export async function getRunSummary(runId: string): Promise<RunSummary> {
  const response = await fetch(`${API_BASE_URL}/api/run/${runId}/summary`)
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || 'Failed to get run summary')
  }
  return response.json()
}

export async function getRun(
  runId: string,
  limit: number = 100,
  offset: number = 0,
  flaggedOnly: boolean = false
): Promise<RunData> {
  const params = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
    flagged_only: flaggedOnly.toString(),
  })
  const response = await fetch(`${API_BASE_URL}/api/run/${runId}?${params}`)
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || 'Failed to get run')
  }
  return response.json()
}

export async function getTransaction(
  runId: string,
  txnId: number
): Promise<Transaction> {
  const response = await fetch(`${API_BASE_URL}/api/run/${runId}/transaction/${txnId}`)
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || 'Failed to get transaction')
  }
  return response.json()
}

