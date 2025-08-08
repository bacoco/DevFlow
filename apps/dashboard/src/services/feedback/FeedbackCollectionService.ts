import { 
  FeedbackWidget, 
  FeedbackResponse, 
  FeedbackTrigger, 
  TriggerCondition,
  UserContext,
  FeedbackMetadata,
  BehaviorEventType,
  UserBehaviorEvent
} from './types'

/**
 * Service for collecting user feedback through contextual surveys and widgets
 */
export class FeedbackCollectionService {
  private widgets: Map<string, FeedbackWidget> = new Map()
  private activeWidgets: Set<string> = new Set()
  private userContext: UserContext | null = null
  private sessionId: string
  private eventListeners: Map<string, EventListener> = new Map()

  constructor() {
    this.sessionId = this.generateSessionId()
    this.initializeEventTracking()
  }

  /**
   * Register a feedback widget
   */
  registerWidget(widget: FeedbackWidget): void {
    this.widgets.set(widget.id, widget)
    
    if (widget.isActive) {
      this.setupWidgetTriggers(widget)
    }
  }

  /**
   * Remove a feedback widget
   */
  unregisterWidget(widgetId: string): void {
    this.widgets.delete(widgetId)
    this.activeWidgets.delete(widgetId)
    this.removeWidgetTriggers(widgetId)
  }

  /**
   * Set user context for personalized feedback
   */
  setUserContext(context: UserContext): void {
    this.userContext = context
  }

  /**
   * Show a feedback widget manually
   */
  showWidget(widgetId: string): void {
    const widget = this.widgets.get(widgetId)
    if (!widget) {
      console.warn(`Widget ${widgetId} not found`)
      return
    }

    if (this.shouldShowWidget(widget)) {
      this.displayWidget(widget)
    }
  }

  /**
   * Submit feedback response
   */
  async submitFeedback(widgetId: string, responses: Record<string, any>): Promise<void> {
    const widget = this.widgets.get(widgetId)
    if (!widget) {
      throw new Error(`Widget ${widgetId} not found`)
    }

    const response: FeedbackResponse = {
      id: this.generateId(),
      widgetId,
      userId: this.userContext?.role ? 'user-' + this.userContext.role : undefined,
      sessionId: this.sessionId,
      responses,
      metadata: this.collectMetadata(),
      submittedAt: new Date()
    }

    try {
      await this.saveFeedbackResponse(response)
      this.trackFeedbackSubmission(widget, response)
      this.hideWidget(widgetId)
      this.showThankYouMessage(widget)
    } catch (error) {
      console.error('Failed to submit feedback:', error)
      throw error
    }
  }

  /**
   * Track user behavior event
   */
  trackBehaviorEvent(type: BehaviorEventType, element: string, metadata: Record<string, any> = {}): void {
    const event: UserBehaviorEvent = {
      id: this.generateId(),
      userId: this.userContext?.role ? 'user-' + this.userContext.role : undefined,
      sessionId: this.sessionId,
      type,
      element,
      page: window.location.pathname,
      timestamp: new Date(),
      metadata: {
        ...metadata,
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      }
    }

    this.saveBehaviorEvent(event)
    this.checkTriggerConditions(event)
  }

  /**
   * Get contextual feedback suggestions
   */
  getContextualSuggestions(): FeedbackWidget[] {
    const suggestions: FeedbackWidget[] = []
    
    for (const widget of this.widgets.values()) {
      if (widget.isActive && this.shouldShowWidget(widget)) {
        suggestions.push(widget)
      }
    }

    return suggestions.sort((a, b) => this.calculateRelevanceScore(b) - this.calculateRelevanceScore(a))
  }

  private setupWidgetTriggers(widget: FeedbackWidget): void {
    const trigger = widget.trigger

    switch (trigger.type) {
      case 'time-based':
        this.setupTimeTrigger(widget)
        break
      case 'action-based':
        this.setupActionTrigger(widget)
        break
      case 'page-based':
        this.setupPageTrigger(widget)
        break
    }
  }

  private setupTimeTrigger(widget: FeedbackWidget): void {
    const delay = widget.trigger.delay || 30000 // 30 seconds default
    
    setTimeout(() => {
      if (this.shouldShowWidget(widget)) {
        this.displayWidget(widget)
      }
    }, delay)
  }

