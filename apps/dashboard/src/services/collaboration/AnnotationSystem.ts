/**
 * AnnotationSystem
 * Handles collaborative annotations on dashboards and charts
 */

import {
  Annotation,
  AnnotationTarget,
  AnnotationType,
  AnnotationPosition,
  AnnotationReply,
  AnnotationReaction,
  VisibilityScope,
  ReactionType
} from './types';

export class AnnotationSystem {
  private annotations: Map<string, Annotation> = new Map();
  private annotationCounter = 0;
  private replyCounter = 0;

  /**
   * Create a new annotation
   */
  async createAnnotation(
    targetType: AnnotationTarget,
    targetId: string,
    annotationData: Partial<Annotation>
  ): Promise<Annotation> {
    if (!annotationData.authorId) {
      throw new Error('Author ID is required');
    }

    if (!annotationData.content || annotationData.content.trim().length === 0) {
      throw new Error('Annotation content is required');
    }

    if (!annotationData.position) {
      throw new Error('Annotation position is required');
    }

    const annotationId = this.generateAnnotationId();
    
    const annotation: Annotation = {
      id: annotationId,
      authorId: annotationData.authorId,
      targetType,
      targetId,
      position: annotationData.position,
      content: annotationData.content.trim(),
      type: annotationData.type || 'comment',
      visibility: annotationData.visibility || 'team',
      replies: [],
      reactions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      isResolved: false
    };

    this.annotations.set(annotationId, annotation);

    // Log annotation creation
    this.logAnnotationActivity(annotation.authorId, 'annotation_created', {
      annotationId,
      targetType,
      targetId,
      type: annotation.type
    });

    return annotation;
  }

