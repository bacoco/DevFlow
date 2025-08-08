/**
 * Batch Operations Component
 * Enables efficient bulk operations with reduced click paths
 */

import React, { useState, useCallback, useRef } from 'react'
import { CheckIcon, XIcon, PlayIcon, UndoIcon, AlertTriangleIcon } from 'lucide-react'
import { BatchOperation, BatchAction, WorkflowContext } from './types'

interface BatchOperationsProps {
  operations: BatchOperation[]
  selectedItems: string[]
  context: WorkflowContext
  onExecute: (operation: BatchOperation, items: string[]) => Promise<void>
  onUndo?: (operationId: string) => Promise<void>
}

export const BatchOperations: React.FC<BatchOperationsProps> = ({
  operations,
  selectedItems,
  context,
  onExecute,
  onUndo
}) => {
  const [isExecuting, setIsExecuting] = useState(false)
  const [executionHistory, setExecutionHistory] = useState<ExecutionRecord[]>([])
  const [showConfirmation, setShowConfirmation] = useState<BatchOperation | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const executeOperation = useCallback(async (operation: BatchOperation) => {
    if (selectedItems.length === 0) return

    if (operation.confirmationRequired) {
      setShowConfirmation(operation)
      return
    }

    await performExecution(operation)
  }, [selectedItems])

  const performExecution = useCallback(async (operation: BatchOperation) => {
    setIsExecuting(true)
    abortControllerRef.current = new AbortController()

    const executionRecord: ExecutionRecord = {
      id: `${operation.id}-${Date.now()}`,
      operationId: operation.id,
      operationName: operation.name,
      itemCount: selectedItems.length,
      startTime: new Date(),
      status: 'running',
      undoable: operation.undoable
    }

    setExecutionHistory(prev => [executionRecord, ...prev.slice(0, 9)]) // Keep last 10

    try {
      await onExecute(operation, selectedItems)
      
      setExecutionHistory(prev => prev.map(record => 
        record.id === executionRecord.id 
          ? { ...record, status: 'completed', endTime: new Date() }
          : record
      ))
    } catch (error) {
      setExecutionHistory(prev => prev.map(record => 
        record.id === executionRecord.id 
          ? { ...record, status: 'failed', endTime: new Date(), error: error.message }
          : record
      ))
    } finally {
      setIsExecuting(false)
      setShowConfirmation(null)
      abortControllerRef.current = null
    }
  }, [selectedItems, onExecute])

  const cancelExecution = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      setIsExecuting(false)
    }
  }, [])

  const undoOperation = useCallback(async (record: ExecutionRecord) => {
    if (!onUndo || !record.undoable) return

    try {
      await onUndo(record.id)
      setExecutionHistory(prev => prev.map(r => 
        r.id === record.id 
          ? { ...r, status: 'undone', undoTime: new Date() }
          : r
      ))
    } catch (error) {
      console.error('Failed to undo operation:', error)
    }
  }, [onUndo])

  const availableOperations = operations.filter(op => 
    isOperationAvailable(op, selectedItems, context)
  )

  return (
    <div className="batch-operations">
      {/* Operation Buttons */}
      <div className="flex flex-wrap gap-2 mb-4">
        {availableOperations.map(operation => (
          <BatchOperationButton
            key={operation.id}
            operation={operation}
            selectedCount={selectedItems.length}
            isExecuting={isExecuting}
            onExecute={() => executeOperation(operation)}
          />
        ))}
        
        {isExecuting && (
          <button
            onClick={cancelExecution}
            className="px-3 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors flex items-center gap-2"
          >
            <XIcon className="w-4 h-4" />
            Cancel
          </button>
        )}
      </div>

      {/* Execution History */}
      {executionHistory.length > 0 && (
        <ExecutionHistory
          history={executionHistory}
          onUndo={undoOperation}
        />
      )}

      {/* Confirmation Modal */}
      {showConfirmation && (
        <ConfirmationModal
          operation={showConfirmation}
          itemCount={selectedItems.length}
          onConfirm={() => performExecution(showConfirmation)}
          onCancel={() => setShowConfirmation(null)}
        />
      )}
    </div>
  )
}

