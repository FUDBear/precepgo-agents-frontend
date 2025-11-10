import { useState, useEffect, useRef } from 'react'
import { api } from './services/api'
import { FirestoreService, type FirestoreDocument } from './services/firestore'
import { exportCOAReportsToExcel, exportSiteReportsToExcel } from './utils/exportExcel'
import Rive from '@rive-app/react-canvas'
import agentsData from './data/agents.json'
import { ScenarioCard } from './components/ScenarioCard'
import { ScenarioCardSkeleton } from './components/ScenarioCardSkeleton'
import { TimeSavingsDashboard } from './components/TimeSavingsDashboard'

type AgentStatus = {
  agent: string
  state: 'idle' | 'active'
  result?: any
  error?: string | null
}

type AgentData = {
  name: string
  apiName: string
  description: string
  icon: string
  color: string
  iconColor: string
  action: string
  detailedDescription: string
  realWorldProblem: string
}

type Agent = Omit<AgentData, 'action'> & {
  action: () => Promise<any>
}

function App() {
  const [loading, setLoading] = useState<string | null>(null)
  const [agentStatuses, setAgentStatuses] = useState<Record<string, AgentStatus>>({})
  const [automatedMode, setAutomatedMode] = useState(false)
  const [corsError, setCorsError] = useState(false)
  const [unsafeEvaluationsCount, setUnsafeEvaluationsCount] = useState<number>(0)
  const [evaluationsCount, setEvaluationsCount] = useState<number>(0)
  const [coaReportsForDownload, setCoaReportsForDownload] = useState<FirestoreDocument[]>([])
  const [siteReportsForDownload, setSiteReportsForDownload] = useState<FirestoreDocument[]>([])
  const [latestSiteReport, setLatestSiteReport] = useState<FirestoreDocument | null>(null)
  const [scenarios, setScenarios] = useState<FirestoreDocument[]>([])
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null)
  const [loadingScenario, setLoadingScenario] = useState<boolean>(false)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [openModal, setOpenModal] = useState<string | null>(null)
  const [openTimeSavingsModal, setOpenTimeSavingsModal] = useState<boolean>(false)
  const [openLogsModal, setOpenLogsModal] = useState<string | null>(null) // Agent name whose logs to show
  const [allStatesData, setAllStatesData] = useState<Record<string, any> | null>(null) // Full all_states document data
  const [timeAgentState, setTimeAgentState] = useState<Record<string, any> | null>(null)
  const [timeAgentHoursSaved, setTimeAgentHoursSaved] = useState<number | null>(null)
  const [timeAgentLastUpdated, setTimeAgentLastUpdated] = useState<Date | null>(null)
  const [agentFirestoreStates, setAgentFirestoreStates] = useState<Record<string, Record<string, any> | null>>({})
  const [isInitialLoad, setIsInitialLoad] = useState<boolean>(true)
  const [togglingAutomatedMode, setTogglingAutomatedMode] = useState<boolean>(false)
  const dropdownRefs = useRef<Record<string, HTMLDivElement | null>>({})

  // Mark initial load as complete after a short delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialLoad(false)
    }, 2000) // Wait 2 seconds after page load before allowing error alerts
    
    return () => clearTimeout(timer)
  }, [])

  // Global error handler to catch unhandled promise rejections
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      // Silently handle errors during initial load
      if (isInitialLoad) {
        console.error('[App] Unhandled promise rejection during initial load (suppressed):', event.reason)
        event.preventDefault() // Prevent default browser error handling
        return
      }
      // For other errors, log but don't show alert (let React handle it)
      console.error('[App] Unhandled promise rejection:', event.reason)
    }

    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [isInitialLoad])

  // Map action strings to API functions
  const actionMap: Record<string, () => Promise<any>> = {
    runSafetyCheck: api.runSafetyCheck,
    generateScenario: api.generateScenario,
    createDemoEvaluation: api.createDemoEvaluation,
    generateCOAReports: api.generateCOAReports,
    generateSiteReport: api.generateSiteReport
  }

  // Transform JSON data to include action functions
  const agents: Agent[] = agentsData.map((agentData: AgentData) => ({
    ...agentData,
    action: actionMap[agentData.action] || (() => Promise.reject(new Error(`Unknown action: ${agentData.action}`)))
  }))

  // Map icon colors to card background colors (lighter, solid versions)
  const getCardBackground = (iconColor: string, isActive: boolean): string => {
    if (!isActive) return 'bg-white'
    
    const colorMap: Record<string, string> = {
      'bg-red-500/20': 'bg-red-50',
      'bg-blue-500/20': 'bg-blue-50',
      'bg-green-500/20': 'bg-green-50',
      'bg-purple-500/20': 'bg-purple-50',
      'bg-yellow-500/20': 'bg-yellow-50',
      'bg-teal-500/20': 'bg-teal-50'
    }
    return colorMap[iconColor] || 'bg-white'
  }

  // Get last run time for an agent from all_states document
  const getAgentLastRunTime = (agentApiName: string): Date | null => {
    if (!allStatesData) return null
    
    // Map agent API names to last_activity field names
    const lastActivityFieldMap: Record<string, string> = {
      'coa_agent': 'coa_agent_last_activity',
      'evaluation_agent': 'evaluation_agent_last_activity',
      'notification_agent': 'notification_agent_last_activity',
      'scenario_agent': 'scenario_agent_last_activity',
      'site_agent': 'site_agent_last_activity',
      'time_savings_agent': 'time_agent_last_activity'
    }
    
    const fieldName = lastActivityFieldMap[agentApiName]
    if (!fieldName) return null
    
    const lastActivity = allStatesData[fieldName]
    if (!lastActivity) return null
    
    // Handle Firestore Timestamp objects
    if (lastActivity?.toDate) {
      return lastActivity.toDate()
    }
    
    // Handle Date objects or strings
    if (lastActivity instanceof Date) {
      return lastActivity
    }
    
    if (typeof lastActivity === 'string' || typeof lastActivity === 'number') {
      return new Date(lastActivity)
    }
    
    return null
  }

  // Get logs for an agent from all_states document
  // All agent logs, including time_agent_logs, are stored in the all_states document
  const getAgentLogs = (agentApiName: string): string[] => {
    // Map agent API names to log field names
    const logFieldMap: Record<string, string> = {
      'coa_agent': 'coa_agent_logs',
      'evaluation_agent': 'evaluation_agent_logs',
      'notification_agent': 'notification_agent_logs',
      'scenario_agent': 'scenario_agent_logs',
      'site_agent': 'site_agent_logs',
      'time_savings_agent': 'time_agent_logs' // This is in all_states, not time_agent_state
    }
    
    const logFieldName = logFieldMap[agentApiName]
    if (!logFieldName) {
      console.log(`[App] ⚠️ No log field mapping for agent: ${agentApiName}`)
      return []
    }
    
    // All logs are in the all_states document
    if (!allStatesData) {
      console.log(`[App] ⚠️ allStatesData is null for agent: ${agentApiName}`)
      return []
    }
    
    console.log(`[App] 🔍 Getting logs for ${agentApiName}:`)
    console.log(`[App] 🔍 Looking for field: ${logFieldName}`)
    console.log(`[App] 🔍 allStatesData keys:`, Object.keys(allStatesData))
    
    const logs = allStatesData[logFieldName]
    if (!logs) {
      console.log(`[App] ⚠️ Field ${logFieldName} not found in allStatesData`)
      return []
    }
    
    if (!Array.isArray(logs)) {
      console.log(`[App] ⚠️ Field ${logFieldName} exists but is not an array:`, typeof logs)
      return []
    }
    
    console.log(`[App] ✅ Found ${logs.length} log entries for ${agentApiName}`)
    return logs
  }

  // Listen to notifications to count unsafe evaluations from last week

  // Listen to notifications to count unsafe evaluations from last week
  useEffect(() => {
    // Calculate date 7 days ago
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const unsubscribeNotifications = FirestoreService.listenToNotificationsSince(
      oneWeekAgo,
      (documents) => {
        // Documents are already filtered server-side, just count them
        console.log(`[App] 🛡️ Found ${documents.length} unsafe evaluations in the last week`);
        setUnsafeEvaluationsCount(documents.length);
      },
      (error) => {
        console.error('[App] ❌ Error listening to notifications for count:', error);
        setUnsafeEvaluationsCount(0);
      }
    );

    return () => {
      unsubscribeNotifications();
    };
  }, []);

  // Listen to scenarios for display and selection (real-time, latest 10)
  useEffect(() => {
    const unsubscribeScenarios = FirestoreService.listenToScenarios(
      (documents) => {
        console.log(`[App] 🎬 Scenarios updated: ${documents.length} scenarios (latest 10)`)
        // Documents are already sorted by created_at desc and limited to 10 by the listener
        setScenarios(documents)

        // If no scenario is selected, select the first one (newest)
        setSelectedScenarioId(prev => {
          if (prev === null && documents.length > 0) {
            return documents[0].id
          }
          return prev
        })
      },
      (error) => {
        console.error('[App] ❌ Error listening to scenarios:', error)
        setScenarios([])
        setSelectedScenarioId(null)
      },
      10 // Get latest 10 scenarios
    )

    return () => {
      unsubscribeScenarios()
    }
  }, []) // Empty dependency array - listener stays active for real-time updates

  // Listen to evaluations to count evaluations from last week
  useEffect(() => {
    // Calculate date 7 days ago
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const unsubscribeEvaluations = FirestoreService.listenToEvaluationsSince(
      oneWeekAgo,
      (documents) => {
        // Documents are already filtered server-side, just count them
        console.log(`[App] 📊 Found ${documents.length} evaluations in the last week`);
        setEvaluationsCount(documents.length);
      },
      (error) => {
        console.error('[App] ❌ Error listening to evaluations for count:', error);
        setEvaluationsCount(0);
      }
    );

    return () => {
      unsubscribeEvaluations();
    };
  }, []);

  // Debug: Log when agentFirestoreStates actually changes (React re-render)
  useEffect(() => {
    console.log('[App] 🎨 React re-rendered! agentFirestoreStates changed:', agentFirestoreStates)
    console.log('[App] 🎨 Current evaluation_agent state:', agentFirestoreStates['evaluation_agent'])
  }, [agentFirestoreStates])

  // Track previous states to detect completion and show alerts
  const prevAgentStatesRef = useRef<Record<string, Record<string, any> | null>>({})
  
  useEffect(() => {
    agents.forEach(agent => {
      if (agent.apiName === 'time_savings_agent') return
      
      const currentState = agentFirestoreStates[agent.apiName]
      const prevState = prevAgentStatesRef.current[agent.apiName]
      
      if (currentState && prevState) {
        const currentStateValue = currentState?.state || currentState?.status || currentState?.agent_state
        const prevStateValue = prevState?.state || prevState?.status || prevState?.agent_state
        
        const currentNormalized = typeof currentStateValue === 'string' ? currentStateValue.toLowerCase() : null
        const prevNormalized = typeof prevStateValue === 'string' ? prevStateValue.toLowerCase() : null
        
        // Detect transition from active/generating/processing to idle/completed
        const wasActive = prevNormalized === 'active' || prevNormalized === 'generating' || prevNormalized === 'processing'
        const isNowIdle = currentNormalized === 'idle' || currentNormalized === 'completed'
        
        if (wasActive && isNowIdle && !isInitialLoad) {
          alert(`✅ ${agent.name} completed successfully!`)
        }
      }
      
      // Update ref for next comparison
      prevAgentStatesRef.current[agent.apiName] = currentState
    })
  }, [agentFirestoreStates, isInitialLoad])

  // Listen to all agent states from single Firestore document
  useEffect(() => {
    console.log('[App] 🔄 Setting up all_states listener...', new Date().toISOString())
    console.log('[App] 🔄 Agents array length:', agents.length)
    console.log('[App] 🌐 This listener WILL sync across ALL browser tabs/windows automatically')
    
    const unsubscribeAllStates = FirestoreService.listenToAgentState(
      'all_states', // Listen to the single document containing all agent states
      (data) => {
        const timestamp = new Date().toISOString()
        console.log(`%c[App] 🔔 LISTENER FIRED - Document changed! ${timestamp}`, 'background: #00ff00; color: #000; font-size: 16px; font-weight: bold;')
        console.log(`[App] 🌐 This update is being received by ALL open tabs/windows`)
        if (data) {
          console.log('[App] 📊 All agent states updated:', data)
          console.log('[App] 📊 Full data object keys:', Object.keys(data))
          
          // Store the full all_states data (including logs) for use in logs modal
          setAllStatesData(data)
          
          // Update automated_mode state from all_states document
          // The field is named "automated_mode" and contains "ON" or "OFF"
          if (data.automated_mode !== undefined) {
            const isAutomatedModeOn = data.automated_mode === 'ON' || data.automated_mode === true
            console.log(`[App] 🤖 Automated mode state from Firestore: ${data.automated_mode} (isOn: ${isAutomatedModeOn})`)
            setAutomatedMode(isAutomatedModeOn)
          }
          
          // Extract individual agent states from the all_states document
          // The document has fields like: notification_agent_state, scenario_agent_state, etc.
          const states: Record<string, Record<string, any> | null> = {}
          
          agents.forEach(agent => {
            // Skip time_savings_agent as it has its own dedicated listener
            if (agent.apiName === 'time_savings_agent') {
              return
            }
            
            // Try different field name patterns based on the actual Firestore structure
            // Fields are named like: notification_agent_state, scenario_agent_state, evaluation_agent_state, etc.
            const stateField = `${agent.apiName}_state`
            const stateValue = data[stateField]
            
            console.log(`[App] 🔍 Checking ${agent.apiName}: field="${stateField}", value=`, stateValue)
            
            if (stateValue !== undefined && stateValue !== null) {
              // Create a state object from the field value
              states[agent.apiName] = {
                state: stateValue,
                // Also include last_activity if available
                last_activity: data[`${agent.apiName}_last_activity`] || null
              }
              console.log(`[App] ✅ Set ${agent.apiName} state to:`, states[agent.apiName])
            } else {
              states[agent.apiName] = null
              console.log(`[App] ⚠️ ${agent.apiName} state field not found or null`)
            }
          })
          
          console.log('[App] 🎯 Final states object BEFORE setState:', states)
          console.log('[App] 🎯 Current agentFirestoreStates (from closure - may be stale):', agentFirestoreStates)
          
          setAgentFirestoreStates(prevStates => {
            console.log('[App] 🎯 setState callback - prevStates:', prevStates)
            console.log('[App] 🎯 setState callback - new states:', states)
            console.log('[App] 🔄 React will re-render with new state')
            return states
          })
          
          // Log after a brief delay to see if React re-rendered
          setTimeout(() => {
            console.log('[App] 🎯 State update queued - React should re-render soon')
          }, 0)
        } else {
          console.log('[App] ⚠️ All agent states document does not exist')
          // Set all states to null if document doesn't exist
          const states: Record<string, Record<string, any> | null> = {}
          agents.forEach(agent => {
            if (agent.apiName !== 'time_savings_agent') {
              states[agent.apiName] = null
            }
          })
          setAgentFirestoreStates(states)
          // Reset automated mode if document doesn't exist
          setAutomatedMode(false)
        }
      },
      (error) => {
        console.error('[App] ❌ Error listening to all agent states:', error)
        // Set all states to null on error
        const states: Record<string, Record<string, any> | null> = {}
        agents.forEach(agent => {
          if (agent.apiName !== 'time_savings_agent') {
            states[agent.apiName] = null
          }
        })
        setAgentFirestoreStates(states)
      }
    )

    return () => {
      console.log('[App] 🛑 Cleaning up all_states listener')
      unsubscribeAllStates()
    }
  }, []) // Empty deps - agents is now memoized and stable

  // Listen to time agent state and fetch analytics
  useEffect(() => {
    // Listen to time_agent_state document
    const unsubscribeTimeAgentState = FirestoreService.listenToAgentState(
      'time_agent_state',
      (data) => {
        if (data) {
          console.log('[App] ⏱️ Time agent state updated:', data)
          setTimeAgentState(data)
          
          // Extract last_updated timestamp
          if (data.last_updated) {
            const lastUpdated = data.last_updated?.toDate?.() || data.last_updated
            setTimeAgentLastUpdated(lastUpdated ? new Date(lastUpdated) : null)
          }
        } else {
          setTimeAgentState(null)
          setTimeAgentLastUpdated(null)
        }
      },
      (error) => {
        console.error('[App] ❌ Error listening to time agent state:', error)
        setTimeAgentState(null)
        setTimeAgentLastUpdated(null)
      }
    )

    // Fetch analytics to get total_hours_saved
    const fetchTimeSavings = async () => {
      try {
        const analytics = await api.getTimeSavingsAnalytics('monthly', true)
        // Handle nested analytics structure (analytics.monthly.total_hours_saved) or flat structure
        let hoursSaved = null
        if (analytics) {
          if (analytics.monthly?.total_hours_saved !== undefined) {
            hoursSaved = analytics.monthly.total_hours_saved
          } else if (analytics.total_hours_saved !== undefined) {
            hoursSaved = analytics.total_hours_saved
          }
        }
        if (hoursSaved !== null) {
          setTimeAgentHoursSaved(hoursSaved)
        }
      } catch (error) {
        console.error('[App] ❌ Error fetching time savings analytics:', error)
      }
    }

    fetchTimeSavings()
    // Refresh analytics every 30 seconds
    const analyticsInterval = setInterval(fetchTimeSavings, 30000)

    return () => {
      unsubscribeTimeAgentState()
      clearInterval(analyticsInterval)
    }
  }, []);

  // Listen to COA reports for download button (always active)
  useEffect(() => {
    const unsubscribeCOAReports = FirestoreService.listenToCOAReports(
      (documents) => {
        console.log(`[App] 🗺️ COA reports for download: ${documents.length}`)
        setCoaReportsForDownload(documents)
      },
      (error) => {
        console.error('[App] ❌ Error listening to COA reports for download:', error)
        setCoaReportsForDownload([])
      },
      20 // Get latest 20 reports
    )

    return () => {
      unsubscribeCOAReports()
    }
  }, [])

  // Listen to site reports for download button (always active)
  useEffect(() => {
    const unsubscribeSiteReports = FirestoreService.listenToSiteReports(
      (documents: FirestoreDocument[]) => {
        console.log(`[App] 🏥 Site reports for download: ${documents.length}`)
        setSiteReportsForDownload(documents)
        
        // Set the latest report for display
        if (documents.length > 0) {
          const sorted = [...documents].sort((a, b) => {
            const dateA = (a.data.created_at?.toDate ? a.data.created_at.toDate() : null) || 
                           (a.createdAt ? new Date(a.createdAt) : new Date(0));
            const dateB = (b.data.created_at?.toDate ? b.data.created_at.toDate() : null) || 
                           (b.createdAt ? new Date(b.createdAt) : new Date(0));
            return dateB.getTime() - dateA.getTime();
          });
          setLatestSiteReport(sorted[0]);
        } else {
          setLatestSiteReport(null);
        }
      },
      (error: Error) => {
        console.error('[App] ❌ Error listening to site reports for download:', error)
        setSiteReportsForDownload([])
        setLatestSiteReport(null)
      },
      20 // Get latest 20 reports
    )

    return () => {
      unsubscribeSiteReports()
    }
  }, [])


  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdown) {
        const ref = dropdownRefs.current[openDropdown]
        if (ref && !ref.contains(event.target as Node)) {
          setOpenDropdown(null)
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [openDropdown])

  // Close modal on Escape key press
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && openModal) {
        setOpenModal(null)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [openModal])

  // Fetch agent statuses and automated mode status
  useEffect(() => {
    const fetchStatuses = async () => {
      try {
        setCorsError(false)
        // Fetch automated mode status
        try {
          const autoStatus = await api.getAutomatedModeStatus()
          setAutomatedMode(autoStatus.active)
        } catch (error: any) {
          // Silently handle errors on initial load - just log to console
          console.error('[App] Error fetching automated mode status:', error)
          if (error.message?.includes('CORS_ERROR')) {
            setCorsError(true)
          }
        }

        // Fetch all agent statuses - silently handle errors
        const statuses: Record<string, AgentStatus> = {}
        const agentNames = ['notification_agent', 'scenario_agent', 'evaluation_agent', 'coa_agent', 'site_agent']
        for (const agentName of agentNames) {
          try {
            const status = await api.getAgentStatus(agentName)
            statuses[agentName] = status
          } catch (error) {
            // Silently handle errors - Firestore listeners will provide the real state
            console.error(`[App] Error fetching status for ${agentName}:`, error)
            // Don't set CORS error here - let the main try/catch handle it
          }
        }
        setAgentStatuses(statuses)
      } catch (error: any) {
        // Only set CORS error flag, don't show alerts on page load
        console.error('[App] Error fetching statuses:', error)
        if (error.message?.includes('CORS_ERROR')) {
          setCorsError(true)
        }
      }
    }

    fetchStatuses()
    // Poll every 10 seconds (reduced from 5s to prevent excessive re-renders)
    const interval = setInterval(fetchStatuses, 10000)
    return () => clearInterval(interval)
  }, [])

  // More frequent polling when any agent is actively working
  useEffect(() => {
    const hasActiveAgent = Object.values(agentStatuses).some(
      status => status?.state === 'active'
    ) || loading !== null

    if (!hasActiveAgent) return

    const fetchStatuses = async () => {
      // Silently fetch statuses - don't show errors, just update state if successful
      const agentNames = ['notification_agent', 'scenario_agent', 'evaluation_agent', 'coa_agent', 'site_agent']
      for (const agentName of agentNames) {
        try {
          const status = await api.getAgentStatus(agentName)
          setAgentStatuses(prev => ({ ...prev, [agentName]: status }))
        } catch (error) {
          // Silently handle errors - Firestore listeners will provide the real state
          // Only log to console, don't show alerts or throw errors
          console.error(`[App] Error fetching status for ${agentName} during active polling:`, error)
        }
      }
    }

    // Poll every 2 seconds when active
    const interval = setInterval(fetchStatuses, 2000)
    return () => clearInterval(interval)
  }, [agentStatuses, loading])

  const handleAgentAction = async (agent: typeof agents[0]) => {
    if (automatedMode) {
      alert('🤖 Automated mode is active. Please stop it first.')
      return
    }

    // OPTIMISTIC UI UPDATE: Immediately show agent as active for instant feedback
    setAgentFirestoreStates(prevStates => ({
      ...prevStates,
      [agent.apiName]: {
        state: 'active',
        status: 'active',
        agent_state: 'active',
        ...prevStates[agent.apiName] // Preserve other fields
      }
    }))
    
    // Set loading state for immediate UI feedback (spinner, disabled state)
    setLoading(agent.name)
    console.log(`[App] 🚀 Starting ${agent.name} - optimistic UI update applied, waiting for Firestore...`)

    try {
      const result = await agent.action()
      if (result.ok !== false) {
        // Firestore listeners will automatically update the state when backend updates it
        // The optimistic update will be overridden by the real Firestore state
        console.log(`[App] ✅ ${agent.name} action completed - Firestore will update state`)
      } else {
        // Revert optimistic update on failure
        setAgentFirestoreStates(prevStates => ({
          ...prevStates,
          [agent.apiName]: {
            state: 'idle',
            status: 'idle',
            agent_state: 'idle',
            ...prevStates[agent.apiName]
          }
        }))
        // Only show error alert if not during initial load
        if (!isInitialLoad) {
          alert(`❌ ${agent.name} failed: ${result.detail || 'Unknown error'}`)
        } else {
          console.error(`[App] ${agent.name} failed on initial load:`, result.detail)
        }
        console.log(`[App] ❌ ${agent.name} failed - reverted optimistic update`)
      }
    } catch (error: any) {
      // Revert optimistic update on error
      setAgentFirestoreStates(prevStates => ({
        ...prevStates,
        [agent.apiName]: {
          state: 'idle',
          status: 'idle',
          agent_state: 'idle',
          ...prevStates[agent.apiName]
        }
      }))
      // Only show error alert if not during initial load
      if (!isInitialLoad) {
        alert(`❌ ${agent.name} error: ${error.message || 'Unknown error'}`)
      } else {
        console.error(`[App] ${agent.name} error on initial load:`, error.message)
      }
      console.log(`[App] ❌ ${agent.name} error - reverted optimistic update`)
    } finally {
      // Clear loading state after a delay to allow Firestore update to come through
      // Keep it visible longer (3 seconds) so user sees feedback
      setTimeout(() => {
        setLoading(null)
      }, 3000)
    }
  }

  // Handle automated mode toggle
  // Function is ready but UI toggle is currently commented out
  // @ts-expect-error - Function intentionally unused until toggle UI is enabled
  const handleToggleAutomatedMode = async () => {
    // Prevent multiple simultaneous toggles
    if (togglingAutomatedMode) {
      console.log('[App] 🤖 Toggle already in progress, ignoring...')
      return
    }

    // Optimistically update UI immediately for better UX
    const newState = !automatedMode
    setAutomatedMode(newState)
    setTogglingAutomatedMode(true)
    
    try {
      console.log('[App] 🤖 Toggling automated mode...', { current: automatedMode, new: newState })
      const result = await api.toggleAutomatedMode()
      console.log('[App] 🤖 Toggle result:', result)
      
      // The Firestore listener will automatically update the state when backend updates it
      // But we can show a success message
      if (result.ok !== false && result.message) {
        // Don't show alert during initial load
        if (!isInitialLoad) {
          console.log(`✅ ${result.message}`)
        }
      } else {
        // If API call failed, revert optimistic update
        console.error('[App] ❌ Toggle API returned error, reverting optimistic update')
        setAutomatedMode(!newState)
      }
    } catch (error: any) {
      console.error('[App] ❌ Error toggling automated mode:', error)
      // Revert optimistic update on error
      setAutomatedMode(!newState)
      if (!isInitialLoad) {
        alert(`❌ Failed to toggle automated mode: ${error.message || 'Unknown error'}`)
      }
    } finally {
      setTogglingAutomatedMode(false)
    }
  }


  const getStatusBadge = (agentName: string) => {
    let state: string | undefined = undefined
    
    // 1. Try to get state from individual agent Firestore document
    if (agentFirestoreStates[agentName]) {
      const agentStateData = agentFirestoreStates[agentName]
      if (agentStateData) {
        // Handle different possible field names for state
        state = agentStateData.state || agentStateData.status || agentStateData.agent_state
      }
    }
    
    // 2. Fallback to time_agent_state for time_savings_agent (if not found in agentFirestoreStates)
    if (agentName === 'time_savings_agent' && !state && timeAgentState) {
      state = timeAgentState?.state || 
              timeAgentState?.time_agent_state || 
              timeAgentState?.status
    }
    
    // 3. Fallback to API polling status
    if (!state) {
      const apiStatus = agentStatuses[agentName]
      if (apiStatus) {
        state = apiStatus.state
      }
    }
    
    // Default to idle if no state found
    if (!state) {
      state = 'idle'
    }

    // Normalize state: map old states to new ones, handle case variations
    const normalizedState = typeof state === 'string' ? state.toLowerCase() : 'idle'
    
    // Map old state names to new ones (for backward compatibility during transition)
    const stateMapping: Record<string, string> = {
      'generating': 'active',
      'processing': 'active',
      'completed': 'idle',
      'error': 'idle',
      'idle': 'idle',
      'active': 'active',
      'IDLE': 'idle',
      'ACTIVE': 'active',
      'GENERATING': 'active',
      'PROCESSING': 'active',
      'COMPLETED': 'idle',
      'ERROR': 'idle'
    }
    
    const mappedState = stateMapping[normalizedState] || 'idle'
    const displayState = mappedState

    const stateColors: Record<string, string> = {
      idle: 'bg-gray-500',
      active: 'bg-blue-500'
    }

    return (
      <span className={`${stateColors[displayState] || 'bg-gray-500'} text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full`}>
        {displayState}
      </span>
    )
  }

  // Format date helper
  const formatDate = (date?: Date | any) => {
    if (!date) return '—'
    try {
      if (date instanceof Date) return date.toLocaleString()
      if (date?.toDate) return date.toDate().toLocaleString()
      return new Date(date).toLocaleString()
    } catch {
      return '—'
    }
  }

  // Handle scenario selection change
  const handleScenarioSelect = (scenarioId: string) => {
    setLoadingScenario(true)
    setSelectedScenarioId(scenarioId)
    // Simulate loading for the skeleton animation
    setTimeout(() => {
      setLoadingScenario(false)
    }, 300)
  }

  // Find the selected scenario document
  const selectedScenario = scenarios.find(s => s.id === selectedScenarioId)

  return (
    <div className="min-h-screen w-full bg-[#83a0cc] px-4 sm:px-6 pt-8 pb-6 overflow-visible">
      {/* Logo */}
      <div className="flex flex-col items-center mb-6 max-w-4xl mx-auto">
        <div className="h-32 w-[300px]">
          <Rive
            src="/animations/precepgo_agent_logo.riv"
            stateMachines="Main_SM"
            className="w-full h-full"
          />
        </div>
        
      </div>


      {/* CORS Error Banner */}
      {corsError && (
        <div className="max-w-6xl mx-auto mb-6">
          <div className="bg-red-50 border-2 border-red-500 rounded-xl p-4 shadow-hard-5">
          <div className="flex items-start gap-3">
            <div className="text-2xl">⚠️</div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-800 mb-2">
                CORS Configuration Required
              </h3>
              <p className="text-sm text-red-700 mb-2">
                The backend server needs to be configured to allow requests from this origin. 
                Please update the backend CORS settings to include:
              </p>
              <code className="block bg-red-100 px-3 py-2 rounded text-xs text-red-900 mb-2 break-all font-mono">
                {window.location.origin}
              </code>
              <p className="text-xs text-red-600 mb-3">
                Add this origin to your backend's <code className="bg-red-100 px-1 rounded">allow_origins</code> list in the CORS middleware configuration.
              </p>
              <div className="bg-red-100 border border-red-300 rounded p-3 mt-3">
                <p className="text-xs font-semibold text-red-800 mb-1">Backend Fix Required:</p>
                <pre className="text-xs text-red-900 overflow-x-auto">
{`app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "${window.location.origin}",
        "http://localhost:5173",  # Local development
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)`}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Agent Cards Grid */}
      <div className="mt-20 sm:mt-40 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-12 md:gap-20 overflow-visible">
        {agents.map((agent) => {
          const isLoading = loading === agent.name
          const agentStatus = agentStatuses[agent.apiName]
          
          // PRIORITIZE Firestore state over API status
          const firestoreState = agentFirestoreStates[agent.apiName]
          const firestoreStateValue = firestoreState?.state || firestoreState?.status || firestoreState?.agent_state
          const normalizedFirestoreState = typeof firestoreStateValue === 'string' 
            ? firestoreStateValue.toLowerCase() 
            : null
          
          // Debug logging for evaluation agent
          if (agent.apiName === 'evaluation_agent') {
            console.log(`[App] 🔍 ${agent.name} state check:`, {
              firestoreState,
              firestoreStateValue,
              normalizedFirestoreState,
              agentStatus: agentStatus?.state,
              isLoading
            })
          }
          
          // Check if agent is active from Firestore (prioritize this)
          // Map COMPLETED, IDLE to false, ACTIVE/GENERATING/PROCESSING to true
          const isActiveFromFirestore = normalizedFirestoreState === 'active' || 
                                       normalizedFirestoreState === 'generating' || 
                                       normalizedFirestoreState === 'processing'
          
          // Explicitly check for idle/completed states to ensure they're NOT active
          const isIdleFromFirestore = normalizedFirestoreState === 'idle' || 
                                     normalizedFirestoreState === 'completed' ||
                                     normalizedFirestoreState === 'error'
          
          // Only use API status if Firestore state is not available
          const isActiveFromAPI = agentStatus?.state === 'active'
          
          // isActive: Use Firestore state as source of truth, BUT also show active when loading
          // This provides immediate UI feedback when user clicks an action
          const isActive = isLoading 
            ? true  // Show as active immediately when loading (optimistic UI)
            : (firestoreState !== null && firestoreState !== undefined
              ? isActiveFromFirestore  // Use Firestore state if available
              : (isActiveFromAPI || false))  // Fallback to API only if Firestore not available
          
          // Debug logging for evaluation agent
          if (agent.apiName === 'evaluation_agent') {
            console.log(`[App] 🔍 ${agent.name} isActive result:`, {
              isActive,
              isActiveFromFirestore,
              isIdleFromFirestore,
              isActiveFromAPI,
              isLoading
            })
          }
          
          const isDisabled = automatedMode || isLoading
          
          const isDropdownOpen = openDropdown === agent.apiName

          return (
            <div key={agent.name} className="relative overflow-visible">
              {/* Rive Animation - positioned behind/on top of card */}
              <div className="max-w-full absolute -top-32 left-0 right-0 h-40 z-0 pointer-events-none">
                <Rive
                  src="/animations/card_clouds.riv"
                  className="w-full h-full max-w-[400px] max-h-[400px] mx-auto"
                />
              </div>

              {/* Card Container */}
              <div
                className={`${getCardBackground(agent.color, isActive)} rounded-xl shadow-sm relative z-10 ${
                  !isLoading
                    ? 'hover:shadow-md'
                    : ''
                }`}
              >
                {/* Dropdown Menu Button - Hide during loading */}
                {!isLoading && (
                  <div 
                    ref={(el) => { dropdownRefs.current[agent.apiName] = el }}
                    className="absolute top-3 right-3 z-20"
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setOpenDropdown(isDropdownOpen ? null : agent.apiName)
                      }}
                      className="p-1 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
                      title="More options"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#bdc3cc' }}>
                        more_vert
                      </span>
                    </button>

                    {/* Dropdown Menu */}
                    {isDropdownOpen && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                        <div className="py-1">
                          {agent.apiName === 'coa_agent' && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setOpenDropdown(null)
                                  !isDisabled && handleAgentAction(agent)
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                disabled={isDisabled}
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>play_arrow</span>
                                Generate COA Reports
                              </button>
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation()
                                  setOpenDropdown(null)
                                  try {
                                    if (coaReportsForDownload.length === 0) {
                                      alert('No COA reports available to export. Please generate some reports first.')
                                      return
                                    }
                                    await exportCOAReportsToExcel(coaReportsForDownload)
                                  } catch (error) {
                                    console.error('Export failed:', error)
                                    alert('Failed to export file. Please try again.')
                                  }
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                disabled={coaReportsForDownload.length === 0}
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>download</span>
                                Download Report
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setOpenDropdown(null)
                                  setOpenModal(agent.apiName)
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>info</span>
                                Agent Description
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setOpenDropdown(null)
                                  setOpenLogsModal(agent.apiName)
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>description</span>
                                Logs
                              </button>
                            </>
                          )}
                          {agent.apiName === 'notification_agent' && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setOpenDropdown(null)
                                  !isDisabled && handleAgentAction(agent)
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                disabled={isDisabled}
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>refresh</span>
                                Run Safety Check
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setOpenDropdown(null)
                                  setOpenModal(agent.apiName)
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>info</span>
                                Agent Description
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setOpenDropdown(null)
                                  setOpenLogsModal(agent.apiName)
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>description</span>
                                Logs
                              </button>
                            </>
                          )}
                          {agent.apiName === 'scenario_agent' && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setOpenDropdown(null)
                                  !isDisabled && handleAgentAction(agent)
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                disabled={isDisabled}
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>add</span>
                                Generate Scenario
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setOpenDropdown(null)
                                  setOpenModal(agent.apiName)
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>info</span>
                                Agent Description
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setOpenDropdown(null)
                                  setOpenLogsModal(agent.apiName)
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>description</span>
                                Logs
                              </button>
                            </>
                          )}
                          {agent.apiName === 'evaluation_agent' && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setOpenDropdown(null)
                                  !isDisabled && handleAgentAction(agent)
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 cursor-pointer"
                                disabled={isDisabled}
                                type="button"
                              >
                                <span className="material-symbols-outlined shrink-0" style={{ fontSize: '20px' }}>add</span>
                                <span className="flex-1">Create Evaluation</span>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setOpenDropdown(null)
                                  setOpenModal(agent.apiName)
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>info</span>
                                Agent Description
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setOpenDropdown(null)
                                  setOpenLogsModal(agent.apiName)
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>description</span>
                                Logs
                              </button>
                            </>
                          )}
                          {agent.apiName === 'time_savings_agent' && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setOpenDropdown(null)
                                  setOpenTimeSavingsModal(true)
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>bar_chart</span>
                                View Analytics
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setOpenDropdown(null)
                                  setOpenModal(agent.apiName)
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>info</span>
                                Agent Description
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setOpenDropdown(null)
                                  setOpenLogsModal(agent.apiName)
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>description</span>
                                Logs
                              </button>
                            </>
                          )}
                          {agent.apiName === 'site_agent' && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setOpenDropdown(null)
                                  !isDisabled && handleAgentAction(agent)
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                disabled={isDisabled}
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>play_arrow</span>
                                Generate Site Report
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setOpenDropdown(null)
                                  setOpenModal(agent.apiName)
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>info</span>
                                Agent Description
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setOpenDropdown(null)
                                  setOpenLogsModal(agent.apiName)
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>description</span>
                                Logs
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                  {/* Card Content */}
                  {isLoading ? (
                    // Loading state: Show spinner with "Talking to agent" label
                    <div className="p-5 flex flex-col items-center justify-center gap-4 min-h-[120px]">
                      <div className="w-12 h-12 border-4 border-precepgo-orange/30 border-t-precepgo-orange rounded-full animate-spin"></div>
                      <p className="text-sm font-medium text-precepgo-card-title">
                        Talking to agent...
                      </p>
                    </div>
                  ) : (
                    // Normal state: Show regular card content
                    <div className="p-5 flex-1 flex items-center gap-4">
                      <div className={`w-16 h-22 ${agent.color} rounded-lg flex items-center justify-center shrink-0`}>
                        <img 
                          src={agent.icon} 
                          alt={`${agent.name} icon`}
                          className="w-22 h-22 object-contain"
                        />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-precepgo-card-title mb-1">
                          {agent.name}
                        </h3>
                        <p className="text-sm text-precepgo-card-text">
                          {agent.description}
                        </p>
                      {agent.apiName === 'coa_agent' && (
                        <button
                          onClick={async (e) => {
                            e.stopPropagation(); // Prevent card click
                            try {
                              if (coaReportsForDownload.length === 0) {
                                alert('No COA reports available to export. Please generate some reports first.');
                                return;
                              }
                              await exportCOAReportsToExcel(coaReportsForDownload);
                            } catch (error) {
                              console.error('Export failed:', error);
                              alert('Failed to export file. Please try again.');
                            }
                          }}
                          className="mt-1 px-3 rounded-lg text-xs transition-colors bg-purple-100 hover:bg-gray-200 text-gray-600 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={isDisabled || coaReportsForDownload.length === 0}
                          title="Download latest COA report as Excel"
                        >
                          <span>Download Report</span>
        </button>
                      )}
                      {agent.apiName === 'site_agent' && (
                        <>
                          {latestSiteReport && latestSiteReport.data && (
                            <>
                              {latestSiteReport.data.total_sites && (
                                <p className="text-xs text-teal-600 font-semibold mt-1">
                                  🏥 {latestSiteReport.data.total_sites} site{latestSiteReport.data.total_sites !== 1 ? 's' : ''} analyzed
                                </p>
                              )}
                              {latestSiteReport.data.total_preceptors && (
                                <p className="text-xs text-teal-600 font-semibold mt-1">
                                  👥 {latestSiteReport.data.total_preceptors} preceptor{latestSiteReport.data.total_preceptors !== 1 ? 's' : ''}
                                </p>
                              )}
                              {latestSiteReport.data.total_evaluations && (
                                <p className="text-xs text-teal-600 font-semibold mt-1">
                                  📊 {latestSiteReport.data.total_evaluations} evaluation{latestSiteReport.data.total_evaluations !== 1 ? 's' : ''} processed
                                </p>
                              )}
                            </>
                          )}
                          <button
                            onClick={async (e) => {
                              e.stopPropagation(); // Prevent card click
                              try {
                                if (siteReportsForDownload.length === 0) {
                                  alert('No site reports available to export. Please generate some reports first.');
                                  return;
                                }
                                await exportSiteReportsToExcel(siteReportsForDownload);
                              } catch (error) {
                                console.error('Export failed:', error);
                                alert('Failed to export file. Please try again.');
                              }
                            }}
                            className="mt-1 px-3 rounded-lg text-xs transition-colors bg-teal-100 hover:bg-gray-200 text-gray-600 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={isDisabled || siteReportsForDownload.length === 0}
                            title="Download latest site report as Excel"
                          >
                            <span>Download Report</span>
                          </button>
                        </>
                      )}
                      {agent.apiName === 'notification_agent' && (
                        <p className="text-xs text-red-600 font-semibold mt-1">
                          ⚠️ {unsafeEvaluationsCount} unsafe evaluation{unsafeEvaluationsCount !== 1 ? 's' : ''} found in the last week
                        </p>
                      )}
                      {agent.apiName === 'evaluation_agent' && (
                        <p className="text-xs text-green-600 font-semibold mt-1">
                          📊 {evaluationsCount} evaluation{evaluationsCount !== 1 ? 's' : ''} generated in the last week
                        </p>
                      )}
                      {agent.apiName === 'scenario_agent' && (
                        <>
                          {scenarios.length > 0 && scenarios[0]?.data?.created_at && (
                            <p className="text-xs text-blue-600 font-semibold mt-1">
                              🎬 Last scenario: {formatDate(scenarios[0].data.created_at)}
                            </p>
                          )}
                        </>
                      )}
                      {agent.apiName === 'time_savings_agent' && (
                        <>
                          <p className="text-xs text-yellow-600 font-semibold mt-1">
                            ⏱️ {timeAgentHoursSaved !== null 
                              ? `${timeAgentHoursSaved.toLocaleString('en-US', { maximumFractionDigits: 0 })} hours saved`
                              : 'Loading...'}
                          </p>
                          {timeAgentLastUpdated && (
                            <p className="text-xs text-gray-500 mt-1">
                              Last updated: {formatDate(timeAgentLastUpdated)}
                            </p>
                          )}
                        </>
                      )}
                      {/* Last Run Time - Display for all agents */}
                      {(() => {
                        const lastRunTime = getAgentLastRunTime(agent.apiName)
                        if (lastRunTime) {
                          return (
                            <p className="text-xs text-gray-600 font-medium mt-2">
                              🕐 Last run: {formatDate(lastRunTime)}
                            </p>
                          )
                        }
                        return null
                      })()}
                      <div className="mt-2">
                        {getStatusBadge(agent.apiName)}
                      </div>
                    </div>
                  </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Scenarios Section */}
      {scenarios.length > 0 && (
        <div className="mt-24 max-w-6xl mx-auto px-4 sm:px-6">
          <div className="relative overflow-visible">

            {/* Rive Animation - positioned behind/on top of card */}
            <div className="absolute -top-22 left-0 right-0 h-24 z-0 pointer-events-none">
              <Rive
                src="/animations/precepgo_scenario.riv"
                className="w-full h-full mx-auto"
              />
            </div>

            {/* Card Container */}
            <div className="relative z-10">
              <div className="grid grid-cols-1 gap-6">
                {loadingScenario ? (
                  <ScenarioCardSkeleton />
                ) : selectedScenario ? (
                  <ScenarioCard 
                    document={selectedScenario}
                    scenarios={scenarios}
                    selectedScenarioId={selectedScenarioId}
                    onScenarioChange={handleScenarioSelect}
                    formatDate={formatDate}
                  />
                ) : (
                  <p className="text-center text-gray-500 py-8">Select a scenario from the dropdown.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Time Savings Analytics Modal */}
      {openTimeSavingsModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto"
          onClick={() => setOpenTimeSavingsModal(false)}
        >
          <div 
            className="bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto my-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-xl z-10">
              <h2 className="text-2xl font-semibold text-precepgo-card-title">Time Savings Analytics</h2>
              <button
                onClick={() => setOpenTimeSavingsModal(false)}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>close</span>
              </button>
            </div>
            
            {/* Modal Content */}
            <div className="p-6">
              <TimeSavingsDashboard />
            </div>
          </div>
        </div>
      )}

      {/* Agent Description Modal */}
      {openModal && (() => {
        const agent = agents.find(a => a.apiName === openModal)
        if (!agent) return null
        
        return (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setOpenModal(null)}
          >
            <div 
              className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-xl">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 ${agent.color} rounded-lg flex items-center justify-center`}>
                    <img 
                      src={agent.icon} 
                      alt={`${agent.name} icon`}
                      className="w-12 h-12 object-contain"
                    />
                  </div>
                  <h2 className="text-2xl font-semibold text-precepgo-card-title">
                    {agent.name}
                  </h2>
                </div>
                <button
                  onClick={() => setOpenModal(null)}
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
                  aria-label="Close modal"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>
                    close
                  </span>
                </button>
              </div>

              {/* Modal Content */}
              <div className="px-6 py-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-precepgo-card-title mb-2">
                    What does this agent do?
                  </h3>
                  <p className="text-sm text-precepgo-card-text leading-relaxed">
                    {agent.detailedDescription}
                  </p>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-lg font-semibold text-precepgo-card-title mb-2">
                    Real-World Problem Solved
                  </h3>
                  <p className="text-sm text-precepgo-card-text leading-relaxed">
                    {agent.realWorldProblem}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Agent Logs Modal */}
      {openLogsModal && (() => {
        const agent = agents.find(a => a.apiName === openLogsModal)
        if (!agent) return null
        
        console.log(`[App] 📋 Opening logs modal for ${agent.apiName}`)
        console.log(`[App] 📋 timeAgentState:`, timeAgentState)
        console.log(`[App] 📋 allStatesData:`, allStatesData)
        
        const logs = getAgentLogs(agent.apiName)
        console.log(`[App] 📋 Retrieved logs:`, logs.length, 'entries')
        
        return (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setOpenLogsModal(null)}
          >
            <div 
              className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-xl">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 ${agent.color} rounded-lg flex items-center justify-center`}>
                    <img 
                      src={agent.icon} 
                      alt={`${agent.name} icon`}
                      className="w-12 h-12 object-contain"
                    />
                  </div>
                  <h2 className="text-2xl font-semibold text-precepgo-card-title">
                    {agent.name} Logs
                  </h2>
                </div>
                <button
                  onClick={() => setOpenLogsModal(null)}
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
                  aria-label="Close modal"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>
                    close
                  </span>
                </button>
              </div>

              {/* Modal Content */}
              <div className="px-6 py-6">
                {logs.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500 text-lg">No logs available</p>
                    <p className="text-gray-400 text-sm mt-2">Logs will appear here as the agent runs</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="mb-4">
                      <p className="text-sm text-gray-600">
                        Showing {logs.length} log {logs.length === 1 ? 'entry' : 'entries'} (newest first)
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm">
                      <div className="space-y-2">
                        {[...logs].reverse().map((log, index) => (
                          <div 
                            key={index} 
                            className="border-b border-gray-200 pb-2 last:border-b-0 last:pb-0"
                          >
                            <div className="text-gray-700 whitespace-pre-wrap wrap-break-word">
                              {log}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

export default App