  /**
   * Get annotations for a specific target
   */
  async getAnnotations(
    targetType: AnnotationTarget,
    targetId: string,
    userId?: string
  ): Promise<Annotation[]> {
    const targetAnnotations: Annotation[] = [];

    for (const [, annotation] of this.annotations) {
      if (annotation.targetType === targetType && annotation.targetId === targetId) {
        // Check visibility permissions
        if (this.canUserViewAnnotation(annotation, userId)) {
          targetAnnotations.push(annotation);
        }
      }
    }

    // Sort by creation date (newest first)
    return targetAnnotations.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Update an existing annotation
   */
  async updateAnnotation(
    annotationId: string,
    userId: string,
    updates: { content?: string; type?: AnnotationType; visibility?: VisibilityScope }
  ): Promise<Annotation> {
    const annotation = this.annotations.get(annotationId);
    
    if (!annotation) {
      throw new Error('Annotation not found');
    }

    // Only author can update annotation
    if (annotation.authorId !== userId) {
      throw new Error('Only the annotation author can update it');
    }

    // Apply updates
    if (updates.content !== undefined) {
      if (updates.content.trim().length === 0) {
        throw new Error('Annotation content cannot be empty');
      }
      annotation.content = updates.content.trim();
    }

    if (updates.type !== undefined) {
      annotation.type = updates.type;
    }

    if (updates.visibility !== undefined) {
      annotation.visibility = updates.visibility;
    }

    annotation.updatedAt = new Date();

    // Log annotation update
    this.logAnnotationActivity(userId, 'annotation_updated', {
      annotationId,
      updates: Object.keys(updates)
    });

    return annotation;
  }

  /**
   * Delete an annotation
   */
  async deleteAnnotation(annotationId: string, userId: string): Promise<boolean> {
    const annotation = this.annotations.get(annotationId);
    
    if (!annotation) {
      throw new Error('Annotation not found');
    }

    // Only author can delete annotation (or admin in real implementation)
    if (annotation.authorId !== userId) {
      throw new Error('Only the annotation author can delete it');
    }

    this.annotations.delete(annotationId);

    // Log annotation deletion
    this.logAnnotationActivity(userId, 'annotation_deleted', {
      annotationId,
      targetType: annotation.targetType,
      targetId: annotation.targetId
    });

    return true;
  }

  /**
   * Add a reply to an annotation
   */
  async replyToAnnotation(
    annotationId: string,
    reply: { authorId: string; content: string }
  ): Promise<Annotation> {
    const annotation = this.annotations.get(annotationId);
    
    if (!annotation) {
      throw new Error('Annotation not found');
    }

    if (!reply.content || reply.content.trim().length === 0) {
      throw new Error('Reply content is required');
    }

    const replyId = this.generateReplyId();
    const annotationReply: AnnotationReply = {
      id: replyId,
      authorId: reply.authorId,
      content: reply.content.trim(),
      createdAt: new Date(),
      reactions: []
    };

    annotation.replies.push(annotationReply);
    annotation.updatedAt = new Date();

    // Log reply creation
    this.logAnnotationActivity(reply.authorId, 'annotation_reply_created', {
      annotationId,
      replyId,
      targetType: annotation.targetType,
      targetId: annotation.targetId
    });

    return annotation;
  }

  /**
   * Add a reaction to an annotation or reply
   */
  async addReaction(
    annotationId: string,
    userId: string,
    reactionType: ReactionType,
    replyId?: string
  ): Promise<Annotation> {
    const annotation = this.annotations.get(annotationId);
    
    if (!annotation) {
      throw new Error('Annotation not found');
    }

    const reaction: AnnotationReaction = {
      userId,
      type: reactionType,
      createdAt: new Date()
    };

    if (replyId) {
      // Add reaction to reply
      const reply = annotation.replies.find(r => r.id === replyId);
      if (!reply) {
        throw new Error('Reply not found');
      }

      // Remove existing reaction from same user
      reply.reactions = reply.reactions.filter(r => r.userId !== userId);
      reply.reactions.push(reaction);
    } else {
      // Add reaction to annotation
      // Remove existing reaction from same user
      annotation.reactions = annotation.reactions.filter(r => r.userId !== userId);
      annotation.reactions.push(reaction);
    }

    annotation.updatedAt = new Date();

    // Log reaction
    this.logAnnotationActivity(userId, 'annotation_reaction_added', {
      annotationId,
      replyId,
      reactionType
    });

    return annotation;
  }

  /**
   * Remove a reaction
   */
  async removeReaction(
    annotationId: string,
    userId: string,
    replyId?: string
  ): Promise<Annotation> {
    const annotation = this.annotations.get(annotationId);
    
    if (!annotation) {
      throw new Error('Annotation not found');
    }

    if (replyId) {
      // Remove reaction from reply
      const reply = annotation.replies.find(r => r.id === replyId);
      if (!reply) {
        throw new Error('Reply not found');
      }
      reply.reactions = reply.reactions.filter(r => r.userId !== userId);
    } else {
      // Remove reaction from annotation
      annotation.reactions = annotation.reactions.filter(r => r.userId !== userId);
    }

    annotation.updatedAt = new Date();

    return annotation;
  }

  /**
   * Resolve or unresolve an annotation
   */
  async toggleAnnotationResolution(
    annotationId: string,
    userId: string
  ): Promise<Annotation> {
    const annotation = this.annotations.get(annotationId);
    
    if (!annotation) {
      throw new Error('Annotation not found');
    }

    // Only author or mentioned users can resolve
    if (annotation.authorId !== userId && !this.isUserMentioned(annotation, userId)) {
      throw new Error('Only the author or mentioned users can resolve this annotation');
    }

    annotation.isResolved = !annotation.isResolved;
    annotation.updatedAt = new Date();

    // Log resolution change
    this.logAnnotationActivity(userId, 'annotation_resolution_toggled', {
      annotationId,
      isResolved: annotation.isResolved
    });

    return annotation;
  }

  /**
   * Get annotation statistics for a user
   */
  async getUserAnnotationCount(userId: string): Promise<number> {
    let count = 0;
    for (const [, annotation] of this.annotations) {
      if (annotation.authorId === userId) {
        count++;
      }
    }
    return count;
  }

  /**
   * Get annotations by user
   */
  async getAnnotationsByUser(
    userId: string,
    filters?: {
      targetType?: AnnotationTarget;
      type?: AnnotationType;
      isResolved?: boolean;
      dateRange?: { start: Date; end: Date };
    }
  ): Promise<Annotation[]> {
    const userAnnotations: Annotation[] = [];

    for (const [, annotation] of this.annotations) {
      if (annotation.authorId !== userId) continue;

      // Apply filters
      if (filters?.targetType && annotation.targetType !== filters.targetType) continue;
      if (filters?.type && annotation.type !== filters.type) continue;
      if (filters?.isResolved !== undefined && annotation.isResolved !== filters.isResolved) continue;
      
      if (filters?.dateRange) {
        const annotationDate = annotation.createdAt;
        if (annotationDate < filters.dateRange.start || annotationDate > filters.dateRange.end) {
          continue;
        }
      }

      userAnnotations.push(annotation);
    }

    return userAnnotations.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Search annotations
   */
  async searchAnnotations(
    query: string,
    filters?: { type?: string; author?: string; dateRange?: { start: Date; end: Date } }
  ): Promise<any[]> {
    const results: any[] = [];
    
    for (const [, annotation] of this.annotations) {
      // Apply filters
      if (filters?.author && annotation.authorId !== filters.author) continue;
      if (filters?.type && annotation.type !== filters.type) continue;
      
      if (filters?.dateRange) {
        const annotationDate = annotation.createdAt;
        if (annotationDate < filters.dateRange.start || annotationDate > filters.dateRange.end) {
          continue;
        }
      }

      // Simple query matching
      const matchesQuery = !query || 
        annotation.content.toLowerCase().includes(query.toLowerCase()) ||
        annotation.replies.some(reply => 
          reply.content.toLowerCase().includes(query.toLowerCase())
        );

      if (matchesQuery) {
        results.push({
          type: 'annotation',
          id: annotation.id,
          title: `${annotation.type} on ${annotation.targetType}`,
          content: annotation.content,
          author: annotation.authorId,
          createdAt: annotation.createdAt,
          targetType: annotation.targetType,
          targetId: annotation.targetId,
          replyCount: annotation.replies.length,
          reactionCount: annotation.reactions.length
        });
      }
    }

    return results;
  }

  /**
   * Get annotation analytics
   */
  async getAnnotationAnalytics(
    targetType?: AnnotationTarget,
    dateRange?: { start: Date; end: Date }
  ): Promise<{
    totalAnnotations: number;
    annotationsByType: Record<AnnotationType, number>;
    annotationsByTarget: Record<AnnotationTarget, number>;
    averageRepliesPerAnnotation: number;
    resolutionRate: number;
  }> {
    let totalAnnotations = 0;
    const annotationsByType: Record<AnnotationType, number> = {
      comment: 0,
      question: 0,
      suggestion: 0,
      issue: 0,
      highlight: 0
    };
    const annotationsByTarget: Record<AnnotationTarget, number> = {
      chart: 0,
      widget: 0,
      dashboard: 0,
      insight: 0
    };
    let totalReplies = 0;
    let resolvedCount = 0;

    for (const [, annotation] of this.annotations) {
      // Apply filters
      if (targetType && annotation.targetType !== targetType) continue;
      
      if (dateRange) {
        const annotationDate = annotation.createdAt;
        if (annotationDate < dateRange.start || annotationDate > dateRange.end) {
          continue;
        }
      }

      totalAnnotations++;
      annotationsByType[annotation.type]++;
      annotationsByTarget[annotation.targetType]++;
      totalReplies += annotation.replies.length;
      
      if (annotation.isResolved) {
        resolvedCount++;
      }
    }

    return {
      totalAnnotations,
      annotationsByType,
      annotationsByTarget,
      averageRepliesPerAnnotation: totalAnnotations > 0 ? totalReplies / totalAnnotations : 0,
      resolutionRate: totalAnnotations > 0 ? resolvedCount / totalAnnotations : 0
    };
  }

  // Private helper methods

  private generateAnnotationId(): string {
    return `annotation_${++this.annotationCounter}_${Date.now()}`;
  }

  private generateReplyId(): string {
    return `reply_${++this.replyCounter}_${Date.now()}`;
  }

  private canUserViewAnnotation(annotation: Annotation, userId?: string): boolean {
    switch (annotation.visibility) {
      case 'public':
        return true;
      case 'team':
        // In real implementation, would check team membership
        return true;
      case 'private':
        return userId === annotation.authorId;
      case 'mentioned_users':
        return userId === annotation.authorId || this.isUserMentioned(annotation, userId);
      default:
        return false;
    }
  }

  private isUserMentioned(annotation: Annotation, userId?: string): boolean {
    if (!userId) return false;
    
    // Simple mention detection (in real implementation, would be more sophisticated)
    const mentionPattern = new RegExp(`@${userId}\\b`, 'i');
    return mentionPattern.test(annotation.content) ||
           annotation.replies.some(reply => mentionPattern.test(reply.content));
  }

  private logAnnotationActivity(
    userId: string,
    action: string,
    metadata: Record<string, any>
  ): void {
    // In real implementation, would log to analytics service
    console.log(`📝 Annotation activity: ${userId} performed ${action}`, metadata);
  }
}

export default AnnotationSystem;