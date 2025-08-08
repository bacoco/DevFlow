import {
  NPSResponse,
  CSATResponse,
  SatisfactionMetrics,
  FeedbackResponse
} from './types'

/**
 * Service for tracking user satisfaction through NPS and CSAT measurements
 */
export class SatisfactionTrackingService {
  private npsResponses: NPSResponse[] = []
  private csatResponses: CSATResponse[] = []
  private satisfactionHistory: Map<string, SatisfactionMetrics> = new Map()

  constructor() {
    this.loadStoredData()
  }

  /**
   * Record an NPS response
   */
  recordNPSResponse(response: Omit<NPSResponse, 'id' | 'category' | 'submittedAt'>): NPSResponse {
    const npsResponse: NPSResponse = {
      ...response,
      id: this.generateId(),
      category: this.categorizeNPSScore(response.score),
      submittedAt: new Date()
    }

    this.npsResponses.push(npsResponse)
    this.saveToStorage()
    this.updateSatisfactionMetrics()
    
    return npsResponse
  }

  /**
   * Record a CSAT response
   */
  recordCSATResponse(response: Omit<CSATResponse, 'id' | 'submittedAt'>): CSATResponse {
    const csatResponse: CSATResponse = {
      ...response,
      id: this.generateId(),
      submittedAt: new Date()
    }

    this.csatResponses.push(csatResponse)
    this.saveToStorage()
    this.updateSatisfactionMetrics()
    
    return csatResponse
  }

  /**
   * Get current satisfaction metrics
   */
  getCurrentSatisfactionMetrics(timeRange?: { start: Date; end: Date }): SatisfactionMetrics {
    const range = timeRange || {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
      end: new Date()
    }

    const npsData = this.calculateNPSMetrics(range)
    const csatData = this.calculateCSATMetrics(range)

    return {
      nps: npsData,
      csat: csatData,
      period: range
    }
  }

  /**
   * Get NPS trend over time
   */
  getNPSTrend(days: number = 90): Array<{ date: Date; score: number; responseCount: number }> {
    const endDate = new Date()
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000)
    
    const trend: Array<{ date: Date; score: number; responseCount: number }> = []
    const dayMs = 24 * 60 * 60 * 1000
    
    for (let date = new Date(startDate); date <= endDate; date = new Date(date.getTime() + dayMs)) {
      const dayStart = new Date(date)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(date)
      dayEnd.setHours(23, 59, 59, 999)
      
      const dayResponses = this.npsResponses.filter(r => 
        r.submittedAt >= dayStart && r.submittedAt <= dayEnd
      )
      
      if (dayResponses.length > 0) {
        const npsMetrics = this.calculateNPSMetrics({ start: dayStart, end: dayEnd })
        trend.push({
          date: new Date(date),
          score: npsMetrics.score,
          responseCount: dayResponses.length
        })
      }
    }
    
