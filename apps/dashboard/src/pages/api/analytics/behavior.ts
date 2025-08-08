import { NextApiRequest, NextApiResponse } from 'next'
import { UserBehaviorEvent } from '../../../services/feedback/types'

// In-memory storage for demo purposes
// In production, this would use a proper database
let behaviorEvents: UserBehaviorEvent[] = []

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const event: UserBehaviorEvent = req.body
      
      // Validate required fields
      if (!event.sessionId || !event.type || !event.element || !event.page) {
        return res.status(400).json({ error: 'Missing required fields' })
      }

      // Add timestamp if not provided
      if (!event.timestamp) {
        event.timestamp = new Date()
      }

      // Generate ID if not provided
      if (!event.id) {
        event.id = `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      }

      // Store the event
      behaviorEvents.push(event)

      // Keep only last 10000 events in memory
      if (behaviorEvents.length > 10000) {
        behaviorEvents = behaviorEvents.slice(-10000)
      }

      res.status(201).json({ success: true, id: event.id })
    } catch (error) {
      console.error('Error saving behavior event:', error)
      res.status(500).json({ error: 'Failed to save behavior event' })
    }
  } else if (req.method === 'GET') {
    try {
      const { 
        sessionId, 
        userId, 
        type, 
        startDate, 
        endDate, 
        limit = '1000' 
      } = req.query
      
      let filteredEvents = behaviorEvents

      // Filter by session ID
      if (sessionId && typeof sessionId === 'string') {
        filteredEvents = filteredEvents.filter(e => e.sessionId === sessionId)
      }

      // Filter by user ID
      if (userId && typeof userId === 'string') {
        filteredEvents = filteredEvents.filter(e => e.userId === userId)
      }

      // Filter by event type
      if (type && typeof type === 'string') {
        filteredEvents = filteredEvents.filter(e => e.type === type)
      }

      // Filter by date range
      if (startDate && typeof startDate === 'string') {
        const start = new Date(startDate)
        filteredEvents = filteredEvents.filter(e => new Date(e.timestamp) >= start)
      }

      if (endDate && typeof endDate === 'string') {
        const end = new Date(endDate)
        filteredEvents = filteredEvents.filter(e => new Date(e.timestamp) <= end)
      }

      // Apply limit
      const limitNum = parseInt(limit as string, 10)
      if (!isNaN(limitNum)) {
        filteredEvents = filteredEvents.slice(-limitNum)
      }

      // Calculate basic analytics
      const analytics = {
        totalEvents: filteredEvents.length,
        uniqueSessions: new Set(filteredEvents.map(e => e.sessionId)).size,
        uniqueUsers: new Set(filteredEvents.map(e => e.userId).filter(Boolean)).size,
        eventTypes: filteredEvents.reduce((acc, event) => {
          acc[event.type] = (acc[event.type] || 0) + 1
          return acc
        }, {} as Record<string, number>),
        topPages: filteredEvents.reduce((acc, event) => {
          acc[event.page] = (acc[event.page] || 0) + 1
          return acc
        }, {} as Record<string, number>)
      }

      res.status(200).json({
        events: filteredEvents,
        analytics
      })
    } catch (error) {
      console.error('Error fetching behavior events:', error)
      res.status(500).json({ error: 'Failed to fetch behavior events' })
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST'])
    res.status(405).json({ error: `Method ${req.method} not allowed` })
  }
}