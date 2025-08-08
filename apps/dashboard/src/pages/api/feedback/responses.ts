import { NextApiRequest, NextApiResponse } from 'next'
import { FeedbackResponse } from '../../../services/feedback/types'

// In-memory storage for demo purposes
// In production, this would use a proper database
let feedbackResponses: FeedbackResponse[] = []

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const response: FeedbackResponse = req.body
      
      // Validate required fields
      if (!response.widgetId || !response.sessionId || !response.responses) {
        return res.status(400).json({ error: 'Missing required fields' })
      }

      // Add timestamp if not provided
      if (!response.submittedAt) {
        response.submittedAt = new Date()
      }

      // Generate ID if not provided
      if (!response.id) {
        response.id = `response-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      }

      // Store the response
      feedbackResponses.push(response)

      // Keep only last 1000 responses in memory
      if (feedbackResponses.length > 1000) {
        feedbackResponses = feedbackResponses.slice(-1000)
      }

      res.status(201).json({ success: true, id: response.id })
    } catch (error) {
      console.error('Error saving feedback response:', error)
      res.status(500).json({ error: 'Failed to save feedback response' })
    }
  } else if (req.method === 'GET') {
    try {
      const { widgetId, startDate, endDate, limit = '100' } = req.query
      
      let filteredResponses = feedbackResponses

      // Filter by widget ID
      if (widgetId && typeof widgetId === 'string') {
        filteredResponses = filteredResponses.filter(r => r.widgetId === widgetId)
      }

      // Filter by date range
      if (startDate && typeof startDate === 'string') {
        const start = new Date(startDate)
        filteredResponses = filteredResponses.filter(r => new Date(r.submittedAt) >= start)
      }

      if (endDate && typeof endDate === 'string') {
        const end = new Date(endDate)
        filteredResponses = filteredResponses.filter(r => new Date(r.submittedAt) <= end)
      }

      // Apply limit
      const limitNum = parseInt(limit as string, 10)
      if (!isNaN(limitNum)) {
        filteredResponses = filteredResponses.slice(-limitNum)
      }

      res.status(200).json({
        responses: filteredResponses,
        total: filteredResponses.length
      })
    } catch (error) {
      console.error('Error fetching feedback responses:', error)
      res.status(500).json({ error: 'Failed to fetch feedback responses' })
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST'])
    res.status(405).json({ error: `Method ${req.method} not allowed` })
  }
}