import React, { useState, useEffect } from 'react'
import { FeedbackWidget } from './FeedbackWidget'
import { feedbackSystem } from '../../services/feedback/FeedbackSystem'
import { FeedbackWidget as FeedbackWidgetType } from '../../services/feedback/types'

export const FeedbackWidgetManager: React.FC = () => {
  const [activeWidget, setActiveWidget] = useState<FeedbackWidgetType | null>(null)
  const [showThankYou, setShowThankYou] = useState(false)
  const [thankYouMessage, setThankYouMessage] = useState('')

  useEffect(() => {
    // Listen for widget show events
    const handleShowWidget = (event: CustomEvent) => {
      setActiveWidget(event.detail.widget)
    }

    const handleHideWidget = () => {
      setActiveWidget(null)
    }

    const handleThankYou = (event: CustomEvent) => {
      setThankYouMessage(event.detail.message)
      setShowThankYou(true)
      setTimeout(() => {
        setShowThankYou(false)
      }, 3000)
    }

    document.addEventListener('show-feedback-widget', handleShowWidget as EventListener)
    document.addEventListener('hide-feedback-widget', handleHideWidget as EventListener)
    document.addEventListener('show-thank-you-message', handleThankYou as EventListener)

    return () => {
      document.removeEventListener('show-feedback-widget', handleShowWidget as EventListener)
      document.removeEventListener('hide-feedback-widget', handleHideWidget as EventListener)
      document.removeEventListener('show-thank-you-message', handleThankYou as EventListener)
    }
  }, [])

  const handleSubmit = async (responses: Record<string, any>) => {
    if (!activeWidget) return

    try {
      await feedbackSystem.submitFeedback(activeWidget.id, responses)
      
      // Handle NPS and CSAT responses
      if (activeWidget.type === 'nps') {
        const npsScore = responses['nps-score']
        const npsComment = responses['nps-comment']
        if (typeof npsScore === 'number') {
          feedbackSystem.recordNPS(npsScore, npsComment, 'widget')
        }
      } else if (activeWidget.type === 'csat') {
        const csatScore = responses['csat-score']
        const csatComment = responses['csat-comment']
        if (typeof csatScore === 'number') {
          feedbackSystem.recordCSAT(csatScore, 'general', csatComment)
        }
      }
    } catch (error) {
      console.error('Failed to submit feedback:', error)
      throw error
    }
  }

  const handleClose = () => {
    setActiveWidget(null)
  }

  return (
    <>
      {activeWidget && (
        <FeedbackWidget
          widget={activeWidget}
          onClose={handleClose}
          onSubmit={handleSubmit}
        />
      )}
      
      {showThankYou && (
        <ThankYouNotification message={thankYouMessage} />
      )}
    </>
  )
}

interface ThankYouNotificationProps {
  message: string
}

const ThankYouNotification: React.FC<ThankYouNotificationProps> = ({ message }) => {
  return (
    <div className="fixed bottom-4 right-4 z-1000">
      <div className="bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center animate-slide-in-right">
        <span className="text-xl mr-2">✓</span>
        <span>{message}</span>
      </div>
    </div>
  )
}