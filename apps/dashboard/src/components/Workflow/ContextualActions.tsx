/**
 * Contextual Actions Component
 * Provides context-aware quick actions and shortcuts
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { ZapIcon, KeyboardIcon, StarIcon, ClockIcon } from 'lucide-react'
import { ContextualAction, WorkflowContext, QuickAccessItem } from './types'

interface ContextualActionsProps {
  context: WorkflowContext
  actions: ContextualAction[]
  onActionExecute: (action: ContextualAction) => Promise<void>
  className?: string
}

export const ContextualActions: React.FC<ContextualActionsProps> = ({
  context,
  actions,
  onActionExecute,
  className = ''
}) => {
  const [quickAccess, setQuickAccess] = useState<QuickAccessItem[]>([])
  const [showShortcuts, setShowShortcuts] = useState(false)

  // Filter available actions based on context
  const availableActions = useMemo(() => {
    return actions
      .filter(action => action.condition(context))
      .sort((a, b) => b.priority - a.priority)
  }, [actions, context])

  // Load quick access items
  useEffect(() => {
    loadQuickAccessItems(context.userId).then(setQuickAccess)
  }, [context.userId])

  // Register keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const action = availableActions.find(a => 
        a.shortcut && isShortcutMatch(event, a.shortcut)
      )
      
      if (action) {
        event.preventDefault()
        executeAction(action)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [availableActions])

  const executeAction = useCallback(async (action: ContextualAction) => {
    try {
      await onActionExecute(action)
      
      // Update quick access frequency
      updateQuickAccessFrequency(context.userId, action.id)
      
      // Track action usage
      trackActionUsage(action, context)
    } catch (error) {
      console.error('Failed to execute action:', error)
    }
  }, [onActionExecute, context])

  const primaryActions = availableActions.slice(0, 3)
  const secondaryActions = availableActions.slice(3)

  return (
    <div className={`contextual-actions ${className}`}>
      {/* Primary Actions */}
      {primaryActions.length > 0 && (
        <div className="flex items-center gap-2 mb-3">
          {primaryActions.map(action => (
            <ActionButton
              key={action.id}
              action={action}
              onExecute={() => executeAction(action)}
              isPrimary
            />
          ))}
        </div>
      )}

      {/* Quick Access Bar */}
      <QuickAccessBar
        items={quickAccess}
        context={context}
        onItemClick={(item) => {
          const action = availableActions.find(a => a.id === item.action)
          if (action) executeAction(action)
        }}
      />

      {/* Secondary Actions Dropdown */}
      {secondaryActions.length > 0 && (
        <SecondaryActionsMenu
          actions={secondaryActions}
          onActionExecute={executeAction}
        />
      )}

      {/* Keyboard Shortcuts Panel */}
      {showShortcuts && (
        <ShortcutsPanel
          actions={availableActions.filter(a => a.shortcut)}
          onClose={() => setShowShortcuts(false)}
        />
      )}

      {/* Shortcuts Toggle */}
      <button
        onClick={() => setShowShortcuts(!showShortcuts)}
        className="mt-2 text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
        title="Show keyboard shortcuts"
      >
        <KeyboardIcon className="w-3 h-3" />
        Shortcuts
      </button>
    </div>
  )
}

interface ActionButtonProps {
  action: ContextualAction
  onExecute: () => void
  isPrimary?: boolean
}

const ActionButton: React.FC<ActionButtonProps> = ({
  action,
  onExecute,
  isPrimary = false
}) => {
  return (
    <button
      onClick={onExecute}
      className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
        isPrimary
          ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
      title={action.shortcut ? `${action.label} (${action.shortcut})` : action.label}
    >
      {action.icon && <span className="w-4 h-4">{action.icon}</span>}
      <span className="text-sm font-medium">{action.label}</span>
      {action.shortcut && (
        <kbd className="text-xs bg-white bg-opacity-50 px-1 py-0.5 rounded">
          {action.shortcut}
        </kbd>
      )}
    </button>
  )
}

interface QuickAccessBarProps {
  items: QuickAccessItem[]
  context: WorkflowContext
  onItemClick: (item: QuickAccessItem) => void
}