    return trend
  }

  /**
   * Get CSAT trend by feature
   */
  getCSATTrendByFeature(feature: string, days: number = 90): Array<{ date: Date; score: number; responseCount: number }> {
    const endDate = new Date()
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000)
    
    const trend: Array<{ date: Date; score: number; responseCount: number }> = []
    const dayMs = 24 * 60 * 60 * 1000
    
    for (let date = new Date(startDate); date <= endDate; date = new Date(date.getTime() + dayMs)) {
      const dayStart = new Date(date)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(date)
      dayEnd.setHours(23, 59, 59, 999)
      
      const dayResponses = this.csatResponses.filter(r => 
        r.feature === feature &&
        r.submittedAt >= dayStart && 
        r.submittedAt <= dayEnd
      )
      
      if (dayResponses.length > 0) {
        const averageScore = dayResponses.reduce((sum, r) => sum + r.score, 0) / dayResponses.length
        trend.push({
          date: new Date(date),
          score: averageScore,
          responseCount: dayResponses.length
        })
      }
    }
    
    return trend
  }

  /**
   * Get satisfaction insights and recommendations
   */
  getSatisfactionInsights(timeRange: { start: Date; end: Date }): {
    insights: string[]
    recommendations: string[]
    keyFindings: {
      npsDrivers: string[]
      csatIssues: string[]
      improvementAreas: string[]
    }
  } {
    const metrics = this.getCurrentSatisfactionMetrics(timeRange)
    const insights: string[] = []
    const recommendations: string[] = []
    const keyFindings = {
      npsDrivers: [] as string[],
      csatIssues: [] as string[],
      improvementAreas: [] as string[]
    }

    // NPS Analysis
    if (metrics.nps.score < 0) {
      insights.push(`NPS score of ${metrics.nps.score} indicates more detractors than promoters`)
      recommendations.push('Focus on addressing detractor concerns to improve overall satisfaction')
      keyFindings.improvementAreas.push('Overall user satisfaction')
    } else if (metrics.nps.score < 30) {
      insights.push(`NPS score of ${metrics.nps.score} is below industry average`)
      recommendations.push('Investigate common pain points and implement targeted improvements')
    } else if (metrics.nps.score > 50) {
      insights.push(`Strong NPS score of ${metrics.nps.score} indicates high user satisfaction`)
      keyFindings.npsDrivers.push('Strong overall user experience')
    }

    // CSAT Analysis
    if (metrics.csat.averageScore < 3.5) {
      insights.push(`CSAT score of ${metrics.csat.averageScore.toFixed(1)} indicates user dissatisfaction`)
      recommendations.push('Review low-scoring features and prioritize improvements')
      keyFindings.improvementAreas.push('Feature satisfaction')
    }

    // Feature-specific analysis
    const lowScoringFeatures = Object.entries(metrics.csat.byFeature)
      .filter(([_, score]) => score < 3.5)
      .map(([feature, score]) => ({ feature, score }))
      .sort((a, b) => a.score - b.score)

    if (lowScoringFeatures.length > 0) {
      insights.push(`${lowScoringFeatures.length} features have below-average satisfaction scores`)
      keyFindings.csatIssues = lowScoringFeatures.map(f => f.feature)
      recommendations.push(`Prioritize improvements for: ${lowScoringFeatures.slice(0, 3).map(f => f.feature).join(', ')}`)
    }

    // Response volume analysis
    if (metrics.nps.responseCount < 50) {
      insights.push('Low NPS response volume may limit insight reliability')
      recommendations.push('Increase NPS survey distribution to gather more feedback')
    }

    if (metrics.csat.responseCount < 100) {
      insights.push('Low CSAT response volume may limit feature-specific insights')
      recommendations.push('Implement contextual CSAT surveys after feature usage')
    }

    return { insights, recommendations, keyFindings }
  }

  /**
   * Get detractor feedback analysis
   */
  getDetractorAnalysis(timeRange: { start: Date; end: Date }): {
    detractorCount: number
    commonThemes: Array<{ theme: string; count: number; examples: string[] }>
    urgentIssues: string[]
  } {
    const detractors = this.npsResponses.filter(r => 
      r.category === 'detractor' &&
      r.submittedAt >= timeRange.start &&
      r.submittedAt <= timeRange.end &&
      r.comment
    )

    const themes = this.analyzeComments(detractors.map(d => d.comment!))
    const urgentIssues = this.identifyUrgentIssues(detractors)

    return {
      detractorCount: detractors.length,
      commonThemes: themes,
      urgentIssues
    }
  }

  /**
   * Get promoter feedback analysis
   */
  getPromoterAnalysis(timeRange: { start: Date; end: Date }): {
    promoterCount: number
    strengthAreas: Array<{ area: string; count: number; examples: string[] }>
    successFactors: string[]
  } {
    const promoters = this.npsResponses.filter(r => 
      r.category === 'promoter' &&
      r.submittedAt >= timeRange.start &&
      r.submittedAt <= timeRange.end &&
      r.comment
    )

    const strengths = this.analyzeComments(promoters.map(p => p.comment!))
    const successFactors = this.identifySuccessFactors(promoters)

    return {
      promoterCount: promoters.length,
      strengthAreas: strengths,
      successFactors
    }
  }

  /**
   * Generate satisfaction report
   */
  generateSatisfactionReport(timeRange: { start: Date; end: Date }): {
    executive_summary: string
    metrics: SatisfactionMetrics
    trends: {
      nps: Array<{ date: Date; score: number }>
      csat: { [feature: string]: Array<{ date: Date; score: number }> }
    }
    insights: ReturnType<typeof this.getSatisfactionInsights>
    detractor_analysis: ReturnType<typeof this.getDetractorAnalysis>
    promoter_analysis: ReturnType<typeof this.getPromoterAnalysis>
    action_items: string[]
  } {
    const metrics = this.getCurrentSatisfactionMetrics(timeRange)
    const insights = this.getSatisfactionInsights(timeRange)
    const detractorAnalysis = this.getDetractorAnalysis(timeRange)
    const promoterAnalysis = this.getPromoterAnalysis(timeRange)

    const npsTrend = this.getNPSTrend(30).map(t => ({ date: t.date, score: t.score }))
    const csatTrends: { [feature: string]: Array<{ date: Date; score: number }> } = {}
    
    Object.keys(metrics.csat.byFeature).forEach(feature => {
      csatTrends[feature] = this.getCSATTrendByFeature(feature, 30)
        .map(t => ({ date: t.date, score: t.score }))
    })

    const executiveSummary = this.generateExecutiveSummary(metrics, insights, detractorAnalysis, promoterAnalysis)
    const actionItems = this.generateActionItems(insights, detractorAnalysis)

    return {
      executive_summary: executiveSummary,
      metrics,
      trends: { nps: npsTrend, csat: csatTrends },
      insights,
      detractor_analysis: detractorAnalysis,
      promoter_analysis: promoterAnalysis,
      action_items: actionItems
    }
  }

  private categorizeNPSScore(score: number): 'detractor' | 'passive' | 'promoter' {
    if (score <= 6) return 'detractor'
    if (score <= 8) return 'passive'
    return 'promoter'
  }

  private calculateNPSMetrics(timeRange: { start: Date; end: Date }) {
    const responses = this.npsResponses.filter(r => 
      r.submittedAt >= timeRange.start && r.submittedAt <= timeRange.end
    )

    if (responses.length === 0) {
      return {
        score: 0,
        responseCount: 0,
        distribution: { detractors: 0, passives: 0, promoters: 0 },
        trend: 0
      }
    }

    const detractors = responses.filter(r => r.category === 'detractor').length
    const passives = responses.filter(r => r.category === 'passive').length
    const promoters = responses.filter(r => r.category === 'promoter').length

    const score = Math.round(((promoters - detractors) / responses.length) * 100)

    // Calculate trend (simplified - compare with previous period)
    const previousPeriodStart = new Date(timeRange.start.getTime() - (timeRange.end.getTime() - timeRange.start.getTime()))
    const previousResponses = this.npsResponses.filter(r => 
      r.submittedAt >= previousPeriodStart && r.submittedAt < timeRange.start
    )
    
    let trend = 0
    if (previousResponses.length > 0) {
      const prevDetractors = previousResponses.filter(r => r.category === 'detractor').length
      const prevPromoters = previousResponses.filter(r => r.category === 'promoter').length
      const prevScore = Math.round(((prevPromoters - prevDetractors) / previousResponses.length) * 100)
      trend = score - prevScore
    }

    return {
      score,
      responseCount: responses.length,
      distribution: { detractors, passives, promoters },
      trend
    }
  }

  private calculateCSATMetrics(timeRange: { start: Date; end: Date }) {
    const responses = this.csatResponses.filter(r => 
      r.submittedAt >= timeRange.start && r.submittedAt <= timeRange.end
    )

    if (responses.length === 0) {
      return {
        averageScore: 0,
        responseCount: 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        byFeature: {}
      }
    }

    const averageScore = responses.reduce((sum, r) => sum + r.score, 0) / responses.length

    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    responses.forEach(r => {
      distribution[r.score as keyof typeof distribution]++
    })

    const byFeature: { [feature: string]: number } = {}
    const featureGroups = responses.reduce((groups, r) => {
      if (!groups[r.feature]) groups[r.feature] = []
      groups[r.feature].push(r)
      return groups
    }, {} as { [feature: string]: CSATResponse[] })

    Object.entries(featureGroups).forEach(([feature, featureResponses]) => {
      byFeature[feature] = featureResponses.reduce((sum, r) => sum + r.score, 0) / featureResponses.length
    })

    return {
      averageScore,
      responseCount: responses.length,
      distribution,
      byFeature
    }
  }

  private updateSatisfactionMetrics(): void {
    const currentMetrics = this.getCurrentSatisfactionMetrics()
    const key = this.formatDateKey(new Date())
    this.satisfactionHistory.set(key, currentMetrics)
  }

  private analyzeComments(comments: string[]): Array<{ theme: string; count: number; examples: string[] }> {
    // Simplified comment analysis - would use NLP in production
    const themes = new Map<string, string[]>()
    
    const keywords = {
      'performance': ['slow', 'fast', 'speed', 'loading', 'performance'],
      'usability': ['easy', 'difficult', 'confusing', 'intuitive', 'user-friendly'],
      'features': ['feature', 'functionality', 'missing', 'need', 'want'],
      'design': ['design', 'ui', 'interface', 'layout', 'visual'],
      'bugs': ['bug', 'error', 'broken', 'issue', 'problem']
    }

    comments.forEach(comment => {
      const lowerComment = comment.toLowerCase()
      Object.entries(keywords).forEach(([theme, words]) => {
        if (words.some(word => lowerComment.includes(word))) {
          if (!themes.has(theme)) themes.set(theme, [])
          themes.get(theme)!.push(comment)
        }
      })
    })

    return Array.from(themes.entries())
      .map(([theme, examples]) => ({
        theme,
        count: examples.length,
        examples: examples.slice(0, 3) // Top 3 examples
      }))
      .sort((a, b) => b.count - a.count)
  }

  private identifyUrgentIssues(detractors: NPSResponse[]): string[] {
    const urgentKeywords = ['broken', 'unusable', 'terrible', 'worst', 'hate', 'never', 'awful']
    const urgentIssues: string[] = []

    detractors.forEach(detractor => {
      if (detractor.comment) {
        const lowerComment = detractor.comment.toLowerCase()
        if (urgentKeywords.some(keyword => lowerComment.includes(keyword))) {
          urgentIssues.push(detractor.comment)
        }
      }
    })

    return urgentIssues.slice(0, 5) // Top 5 urgent issues
  }

  private identifySuccessFactors(promoters: NPSResponse[]): string[] {
    const positiveKeywords = ['love', 'amazing', 'excellent', 'perfect', 'best', 'great', 'fantastic']
    const successFactors: string[] = []

    promoters.forEach(promoter => {
      if (promoter.comment) {
        const lowerComment = promoter.comment.toLowerCase()
        if (positiveKeywords.some(keyword => lowerComment.includes(keyword))) {
          successFactors.push(promoter.comment)
        }
      }
    })

    return successFactors.slice(0, 5) // Top 5 success factors
  }

  private generateExecutiveSummary(
    metrics: SatisfactionMetrics,
    insights: ReturnType<typeof this.getSatisfactionInsights>,
    detractorAnalysis: ReturnType<typeof this.getDetractorAnalysis>,
    promoterAnalysis: ReturnType<typeof this.getPromoterAnalysis>
  ): string {
    const npsStatus = metrics.nps.score > 50 ? 'excellent' : metrics.nps.score > 30 ? 'good' : metrics.nps.score > 0 ? 'fair' : 'poor'
    const csatStatus = metrics.csat.averageScore > 4 ? 'excellent' : metrics.csat.averageScore > 3.5 ? 'good' : 'needs improvement'

    return `User satisfaction analysis for ${metrics.period.start.toDateString()} to ${metrics.period.end.toDateString()}: 
    NPS score of ${metrics.nps.score} (${npsStatus}) with ${metrics.nps.responseCount} responses. 
    CSAT average of ${metrics.csat.averageScore.toFixed(1)} (${csatStatus}) across ${metrics.csat.responseCount} feature ratings. 
    ${detractorAnalysis.detractorCount} detractors identified ${detractorAnalysis.urgentIssues.length} urgent issues. 
    ${promoterAnalysis.promoterCount} promoters highlighted key strengths in user experience.`
  }

  private generateActionItems(
    insights: ReturnType<typeof this.getSatisfactionInsights>,
    detractorAnalysis: ReturnType<typeof this.getDetractorAnalysis>
  ): string[] {
    const actionItems: string[] = []

    // Add recommendations from insights
    actionItems.push(...insights.recommendations)

    // Add urgent issue actions
    if (detractorAnalysis.urgentIssues.length > 0) {
      actionItems.push('Address urgent detractor issues immediately')
    }

    // Add theme-based actions
    detractorAnalysis.commonThemes.slice(0, 3).forEach(theme => {
      actionItems.push(`Investigate and resolve ${theme.theme} issues (${theme.count} mentions)`)
    })

    return actionItems.slice(0, 10) // Limit to top 10 action items
  }

  private loadStoredData(): void {
    try {
      const npsData = localStorage.getItem('nps-responses')
      if (npsData) {
        this.npsResponses = JSON.parse(npsData).map((r: any) => ({
          ...r,
          submittedAt: new Date(r.submittedAt)
        }))
      }

      const csatData = localStorage.getItem('csat-responses')
      if (csatData) {
        this.csatResponses = JSON.parse(csatData).map((r: any) => ({
          ...r,
          submittedAt: new Date(r.submittedAt)
        }))
      }
    } catch (error) {
      console.error('Error loading satisfaction data:', error)
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem('nps-responses', JSON.stringify(this.npsResponses))
      localStorage.setItem('csat-responses', JSON.stringify(this.csatResponses))
    } catch (error) {
      console.error('Error saving satisfaction data:', error)
    }
  }

  private formatDateKey(date: Date): string {
    return date.toISOString().split('T')[0]
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }
}

export const satisfactionTrackingService = new SatisfactionTrackingService()