  private setupActionTrigger(widget: FeedbackWidget): void {
    widget.trigger.conditions.forEach(condition => {
      if (condition.type === 'feature-usage') {
        // Listen for feature usage events
        const listener = (event: CustomEvent) => {
          if (event.detail.feature === condition.value) {
            this.evaluateTriggerCondition(widget, condition, event.detail)
          }
        }
        
        document.addEventListener('feature-used', listener as EventListener)
        this.eventListeners.set(`${widget.id}-${condition.type}`, listener as EventListener)
      }
    })
  }

  private setupPageTrigger(widget: FeedbackWidget): void {
    widget.trigger.conditions.forEach(condition => {
      if (condition.type === 'page-visit' && condition.value === window.location.pathname) {
        setTimeout(() => {
          if (this.shouldShowWidget(widget)) {
            this.displayWidget(widget)
          }
        }, widget.trigger.delay || 5000)
      }
    })
  }

  private shouldShowWidget(widget: FeedbackWidget): boolean {
    // Check if already shown
    if (this.activeWidgets.has(widget.id)) {
      return false
    }

    // Check targeting
    if (!this.matchesTargeting(widget)) {
      return false
    }

    // Check frequency
    if (!this.checkFrequency(widget)) {
      return false
    }

    return true
  }

  private matchesTargeting(widget: FeedbackWidget): boolean {
    const targeting = widget.targeting

    // Check page targeting
    if (targeting.pages.length > 0 && !targeting.pages.includes(window.location.pathname)) {
      return false
    }

    // Check user segment targeting
    if (this.userContext && targeting.userSegments.length > 0) {
      const userSegment = this.getUserSegment(this.userContext)
      if (!targeting.userSegments.includes(userSegment)) {
        return false
      }
    }

    // Check percentage rollout
    if (Math.random() * 100 > targeting.percentage) {
      return false
    }

    return true
  }

  private checkFrequency(widget: FeedbackWidget): boolean {
    const frequency = widget.trigger.frequency
    const lastShown = localStorage.getItem(`feedback-widget-${widget.id}-last-shown`)
    
    if (!lastShown) {
      return true
    }

    const lastShownDate = new Date(lastShown)
    const now = new Date()
    const timeDiff = now.getTime() - lastShownDate.getTime()

    switch (frequency) {
      case 'once':
        return false
      case 'daily':
        return timeDiff > 24 * 60 * 60 * 1000
      case 'weekly':
        return timeDiff > 7 * 24 * 60 * 60 * 1000
      case 'monthly':
        return timeDiff > 30 * 24 * 60 * 60 * 1000
      case 'always':
        return true
      default:
        return true
    }
  }

  private displayWidget(widget: FeedbackWidget): void {
    this.activeWidgets.add(widget.id)
    localStorage.setItem(`feedback-widget-${widget.id}-last-shown`, new Date().toISOString())
    
    // Dispatch event for UI components to listen to
    const event = new CustomEvent('show-feedback-widget', {
      detail: { widget }
    })
    document.dispatchEvent(event)
  }

  private hideWidget(widgetId: string): void {
    this.activeWidgets.delete(widgetId)
    
    const event = new CustomEvent('hide-feedback-widget', {
      detail: { widgetId }
    })
    document.dispatchEvent(event)
  }

  private showThankYouMessage(widget: FeedbackWidget): void {
    const event = new CustomEvent('show-thank-you-message', {
      detail: { 
        message: widget.content.thankYouMessage,
        widgetId: widget.id
      }
    })
    document.dispatchEvent(event)
  }

  private collectMetadata(): FeedbackMetadata {
    return {
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      page: window.location.pathname,
      referrer: document.referrer,
      timeOnPage: this.getTimeOnPage(),
      deviceType: this.getDeviceType(),
      userContext: this.userContext || {} as UserContext
    }
  }

  private getTimeOnPage(): number {
    const navigationStart = performance.timing?.navigationStart || Date.now()
    return Date.now() - navigationStart
  }

  private getDeviceType(): 'desktop' | 'tablet' | 'mobile' {
    const width = window.innerWidth
    if (width < 768) return 'mobile'
    if (width < 1024) return 'tablet'
    return 'desktop'
  }

  private getUserSegment(context: UserContext): string {
    // Simple segmentation logic
    if (context.tenure < 7) return 'new-user'
    if (context.tenure < 30) return 'recent-user'
    return 'experienced-user'
  }