const QuickAccessBar: React.FC<QuickAccessBarProps> = ({
  items,
  context,
  onItemClick
}) => {
  // Filter items relevant to current context
  const relevantItems = items
    .filter(item => !item.context || item.context.includes(context.currentTask || ''))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 5)

  if (relevantItems.length === 0) return null

  return (
    <div className="quick-access-bar bg-gray-50 rounded-lg p-2 mb-3">
      <div className="flex items-center gap-1 mb-2">
        <StarIcon className="w-3 h-3 text-gray-500" />
        <span className="text-xs text-gray-600 font-medium">Quick Access</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {relevantItems.map(item => (
          <button
            key={item.id}
            onClick={() => onItemClick(item)}
            className="px-2 py-1 text-xs bg-white text-gray-700 rounded hover:bg-gray-100 transition-colors flex items-center gap-1"
            title={`Used ${item.frequency} times`}
          >
            {item.icon && <span className="w-3 h-3">{item.icon}</span>}
            {item.label}
          </button>
        ))}
      </div>
    </div>
  )
}

interface SecondaryActionsMenuProps {
  actions: ContextualAction[]
  onActionExecute: (action: ContextualAction) => void
}

const SecondaryActionsMenu: React.FC<SecondaryActionsMenuProps> = ({
  actions,
  onActionExecute
}) => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
      >
        <ZapIcon className="w-4 h-4" />
        More Actions ({actions.length})
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-48">
            <div className="py-1">
              {actions.map(action => (
                <button
                  key={action.id}
                  onClick={() => {
                    onActionExecute(action)
                    setIsOpen(false)
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  {action.icon && <span className="w-4 h-4">{action.icon}</span>}
                  <span className="flex-1 text-left">{action.label}</span>
                  {action.shortcut && (
                    <kbd className="text-xs text-gray-500 bg-gray-100 px-1 py-0.5 rounded">
                      {action.shortcut}
                    </kbd>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

interface ShortcutsPanelProps {
  actions: ContextualAction[]
  onClose: () => void
}

const ShortcutsPanel: React.FC<ShortcutsPanelProps> = ({ actions, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-96 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Keyboard Shortcuts</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>

        <div className="space-y-2">
          {actions.map(action => (
            <div
              key={action.id}
              className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
            >
              <div className="flex items-center gap-2">
                {action.icon && <span className="w-4 h-4">{action.icon}</span>}
                <span className="text-sm text-gray-700">{action.label}</span>
              </div>
              <kbd className="text-sm bg-gray-100 text-gray-600 px-2 py-1 rounded">
                {action.shortcut}
              </kbd>
            </div>
          ))}
        </div>

        <div className="mt-4 text-xs text-gray-500">
          <p>Tip: These shortcuts work when the dashboard is focused.</p>
        </div>
      </div>
    </div>
  )
}

// Helper functions
function isShortcutMatch(event: KeyboardEvent, shortcut: string): boolean {
  const parts = shortcut.toLowerCase().split('+')
  const key = parts.pop()
  const modifiers = parts

  if (event.key.toLowerCase() !== key) return false

  const requiredModifiers = {
    ctrl: modifiers.includes('ctrl'),
    alt: modifiers.includes('alt'),
    shift: modifiers.includes('shift'),
    meta: modifiers.includes('cmd') || modifiers.includes('meta')
  }

  return (
    event.ctrlKey === requiredModifiers.ctrl &&
    event.altKey === requiredModifiers.alt &&
    event.shiftKey === requiredModifiers.shift &&
    event.metaKey === requiredModifiers.meta
  )
}

async function loadQuickAccessItems(userId: string): Promise<QuickAccessItem[]> {
  try {
    const response = await fetch(`/api/quick-access/${userId}`)
    if (response.ok) {
      return await response.json()
    }
  } catch (error) {
    console.warn('Failed to load quick access items:', error)
  }
  return []
}

async function updateQuickAccessFrequency(userId: string, actionId: string): Promise<void> {
  try {
    await fetch(`/api/quick-access/${userId}/${actionId}`, {
      method: 'POST'
    })
  } catch (error) {
    console.warn('Failed to update quick access frequency:', error)
  }
}

function trackActionUsage(action: ContextualAction, context: WorkflowContext): void {
  // Track action usage for analytics
  const event = {
    type: 'action_executed',
    actionId: action.id,
    context: context.currentTask,
    timestamp: new Date()
  }
  
  // Send to analytics service
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'workflow_action', {
      action_id: action.id,
      context: context.currentTask
    })
  }
}

export default ContextualActions