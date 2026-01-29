'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { runPipeline, listRuns, getRunSummary, type RunSummary } from '@/lib/api'
import { format } from 'date-fns'
import { Loader2 } from 'lucide-react'

export default function Dashboard() {
  const [isRunning, setIsRunning] = useState(false)
  const [runs, setRuns] = useState<string[]>([])
  const [summaries, setSummaries] = useState<Record<string, RunSummary>>({})
  const [loading, setLoading] = useState(true)

  const loadRuns = async () => {
    try {
      setLoading(true)
      const runIds = await listRuns()
      setRuns(runIds)
      
      // Load summaries for all runs
      const summaryPromises = runIds.slice(0, 10).map(async (runFile) => {
        const runId = runFile.replace('.json', '')
        try {
          const summary = await getRunSummary(runId)
          return { runId, summary }
        } catch (error) {
          console.error(`Failed to load summary for ${runId}:`, error)
          return null
        }
      })
      
      const results = await Promise.all(summaryPromises)
      const summaryMap: Record<string, RunSummary> = {}
      results.forEach((result) => {
        if (result) {
          summaryMap[result.runId] = result.summary
        }
      })
      setSummaries(summaryMap)
    } catch (error) {
      console.error('Failed to load runs:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRuns()
  }, [])

  const handleRunPipeline = async () => {
    setIsRunning(true)
    try {
      await runPipeline()
      await loadRuns()
    } catch (error) {
      console.error('Failed to run pipeline:', error)
      alert('Failed to run pipeline. Please check the backend connection.')
    } finally {
      setIsRunning(false)
    }
  }

  const totalTransactions = Object.values(summaries).reduce(
    (sum, s) => sum + (s.total_transactions || 0),
    0
  )
  const totalFlagged = Object.values(summaries).reduce(
    (sum, s) => sum + (s.flagged_transactions || 0),
    0
  )
  const totalVerified = Object.values(summaries).reduce(
    (sum, s) => sum + (s.total_transactions || 0) - (s.flagged_transactions || 0),
    0
  )

  const getRunTimestamp = (runId: string) => {
    // Extract timestamp from run ID or use file modification time
    // For now, we'll use a simple approach
    return runId
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Transaction Screening Dashboard</h1>
        <p className="text-gray-600">Monitor and manage AML transaction screening runs</p>
      </div>

      <div className="mb-6">
        <Button
          onClick={handleRunPipeline}
          disabled={isRunning}
          size="lg"
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isRunning ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Running...
            </>
          ) : (
            'Run Transaction Screening'
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Total Transactions</CardTitle>
            <CardDescription>Across all runs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalTransactions.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Flagged Transactions</CardTitle>
            <CardDescription>Requiring review</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{totalFlagged.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Verified vs Conflicted</CardTitle>
            <CardDescription>Clear transactions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{totalVerified.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Runs</CardTitle>
          <CardDescription>Latest transaction screening runs</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : runs.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No runs yet. Click "Run Transaction Screening" to start.</p>
          ) : (
            <div className="space-y-2">
              {runs.slice(0, 10).map((runFile) => {
                const runId = runFile.replace('.json', '')
                const summary = summaries[runId]
                return (
                  <Link
                    key={runId}
                    href={`/transactions?runId=${runId}`}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <div className="flex-1">
                      <div className="font-mono text-sm text-gray-900">{runId}</div>
                      {summary && (
                        <div className="text-xs text-gray-500 mt-1">
                          {summary.total_transactions} transactions • {summary.flagged_transactions} flagged
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-gray-400">
                      {getRunTimestamp(runId)}
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

