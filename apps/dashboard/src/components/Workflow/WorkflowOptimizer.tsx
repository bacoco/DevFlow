/**
 * Workflow Optimizer
 * Main component that orchestrates all workflow optimization features
 */

import React, { useState, useEffect, useCallback } from 'react'
import { WorkflowContext, BatchOperation, ContextualAction, ProgressiveDisclosureConfig } from './types'
import ProgressiveDisclosure from './ProgressiveDisclosure'
import { SmartDefaultsProvider, SmartInput } from './SmartDefaultsEngine'
import BatchOperations from './BatchOperations'
import ContextualActions from './ContextualActions'
import { StatePreservationProvider, useStatePreservation, StateRestorationNotification } from './StatePreservation'

interface WorkflowOptimizerProps {
  userId: string
  userRole: 'developer' | 'team_lead' | 'manager' | 'admin'
  currentTask?: string
  children: React.ReactNode
}

export const WorkflowOptimizer: React.FC<WorkflowOptimizerProps> = ({
  userId,
  userRole,
  currentTask,
  children
}) => {
  const [workflowContext, setWorkflowContext] = useState<WorkflowContext>({
    userId,
    userRole,
    currentTask,
    recentActions: [],
    preferences: {
      defaultViews: {},
      shortcuts: [],
      batchOperations: true,
      progressiveDisclosure: true,
      autoSave: true
    }
  })

  // Load user preferences and recent actions
  useEffect(() => {
    loadWorkflowContext(userId).then(context => {
      setWorkflowContext(prev => ({ ...prev, ...context }))
    })
  }, [userId])

  // Update context when props change
  useEffect(() => {
    setWorkflowContext(prev => ({
      ...prev,
      userRole,
      currentTask
    }))
  }, [userRole, currentTask])

  return (
    <StatePreservationProvider workflowContext={workflowContext}>
      <SmartDefaultsProvider workflowContext={workflowContext}>
        <div className="workflow-optimizer">
          {children}
        </div>
      </SmartDefaultsProvider>
    </StatePreservationProvider>
  )
}

// Optimized Form Component with all workflow features
interface OptimizedFormProps {
  formId: string
  title: string
  onSubmit: (data: any) => Promise<void>
  children: React.ReactNode
  disclosureConfig?: ProgressiveDisclosureConfig
  batchOperations?: BatchOperation[]
  contextualActions?: ContextualAction[]
  selectedItems?: string[]
}

