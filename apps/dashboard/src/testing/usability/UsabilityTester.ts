import { Page, Browser, chromium } from 'playwright';

export interface UserJourney {
  id: string;
  name: string;
  description: string;
  persona: UserPersona;
  steps: JourneyStep[];
  successCriteria: SuccessCriteria;
  expectedDuration: number; // in seconds
}

export interface UserPersona {
  id: string;
  name: string;
  role: string;
  experience: 'novice' | 'intermediate' | 'expert';
  goals: string[];
  painPoints: string[];
}

export interface JourneyStep {
  id: string;
  description: string;
  action: StepAction;
  expectedOutcome: string;
  timeout?: number;
  optional?: boolean;
}

export interface StepAction {
  type: 'navigate' | 'click' | 'type' | 'wait' | 'verify' | 'measure';
  target?: string;
  value?: string;
  condition?: string;
}

export interface SuccessCriteria {
  taskCompletionRate: number; // percentage
  maxTaskTime: number; // seconds
  maxErrors: number;
  minSatisfactionScore: number; // 1-5 scale
}

export interface UsabilityTestResult {
  journeyId: string;
  journeyName: string;
  persona: string;
  completed: boolean;
  completionTime: number;
  errors: UsabilityError[];
  stepResults: StepResult[];
  satisfactionScore?: number;
  feedback?: string;
  metrics: UsabilityMetrics;
}

export interface UsabilityError {
  stepId: string;
  type: 'navigation' | 'interaction' | 'understanding' | 'technical';
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
}

export interface StepResult {
  stepId: string;
  completed: boolean;
  duration: number;
  attempts: number;
  errors: UsabilityError[];
}

export interface UsabilityMetrics {
  timeToFirstInteraction: number;
  timeToCompletion: number;
  clickCount: number;
  scrollDistance: number;
  errorRate: number;
  hesitationTime: number; // time spent without interaction
}

export class UsabilityTester {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private startTime: number = 0;
  private metrics: Partial<UsabilityMetrics> = {};

  async runUsabilityTests(journeys: UserJourney[]): Promise<UsabilityTestResult[]> {
    const results: UsabilityTestResult[] = [];

    try {
      this.browser = await chromium.launch({ 
        headless: false, // Run in headed mode for better observation
        slowMo: 100 // Slow down actions to simulate human behavior
      });

      for (const journey of journeys) {
        const result = await this.runSingleJourney(journey);
        results.push(result);
      }
    } finally {
      if (this.browser) {
        await this.browser.close();
      }
    }

    return results;
  }

  private async runSingleJourney(journey: UserJourney): Promise<UsabilityTestResult> {
    this.page = await this.browser!.newPage();
    this.startTime = Date.now();
    this.metrics = {
      clickCount: 0,
      scrollDistance: 0,
      errorRate: 0,
      hesitationTime: 0
    };

    const errors: UsabilityError[] = [];
    const stepResults: StepResult[] = [];
    let completed = false;

    try {
      // Set up metrics tracking
      await this.setupMetricsTracking();

      // Execute journey steps
      for (const step of journey.steps) {
        const stepResult = await this.executeStep(step, journey.id);
        stepResults.push(stepResult);

        if (!stepResult.completed && !step.optional) {
          errors.push({
            stepId: step.id,
            type: 'interaction',
            description: `Failed to complete required step: ${step.description}`,
            severity: 'high',
            timestamp: Date.now()
          });
          break;
        }
      }

      // Check if journey was completed successfully
      completed = stepResults.every(sr => sr.completed || 
        journey.steps.find(s => s.id === sr.stepId)?.optional
      );

      const completionTime = (Date.now() - this.startTime) / 1000;

      return {
        journeyId: journey.id,
        journeyName: journey.name,
        persona: journey.persona.name,
        completed,
        completionTime,
        errors: [...errors, ...stepResults.flatMap(sr => sr.errors)],
        stepResults,
        metrics: {
          timeToFirstInteraction: this.metrics.timeToFirstInteraction || 0,
          timeToCompletion: completionTime,
          clickCount: this.metrics.clickCount || 0,
          scrollDistance: this.metrics.scrollDistance || 0,
          errorRate: errors.length / journey.steps.length,
          hesitationTime: this.metrics.hesitationTime || 0
        }
      };

    } catch (error) {
      return {
        journeyId: journey.id,
        journeyName: journey.name,
        persona: journey.persona.name,
        completed: false,
        completionTime: (Date.now() - this.startTime) / 1000,
        errors: [{
          stepId: 'unknown',
          type: 'technical',
          description: error instanceof Error ? error.message : 'Unknown error',
          severity: 'critical',
          timestamp: Date.now()
        }],
        stepResults,
        metrics: {
          timeToFirstInteraction: 0,
          timeToCompletion: 0,
          clickCount: 0,
          scrollDistance: 0,
          errorRate: 1,
          hesitationTime: 0
        }
      };
    } finally {
      if (this.page) {
        await this.page.close();
      }
    }
  }

