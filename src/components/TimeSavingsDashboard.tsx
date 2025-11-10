import { useState, useEffect, useCallback } from 'react'
import { api } from '../services/api'

type Timeframe = 'daily' | 'weekly' | 'monthly' | 'semester' | 'all_time'

interface TimeSavingsData {
  total_hours_saved: number
  fte_equivalent: number
  cost_savings: number
  total_tasks: number
  task_breakdown: Record<string, number>
  agent_breakdown: Record<string, number>
  top_agent: string
  insights: string
}

export function TimeSavingsDashboard() {
  const [timeframe, setTimeframe] = useState<Timeframe>('monthly')
  const [data, setData] = useState<TimeSavingsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await api.getTimeSavingsAnalytics(timeframe, true)
      setData(response)
    } catch (err: any) {
      console.error('[TimeSavings] Error fetching analytics:', err)
      setError(err.message || 'Failed to load time savings analytics')
    } finally {
      setLoading(false)
    }
  }, [timeframe])

  // Initial fetch and when timeframe changes
  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  // Auto-refresh every 45 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchAnalytics()
    }, 45000) // 45 seconds

    return () => clearInterval(interval)
  }, [fetchAnalytics])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    }).format(value)
  }

  if (loading && !data) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 mt-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 mt-8">
        <div className="text-red-600">
          <h3 className="text-lg font-semibold mb-2">Error Loading Analytics</h3>
          <p>{error}</p>
        </div>
      </div>
    )
  }

  if (!data) return null

  // Prepare chart data
  const taskBreakdownEntries = Object.entries(data.task_breakdown || {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)

  const agentBreakdownEntries = Object.entries(data.agent_breakdown || {})
    .sort(([, a], [, b]) => b - a)

  const maxTaskValue = Math.max(...taskBreakdownEntries.map(([, value]) => value), 1)
  const maxAgentValue = Math.max(...agentBreakdownEntries.map(([, value]) => value), 1)

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-precepgo-card-title">Time Savings Analytics</h2>
        <select
          value={timeframe}
          onChange={(e) => setTimeframe(e.target.value as Timeframe)}
          className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="semester">Semester</option>
          <option value="all_time">All Time</option>
        </select>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="text-sm text-blue-600 font-medium mb-1">Total Hours Saved</div>
          <div className="text-2xl font-bold text-blue-900">{formatNumber(data.total_hours_saved)}</div>
        </div>
        
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <div className="text-sm text-green-600 font-medium mb-1">FTE Equivalent</div>
          <div className="text-2xl font-bold text-green-900">{formatNumber(data.fte_equivalent)}</div>
        </div>
        
        <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
          <div className="text-sm text-purple-600 font-medium mb-1">Cost Savings</div>
          <div className="text-2xl font-bold text-purple-900">{formatCurrency(data.cost_savings)}</div>
        </div>
        
        <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
          <div className="text-sm text-orange-600 font-medium mb-1">Total Tasks</div>
          <div className="text-2xl font-bold text-orange-900">{formatNumber(data.total_tasks)}</div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Task Breakdown Chart */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Task Breakdown</h3>
          <div className="space-y-2">
            {taskBreakdownEntries.length > 0 ? (
              taskBreakdownEntries.map(([task, count]) => (
                <div key={task} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700 truncate">{task}</span>
                      <span className="text-sm text-gray-600 ml-2">{count}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all"
                        style={{ width: `${(count / maxTaskValue) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm">No task data available</p>
            )}
          </div>
        </div>

        {/* Agent Breakdown Chart */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Agent Breakdown</h3>
          <div className="space-y-2">
            {agentBreakdownEntries.length > 0 ? (
              agentBreakdownEntries.map(([agent, hours]) => (
                <div key={agent} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700 truncate">
                        {agent.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        {data.top_agent === agent && (
                          <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">Top</span>
                        )}
                      </span>
                      <span className="text-sm text-gray-600 ml-2">{formatNumber(hours)} hrs</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full transition-all"
                        style={{ width: `${(hours / maxAgentValue) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm">No agent data available</p>
            )}
          </div>
        </div>
      </div>

      {/* AI Insights Section */}
      {data.insights && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-200">
          <div className="flex items-start gap-3">
            <div className="text-2xl">💡</div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">AI-Generated Insights</h3>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{data.insights}</p>
            </div>
          </div>
        </div>
      )}

      {/* Refresh indicator */}
      <div className="mt-4 text-xs text-gray-500 text-center">
        Auto-refreshing every 45 seconds • Last updated: {new Date().toLocaleTimeString()}
      </div>
    </div>
  )
}

