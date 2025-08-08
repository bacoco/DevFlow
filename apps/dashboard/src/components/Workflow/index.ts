/**
 * Workflow Optimization Components
 * Streamlined workflow optimization with reduced click paths and smart defaults
 */

export { default as WorkflowOptimizer, OptimizedForm, SmartField } from './WorkflowOptimizer'
export { default as ProgressiveDisclosure } from './ProgressiveDisclosure'
export { default as SmartDefaultsProvider, SmartInput, useSmartDefaults } from './SmartDefaultsEngine'
export { default as BatchOperations } from './BatchOperations'
export { default as ContextualActions } from './ContextualActions'
export {
  default as StatePreservationProvider,
  useStatePreservation,
  useAutoSaveState,
  StateRestorationNotification,
  ContextSwitcher
} from './StatePreservation'

export * from './types'