  private async executeStep(step: JourneyStep, journeyId: string): Promise<StepResult> {
    const stepStartTime = Date.now();
    let attempts = 0;
    let completed = false;
    const errors: UsabilityError[] = [];

    try {
      attempts++;
      
      switch (step.action.type) {
        case 'navigate':
          await this.page!.goto(step.action.target!);
          completed = true;
          break;

        case 'click':
          await this.page!.click(step.action.target!);
          this.metrics.clickCount = (this.metrics.clickCount || 0) + 1;
          completed = true;
          break;

        case 'type':
          await this.page!.fill(step.action.target!, step.action.value!);
          completed = true;
          break;

        case 'wait':
          if (step.action.target) {
            await this.page!.waitForSelector(step.action.target, { 
              timeout: step.timeout || 5000 
            });
          } else if (step.action.value) {
            await this.page!.waitForTimeout(parseInt(step.action.value));
          }
          completed = true;
          break;

        case 'verify':
          const element = await this.page!.$(step.action.target!);
          completed = element !== null;
          if (!completed) {
            errors.push({
              stepId: step.id,
              type: 'understanding',
              description: `Expected element not found: ${step.action.target}`,
              severity: 'medium',
              timestamp: Date.now()
            });
          }
          break;

        case 'measure':
          // Measure performance metrics
          const metrics = await this.page!.evaluate(() => {
            const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
            return {
              loadTime: navigation.loadEventEnd - navigation.loadEventStart,
              domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart
            };
          });
          completed = true;
          break;
      }

      // Record first interaction time
      if (!this.metrics.timeToFirstInteraction && step.action.type !== 'wait') {
        this.metrics.timeToFirstInteraction = (Date.now() - this.startTime) / 1000;
      }

    } catch (error) {
      errors.push({
        stepId: step.id,
        type: 'technical',
        description: error instanceof Error ? error.message : 'Step execution failed',
        severity: 'high',
        timestamp: Date.now()
      });
    }

    const duration = (Date.now() - stepStartTime) / 1000;

    return {
      stepId: step.id,
      completed,
      duration,
      attempts,
      errors
    };
  }

  private async setupMetricsTracking(): Promise<void> {
    if (!this.page) return;

    // Track scroll distance
    await this.page.evaluate(() => {
      let totalScrollDistance = 0;
      let lastScrollY = window.scrollY;

      window.addEventListener('scroll', () => {
        const currentScrollY = window.scrollY;
        totalScrollDistance += Math.abs(currentScrollY - lastScrollY);
        lastScrollY = currentScrollY;
        (window as any).__scrollDistance = totalScrollDistance;
      });
    });

    // Track hesitation (periods of inactivity)
    let lastActivityTime = Date.now();
    await this.page.on('domcontentloaded', () => {
      lastActivityTime = Date.now();
    });

    // Periodically check for hesitation
    const hesitationInterval = setInterval(() => {
      const inactiveTime = Date.now() - lastActivityTime;
      if (inactiveTime > 3000) { // 3 seconds of inactivity
        this.metrics.hesitationTime = (this.metrics.hesitationTime || 0) + inactiveTime;
        lastActivityTime = Date.now();
      }
    }, 1000);

    // Clean up interval when page closes
    this.page.on('close', () => {
      clearInterval(hesitationInterval);
    });
  }

  generateUsabilityReport(results: UsabilityTestResult[]): UsabilityReport {
    const totalJourneys = results.length;
    const completedJourneys = results.filter(r => r.completed).length;
    const averageCompletionTime = results
      .filter(r => r.completed)
      .reduce((sum, r) => sum + r.completionTime, 0) / completedJourneys || 0;

    const errorsByType = results.flatMap(r => r.errors).reduce((acc, error) => {
      acc[error.type] = (acc[error.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const criticalIssues = results.flatMap(r => 
      r.errors.filter(e => e.severity === 'critical')
    );

    return {
      summary: {
        totalJourneys,
        completedJourneys,
        completionRate: (completedJourneys / totalJourneys) * 100,
        averageCompletionTime,
        totalErrors: results.flatMap(r => r.errors).length,
        criticalIssues: criticalIssues.length
      },
      journeyResults: results.map(r => ({
        journeyId: r.journeyId,
        journeyName: r.journeyName,
        persona: r.persona,
        completed: r.completed,
        completionTime: r.completionTime,
        errorCount: r.errors.length,
        satisfactionScore: r.satisfactionScore
      })),
      errorAnalysis: {
        byType: errorsByType,
        critical: criticalIssues.map(e => ({
          journey: results.find(r => r.errors.includes(e))?.journeyName || 'Unknown',
          step: e.stepId,
          description: e.description
        }))
      },
      recommendations: this.generateRecommendations(results)
    };
  }

  private generateRecommendations(results: UsabilityTestResult[]): string[] {
    const recommendations: string[] = [];
    
    // Analyze completion rates
    const completionRate = results.filter(r => r.completed).length / results.length;
    if (completionRate < 0.8) {
      recommendations.push('Consider simplifying user journeys - completion rate is below 80%');
    }

    // Analyze error patterns
    const errorsByType = results.flatMap(r => r.errors).reduce((acc, error) => {
      acc[error.type] = (acc[error.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    if (errorsByType.navigation > 5) {
      recommendations.push('Review navigation design - users are having trouble finding their way');
    }

    if (errorsByType.understanding > 5) {
      recommendations.push('Improve UI clarity and labeling - users are confused about interface elements');
    }

    // Analyze completion times
    const avgTime = results
      .filter(r => r.completed)
      .reduce((sum, r) => sum + r.completionTime, 0) / results.filter(r => r.completed).length;

    if (avgTime > 120) { // 2 minutes
      recommendations.push('Consider streamlining workflows - tasks are taking too long to complete');
    }

    return recommendations;
  }
}

export interface UsabilityReport {
  summary: {
    totalJourneys: number;
    completedJourneys: number;
    completionRate: number;
    averageCompletionTime: number;
    totalErrors: number;
    criticalIssues: number;
  };
  journeyResults: {
    journeyId: string;
    journeyName: string;
    persona: string;
    completed: boolean;
    completionTime: number;
    errorCount: number;
    satisfactionScore?: number;
  }[];
  errorAnalysis: {
    byType: Record<string, number>;
    critical: {
      journey: string;
      step: string;
      description: string;
    }[];
  };
  recommendations: string[];
}