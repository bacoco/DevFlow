/**
 * Smart Defaults Engine
 * Provides intelligent default values based on user context and role
 */

import React, { createContext, useContext, useEffect, useState } from 'react'
import { SmartDefault, WorkflowContext } from './types'

interface SmartDefaultsContextType {
  getDefault: (field: string, context?: string) => any
  setDefault: (field: string, value: any, context?: string) => void
  learnFromAction: (field: string, value: any, context?: string) => void
  getConfidence: (field: string, context?: string) => number
}

const SmartDefaultsContext = createContext<SmartDefaultsContextType | null>(null)

export const useSmartDefaults = () => {
  const context = useContext(SmartDefaultsContext)
  if (!context) {
    throw new Error('useSmartDefaults must be used within SmartDefaultsProvider')
  }
  return context
}

interface SmartDefaultsProviderProps {
  workflowContext: WorkflowContext
  children: React.ReactNode
}

export const SmartDefaultsProvider: React.FC<SmartDefaultsProviderProps> = ({
  workflowContext,
  children
}) => {
  const [defaults, setDefaults] = useState<Map<string, SmartDefault>>(new Map())
  const [userPatterns, setUserPatterns] = useState<Map<string, any[]>>(new Map())

  // Load defaults on mount
  useEffect(() => {
    loadSmartDefaults(workflowContext).then(setDefaults)
  }, [workflowContext.userId])

  const getDefault = (field: string, context?: string): any => {
    const key = context ? `${context}.${field}` : field
    const smartDefault = defaults.get(key)
    
    if (smartDefault) {
      return smartDefault.value
    }

    // Fallback to role-based defaults
    return getRoleBasedDefault(field, workflowContext.userRole, context)
  }

  const setDefault = (field: string, value: any, context?: string): void => {
    const key = context ? `${context}.${field}` : field
    const smartDefault: SmartDefault = {
      context: context || 'global',
      field,
      value,
      confidence: 1.0,
      source: 'user_history'
    }
    
    setDefaults(prev => new Map(prev.set(key, smartDefault)))
    saveSmartDefault(workflowContext.userId, smartDefault)
  }

  const learnFromAction = (field: string, value: any, context?: string): void => {
    const key = context ? `${context}.${field}` : field
    
    // Track user patterns
    setUserPatterns(prev => {
      const newPatterns = new Map(prev)
      const existing = newPatterns.get(key) || []
      const updated = [...existing, { value, timestamp: new Date() }].slice(-10) // Keep last 10
      newPatterns.set(key, updated)
      return newPatterns
    })

    // Update smart default based on frequency
    const patterns = userPatterns.get(key) || []
    const mostFrequent = getMostFrequentValue(patterns)
    
    if (mostFrequent && mostFrequent.frequency > 0.6) {
      const smartDefault: SmartDefault = {
        context: context || 'global',
        field,
        value: mostFrequent.value,
        confidence: mostFrequent.frequency,
        source: 'user_history'
      }
      
      setDefaults(prev => new Map(prev.set(key, smartDefault)))
      saveSmartDefault(workflowContext.userId, smartDefault)
    }
  }

  const getConfidence = (field: string, context?: string): number => {
    const key = context ? `${context}.${field}` : field
    return defaults.get(key)?.confidence || 0
  }

  return (
    <SmartDefaultsContext.Provider value={{
      getDefault,
      setDefault,
      learnFromAction,
      getConfidence
    }}>
      {children}
    </SmartDefaultsContext.Provider>
  )
}

// Smart Default Input Component
interface SmartInputProps {
  field: string
  context?: string
  defaultValue?: any
  onChange: (value: any) => void
  children: (props: {
    value: any
    onChange: (value: any) => void
    confidence: number
    isSmartDefault: boolean
  }) => React.ReactNode
}

export const SmartInput: React.FC<SmartInputProps> = ({
  field,
  context,
  defaultValue,
  onChange,
  children
}) => {
  const { getDefault, learnFromAction, getConfidence } = useSmartDefaults()
  const [value, setValue] = useState(() => {
    const smartDefault = getDefault(field, context)
    return smartDefault !== undefined ? smartDefault : defaultValue
  })

  const confidence = getConfidence(field, context)
  const isSmartDefault = confidence > 0

  const handleChange = (newValue: any) => {
    setValue(newValue)
    onChange(newValue)
    learnFromAction(field, newValue, context)
  }

  return (
    <>
      {children({
        value,
        onChange: handleChange,
        confidence,
        isSmartDefault
      })}
    </>
  )
}

// Helper functions
function getRoleBasedDefault(field: string, role: string, context?: string): any {
  const roleDefaults: Record<string, Record<string, any>> = {
    developer: {
      'timeRange': '7d',
      'chartType': 'line',
      'groupBy': 'day',
      'showDetails': false
    },
    team_lead: {
      'timeRange': '30d',
      'chartType': 'bar',
      'groupBy': 'week',
      'showDetails': true,
      'includeTeam': true
    },
    manager: {
      'timeRange': '90d',
      'chartType': 'summary',
      'groupBy': 'month',
      'showDetails': false,
      'includeTeam': true,
      'showTrends': true
    }
  }

  return roleDefaults[role]?.[field]
}

function getMostFrequentValue(patterns: any[]): { value: any; frequency: number } | null {
  if (patterns.length === 0) return null

  const frequency: Map<any, number> = new Map()
  patterns.forEach(pattern => {
    const count = frequency.get(pattern.value) || 0
    frequency.set(pattern.value, count + 1)
  })

  let mostFrequent = { value: null, frequency: 0 }
  frequency.forEach((count, value) => {
    const freq = count / patterns.length
    if (freq > mostFrequent.frequency) {
      mostFrequent = { value, frequency: freq }
    }
  })

  return mostFrequent.frequency > 0 ? mostFrequent : null
}

async function loadSmartDefaults(context: WorkflowContext): Promise<Map<string, SmartDefault>> {
  try {
    const response = await fetch(`/api/smart-defaults/${context.userId}`)
    if (response.ok) {
      const defaults = await response.json()
      return new Map(defaults.map((d: SmartDefault) => [`${d.context}.${d.field}`, d]))
    }
  } catch (error) {
    console.warn('Failed to load smart defaults:', error)
  }
  return new Map()
}

async function saveSmartDefault(userId: string, smartDefault: SmartDefault): Promise<void> {
  try {
    await fetch(`/api/smart-defaults/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(smartDefault)
    })
  } catch (error) {
    console.warn('Failed to save smart default:', error)
  }
}

export default SmartDefaultsProvider