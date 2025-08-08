/**
 * State Preservation System
 * Maintains user state for seamless context switching
 */

import React, { createContext, useContext, useEffect, useRef, useCallback } from 'react'
import { WorkflowState, WorkflowContext } from './types'

interface StatePreservationContextType {
  saveState: (context: string, state: any, autoSave?: boolean) => void
  restoreState: (context: string) => any
  clearState: (context: string) => void
  hasState: (context: string) => boolean
  getStateAge: (context: string) => number | null
}

const StatePreservationContext = createContext<StatePreservationContextType | null>(null)

export const useStatePreservation = () => {
  const context = useContext(StatePreservationContext)
  if (!context) {
    throw new Error('useStatePreservation must be used within StatePreservationProvider')
  }
  return context
}

interface StatePreservationProviderProps {
  workflowContext: WorkflowContext
  children: React.ReactNode
  autoSaveInterval?: number
  maxStateAge?: number
}

export const StatePreservationProvider: React.FC<StatePreservationProviderProps> = ({
  workflowContext,
  children,
  autoSaveInterval = 30000, // 30 seconds
  maxStateAge = 24 * 60 * 60 * 1000 // 24 hours
}) => {
  const stateCache = useRef<Map<string, WorkflowState>>(new Map())
  const autoSaveTimers = useRef<Map<string, NodeJS.Timeout>>(new Map())
  const pendingStates = useRef<Map<string, any>>(new Map())

  // Load existing states on mount
  useEffect(() => {
    loadPersistedStates(workflowContext.userId).then(states => {
      states.forEach(state => {
        if (Date.now() - state.timestamp.getTime() < maxStateAge) {
          stateCache.current.set(state.context, state)
        }
      })
    })
  }, [workflowContext.userId, maxStateAge])

  // Auto-save pending states
  useEffect(() => {
    const interval = setInterval(() => {
      pendingStates.current.forEach((state, context) => {
        persistState(workflowContext.userId, context, state, true)
      })
      pendingStates.current.clear()
    }, autoSaveInterval)

    return () => clearInterval(interval)
  }, [workflowContext.userId, autoSaveInterval])

  // Save state before page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      pendingStates.current.forEach((state, context) => {
        persistState(workflowContext.userId, context, state, true)
      })
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [workflowContext.userId])

  const saveState = useCallback((context: string, state: any, autoSave = false) => {
    const workflowState: WorkflowState = {
      id: `${workflowContext.userId}-${context}-${Date.now()}`,
      userId: workflowContext.userId,
      context,
      state,
      timestamp: new Date(),
      autoSaved: autoSave
    }

    stateCache.current.set(context, workflowState)

    if (autoSave) {
      // Queue for batch auto-save
      pendingStates.current.set(context, state)
    } else {
      // Immediate save for manual saves
      persistState(workflowContext.userId, context, state, false)
    }
  }, [workflowContext.userId])

  const restoreState = useCallback((context: string): any => {
    const workflowState = stateCache.current.get(context)
    if (!workflowState) return null

    // Check if state is still valid
    if (Date.now() - workflowState.timestamp.getTime() > maxStateAge) {
      stateCache.current.delete(context)
      return null
    }

    return workflowState.state
  }, [maxStateAge])

  const clearState = useCallback((context: string) => {
    stateCache.current.delete(context)
    pendingStates.current.delete(context)
    
    // Clear auto-save timer
    const timer = autoSaveTimers.current.get(context)
    if (timer) {
      clearTimeout(timer)
      autoSaveTimers.current.delete(context)
    }

    // Remove from persistence
    removePersistedState(workflowContext.userId, context)
  }, [workflowContext.userId])

  const hasState = useCallback((context: string): boolean => {
    return stateCache.current.has(context)
  }, [])

  const getStateAge = useCallback((context: string): number | null => {
    const workflowState = stateCache.current.get(context)
    if (!workflowState) return null
    return Date.now() - workflowState.timestamp.getTime()
  }, [])

  return (
    <StatePreservationContext.Provider value={{
      saveState,
      restoreState,
      clearState,
      hasState,
      getStateAge
    }}>
      {children}
    </StatePreservationContext.Provider>
  )
}

