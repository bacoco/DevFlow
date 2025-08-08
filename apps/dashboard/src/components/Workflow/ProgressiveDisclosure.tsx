/**
 * Progressive Disclosure Component
 * Implements progressive disclosure patterns for complex interfaces
 */

import React, { useState, useEffect, useCallback } from 'react'
import { ChevronDownIcon, ChevronRightIcon, InfoIcon } from 'lucide-react'
import { ProgressiveDisclosureConfig, DisclosureLevel, WorkflowContext } from './types'

interface ProgressiveDisclosureProps {
  config: ProgressiveDisclosureConfig
  context: WorkflowContext
  children: React.ReactNode
  onLevelChange?: (level: number) => void
}

export const ProgressiveDisclosure: React.FC<ProgressiveDisclosureProps> = ({
  config,
  context,
  children,
  onLevelChange
}) => {
  const [currentLevel, setCurrentLevel] = useState(0)
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set([0]))
  const [userInteracted, setUserInteracted] = useState(false)

  // Determine initial level based on user experience
  useEffect(() => {
    const initialLevel = determineInitialLevel(config, context)
    setCurrentLevel(initialLevel)
    setExpandedSections(new Set(Array.from({ length: initialLevel + 1 }, (_, i) => i)))
  }, [config, context])

  // Auto-expand based on usage patterns
  useEffect(() => {
    if (config.adaptToUsage && !userInteracted) {
      const shouldExpand = shouldAutoExpand(context, config.component)
      if (shouldExpand && currentLevel < config.levels.length - 1) {
        const newLevel = Math.min(currentLevel + 1, config.levels.length - 1)
        setCurrentLevel(newLevel)
        setExpandedSections(prev => new Set([...prev, newLevel]))
      }
    }
  }, [context, config, currentLevel, userInteracted])

  const toggleSection = useCallback((level: number) => {
    setUserInteracted(true)
    setExpandedSections(prev => {
      const newSet = new Set(prev)
      if (newSet.has(level)) {
        newSet.delete(level)
      } else {
        newSet.add(level)
        // Auto-expand prerequisite levels
        for (let i = 0; i < level; i++) {
          newSet.add(i)
        }
      }
      return newSet
    })
    
    const maxExpanded = Math.max(...Array.from(expandedSections))
    if (onLevelChange && maxExpanded !== currentLevel) {
      setCurrentLevel(maxExpanded)
      onLevelChange(maxExpanded)
    }
  }, [expandedSections, currentLevel, onLevelChange])

  const expandToLevel = useCallback((targetLevel: number) => {
    setUserInteracted(true)
    const newExpanded = new Set(Array.from({ length: targetLevel + 1 }, (_, i) => i))
    setExpandedSections(newExpanded)
    setCurrentLevel(targetLevel)
    onLevelChange?.(targetLevel)
  }, [onLevelChange])

  return (
    <div className="progressive-disclosure" data-component={config.component}>
      {/* Quick Level Selector */}
      <div className="flex items-center gap-2 mb-4 p-2 bg-gray-50 rounded-lg">
        <span className="text-sm font-medium text-gray-700">Detail Level:</span>
        {config.levels.map((level, index) => (
          <button
            key={index}
            onClick={() => expandToLevel(index)}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              currentLevel >= index
                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
            }`}
            title={level.label}
          >
            {level.label}
          </button>
        ))}
      </div>

      {/* Progressive Content */}
      <div className="space-y-4">
        {config.levels.map((level, index) => {
          const isExpanded = expandedSections.has(index)
          const isAvailable = !level.condition || level.condition(context)
          
          if (!isAvailable) return null

          return (
            <DisclosureSection
              key={index}
              level={level}
              index={index}
              isExpanded={isExpanded}
              onToggle={() => toggleSection(index)}
              context={context}
            >
              {isExpanded && (
                <div className="mt-3">
                  {React.Children.toArray(children).filter((child: any) => 
                    child.props?.disclosureLevel === index
                  )}
                </div>
              )}
            </DisclosureSection>
          )
        })}
      </div>

      {/* Usage Hint */}
      {!userInteracted && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-2">
            <InfoIcon className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium">Progressive Interface</p>
              <p>This interface adapts to your experience level. Click sections to expand or use the detail level buttons above.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface DisclosureSectionProps {
  level: DisclosureLevel
  index: number
  isExpanded: boolean
  onToggle: () => void
  context: WorkflowContext
  children: React.ReactNode
}

const DisclosureSection: React.FC<DisclosureSectionProps> = ({
  level,
  index,
  isExpanded,
  onToggle,
  context,
  children
}) => {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronDownIcon className="w-4 h-4 text-gray-600" />
            ) : (
              <ChevronRightIcon className="w-4 h-4 text-gray-600" />
            )}
            <span className="font-medium text-gray-900">{level.label}</span>
          </div>
          <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">
            Level {index + 1}
          </span>
        </div>
        <div className="text-sm text-gray-500">
          {level.fields.length} field{level.fields.length !== 1 ? 's' : ''}
        </div>
      </button>
      
      {isExpanded && (
        <div className="p-4 bg-white border-t border-gray-200">
          {children}
        </div>
      )}
    </div>
  )
}

// Helper functions
function determineInitialLevel(config: ProgressiveDisclosureConfig, context: WorkflowContext): number {
  switch (context.userRole) {
    case 'admin':
      return Math.min(2, config.levels.length - 1)
    case 'team_lead':
      return Math.min(1, config.levels.length - 1)
    case 'developer':
      return config.userLevel === 'advanced' ? 1 : 0
    default:
      return 0
  }
}

function shouldAutoExpand(context: WorkflowContext, component: string): boolean {
  const recentActions = context.recentActions.filter(
    action => action.context.component === component
  )
  
  // Auto-expand if user frequently accesses advanced features
  const advancedActions = recentActions.filter(
    action => action.context.level > 0
  ).length
  
  return advancedActions > recentActions.length * 0.3
}

export default ProgressiveDisclosure