interface BatchOperationButtonProps {
  operation: BatchOperation
  selectedCount: number
  isExecuting: boolean
  onExecute: () => void
}

const BatchOperationButton: React.FC<BatchOperationButtonProps> = ({
  operation,
  selectedCount,
  isExecuting,
  onExecute
}) => {
  const isDisabled = selectedCount === 0 || isExecuting

  return (
    <button
      onClick={onExecute}
      disabled={isDisabled}
      className={`px-4 py-2 rounded-md transition-colors flex items-center gap-2 ${
        isDisabled
          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
          : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
      }`}
      title={operation.description}
    >
      <PlayIcon className="w-4 h-4" />
      {operation.name}
      {selectedCount > 0 && (
        <span className="bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full text-xs">
          {selectedCount}
        </span>
      )}
    </button>
  )
}

interface ExecutionRecord {
  id: string
  operationId: string
  operationName: string
  itemCount: number
  startTime: Date
  endTime?: Date
  undoTime?: Date
  status: 'running' | 'completed' | 'failed' | 'undone'
  error?: string
  undoable: boolean
}

interface ExecutionHistoryProps {
  history: ExecutionRecord[]
  onUndo: (record: ExecutionRecord) => void
}

const ExecutionHistory: React.FC<ExecutionHistoryProps> = ({ history, onUndo }) => {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <h4 className="font-medium text-gray-900 mb-3">Recent Operations</h4>
      <div className="space-y-2">
        {history.map(record => (
          <div
            key={record.id}
            className="flex items-center justify-between p-2 bg-white rounded border"
          >
            <div className="flex items-center gap-3">
              <StatusIcon status={record.status} />
              <div>
                <div className="font-medium text-sm">{record.operationName}</div>
                <div className="text-xs text-gray-500">
                  {record.itemCount} items • {formatTime(record.startTime)}
                  {record.endTime && ` (${getDuration(record.startTime, record.endTime)})`}
                </div>
                {record.error && (
                  <div className="text-xs text-red-600 mt-1">{record.error}</div>
                )}
              </div>
            </div>
            
            {record.undoable && record.status === 'completed' && (
              <button
                onClick={() => onUndo(record)}
                className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors flex items-center gap-1"
              >
                <UndoIcon className="w-3 h-3" />
                Undo
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

const StatusIcon: React.FC<{ status: ExecutionRecord['status'] }> = ({ status }) => {
  switch (status) {
    case 'running':
      return <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    case 'completed':
      return <CheckIcon className="w-4 h-4 text-green-600" />
    case 'failed':
      return <XIcon className="w-4 h-4 text-red-600" />
    case 'undone':
      return <UndoIcon className="w-4 h-4 text-gray-600" />
    default:
      return null
  }
}

interface ConfirmationModalProps {
  operation: BatchOperation
  itemCount: number
  onConfirm: () => void
  onCancel: () => void
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  operation,
  itemCount,
  onConfirm,
  onCancel
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangleIcon className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-gray-900">Confirm Batch Operation</h3>
            <p className="text-gray-600 mt-1">
              Are you sure you want to perform "{operation.name}" on {itemCount} items?
            </p>
            {operation.description && (
              <p className="text-sm text-gray-500 mt-2">{operation.description}</p>
            )}
          </div>
        </div>
        
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}

// Helper functions
function isOperationAvailable(
  operation: BatchOperation,
  selectedItems: string[],
  context: WorkflowContext
): boolean {
  // Check if operation is available based on context and selection
  return selectedItems.length > 0
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function getDuration(start: Date, end: Date): string {
  const ms = end.getTime() - start.getTime()
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${Math.round(ms / 1000)}s`
  return `${Math.round(ms / 60000)}m`
}

export default BatchOperations