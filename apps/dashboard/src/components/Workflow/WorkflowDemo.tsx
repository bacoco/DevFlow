/**
 * Workflow Optimization Demo
 * Demonstrates streamlined workflow features
 */

import React, { useState } from 'react'
import { PlayIcon, CheckIcon, ClockIcon, ZapIcon } from 'lucide-react'
import { WorkflowOptimizer, OptimizedForm, SmartField } from './WorkflowOptimizer'
import { ProgressiveDisclosureConfig, BatchOperation, ContextualAction } from './types'

export const WorkflowDemo: React.FC = () => {
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [demoMetrics, setDemoMetrics] = useState({
    taskCompletionTime: 0,
    clickCount: 0,
    shortcutUsage: 0,
    batchOperationUsage: 0
  })

  // Progressive disclosure configuration
  const disclosureConfig: ProgressiveDisclosureConfig = {
    component: 'task-form',
    levels: [
      {
        level: 0,
        label: 'Essential',
        fields: ['title', 'priority', 'assignee']
      },
      {
        level: 1,
        label: 'Details',
        fields: ['description', 'tags', 'dueDate']
      },
      {
        level: 2,
        label: 'Advanced',
        fields: ['customFields', 'automation', 'integrations']
      }
    ],
    userLevel: 'intermediate',
    adaptToUsage: true
  }

  // Batch operations
  const batchOperations: BatchOperation[] = [
    {
      id: 'assign-multiple',
      name: 'Assign to Team',
      description: 'Assign selected tasks to team members',
      actions: [{ type: 'assign', target: 'task', parameters: {} }],
      confirmationRequired: false,
      undoable: true
    },
    {
      id: 'update-priority',
      name: 'Update Priority',
      description: 'Change priority for selected tasks',
      actions: [{ type: 'update', target: 'priority', parameters: {} }],
      confirmationRequired: true,
      undoable: true
    },
    {
      id: 'bulk-delete',
      name: 'Delete Selected',
      description: 'Delete multiple tasks at once',
      actions: [{ type: 'delete', target: 'task', parameters: {} }],
      confirmationRequired: true,
      undoable: false
    }
  ]

  // Contextual actions
  const contextualActions: ContextualAction[] = [
    {
      id: 'quick-save',
      label: 'Quick Save',
      icon: '💾',
      shortcut: 'Ctrl+S',
      action: async () => {
        setDemoMetrics(prev => ({ ...prev, shortcutUsage: prev.shortcutUsage + 1 }))
        console.log('Quick save executed')
      },
      condition: () => true,
      priority: 1
    },
    {
      id: 'duplicate-task',
      label: 'Duplicate',
      icon: '📋',
      shortcut: 'Ctrl+D',
      action: async () => {
        setDemoMetrics(prev => ({ ...prev, shortcutUsage: prev.shortcutUsage + 1 }))
        console.log('Task duplicated')
      },
      condition: () => true,
      priority: 2
    },
    {
      id: 'export-data',
      label: 'Export',
      icon: '📤',
      shortcut: 'Ctrl+E',
      action: async () => {
        setDemoMetrics(prev => ({ ...prev, shortcutUsage: prev.shortcutUsage + 1 }))
        console.log('Data exported')
      },
      condition: () => true,
      priority: 3
    }
  ]

  const handleFormSubmit = async (data: any) => {
    const startTime = performance.now()
    
    // Simulate form processing
    await new Promise(resolve => setTimeout(resolve, 500))
    
    const completionTime = performance.now() - startTime
    setDemoMetrics(prev => ({
      ...prev,
      taskCompletionTime: completionTime
    }))
    
    console.log('Form submitted:', data)
  }

  const handleBatchOperation = async (operation: BatchOperation, items: string[]) => {
    setDemoMetrics(prev => ({
      ...prev,
      batchOperationUsage: prev.batchOperationUsage + 1
    }))
    
    console.log(`Batch operation ${operation.name} executed on ${items.length} items`)
  }

  const handleContextualAction = async (action: ContextualAction) => {
    await action.action({
      userId: 'demo-user',
      userRole: 'developer',
      currentTask: 'task-form',
      recentActions: [],
      preferences: {
        defaultViews: {},
        shortcuts: [],
        batchOperations: true,
        progressiveDisclosure: true,
        autoSave: true
      }
    })
  }

  const mockTasks = [
    { id: 'task-1', title: 'Fix login bug', priority: 'high' },
    { id: 'task-2', title: 'Add user dashboard', priority: 'medium' },
    { id: 'task-3', title: 'Update documentation', priority: 'low' },
    { id: 'task-4', title: 'Optimize database queries', priority: 'high' },
    { id: 'task-5', title: 'Implement dark mode', priority: 'medium' }
  ]

  return (
    <div className="workflow-demo p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Workflow Optimization Demo
        </h1>
        <p className="text-lg text-gray-600">
          Experience streamlined workflows with progressive disclosure, smart defaults, 
          batch operations, and contextual actions.
        </p>
      </div>

      {/* Metrics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <MetricCard
          icon={<ClockIcon className="w-5 h-5" />}
          label="Task Completion"
          value={`${Math.round(demoMetrics.taskCompletionTime)}ms`}
          color="blue"
        />
        <MetricCard
          icon={<ZapIcon className="w-5 h-5" />}
          label="Shortcuts Used"
          value={demoMetrics.shortcutUsage.toString()}
          color="green"
        />
        <MetricCard
          icon={<CheckIcon className="w-5 h-5" />}
          label="Batch Operations"
          value={demoMetrics.batchOperationUsage.toString()}
          color="purple"
        />
        <MetricCard
          icon={<PlayIcon className="w-5 h-5" />}
          label="Click Reduction"
          value={`${Math.max(0, 15 - demoMetrics.clickCount)}%`}
          color="orange"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Task Selection Panel */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Task Selection (for Batch Operations)
          </h3>
          <div className="space-y-2">
            {mockTasks.map(task => (
              <label key={task.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded">
                <input
                  type="checkbox"
                  checked={selectedItems.includes(task.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedItems(prev => [...prev, task.id])
                    } else {
                      setSelectedItems(prev => prev.filter(id => id !== task.id))
                    }
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="font-medium text-sm">{task.title}</div>
                  <div className={`text-xs px-2 py-0.5 rounded-full inline-block ${
                    task.priority === 'high' ? 'bg-red-100 text-red-700' :
                    task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {task.priority}
                  </div>
                </div>
              </label>
            ))}
          </div>
          <div className="mt-4 text-sm text-gray-600">
            Selected: {selectedItems.length} tasks
          </div>
        </div>

        {/* Optimized Form */}
        <WorkflowOptimizer userId="demo-user" userRole="developer" currentTask="task-form">
          <OptimizedForm
            formId="task-form"
            title="Create Task (Optimized)"
            onSubmit={handleFormSubmit}
            disclosureConfig={disclosureConfig}
            batchOperations={batchOperations}
            contextualActions={contextualActions}
            selectedItems={selectedItems}
          >
            {/* Essential Level (0) */}
            <SmartField
              field="title"
              label="Task Title"
              required
              disclosureLevel={0}
              onChange={() => {}}
            />
            <SmartField
              field="priority"
              label="Priority"
              type="select"
              options={[
                { value: 'low', label: 'Low' },
                { value: 'medium', label: 'Medium' },
                { value: 'high', label: 'High' }
              ]}
              disclosureLevel={0}
              onChange={() => {}}
            />
            <SmartField
              field="assignee"
              label="Assignee"
              type="select"
              options={[
                { value: 'john', label: 'John Doe' },
                { value: 'jane', label: 'Jane Smith' },
                { value: 'bob', label: 'Bob Johnson' }
              ]}
              disclosureLevel={0}
              onChange={() => {}}
            />

            {/* Details Level (1) */}
            <SmartField
              field="description"
              label="Description"
              type="textarea"
              disclosureLevel={1}
              onChange={() => {}}
            />
            <SmartField
              field="tags"
              label="Tags"
              disclosureLevel={1}
              onChange={() => {}}
            />
            <SmartField
              field="dueDate"
              label="Due Date"
              type="date"
              disclosureLevel={1}
              onChange={() => {}}
            />

            {/* Advanced Level (2) */}
            <SmartField
              field="customFields"
              label="Custom Fields"
              type="textarea"
              disclosureLevel={2}
              onChange={() => {}}
            />
            <SmartField
              field="automation"
              label="Automation Rules"
              type="select"
              options={[
                { value: 'none', label: 'None' },
                { value: 'auto-assign', label: 'Auto-assign' },
                { value: 'auto-close', label: 'Auto-close when done' }
              ]}
              disclosureLevel={2}
              onChange={() => {}}
            />
          </OptimizedForm>
        </WorkflowOptimizer>
      </div>

      {/* Feature Highlights */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <FeatureCard
          title="Progressive Disclosure"
          description="Interface complexity adapts to user expertise and usage patterns"
          icon="🎯"
        />
        <FeatureCard
          title="Smart Defaults"
          description="AI-powered defaults based on user role, history, and team patterns"
          icon="🧠"
        />
        <FeatureCard
          title="Batch Operations"
          description="Reduce clicks with bulk actions and undo capabilities"
          icon="⚡"
        />
        <FeatureCard
          title="State Preservation"
          description="Seamless context switching with automatic state saving"
          icon="💾"
        />
      </div>

      {/* Keyboard Shortcuts Guide */}
      <div className="mt-8 bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Keyboard Shortcuts (Try them!)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3">
            <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-sm">Ctrl+S</kbd>
            <span className="text-sm text-gray-600">Quick Save</span>
          </div>
          <div className="flex items-center gap-3">
            <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-sm">Ctrl+D</kbd>
            <span className="text-sm text-gray-600">Duplicate Task</span>
          </div>
          <div className="flex items-center gap-3">
            <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-sm">Ctrl+E</kbd>
            <span className="text-sm text-gray-600">Export Data</span>
          </div>
        </div>
      </div>
    </div>
  )
}

interface MetricCardProps {
  icon: React.ReactNode
  label: string
  value: string
  color: 'blue' | 'green' | 'purple' | 'orange'
}

const MetricCard: React.FC<MetricCardProps> = ({ icon, label, value, color }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
    orange: 'bg-orange-50 text-orange-600 border-orange-200'
  }

  return (
    <div className={`p-4 rounded-lg border ${colorClasses[color]}`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  )
}

interface FeatureCardProps {
  title: string
  description: string
  icon: string
}

const FeatureCard: React.FC<FeatureCardProps> = ({ title, description, icon }) => {
  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
      <div className="text-3xl mb-3">{icon}</div>
      <h4 className="font-semibold text-gray-900 mb-2">{title}</h4>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  )
}

export default WorkflowDemo