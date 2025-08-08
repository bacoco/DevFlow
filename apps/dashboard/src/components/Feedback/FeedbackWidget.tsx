import React, { useState, useEffect } from 'react'
import { FeedbackWidget as FeedbackWidgetType, FeedbackQuestion } from '../../services/feedback/types'
import { feedbackSystem } from '../../services/feedback/FeedbackSystem'

interface FeedbackWidgetProps {
  widget: FeedbackWidgetType
  onClose: () => void
  onSubmit: (responses: Record<string, any>) => void
}

export const FeedbackWidget: React.FC<FeedbackWidgetProps> = ({
  widget,
  onClose,
  onSubmit
}) => {
  const [responses, setResponses] = useState<Record<string, any>>({})
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showThankYou, setShowThankYou] = useState(false)

  const currentQuestion = widget.content.questions[currentQuestionIndex]
  const isLastQuestion = currentQuestionIndex === widget.content.questions.length - 1
  const canProceed = !currentQuestion.required || responses[currentQuestion.id] !== undefined

  const handleResponse = (questionId: string, value: any) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: value
    }))
  }

  const handleNext = () => {
    if (isLastQuestion) {
      handleSubmit()
    } else {
      setCurrentQuestionIndex(prev => prev + 1)
    }
  }

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1)
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    
    try {
      await onSubmit(responses)
      setShowThankYou(true)
      
      // Auto-close after showing thank you message
      setTimeout(() => {
        onClose()
      }, 3000)
    } catch (error) {
      console.error('Failed to submit feedback:', error)
      // Show error message
    } finally {
      setIsSubmitting(false)
    }
  }

  const getPositionStyles = (): React.CSSProperties => {
    const baseStyles: React.CSSProperties = {
      position: 'fixed',
      zIndex: 1000,
      backgroundColor: widget.content.customization.theme === 'dark' ? '#1a1a1a' : '#ffffff',
      borderRadius: widget.content.customization.borderRadius,
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
      border: '1px solid #e0e0e0',
      maxWidth: '400px',
      width: '90%'
    }

    switch (widget.position) {
      case 'bottom-right':
        return { ...baseStyles, bottom: '20px', right: '20px' }
      case 'bottom-left':
        return { ...baseStyles, bottom: '20px', left: '20px' }
      case 'top-right':
        return { ...baseStyles, top: '20px', right: '20px' }
      case 'top-left':
        return { ...baseStyles, top: '20px', left: '20px' }
      case 'modal':
        return {
          ...baseStyles,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          maxWidth: '500px'
        }
      default:
        return baseStyles
    }
  }

  if (showThankYou) {
    return (
      <div style={getPositionStyles()}>
        <div className="p-6 text-center">
          <div className="text-2xl mb-2">🎉</div>
          <h3 className="text-lg font-semibold mb-2">Thank You!</h3>
          <p className="text-gray-600">{widget.content.thankYouMessage}</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {widget.position === 'modal' && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-999"
          onClick={onClose}
        />
      )}
      
      <div style={getPositionStyles()}>
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-semibold mb-1">
                {widget.content.title}
              </h3>
              {widget.content.description && (
                <p className="text-sm text-gray-600">
                  {widget.content.description}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              aria-label="Close feedback widget"
            >
              ×
            </button>
          </div>

          {/* Progress indicator */}
          {widget.content.questions.length > 1 && (
            <div className="mb-4">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Question {currentQuestionIndex + 1} of {widget.content.questions.length}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1">
                <div 
                  className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${((currentQuestionIndex + 1) / widget.content.questions.length) * 100}%` 
                  }}
                />
              </div>
            </div>
          )}

          {/* Question */}
          <div className="mb-6">
            <QuestionRenderer
              question={currentQuestion}
              value={responses[currentQuestion.id]}
              onChange={(value) => handleResponse(currentQuestion.id, value)}
            />
          </div>

          {/* Navigation */}
          <div className="flex justify-between">
            <button
              onClick={handlePrevious}
              disabled={currentQuestionIndex === 0}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            
            <button
              onClick={handleNext}
              disabled={!canProceed || isSubmitting}
              className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              style={{ backgroundColor: widget.content.customization.primaryColor }}
            >
              {isSubmitting ? 'Submitting...' : isLastQuestion ? 'Submit' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

interface QuestionRendererProps {
  question: FeedbackQuestion
  value: any
  onChange: (value: any) => void
}

const QuestionRenderer: React.FC<QuestionRendererProps> = ({
  question,
  value,
  onChange
}) => {
  switch (question.type) {
    case 'text':
      return (
        <div>
          <label className="block text-sm font-medium mb-2">
            {question.question}
            {question.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={3}
            placeholder="Please share your thoughts..."
          />
        </div>
      )

    case 'rating':
    case 'scale':
      return (
        <div>
          <label className="block text-sm font-medium mb-3">
            {question.question}
            {question.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <div className="flex items-center justify-between">
            {question.scale && (
              <>
                <span className="text-xs text-gray-500">
                  {question.scale.labels?.[question.scale.min] || question.scale.min}
                </span>
                <div className="flex space-x-2 mx-4">
                  {Array.from(
                    { length: question.scale.max - question.scale.min + 1 },
                    (_, i) => question.scale!.min + i
                  ).map((num) => (
                    <button
                      key={num}
                      onClick={() => onChange(num)}
                      className={`w-10 h-10 rounded-full border-2 text-sm font-medium transition-all ${
                        value === num
                          ? 'bg-blue-500 text-white border-blue-500'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-blue-300'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
                <span className="text-xs text-gray-500">
                  {question.scale.labels?.[question.scale.max] || question.scale.max}
                </span>
              </>
            )}
          </div>
        </div>
      )

    case 'nps':
      return (
        <div>
          <label className="block text-sm font-medium mb-3">
            {question.question}
            {question.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Not likely</span>
            <div className="flex space-x-1 mx-4">
              {Array.from({ length: 11 }, (_, i) => i).map((num) => (
                <button
                  key={num}
                  onClick={() => onChange(num)}
                  className={`w-8 h-8 rounded text-xs font-medium transition-all ${
                    value === num
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
            <span className="text-xs text-gray-500">Very likely</span>
          </div>
        </div>
      )

    case 'csat':
      const csatLabels = ['Very Dissatisfied', 'Dissatisfied', 'Neutral', 'Satisfied', 'Very Satisfied']
      return (
        <div>
          <label className="block text-sm font-medium mb-3">
            {question.question}
            {question.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <div className="flex justify-center space-x-2">
            {[1, 2, 3, 4, 5].map((num) => (
              <button
                key={num}
                onClick={() => onChange(num)}
                className={`flex flex-col items-center p-3 rounded-lg border-2 transition-all ${
                  value === num
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
                title={csatLabels[num - 1]}
              >
                <div className="text-2xl mb-1">
                  {num === 1 ? '😞' : num === 2 ? '😕' : num === 3 ? '😐' : num === 4 ? '🙂' : '😊'}
                </div>
                <span className="text-xs">{num}</span>
              </button>
            ))}
          </div>
        </div>
      )

    case 'multiple-choice':
      return (
        <div>
          <label className="block text-sm font-medium mb-3">
            {question.question}
            {question.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <div className="space-y-2">
            {question.options?.map((option, index) => (
              <label key={index} className="flex items-center">
                <input
                  type="radio"
                  name={question.id}
                  value={option}
                  checked={value === option}
                  onChange={(e) => onChange(e.target.value)}
                  className="mr-3 text-blue-500"
                />
                <span className="text-sm">{option}</span>
              </label>
            ))}
          </div>
        </div>
      )

    case 'yes-no':
      return (
        <div>
          <label className="block text-sm font-medium mb-3">
            {question.question}
            {question.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <div className="flex space-x-4">
            {['Yes', 'No'].map((option) => (
              <button
                key={option}
                onClick={() => onChange(option)}
                className={`px-6 py-2 rounded-md border-2 transition-all ${
                  value === option
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-blue-300'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      )

    default:
      return (
        <div className="text-red-500">
          Unsupported question type: {question.type}
        </div>
      )
  }
}