  private calculateRelevanceScore(widget: FeedbackWidget): number {
    let score = 0
    
    // Page relevance
    if (widget.targeting.pages.includes(window.location.pathname)) {
      score += 10
    }
    
    // User context relevance
    if (this.userContext) {
      const segment = this.getUserSegment(this.userContext)
      if (widget.targeting.userSegments.includes(segment)) {
        score += 5
      }
    }
    
    // Recency (prefer newer widgets)
    const daysSinceCreated = (Date.now() - widget.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    score += Math.max(0, 10 - daysSinceCreated)
    
    return score
  }

  private evaluateTriggerCondition(widget: FeedbackWidget, condition: TriggerCondition, data: any): void {
    let conditionMet = false
    
    switch (condition.operator) {
      case 'equals':
        conditionMet = data.value === condition.value
        break
      case 'greater-than':
        conditionMet = data.value > condition.value
        break
      case 'less-than':
        conditionMet = data.value < condition.value
        break
      case 'contains':
        conditionMet = String(data.value).includes(String(condition.value))
        break
    }
    
    if (conditionMet && this.shouldShowWidget(widget)) {
      this.displayWidget(widget)
    }
  }

  private checkTriggerConditions(event: UserBehaviorEvent): void {
    for (const widget of this.widgets.values()) {
      if (!widget.isActive || this.activeWidgets.has(widget.id)) {
        continue
      }
      
      for (const condition of widget.trigger.conditions) {
        if (this.eventMatchesCondition(event, condition)) {
          this.evaluateTriggerCondition(widget, condition, { value: event.element })
        }
      }
    }
  }

  private eventMatchesCondition(event: UserBehaviorEvent, condition: TriggerCondition): boolean {
    switch (condition.type) {
      case 'page-visit':
        return event.type === 'page-view' && event.page === condition.value
      case 'feature-usage':
        return event.element === condition.value
      case 'error-encountered':
        return event.type === 'error'
      case 'task-completed':
        return event.type === 'task-completion'
      default:
        return false
    }
  }

  private async saveFeedbackResponse(response: FeedbackResponse): Promise<void> {
    try {
      const result = await fetch('/api/feedback/responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(response)
      })
      
      if (!result.ok) {
        throw new Error(`Failed to save feedback: ${result.statusText}`)
      }
    } catch (error) {
      console.error('Error saving feedback response:', error)
      // Fallback to local storage
      this.saveFeedbackToLocalStorage(response)
    }
  }

  private saveFeedbackToLocalStorage(response: FeedbackResponse): void {
    const key = 'pending-feedback-responses'
    const existing = JSON.parse(localStorage.getItem(key) || '[]')
    existing.push(response)
    localStorage.setItem(key, JSON.stringify(existing))
  }

  private async saveBehaviorEvent(event: UserBehaviorEvent): Promise<void> {
    try {
      await fetch('/api/analytics/behavior', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(event)
      })
    } catch (error) {
      console.error('Error saving behavior event:', error)
      // Could implement local storage fallback here too
    }
  }

  private trackFeedbackSubmission(widget: FeedbackWidget, response: FeedbackResponse): void {
    this.trackBehaviorEvent('form-submit', `feedback-widget-${widget.id}`, {
      widgetType: widget.type,
      responseCount: Object.keys(response.responses).length,
      timeToComplete: Date.now() - (response.metadata.timeOnPage || 0)
    })
  }

  private removeWidgetTriggers(widgetId: string): void {
    // Remove event listeners
    for (const [key, listener] of this.eventListeners.entries()) {
      if (key.startsWith(widgetId)) {
        document.removeEventListener(key.split('-')[1], listener)
        this.eventListeners.delete(key)
      }
    }
  }

  private initializeEventTracking(): void {
    // Track page views
    this.trackBehaviorEvent('page-view', window.location.pathname)
    
    // Track clicks
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement
      const element = target.tagName.toLowerCase() + (target.id ? `#${target.id}` : '') + 
                    (target.className ? `.${target.className.split(' ').join('.')}` : '')
      
      this.trackBehaviorEvent('click', element, {
        x: event.clientX,
        y: event.clientY
      })
    })
    
    // Track form submissions
    document.addEventListener('submit', (event) => {
      const form = event.target as HTMLFormElement
      const formId = form.id || form.className || 'unknown-form'
      
      this.trackBehaviorEvent('form-submit', formId)
    })
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }

  private generateSessionId(): string {
    return 'session-' + this.generateId()
  }
}

// Singleton instance
export const feedbackCollectionService = new FeedbackCollectionService()