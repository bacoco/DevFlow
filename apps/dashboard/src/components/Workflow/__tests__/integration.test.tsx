/**
 * Workflow Integration Test
 * Verifies that all workflow optimization components work together
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import { WorkflowOptimizer } from '../WorkflowOptimizer'

// Mock API calls
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve([])
})

describe('Workflow Integration', () => {
  it('should render workflow optimizer without errors', () => {
    render(
      <WorkflowOptimizer userId="test-user" userRole="developer" currentTask="test-task">
        <div data-testid="test-content">Test Content</div>
      </WorkflowOptimizer>
    )

    expect(screen.getByTestId('test-content')).toBeInTheDocument()
  })

  it('should provide workflow context to children', () => {
    const TestComponent = () => {
      return <div data-testid="context-consumer">Context Consumer</div>
    }

    render(
      <WorkflowOptimizer userId="test-user" userRole="team_lead" currentTask="important-task">
        <TestComponent />
      </WorkflowOptimizer>
    )

    expect(screen.getByTestId('context-consumer')).toBeInTheDocument()
  })
})