export const OptimizedForm: React.FC<OptimizedFormProps> = ({
  formId,
  title,
  onSubmit,
  children,
  disclosureConfig,
  batchOperations = [],
  contextualActions = [],
  selectedItems = []
}) => {
  const { saveState, restoreState, hasState } = useStatePreservation()
  const [formData, setFormData] = useState<any>({})
  const [showRestoreNotification, setShowRestoreNotification] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Check for previous state on mount
  useEffect(() => {
    if (hasState(formId)) {
      setShowRestoreNotification(true)
    }
  }, [formId, hasState])

  // Auto-save form data
  useEffect(() => {
    if (Object.keys(formData).length > 0) {
      saveState(formId, formData, true)
    }
  }, [formData, formId, saveState])

  const handleRestore = useCallback(() => {
    const restored = restoreState(formId)
    if (restored) {
      setFormData(restored)
    }
    setShowRestoreNotification(false)
  }, [formId, restoreState])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      await onSubmit(formData)
      // Clear saved state on successful submit
      saveState(formId, {}, false)
    } catch (error) {
      console.error('Form submission failed:', error)
    } finally {
      setIsSubmitting(false)
    }
  }, [formData, onSubmit, formId, saveState])

  const handleBatchOperation = useCallback(async (operation: BatchOperation, items: string[]) => {
    // Execute batch operation
    console.log('Executing batch operation:', operation.name, 'on', items.length, 'items')
    // Implementation would depend on the specific operation
  }, [])

  const handleContextualAction = useCallback(async (action: ContextualAction) => {
    // Execute contextual action
    console.log('Executing contextual action:', action.label)
    // Implementation would depend on the specific action
  }, [])

  return (
    <div className="optimized-form bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header with title and contextual actions */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
        <ContextualActions
          context={{
            userId: 'current-user',
            userRole: 'developer',
            currentTask: formId,
            recentActions: [],
            preferences: {
              defaultViews: {},
              shortcuts: [],
              batchOperations: true,
              progressiveDisclosure: true,
              autoSave: true
            }
          }}
          actions={contextualActions}
          onActionExecute={handleContextualAction}
        />
      </div>

      <div className="p-6">
        {/* State restoration notification */}
        {showRestoreNotification && (
          <StateRestorationNotification
            context={formId}
            onRestore={handleRestore}
            onDismiss={() => setShowRestoreNotification(false)}
          />
        )}

        {/* Batch operations */}
        {batchOperations.length > 0 && selectedItems.length > 0 && (
          <div className="mb-6">
            <BatchOperations
              operations={batchOperations}
              selectedItems={selectedItems}
              context={{
                userId: 'current-user',
                userRole: 'developer',
                currentTask: formId,
                recentActions: [],
                preferences: {
                  defaultViews: {},
                  shortcuts: [],
                  batchOperations: true,
                  progressiveDisclosure: true,
                  autoSave: true
                }
              }}
              onExecute={handleBatchOperation}
            />
          </div>
        )}

        {/* Form content with progressive disclosure */}
        <form onSubmit={handleSubmit}>
          {disclosureConfig ? (
            <ProgressiveDisclosure
              config={disclosureConfig}
              context={{
                userId: 'current-user',
                userRole: 'developer',
                currentTask: formId,
                recentActions: [],
                preferences: {
                  defaultViews: {},
                  shortcuts: [],
                  batchOperations: true,
                  progressiveDisclosure: true,
                  autoSave: true
                }
              }}
            >
              {children}
            </ProgressiveDisclosure>
          ) : (
            children
          )}

          {/* Submit button */}
          <div className="flex justify-end mt-6 pt-6 border-t border-gray-200">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Smart Input Field with defaults
interface SmartFieldProps {
  field: string
  label: string
  type?: 'text' | 'number' | 'select' | 'textarea'
  options?: Array<{ value: any; label: string }>
  context?: string
  required?: boolean
  onChange: (value: any) => void
  disclosureLevel?: number
}

export const SmartField: React.FC<SmartFieldProps> = ({
  field,
  label,
  type = 'text',
  options,
  context,
  required = false,
  onChange,
  disclosureLevel
}) => {
  return (
    <div className="smart-field mb-4" data-disclosure-level={disclosureLevel}>
      <SmartInput
        field={field}
        context={context}
        onChange={onChange}
      >
        {({ value, onChange: handleChange, confidence, isSmartDefault }) => (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <label className="block text-sm font-medium text-gray-700">
                {label}
                {required && <span className="text-red-500 ml-1">*</span>}
              </label>
              {isSmartDefault && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                  Smart Default ({Math.round(confidence * 100)}%)
                </span>
              )}
            </div>

            {type === 'select' && options ? (
              <select
                value={value || ''}
                onChange={(e) => handleChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required={required}
              >
                <option value="">Select an option</option>
                {options.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : type === 'textarea' ? (
              <textarea
                value={value || ''}
                onChange={(e) => handleChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={4}
                required={required}
              />
            ) : (
              <input
                type={type}
                value={value || ''}
                onChange={(e) => handleChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required={required}
              />
            )}
          </div>
        )}
      </SmartInput>
    </div>
  )
}

// Helper function to load workflow context
async function loadWorkflowContext(userId: string): Promise<Partial<WorkflowContext>> {
  try {
    const response = await fetch(`/api/workflow-context/${userId}`)
    if (response.ok) {
      return await response.json()
    }
  } catch (error) {
    console.warn('Failed to load workflow context:', error)
  }
  return {}
}

export default WorkflowOptimizer