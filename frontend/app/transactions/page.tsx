'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getRun, type Transaction } from '@/lib/api'
import { Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function TransactionsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const runId = searchParams.get('runId')
  
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (runId) {
      loadTransactions()
    }
  }, [runId])

  const loadTransactions = async () => {
    if (!runId) return
    
    setLoading(true)
    setError(null)
    try {
      const data = await getRun(runId, 1000, 0, false)
      setTransactions(data.transactions)
    } catch (err) {
      setError('Failed to load transactions')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const getVerificationBadge = (verification: string, hasRules: boolean) => {
    if (!hasRules) {
      return <Badge variant="success">CLEAR</Badge>
    }
    if (verification === 'PASS') {
      return <Badge variant="success">PASS</Badge>
    }
    return <Badge variant="destructive">CONFLICT</Badge>
  }

  const getRulesBadge = (rules: string[]) => {
    if (rules.length === 0) {
      return <span className="text-gray-400 text-sm">None</span>
    }
    return (
      <div className="flex flex-wrap gap-1">
        {rules.map((rule) => (
          <Badge key={rule} variant="destructive" className="text-xs">
            {rule}
          </Badge>
        ))}
      </div>
    )
  }

  if (!runId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No run ID provided</p>
          <Link href="/">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Transaction List</h1>
          <p className="text-gray-600">Run ID: <span className="font-mono text-sm">{runId}</span></p>
        </div>
        <Link href="/">
          <Button variant="outline">Back to Dashboard</Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={loadTransactions} variant="outline">Retry</Button>
        </div>
      ) : (
        <div className="bg-white rounded-lg border shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Txn ID</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Rules Triggered</TableHead>
                <TableHead>LLM Verdict</TableHead>
                <TableHead>Verification</TableHead>
                <TableHead>View</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    No transactions found
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((txn) => (
                  <TableRow key={txn.transaction_id}>
                    <TableCell className="font-mono text-sm">{txn.transaction_id}</TableCell>
                    <TableCell className="font-medium">
                      ${txn.amount.toFixed(2)}
                    </TableCell>
                    <TableCell>{getRulesBadge(txn.rules)}</TableCell>
                    <TableCell>
                      {txn.rules.length > 0 ? (
                        <Badge variant="destructive">FLAG</Badge>
                      ) : (
                        <Badge variant="success">CLEAR</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {getVerificationBadge(txn.verification, txn.rules.length > 0)}
                    </TableCell>
                    <TableCell>
                      <Link href={`/transaction/${runId}/${txn.transaction_id}`}>
                        <Button variant="ghost" size="sm">View</Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

