/**
 * Basic Workflow Tests
 * Core functionality tests for workflow optimization
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WorkflowOptimizer, OptimizedForm, SmartField } from '../WorkflowOptimizer'
import ProgressiveDisclosure from '../ProgressiveDisclosure'
import BatchOperations from '../BatchOperations'
import { ProgressiveDisclosureConfig, BatchOperation, WorkflowContext } from '../types'

// Mock API calls
global.fetch = jest.fn()

const mockWorkflowContext: WorkflowContext = {
  userId: 'test-user',
  userRole: 'developer',
  currentTask: 'test-task',
  recentActions: [],
  preferences: {
    defaultViews: {},
    shortcuts: [],
    batchOperations: true,
    progressiveDisclosure: true,
    autoSave: true
  }
}

describe('Workflow Optimization - Basic Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([])
    })
  })

  describe('Progressive Disclosure', () => {
    it('should render progressive disclosure with correct levels', () => {
      const disclosureConfig: ProgressiveDisclosureConfig = {
        component: 'test-form',
        levels: [
          { level: 0, label: 'Basic', fields: ['name'] },
          { level: 1, label: 'Advanced', fields: ['settings'] }
        ],
        userLevel: 'intermediate',
        adaptToUsage: true
      }

      render(
        <ProgressiveDisclosure config={disclosureConfig} context={mockWorkflowContext}>
          <div data-testid="basic-content">Basic Content</div>
          <div data-testid="advanced-content">Advanced Content</div>
        </ProgressiveDisclosure>
      )

      expect(screen.getByText('Detail Level:')).toBeInTheDocument()
      expect(screen.getByText('Basic')).toBeInTheDocument()
      expect(screen.getByText('Advanced')).toBeInTheDocument()
    })

    it('should expand sections when clicked', async () => {
      const user = userEvent.setup()
      const disclosureConfig: ProgressiveDisclosureConfig = {
        component: 'test-form',
        levels: [
          { level: 0, label: 'Basic', fields: ['name'] },
          { level: 1, label: 'Advanced', fields: ['settings'] }
        ],
        userLevel: 'beginner',
        adaptToUsage: false
      }

      render(
        <ProgressiveDisclosure config={disclosureConfig} context={mockWorkflowContext}>
          <div data-testid="basic-content">Basic Content</div>
          <div data-testid="advanced-content">Advanced Content</div>
        </ProgressiveDisclosure>
      )

      // Initially only basic should be expanded
      expect(screen.getByTestId('basic-content')).toBeInTheDocument()
      expect(screen.queryByTestId('advanced-content')).not.toBeInTheDocument()

      // Click to expand advanced
      const advancedButton = screen.getByRole('button', { name: /advanced/i })
      await user.click(advancedButton)

      // Now advanced content should be visible
      await waitFor(() => {
        expect(screen.getByTestId('advanced-content')).toBeInTheDocument()
      })
    })
  })

  describe('Batch Operations', () => {
    it('should render batch operation buttons', () => {
      const batchOperations: BatchOperation[] = [
        {
          id: 'delete-multiple',
          name: 'Delete Selected',
          description: 'Delete multiple items',
          actions: [{ type: 'delete', target: 'item', parameters: {} }],
          confirmationRequired: false,
          undoable: true
        }
      ]

      render(
        <BatchOperations
          operations={batchOperations}
          selectedItems={['item1', 'item2']}
          context={mockWorkflowContext}
          onExecute={jest.fn()}
        />
      )

      expect(screen.getByRole('button', { name: /delete selected/i })).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument() // Item count badge
    })

    it('should execute batch operations', async () => {
      const user = userEvent.setup()
      const onExecute = jest.fn().mockResolvedValue(undefined)
      
      const batchOperations: BatchOperation[] = [
        {
          id: 'test-operation',
          name: 'Test Operation',
          description: 'Test batch operation',
          actions: [{ type: 'test', target: 'item', parameters: {} }],
          confirmationRequired: false,
          undoable: false
        }
      ]

      render(
        <BatchOperations
          operations={batchOperations}
          selectedItems={['item1', 'item2']}
          context={mockWorkflowContext}
          onExecute={onExecute}
        />
      )

      const operationButton = screen.getByRole('button', { name: /test operation/i })
      await user.click(operationButton)

      await waitFor(() => {
        expect(onExecute).toHaveBeenCalledWith(batchOperations[0], ['item1', 'item2'])
      })
    })
  })

  describe('Smart Fields', () => {
    it('should render smart field with label', () => {
      render(
        <WorkflowOptimizer userId="test-user" userRole="developer">
          <SmartField
            field="testField"
            label="Test Field"
            onChange={jest.fn()}
          />
        </WorkflowOptimizer>
      )

      expect(screen.getByText('Test Field')).toBeInTheDocument()
      expect(screen.getByRole('textbox')).toBeInTheDocument()
    })

    it('should handle field changes', async () => {
      const user = userEvent.setup()
      const onChange = jest.fn()

      render(
        <WorkflowOptimizer userId="test-user" userRole="developer">
          <SmartField
            field="testField"
            label="Test Field"
            onChange={onChange}
          />
        </WorkflowOptimizer>
      )

      const input = screen.getByRole('textbox')
      await user.type(input, 'test value')

      expect(input).toHaveValue('test value')
    })
  })

  describe('Optimized Form', () => {
    it('should render form with title and submit button', () => {
      render(
        <WorkflowOptimizer userId="test-user" userRole="developer">
          <OptimizedForm
            formId="test-form"
            title="Test Form"
            onSubmit={jest.fn()}
          >
            <SmartField
              field="testField"
              label="Test Field"
              onChange={jest.fn()}
            />
          </OptimizedForm>
        </WorkflowOptimizer>
      )

      expect(screen.getByText('Test Form')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument()
      expect(screen.getByText('Test Field')).toBeInTheDocument()
    })

    it('should handle form submission', async () => {
      const user = userEvent.setup()
      const onSubmit = jest.fn().mockResolvedValue(undefined)

      render(
        <WorkflowOptimizer userId="test-user" userRole="developer">
          <OptimizedForm
            formId="test-form"
            title="Test Form"
            onSubmit={onSubmit}
          >
            <SmartField
              field="testField"
              label="Test Field"
              onChange={jest.fn()}
            />
          </OptimizedForm>
        </WorkflowOptimizer>
      )

      // Fill the form
      const input = screen.getByRole('textbox')
      await user.type(input, 'test value')

      // Submit the form
      const submitButton = screen.getByRole('button', { name: /submit/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalled()
      })
    })
  })

  describe('Workflow Context', () => {
    it('should provide workflow context to child components', () => {
      render(
        <WorkflowOptimizer userId="test-user" userRole="team_lead" currentTask="important-task">
          <div data-testid="child-component">Child Component</div>
        </WorkflowOptimizer>
      )

      expect(screen.getByTestId('child-component')).toBeInTheDocument()
    })
  })

  describe('Performance Optimization', () => {
    it('should complete basic operations quickly', async () => {
      const startTime = performance.now()
      
      render(
        <WorkflowOptimizer userId="test-user" userRole="developer">
          <OptimizedForm
            formId="perf-test"
            title="Performance Test"
            onSubmit={jest.fn()}
          >
            <SmartField field="field1" label="Field 1" onChange={jest.fn()} />
            <SmartField field="field2" label="Field 2" onChange={jest.fn()} />
            <SmartField field="field3" label="Field 3" onChange={jest.fn()} />
          </OptimizedForm>
        </WorkflowOptimizer>
      )

      const renderTime = performance.now() - startTime
      
      // Should render quickly
      expect(renderTime).toBeLessThan(100) // Less than 100ms
      expect(screen.getByText('Performance Test')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      // Mock API failure
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'))

      render(
        <WorkflowOptimizer userId="test-user" userRole="developer">
          <OptimizedForm
            formId="error-test"
            title="Error Test"
            onSubmit={jest.fn()}
          >
            <SmartField field="testField" label="Test Field" onChange={jest.fn()} />
          </OptimizedForm>
        </WorkflowOptimizer>
      )

      // Should still render despite API error
      expect(screen.getByText('Error Test')).toBeInTheDocument()
      expect(screen.getByText('Test Field')).toBeInTheDocument()
    })
  })
})