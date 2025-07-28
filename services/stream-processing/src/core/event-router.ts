import { StreamEvent, EventRouter } from '../types/stream-processing';
import { GitEventType, IDEEventType } from '@devflow/shared-types';

export class DefaultEventRouter implements EventRouter {
  private routingRules: Map<string, string[]> = new Map();

  constructor() {
    this.initializeRoutingRules();
  }

  private initializeRoutingRules(): void {
    // Git events routing
    this.routingRules.set('git.commit', ['code-quality', 'productivity']);
    this.routingRules.set('git.push', ['code-quality', 'productivity']);
    this.routingRules.set('git.pull_request', ['code-quality', 'collaboration']);
    this.routingRules.set('git.merge', ['code-quality', 'collaboration']);

    // IDE events routing
    this.routingRules.set('ide.keystroke', ['flow-metrics', 'productivity']);
    this.routingRules.set('ide.file_change', ['flow-metrics', 'productivity']);
    this.routingRules.set('ide.focus', ['flow-metrics']);
    this.routingRules.set('ide.debug', ['productivity']);
    this.routingRules.set('ide.build', ['productivity']);
    this.routingRules.set('ide.test_run', ['code-quality', 'productivity']);

    // Communication events routing
    this.routingRules.set('communication.slack', ['collaboration']);
    this.routingRules.set('communication.teams', ['collaboration']);
    this.routingRules.set('communication.code_review', ['collaboration', 'code-quality']);
  }

  route(event: StreamEvent): string[] {
    const eventKey = this.getEventKey(event);
    const routes = this.routingRules.get(eventKey) || ['default'];
    
    // Add user-specific routing if needed
    if (this.shouldRouteToPersonalMetrics(event)) {
      routes.push('personal-metrics');
    }

    return routes;
  }

  private getEventKey(event: StreamEvent): string {
    if (event.type === 'git') {
      const gitEvent = event.data as any;
      return `git.${gitEvent.type}`;
    } else if (event.type === 'ide') {
      const ideEvent = event.data as any;
      return `ide.${ideEvent.eventType}`;
    } else if (event.type === 'communication') {
      return `communication.${event.data.source || 'unknown'}`;
    }
    
    return 'unknown';
  }

  private shouldRouteToPersonalMetrics(event: StreamEvent): boolean {
    // Route to personal metrics if privacy level allows
    const privacyLevel = (event.data as any).privacyLevel;
    return privacyLevel === 'private' || privacyLevel === 'team';
  }

  addRoutingRule(eventPattern: string, routes: string[]): void {
    this.routingRules.set(eventPattern, routes);
  }

  removeRoutingRule(eventPattern: string): void {
    this.routingRules.delete(eventPattern);
  }

  getRoutingRules(): Map<string, string[]> {
    return new Map(this.routingRules);
  }
}