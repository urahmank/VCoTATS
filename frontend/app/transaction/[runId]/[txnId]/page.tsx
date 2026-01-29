'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { JsonViewer } from '@/components/json-viewer'
import { getTransaction, type Transaction } from '@/lib/api'
import { Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function TransactionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const runId = params.runId as string
  const txnId = parseInt(params.txnId as string)
  
  const [transaction, setTransaction] = useState<Transaction | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadTransaction()
  }, [runId, txnId])

  const loadTransaction = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getTransaction(runId, txnId)
      setTransaction(data)
    } catch (err) {
      setError('Failed to load transaction')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const getVerificationBadge = (verification: string, hasRules: boolean) => {
    if (!hasRules) {
      return <Badge variant="success" className="text-sm px-3 py-1">CLEAR</Badge>
    }
    if (verification === 'PASS') {
      return <Badge variant="success" className="text-sm px-3 py-1">PASS</Badge>
    }
    return <Badge variant="destructive" className="text-sm px-3 py-1">CONFLICT</Badge>
  }

  const getConfidenceScore = (verification: string, hasRules: boolean) => {
    if (!hasRules) return 100
    if (verification === 'PASS') return 85
    return 45
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    )
  }

  if (error || !transaction) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">{error || 'Transaction not found'}</p>
          <Link href={`/transactions?runId=${runId}`}>
            <Button variant="outline">Back to Transactions</Button>
          </Link>
        </div>
      </div>
    )
  }

  const hasRules = transaction.rules.length > 0
  const confidenceScore = getConfidenceScore(transaction.verification, hasRules)

  // Function to clean LLM output by removing the prompt prefix
  const cleanLLMOutput = (output: string | object): string => {
    let text = typeof output === 'string' ? output : JSON.stringify(output, null, 2)
    
    // Extract raw_output if it's an object with that property
    if (typeof output === 'object' && output !== null && 'raw_output' in output) {
      text = String(output.raw_output)
    }
    
    // Remove the prompt prefix pattern
    // Pattern: "You are an AML compliance analyst.\nExplain the reasoning clearly.\n Transaction data:\n{...}\n\nTriggered rules:\n[...]\n\nExplain why this transaction might be suspicious."
    // This regex matches the entire prompt section including the dictionary and list
    const promptPattern = /You are an AML compliance analyst\.\s*\n?\s*Explain the reasoning clearly\.\s*\n?\s*Transaction data:\s*\n?\s*\{[^}]*\}\s*\n?\s*\n?\s*Triggered rules:\s*\n?\s*\[[^\]]*\]\s*\n?\s*\n?\s*Explain why this transaction might be suspicious\.\s*\n?\s*/i
    
    text = text.replace(promptPattern, '')
    
    // Additional cleanup: remove any remaining prompt-like text at the start (line by line)
    const lines = text.split('\n')
    let startIndex = 0
    
    // Skip lines that match prompt patterns
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (
        /^You are an AML compliance analyst/i.test(line) ||
        /^Explain the reasoning clearly/i.test(line) ||
        /^Transaction data:/i.test(line) ||
        /^Triggered rules:/i.test(line) ||
        /^Explain why this transaction might be suspicious/i.test(line) ||
        /^\{'amount':/i.test(line) || // Transaction data dict start
        /^'amount':/i.test(line) || // Transaction data dict start (alternative)
        /^\['HIGH_/i.test(line) || // Triggered rules list start
        line === '' && i < 5 // Empty lines at the start
      ) {
        startIndex = i + 1
      } else {
        break
      }
    }
    
    text = lines.slice(startIndex).join('\n')
    
    // Clean up leading/trailing whitespace
    text = text.trim()
    
    return text || 'No reasoning available.'
  }

  const cleanedLLMOutput = cleanLLMOutput(transaction.llm_output)

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href={`/transactions?runId=${runId}`}>
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Transactions
          </Button>
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Transaction {transaction.transaction_id}
        </h1>
        <p className="text-gray-600">Run ID: <span className="font-mono text-sm">{runId}</span></p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Left Column */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Transaction Attributes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Basic Transaction Info */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Transaction ID</div>
                    <div className="font-mono text-sm font-medium">{transaction.transaction_id}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Amount</div>
                    <div className="font-medium">${transaction.amount.toFixed(2)}</div>
                  </div>
                  {transaction.date && (
                    <div>
                      <div className="text-sm text-gray-500 mb-1">Date</div>
                      <div className="text-sm">{new Date(transaction.date).toLocaleString()}</div>
                    </div>
                  )}
                  {transaction.txn_hour !== undefined && (
                    <div>
                      <div className="text-sm text-gray-500 mb-1">Transaction Hour</div>
                      <div className="text-sm">{transaction.txn_hour}:00</div>
                    </div>
                  )}
                  {transaction.client_id && (
                    <div>
                      <div className="text-sm text-gray-500 mb-1">Client ID</div>
                      <div className="font-mono text-sm">{transaction.client_id}</div>
                    </div>
                  )}
                  {transaction.card_id && (
                    <div>
                      <div className="text-sm text-gray-500 mb-1">Card ID</div>
                      <div className="font-mono text-sm">{transaction.card_id}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Merchant Information */}
              {(transaction.merchant_id || transaction.merchant_city || transaction.merchant_state || transaction.mcc) && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Merchant Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {transaction.merchant_id && (
                      <div>
                        <div className="text-sm text-gray-500 mb-1">Merchant ID</div>
                        <div className="font-mono text-sm">{transaction.merchant_id}</div>
                      </div>
                    )}
                    {transaction.merchant_city && (
                      <div>
                        <div className="text-sm text-gray-500 mb-1">Merchant City</div>
                        <div className="text-sm">{transaction.merchant_city}</div>
                      </div>
                    )}
                    {transaction.merchant_state && (
                      <div>
                        <div className="text-sm text-gray-500 mb-1">Merchant State</div>
                        <div className="text-sm">{transaction.merchant_state}</div>
                      </div>
                    )}
                    {transaction.mcc && (
                      <div>
                        <div className="text-sm text-gray-500 mb-1">MCC Code</div>
                        <div className="font-mono text-sm">{transaction.mcc}</div>
                      </div>
                    )}
                    {transaction.zip && (
                      <div>
                        <div className="text-sm text-gray-500 mb-1">ZIP Code</div>
                        <div className="text-sm">{transaction.zip}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Account & Financial Information */}
              {(transaction.account_age_years !== undefined || transaction.account_age_days !== undefined || 
                transaction.debt_to_income_ratio !== undefined || transaction.user_mean_amount !== undefined) && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Account & Financial Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {transaction.account_age_years !== undefined && (
                      <div>
                        <div className="text-sm text-gray-500 mb-1">Account Age (Years)</div>
                        <div className="text-sm">{transaction.account_age_years}</div>
                      </div>
                    )}
                    {transaction.account_age_days !== undefined && (
                      <div>
                        <div className="text-sm text-gray-500 mb-1">Account Age (Days)</div>
                        <div className="text-sm">{transaction.account_age_days}</div>
                      </div>
                    )}
                    {transaction.debt_to_income_ratio !== undefined && (
                      <div>
                        <div className="text-sm text-gray-500 mb-1">Debt-to-Income Ratio</div>
                        <div className="text-sm">{transaction.debt_to_income_ratio.toFixed(2)}</div>
                      </div>
                    )}
                    {transaction.user_mean_amount !== undefined && (
                      <div>
                        <div className="text-sm text-gray-500 mb-1">User Mean Amount</div>
                        <div className="text-sm">${transaction.user_mean_amount.toFixed(2)}</div>
                      </div>
                    )}
                    {transaction.previous_tx_count !== undefined && (
                      <div>
                        <div className="text-sm text-gray-500 mb-1">Previous Transactions</div>
                        <div className="text-sm">{transaction.previous_tx_count}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Risk Flags */}
              {(transaction.high_amount_flag !== undefined || transaction.error_flag !== undefined || 
                transaction.merchant_mcc_risk !== undefined || transaction.unusual_location_flag !== undefined ||
                transaction.structuring_flag !== undefined || transaction.rapid_funds_movement !== undefined ||
                transaction.repeated_counterparty_flag !== undefined || transaction.unusual_high_volume !== undefined ||
                transaction.dormant_sudden_activity !== undefined) && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Risk Flags</h3>
                  <div className="flex flex-wrap gap-2">
                    {transaction.high_amount_flag && (
                      <Badge variant="outline" className="text-xs">High Amount</Badge>
                    )}
                    {transaction.error_flag && (
                      <Badge variant="outline" className="text-xs">Error Transaction</Badge>
                    )}
                    {transaction.merchant_mcc_risk && (
                      <Badge variant="outline" className="text-xs">High Risk MCC</Badge>
                    )}
                    {transaction.unusual_location_flag && (
                      <Badge variant="outline" className="text-xs">Unusual Location</Badge>
                    )}
                    {transaction.structuring_flag && (
                      <Badge variant="outline" className="text-xs">Structuring</Badge>
                    )}
                    {transaction.rapid_funds_movement && (
                      <Badge variant="outline" className="text-xs">Rapid Funds Movement</Badge>
                    )}
                    {transaction.repeated_counterparty_flag && (
                      <Badge variant="outline" className="text-xs">Repeated Counterparty</Badge>
                    )}
                    {transaction.unusual_high_volume && (
                      <Badge variant="outline" className="text-xs">Unusual High Volume</Badge>
                    )}
                    {transaction.dormant_sudden_activity && (
                      <Badge variant="outline" className="text-xs">Dormant Sudden Activity</Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Transaction Statistics */}
              {(transaction.small_tx_24h_count !== undefined || transaction.repeated_counterparty_count !== undefined ||
                transaction.amount_abs !== undefined || transaction.small_tx_flag !== undefined) && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Transaction Statistics</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {transaction.small_tx_24h_count !== undefined && (
                      <div>
                        <div className="text-sm text-gray-500 mb-1">Small TX (24h Count)</div>
                        <div className="text-sm">{transaction.small_tx_24h_count}</div>
                      </div>
                    )}
                    {transaction.repeated_counterparty_count !== undefined && (
                      <div>
                        <div className="text-sm text-gray-500 mb-1">Repeated Counterparty Count</div>
                        <div className="text-sm">{transaction.repeated_counterparty_count}</div>
                      </div>
                    )}
                    {transaction.amount_abs !== undefined && (
                      <div>
                        <div className="text-sm text-gray-500 mb-1">Absolute Amount</div>
                        <div className="text-sm">${transaction.amount_abs.toFixed(2)}</div>
                      </div>
                    )}
                    {transaction.small_tx_flag !== undefined && (
                      <div>
                        <div className="text-sm text-gray-500 mb-1">Small Transaction</div>
                        <div className="text-sm">{transaction.small_tx_flag ? 'Yes' : 'No'}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Additional Fields */}
              {(transaction.use_chip !== undefined || transaction.errors) && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Additional Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {transaction.use_chip !== undefined && (
                      <div>
                        <div className="text-sm text-gray-500 mb-1">Use Chip</div>
                        <div className="text-sm">{transaction.use_chip ? 'Yes' : 'No'}</div>
                      </div>
                    )}
                    {transaction.errors && (
                      <div>
                        <div className="text-sm text-gray-500 mb-1">Errors</div>
                        <div className="text-sm text-red-600">{transaction.errors}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Triggered AML Rules</CardTitle>
            </CardHeader>
            <CardContent>
              {hasRules ? (
                <div className="flex flex-wrap gap-2">
                  {transaction.rules.map((rule) => (
                    <Badge key={rule} variant="destructive">
                      {rule}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No rules triggered</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Verification Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm text-gray-500 mb-2">Status</div>
                {getVerificationBadge(transaction.verification, hasRules)}
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-2">Confidence Score</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        confidenceScore >= 80
                          ? 'bg-green-500'
                          : confidenceScore >= 50
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${confidenceScore}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium">{confidenceScore}%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Full Width LLM Reasoning Card */}
      <Card>
        <CardHeader>
          <CardTitle>LLM Raw Reasoning</CardTitle>
        </CardHeader>
        <CardContent>
          <JsonViewer data={cleanedLLMOutput} />
        </CardContent>
      </Card>
    </div>
  )
}