// Hook for automatic state preservation
export const useAutoSaveState = <T extends Record<string, any>>(
  context: string,
  initialState: T,
  dependencies: any[] = []
): [T, (newState: Partial<T>) => void] => {
  const { saveState, restoreState } = useStatePreservation()
  const [state, setState] = React.useState<T>(() => {
    const restored = restoreState(context)
    return restored ? { ...initialState, ...restored } : initialState
  })

  // Auto-save when state changes
  useEffect(() => {
    saveState(context, state, true)
  }, [context, state, saveState])

  const updateState = useCallback((newState: Partial<T>) => {
    setState(prev => ({ ...prev, ...newState }))
  }, [])

  return [state, updateState]
}

// Component for state restoration notifications
interface StateRestorationNotificationProps {
  context: string
  onRestore: () => void
  onDismiss: () => void
}

export const StateRestorationNotification: React.FC<StateRestorationNotificationProps> = ({
  context,
  onRestore,
  onDismiss
}) => {
  const { getStateAge } = useStatePreservation()
  const stateAge = getStateAge(context)

  if (!stateAge) return null

  const ageText = formatStateAge(stateAge)

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="flex-1">
          <h4 className="font-medium text-blue-900">Previous Session Found</h4>
          <p className="text-sm text-blue-700 mt-1">
            We found your previous work from {ageText}. Would you like to restore it?
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={onRestore}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
            >
              Restore
            </button>
            <button
              onClick={onDismiss}
              className="px-3 py-1 bg-white text-blue-600 text-sm border border-blue-300 rounded-md hover:bg-blue-50 transition-colors"
            >
              Start Fresh
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Context switching component
interface ContextSwitcherProps {
  contexts: Array<{ id: string; label: string; hasState: boolean }>
  currentContext: string
  onContextSwitch: (context: string) => void
}

export const ContextSwitcher: React.FC<ContextSwitcherProps> = ({
  contexts,
  currentContext,
  onContextSwitch
}) => {
  const { hasState, getStateAge } = useStatePreservation()

  return (
    <div className="context-switcher">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-medium text-gray-700">Context:</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {contexts.map(context => {
          const isActive = context.id === currentContext
          const hasPreservedState = hasState(context.id)
          const stateAge = getStateAge(context.id)

          return (
            <button
              key={context.id}
              onClick={() => onContextSwitch(context.id)}
              className={`relative px-3 py-2 text-sm rounded-md transition-colors ${
                isActive
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {context.label}
              {hasPreservedState && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" 
                     title={`Saved state from ${formatStateAge(stateAge!)}`} />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// Helper functions
async function loadPersistedStates(userId: string): Promise<WorkflowState[]> {
  try {
    const response = await fetch(`/api/workflow-states/${userId}`)
    if (response.ok) {
      const states = await response.json()
      return states.map((s: any) => ({
        ...s,
        timestamp: new Date(s.timestamp)
      }))
    }
  } catch (error) {
    console.warn('Failed to load persisted states:', error)
  }
  return []
}

async function persistState(userId: string, context: string, state: any, autoSaved: boolean): Promise<void> {
  try {
    await fetch(`/api/workflow-states/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        context,
        state,
        autoSaved,
        timestamp: new Date()
      })
    })
  } catch (error) {
    console.warn('Failed to persist state:', error)
  }
}

async function removePersistedState(userId: string, context: string): Promise<void> {
  try {
    await fetch(`/api/workflow-states/${userId}/${context}`, {
      method: 'DELETE'
    })
  } catch (error) {
    console.warn('Failed to remove persisted state:', error)
  }
}

function formatStateAge(ageMs: number): string {
  const minutes = Math.floor(ageMs / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days} day${days !== 1 ? 's' : ''} ago`
  if (hours > 0) return `${hours} hour${hours !== 1 ? 's' : ''} ago`
  if (minutes > 0) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`
  return 'just now'
}

export default StatePreservationProvider