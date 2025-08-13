import {
  DeliveryResult,
  DeliveryMethod,
  InterventionType,
  UserContext
} from '@devflow/shared-types';
import {
  DeliveryManager as IDeliveryManager,
  VisualInterventionContent,
  AudioInterventionContent,
  HapticInterventionContent,
  MultiModalInterventionContent,
  DeliveryContext,
  PersonalizedContent,
  UserResponse,
  InterventionContent,
  DeliveryError
} from '../types';
import { Logger } from 'winston';
import axios from 'axios';
import moment from 'moment';

export class DeliveryManager implements IDeliveryManager {
  private logger: Logger;
  private deliveryHistory: Map<string, DeliveryRecord[]> = new Map();
  private userPreferences: Map<string, UserDeliveryPreferences> = new Map();
  private activeDeliveries: Map<string, ActiveDelivery> = new Map();

  constructor(logger: Logger) {
    this.logger = logger;
    this.initializeDeliveryManager();
  }

  private initializeDeliveryManager(): void {
    // Initialize default delivery preferences
    this.loadDefaultPreferences();
    
    this.logger.info('DeliveryManager initialized');
  }

  async deliverVisualIntervention(
    userId: string,
    content: VisualInterventionContent
  ): Promise<DeliveryResult> {
    try {
      this.logger.info(`Delivering visual intervention`, { userId, type: content.type });

      // Validate content
      this.validateVisualContent(content);

      // Create delivery record
      const deliveryId = this.generateDeliveryId(userId, 'visual');
      const delivery: ActiveDelivery = {
        deliveryId,
        userId,
        method: DeliveryMethod.VISUAL,
        content,
        startTime: new Date(),
        status: 'delivering'
      };

      this.activeDeliveries.set(deliveryId, delivery);

      // Personalize content for user
      const personalizedContent = await this.personalizeVisualContent(userId, content);

      // Execute visual delivery
      const deliveryResult = await this.executeVisualDelivery(userId, personalizedContent);

      // Update delivery status
      delivery.status = deliveryResult.success ? 'completed' : 'failed';
      delivery.endTime = new Date();
      delivery.result = deliveryResult;

      // Record delivery history
      await this.recordDeliveryHistory(userId, delivery);

      this.logger.info(`Visual intervention delivered`, { 
        userId, 
        deliveryId, 
        success: deliveryResult.success 
      });

      return {
        success: deliveryResult.success,
        deliveredAt: new Date(),
        deliveryMethod: DeliveryMethod.VISUAL,
        userResponse: deliveryResult.userResponse,
        error: deliveryResult.error
      };
    } catch (error) {
      this.logger.error(`Error delivering visual intervention`, { userId, error: error.message });
      throw new DeliveryError(`Visual delivery failed: ${error.message}`, userId, '');
    }
  }

  async deliverAudioIntervention(
    userId: string,
    content: AudioInterventionContent
  ): Promise<DeliveryResult> {
    try {
      this.logger.info(`Delivering audio intervention`, { userId, type: content.type });

      // Validate content
      this.validateAudioContent(content);

      // Create delivery record
      const deliveryId = this.generateDeliveryId(userId, 'audio');
      const delivery: ActiveDelivery = {
        deliveryId,
        userId,
        method: DeliveryMethod.AUDIO,
        content,
        startTime: new Date(),
        status: 'delivering'
      };

      this.activeDeliveries.set(deliveryId, delivery);

      // Personalize content for user
      const personalizedContent = await this.personalizeAudioContent(userId, content);

      // Execute audio delivery
      const deliveryResult = await this.executeAudioDelivery(userId, personalizedContent);

      // Update delivery status
      delivery.status = deliveryResult.success ? 'completed' : 'failed';
      delivery.endTime = new Date();
      delivery.result = deliveryResult;

      // Record delivery history
      await this.recordDeliveryHistory(userId, delivery);

      this.logger.info(`Audio intervention delivered`, { 
        userId, 
        deliveryId, 
        success: deliveryResult.success 
      });

      return {
        success: deliveryResult.success,
        deliveredAt: new Date(),
        deliveryMethod: DeliveryMethod.AUDIO,
        userResponse: deliveryResult.userResponse,
        error: deliveryResult.error
      };
    } catch (error) {
      this.logger.error(`Error delivering audio intervention`, { userId, error: error.message });
      throw new DeliveryError(`Audio delivery failed: ${error.message}`, userId, '');
    }
  }

  async deliverHapticIntervention(
    userId: string,
    content: HapticInterventionContent
  ): Promise<DeliveryResult> {
    try {
      this.logger.info(`Delivering haptic intervention`, { userId, type: content.type });

      // Validate content
      this.validateHapticContent(content);

      // Create delivery record
      const deliveryId = this.generateDeliveryId(userId, 'haptic');
      const delivery: ActiveDelivery = {
        deliveryId,
        userId,
        method: DeliveryMethod.HAPTIC,
        content,
        startTime: new Date(),
        status: 'delivering'
      };

      this.activeDeliveries.set(deliveryId, delivery);

      // Personalize content for user
      const personalizedContent = await this.personalizeHapticContent(userId, content);

      // Execute haptic delivery
      const deliveryResult = await this.executeHapticDelivery(userId, personalizedContent);

      // Update delivery status
      delivery.status = deliveryResult.success ? 'completed' : 'failed';
      delivery.endTime = new Date();
      delivery.result = deliveryResult;

      // Record delivery history
      await this.recordDeliveryHistory(userId, delivery);

      this.logger.info(`Haptic intervention delivered`, { 
        userId, 
        deliveryId, 
        success: deliveryResult.success 
      });

      return {
        success: deliveryResult.success,
        deliveredAt: new Date(),
        deliveryMethod: DeliveryMethod.HAPTIC,
        userResponse: deliveryResult.userResponse,
        error: deliveryResult.error
      };
    } catch (error) {
      this.logger.error(`Error delivering haptic intervention`, { userId, error: error.message });
      throw new DeliveryError(`Haptic delivery failed: ${error.message}`, userId, '');
    }
  }

  async deliverMultiModalIntervention(
    userId: string,
    content: MultiModalInterventionContent
  ): Promise<DeliveryResult> {
    try {
      this.logger.info(`Delivering multi-modal intervention`, { userId });

      // Validate content
      this.validateMultiModalContent(content);

      // Create delivery record
      const deliveryId = this.generateDeliveryId(userId, 'multi_modal');
      const delivery: ActiveDelivery = {
        deliveryId,
        userId,
        method: DeliveryMethod.MULTI_MODAL,
        content,
        startTime: new Date(),
        status: 'delivering'
      };

      this.activeDeliveries.set(deliveryId, delivery);

      // Execute multi-modal delivery with synchronization
      const deliveryResults = await this.executeMultiModalDelivery(userId, content);

      // Determine overall success
      const overallSuccess = deliveryResults.some(result => result.success);
      const primaryResult = deliveryResults.find(result => result.success) || deliveryResults[0];

      // Update delivery status
      delivery.status = overallSuccess ? 'completed' : 'failed';
      delivery.endTime = new Date();
      delivery.result = primaryResult;

      // Record delivery history
      await this.recordDeliveryHistory(userId, delivery);

      this.logger.info(`Multi-modal intervention delivered`, { 
        userId, 
        deliveryId, 
        success: overallSuccess,
        modalitiesSuccessful: deliveryResults.filter(r => r.success).length
      });

      return {
        success: overallSuccess,
        deliveredAt: new Date(),
        deliveryMethod: DeliveryMethod.MULTI_MODAL,
        userResponse: primaryResult.userResponse,
        error: overallSuccess ? undefined : 'Some modalities failed'
      };
    } catch (error) {
      this.logger.error(`Error delivering multi-modal intervention`, { userId, error: error.message });
      throw new DeliveryError(`Multi-modal delivery failed: ${error.message}`, userId, '');
    }
  }

  async selectOptimalDeliveryMethod(
    userId: string,
    context: DeliveryContext
  ): Promise<DeliveryMethod> {
    try {
      this.logger.info(`Selecting optimal delivery method`, { userId, context: context.currentActivity });

      // Get user preferences
      const preferences = this.getUserPreferences(userId);
      
      // Analyze context factors
      const contextScore = this.analyzeDeliveryContext(context);
      
      // Score each delivery method
      const methodScores = new Map<DeliveryMethod, number>();
      
      // Visual delivery scoring
      let visualScore = 0.5; // Base score
      if (context.currentActivity === 'coding' || context.currentActivity === 'focused') {
        visualScore -= 0.3; // Reduce for focus-intensive activities
      }
      if (context.userLocation === 'office') {
        visualScore += 0.2; // Good for office environment
      }
      if (preferences.preferredMethods.includes(DeliveryMethod.VISUAL)) {
        visualScore += 0.3; // User preference bonus
      }
      methodScores.set(DeliveryMethod.VISUAL, Math.max(0, Math.min(1, visualScore)));

      // Audio delivery scoring
      let audioScore = 0.4; // Base score
      if (context.currentActivity === 'meeting') {
        audioScore -= 0.5; // Bad for meetings
      }
      if (context.userLocation === 'office' && context.environmentalFactors?.noiseLevel && context.environmentalFactors.noiseLevel > 70) {
        audioScore -= 0.3; // Reduce in noisy environments
      }
      if (preferences.preferredMethods.includes(DeliveryMethod.AUDIO)) {
        audioScore += 0.3; // User preference bonus
      }
      methodScores.set(DeliveryMethod.AUDIO, Math.max(0, Math.min(1, audioScore)));

      // Haptic delivery scoring
      let hapticScore = 0.6; // Base score (generally less intrusive)
      if (context.deviceType === 'mobile' || context.deviceType === 'wearable') {
        hapticScore += 0.2; // Better on mobile devices
      }
      if (context.currentActivity === 'focused') {
        hapticScore += 0.3; // Good for focused work
      }
      if (preferences.preferredMethods.includes(DeliveryMethod.HAPTIC)) {
        hapticScore += 0.3; // User preference bonus
      }
      methodScores.set(DeliveryMethod.HAPTIC, Math.max(0, Math.min(1, hapticScore)));

      // Multi-modal scoring (for high-priority interventions)
      let multiModalScore = 0.3; // Base score (more complex)
      if (context.userState?.stressLevel && context.userState.stressLevel > 80) {
        multiModalScore += 0.4; // Better for high stress situations
      }
      if (preferences.preferredMethods.includes(DeliveryMethod.MULTI_MODAL)) {
        multiModalScore += 0.3; // User preference bonus
      }
      methodScores.set(DeliveryMethod.MULTI_MODAL, Math.max(0, Math.min(1, multiModalScore)));

      // Select method with highest score
      const optimalMethod = Array.from(methodScores.entries())
        .reduce((best, current) => current[1] > best[1] ? current : best)[0];

      this.logger.info(`Optimal delivery method selected`, { 
        userId, 
        method: optimalMethod,
        scores: Object.fromEntries(methodScores)
      });

      return optimalMethod;
    } catch (error) {
      this.logger.error(`Error selecting optimal delivery method`, { userId, error: error.message });
      // Default to visual if selection fails
      return DeliveryMethod.VISUAL;
    }
  }

  async adaptContentForUser(
    userId: string,
    baseContent: InterventionContent
  ): Promise<PersonalizedContent> {
    try {
      this.logger.info(`Adapting content for user`, { userId });

      const preferences = this.getUserPreferences(userId);
      const deliveryHistory = this.getDeliveryHistory(userId);
      
      // Analyze user's response patterns
      const responsePatterns = this.analyzeUserResponsePatterns(deliveryHistory);
      
      // Create personalized content
      const personalizations: any[] = [];
      let adaptedContent = { ...baseContent };
      let effectivenessScore = 0.5; // Base effectiveness

      // Adapt based on user preferences
      if (preferences.preferredTone === 'formal') {
        personalizations.push({
          type: 'tone_adaptation',
          description: 'Adapted to formal tone preference'
        });
        effectivenessScore += 0.1;
      } else if (preferences.preferredTone === 'casual') {
        personalizations.push({
          type: 'tone_adaptation',
          description: 'Adapted to casual tone preference'
        });
        effectivenessScore += 0.1;
      }

      // Adapt based on response patterns
      if (responsePatterns.averageResponseTime < 5000) { // Quick responder
        personalizations.push({
          type: 'timing_adaptation',
          description: 'Shortened content for quick responder'
        });
        effectivenessScore += 0.1;
      } else if (responsePatterns.averageResponseTime > 30000) { // Slow responder
        personalizations.push({
          type: 'timing_adaptation',
          description: 'Extended content duration for thorough consideration'
        });
        effectivenessScore += 0.1;
      }

      // Adapt based on intervention type effectiveness
      const typeEffectiveness = responsePatterns.typeEffectiveness.get(baseContent.type);
      if (typeEffectiveness && typeEffectiveness > 0.7) {
        personalizations.push({
          type: 'content_enhancement',
          description: 'Enhanced content based on high effectiveness for this intervention type'
        });
        effectivenessScore += 0.2;
      }

      // Adapt based on time of day
      const hour = new Date().getHours();
      if (hour < 9) {
        personalizations.push({
          type: 'time_adaptation',
          description: 'Morning-optimized content'
        });
        adaptedContent.energyLevel = 'gentle';
      } else if (hour > 17) {
        personalizations.push({
          type: 'time_adaptation',
          description: 'Evening-optimized content'
        });
        adaptedContent.energyLevel = 'relaxing';
      }

      const personalizedContent: PersonalizedContent = {
        baseContent,
        personalizations,
        adaptationReason: personalizations.map(p => p.description),
        effectivenessScore: Math.min(1, effectivenessScore)
      };

      this.logger.info(`Content adapted for user`, { 
        userId, 
        personalizationCount: personalizations.length,
        effectivenessScore: personalizedContent.effectivenessScore
      });

      return personalizedContent;
    } catch (error) {
      this.logger.error(`Error adapting content for user`, { userId, error: error.message });
      
      // Return base content if adaptation fails
      return {
        baseContent,
        personalizations: [],
        adaptationReason: ['Adaptation failed, using base content'],
        effectivenessScore: 0.5
      };
    }
  }

  async trackDeliveryEffectiveness(
    deliveryId: string,
    userResponse: UserResponse
  ): Promise<void> {
    try {
      this.logger.info(`Tracking delivery effectiveness`, { deliveryId });

      const delivery = this.activeDeliveries.get(deliveryId);
      if (!delivery) {
        throw new Error(`Delivery not found: ${deliveryId}`);
      }

      // Update delivery with user response
      delivery.userResponse = userResponse;
      delivery.responseTime = userResponse.responseTime;

      // Calculate effectiveness score
      const effectivenessScore = this.calculateDeliveryEffectiveness(delivery, userResponse);
      delivery.effectivenessScore = effectivenessScore;

      // Update user preferences based on response
      await this.updateUserPreferencesFromResponse(delivery.userId, delivery, userResponse);

      // Record effectiveness data for ML learning
      await this.recordEffectivenessData(delivery, userResponse, effectivenessScore);

      this.logger.info(`Delivery effectiveness tracked`, { 
        deliveryId, 
        effectivenessScore,
        responseType: userResponse.responseType
      });
    } catch (error) {
      this.logger.error(`Error tracking delivery effectiveness`, { deliveryId, error: error.message });
      throw error;
    }
  }

  // Specialized delivery methods for different intervention types
  async deliverStressReductionIntervention(
    userId: string,
    interventionType: InterventionType,
    deliveryMethod: DeliveryMethod
  ): Promise<DeliveryResult> {
    try {
      this.logger.info(`Delivering stress reduction intervention`, { userId, interventionType });

      const stressReductionContent = await this.createStressReductionContent(userId, interventionType);
      
      switch (deliveryMethod) {
        case DeliveryMethod.VISUAL:
          return await this.deliverVisualIntervention(userId, stressReductionContent.visual);
        case DeliveryMethod.AUDIO:
          return await this.deliverAudioIntervention(userId, stressReductionContent.audio);
        case DeliveryMethod.HAPTIC:
          return await this.deliverHapticIntervention(userId, stressReductionContent.haptic);
        case DeliveryMethod.MULTI_MODAL:
          return await this.deliverMultiModalIntervention(userId, stressReductionContent.multiModal);
        default:
          throw new Error(`Unsupported delivery method: ${deliveryMethod}`);
      }
    } catch (error) {
      this.logger.error(`Error delivering stress reduction intervention`, { userId, error: error.message });
      throw error;
    }
  }

  async deliverBreathingExercise(
    userId: string,
    exerciseType: 'box_breathing' | '4_7_8' | 'coherent_breathing',
    deliveryMethod: DeliveryMethod
  ): Promise<DeliveryResult> {
    try {
      this.logger.info(`Delivering breathing exercise`, { userId, exerciseType });

      const breathingContent = await this.createBreathingExerciseContent(userId, exerciseType);
      
      switch (deliveryMethod) {
        case DeliveryMethod.VISUAL:
          return await this.deliverVisualIntervention(userId, breathingContent.visual);
        case DeliveryMethod.AUDIO:
          return await this.deliverAudioIntervention(userId, breathingContent.audio);
        case DeliveryMethod.MULTI_MODAL:
          return await this.deliverMultiModalIntervention(userId, breathingContent.multiModal);
        default:
          // Default to visual for breathing exercises
          return await this.deliverVisualIntervention(userId, breathingContent.visual);
      }
    } catch (error) {
      this.logger.error(`Error delivering breathing exercise`, { userId, error: error.message });
      throw error;
    }
  }

  async deliverMovementReminder(
    userId: string,
    movementType: 'stretch' | 'walk' | 'posture_check' | 'eye_rest',
    deliveryMethod: DeliveryMethod
  ): Promise<DeliveryResult> {
    try {
      this.logger.info(`Delivering movement reminder`, { userId, movementType });

      const movementContent = await this.createMovementReminderContent(userId, movementType);
      
      switch (deliveryMethod) {
        case DeliveryMethod.VISUAL:
          return await this.deliverVisualIntervention(userId, movementContent.visual);
        case DeliveryMethod.HAPTIC:
          return await this.deliverHapticIntervention(userId, movementContent.haptic);
        case DeliveryMethod.MULTI_MODAL:
          return await this.deliverMultiModalIntervention(userId, movementContent.multiModal);
        default:
          // Default to haptic for movement reminders
          return await this.deliverHapticIntervention(userId, movementContent.haptic);
      }
    } catch (error) {
      this.logger.error(`Error delivering movement reminder`, { userId, error: error.message });
      throw error;
    }
  }

  async deliverHydrationReminder(
    userId: string,
    reminderType: 'gentle' | 'urgent' | 'gamified',
    deliveryMethod: DeliveryMethod
  ): Promise<DeliveryResult> {
    try {
      this.logger.info(`Delivering hydration reminder`, { userId, reminderType });

      const hydrationContent = await this.createHydrationReminderContent(userId, reminderType);
      
      switch (deliveryMethod) {
        case DeliveryMethod.VISUAL:
          return await this.deliverVisualIntervention(userId, hydrationContent.visual);
        case DeliveryMethod.AUDIO:
          return await this.deliverAudioIntervention(userId, hydrationContent.audio);
        case DeliveryMethod.HAPTIC:
          return await this.deliverHapticIntervention(userId, hydrationContent.haptic);
        default:
          // Default to visual for hydration reminders
          return await this.deliverVisualIntervention(userId, hydrationContent.visual);
      }
    } catch (error) {
      this.logger.error(`Error delivering hydration reminder`, { userId, error: error.message });
      throw error;
    }
  }

  // Private helper methods
  private validateVisualContent(content: VisualInterventionContent): void {
    if (!content.title || !content.message) {
      throw new Error('Visual content must have title and message');
    }
    if (content.duration <= 0) {
      throw new Error('Visual content duration must be positive');
    }
  }

  private validateAudioContent(content: AudioInterventionContent): void {
    if (!content.audioUrl && !content.textToSpeech) {
      throw new Error('Audio content must have either audioUrl or textToSpeech');
    }
    if (content.duration <= 0) {
      throw new Error('Audio content duration must be positive');
    }
  }

  private validateHapticContent(content: HapticInterventionContent): void {
    if (!content.pattern || content.pattern.length === 0) {
      throw new Error('Haptic content must have pattern');
    }
    if (content.duration <= 0) {
      throw new Error('Haptic content duration must be positive');
    }
  }

  private validateMultiModalContent(content: MultiModalInterventionContent): void {
    if (!content.visual && !content.audio && !content.haptic) {
      throw new Error('Multi-modal content must have at least one modality');
    }
  }

  private generateDeliveryId(userId: string, method: string): string {
    return `delivery_${userId}_${method}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async personalizeVisualContent(
    userId: string,
    content: VisualInterventionContent
  ): Promise<VisualInterventionContent> {
    const preferences = this.getUserPreferences(userId);
    
    return {
      ...content,
      styling: {
        ...content.styling,
        fontSize: preferences.fontSize || content.styling?.fontSize || 'medium',
        colorScheme: preferences.colorScheme || content.styling?.colorScheme || 'default',
        animation: preferences.animationsEnabled !== false
      }
    };
  }

  private async personalizeAudioContent(
    userId: string,
    content: AudioInterventionContent
  ): Promise<AudioInterventionContent> {
    const preferences = this.getUserPreferences(userId);
    
    return {
      ...content,
      volume: Math.min(1, Math.max(0, preferences.audioVolume || content.volume || 0.7))
    };
  }

  private async personalizeHapticContent(
    userId: string,
    content: HapticInterventionContent
  ): Promise<HapticInterventionContent> {
    const preferences = this.getUserPreferences(userId);
    
    return {
      ...content,
      intensity: Math.min(1, Math.max(0, preferences.hapticIntensity || content.intensity || 0.5))
    };
  }

  private async executeVisualDelivery(
    userId: string,
    content: VisualInterventionContent
  ): Promise<InternalDeliveryResult> {
    // In a real implementation, this would:
    // - Send to dashboard/UI service
    // - Display notification or overlay
    // - Track user interaction
    
    // Simulate delivery
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return {
      success: true,
      userResponse: 'accepted',
      deliveredAt: new Date()
    };
  }

  private async executeAudioDelivery(
    userId: string,
    content: AudioInterventionContent
  ): Promise<InternalDeliveryResult> {
    // In a real implementation, this would:
    // - Send to audio service
    // - Play audio or text-to-speech
    // - Handle audio device availability
    
    // Simulate delivery
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return {
      success: true,
      userResponse: 'accepted',
      deliveredAt: new Date()
    };
  }

  private async executeHapticDelivery(
    userId: string,
    content: HapticInterventionContent
  ): Promise<InternalDeliveryResult> {
    // In a real implementation, this would:
    // - Send to device haptic service
    // - Trigger haptic patterns
    // - Handle device capability checks
    
    // Simulate delivery
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return {
      success: true,
      userResponse: 'accepted',
      deliveredAt: new Date()
    };
  }

  private async executeMultiModalDelivery(
    userId: string,
    content: MultiModalInterventionContent
  ): Promise<InternalDeliveryResult[]> {
    const results: InternalDeliveryResult[] = [];
    
    // Execute each modality based on synchronization settings
    if (content.visual) {
      const visualResult = await this.executeVisualDelivery(userId, content.visual);
      results.push(visualResult);
    }
    
    if (content.audio) {
      const audioResult = await this.executeAudioDelivery(userId, content.audio);
      results.push(audioResult);
    }
    
    if (content.haptic) {
      const hapticResult = await this.executeHapticDelivery(userId, content.haptic);
      results.push(hapticResult);
    }
    
    return results;
  }

  private analyzeDeliveryContext(context: DeliveryContext): number {
    let score = 0.5; // Base score
    
    // Activity-based scoring
    if (context.currentActivity === 'focused') {
      score += 0.2; // Good time for intervention
    } else if (context.currentActivity === 'meeting') {
      score -= 0.3; // Bad time for intervention
    }
    
    // Location-based scoring
    if (context.userLocation === 'office') {
      score += 0.1;
    } else if (context.userLocation === 'mobile') {
      score -= 0.1;
    }
    
    return Math.max(0, Math.min(1, score));
  }

  private getUserPreferences(userId: string): UserDeliveryPreferences {
    return this.userPreferences.get(userId) || this.getDefaultPreferences();
  }

  private getDefaultPreferences(): UserDeliveryPreferences {
    return {
      preferredMethods: [DeliveryMethod.VISUAL, DeliveryMethod.HAPTIC],
      preferredTone: 'professional',
      fontSize: 'medium',
      colorScheme: 'default',
      audioVolume: 0.7,
      hapticIntensity: 0.5,
      animationsEnabled: true
    };
  }

  private getDeliveryHistory(userId: string): DeliveryRecord[] {
    return this.deliveryHistory.get(userId) || [];
  }

  private analyzeUserResponsePatterns(history: DeliveryRecord[]): ResponsePatterns {
    if (history.length === 0) {
      return {
        averageResponseTime: 10000,
        preferredResponseType: 'accepted',
        typeEffectiveness: new Map()
      };
    }

    const responseTimes = history
      .filter(h => h.responseTime)
      .map(h => h.responseTime!.getTime() - h.startTime.getTime());
    
    const averageResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      : 10000;

    const responseTypes = history
      .filter(h => h.userResponse)
      .map(h => h.userResponse!.responseType);
    
    const preferredResponseType = this.getMostFrequent(responseTypes) || 'accepted';

    const typeEffectiveness = new Map<InterventionType, number>();
    // Calculate effectiveness by intervention type
    for (const type of Object.values(InterventionType)) {
      const typeHistory = history.filter(h => h.content.type === type);
      if (typeHistory.length > 0) {
        const avgEffectiveness = typeHistory
          .filter(h => h.effectivenessScore !== undefined)
          .reduce((sum, h) => sum + (h.effectivenessScore || 0), 0) / typeHistory.length;
        typeEffectiveness.set(type, avgEffectiveness);
      }
    }

    return {
      averageResponseTime,
      preferredResponseType,
      typeEffectiveness
    };
  }

  private getMostFrequent<T>(items: T[]): T | undefined {
    if (items.length === 0) return undefined;
    
    const frequency = new Map<T, number>();
    for (const item of items) {
      frequency.set(item, (frequency.get(item) || 0) + 1);
    }
    
    return Array.from(frequency.entries())
      .reduce((most, current) => current[1] > most[1] ? current : most)[0];
  }

  private calculateDeliveryEffectiveness(
    delivery: ActiveDelivery,
    userResponse: UserResponse
  ): number {
    let score = 0.5; // Base score

    // Response type scoring
    if (userResponse.responseType === 'accepted') {
      score += 0.3;
    } else if (userResponse.responseType === 'completed') {
      score += 0.5;
    } else if (userResponse.responseType === 'dismissed') {
      score -= 0.2;
    } else if (userResponse.responseType === 'ignored') {
      score -= 0.4;
    }

    // Response time scoring
    const responseTime = userResponse.responseTime.getTime() - delivery.startTime.getTime();
    if (responseTime < 5000) { // Quick response
      score += 0.1;
    } else if (responseTime > 60000) { // Very slow response
      score -= 0.1;
    }

    // Engagement duration scoring
    if (userResponse.engagementDuration > 0) {
      score += Math.min(0.2, userResponse.engagementDuration / 30000); // Up to 0.2 for 30+ seconds
    }

    return Math.max(0, Math.min(1, score));
  }

  private async updateUserPreferencesFromResponse(
    userId: string,
    delivery: ActiveDelivery,
    userResponse: UserResponse
  ): Promise<void> {
    const preferences = this.getUserPreferences(userId);
    
    // Update method preferences based on response
    if (userResponse.responseType === 'accepted' || userResponse.responseType === 'completed') {
      if (!preferences.preferredMethods.includes(delivery.method)) {
        preferences.preferredMethods.push(delivery.method);
      }
    } else if (userResponse.responseType === 'dismissed' || userResponse.responseType === 'ignored') {
      const index = preferences.preferredMethods.indexOf(delivery.method);
      if (index > -1 && preferences.preferredMethods.length > 1) {
        preferences.preferredMethods.splice(index, 1);
      }
    }

    this.userPreferences.set(userId, preferences);
  }

  private async recordDeliveryHistory(userId: string, delivery: ActiveDelivery): Promise<void> {
    if (!this.deliveryHistory.has(userId)) {
      this.deliveryHistory.set(userId, []);
    }

    const history = this.deliveryHistory.get(userId)!;
    const record: DeliveryRecord = {
      deliveryId: delivery.deliveryId,
      method: delivery.method,
      content: delivery.content,
      startTime: delivery.startTime,
      endTime: delivery.endTime,
      status: delivery.status,
      userResponse: delivery.userResponse,
      responseTime: delivery.responseTime,
      effectivenessScore: delivery.effectivenessScore
    };

    history.push(record);

    // Keep only last 1000 records per user
    if (history.length > 1000) {
      history.splice(0, history.length - 1000);
    }
  }

  private async recordEffectivenessData(
    delivery: ActiveDelivery,
    userResponse: UserResponse,
    effectivenessScore: number
  ): Promise<void> {
    // In a real implementation, this would send data to ML pipeline
    this.logger.info(`Recording effectiveness data`, {
      deliveryId: delivery.deliveryId,
      method: delivery.method,
      effectivenessScore,
      responseType: userResponse.responseType
    });
  }

  private async createStressReductionContent(
    userId: string,
    interventionType: InterventionType
  ): Promise<any> {
    // Create personalized stress reduction content
    return {
      visual: {
        type: 'overlay',
        title: 'Take a Moment to Breathe',
        message: 'Your stress levels seem elevated. Let\'s take a few deep breaths together.',
        duration: 30,
        styling: {}
      },
      audio: {
        type: 'guided_audio',
        textToSpeech: 'Take a deep breath in... and slowly breathe out. You\'re doing great.',
        duration: 30,
        volume: 0.7,
        fadeIn: true,
        fadeOut: true
      },
      haptic: {
        type: 'pattern',
        pattern: [
          { intensity: 0.3, duration: 1000 },
          { intensity: 0, duration: 500 },
          { intensity: 0.3, duration: 1000 }
        ],
        intensity: 0.5,
        duration: 2500,
        repeatCount: 3
      },
      multiModal: {
        visual: {
          type: 'overlay',
          title: 'Stress Relief',
          message: 'Follow the breathing guide',
          duration: 60,
          styling: {}
        },
        audio: {
          type: 'guided_audio',
          textToSpeech: 'Breathe in slowly... hold... and breathe out',
          duration: 60,
          volume: 0.6,
          fadeIn: true,
          fadeOut: true
        },
        synchronization: {
          startTogether: true,
          endTogether: true
        },
        fallbackMethods: [DeliveryMethod.VISUAL]
      }
    };
  }

  private async createBreathingExerciseContent(
    userId: string,
    exerciseType: string
  ): Promise<any> {
    const exercises = {
      box_breathing: {
        title: 'Box Breathing Exercise',
        instructions: ['Breathe in for 4 counts', 'Hold for 4 counts', 'Breathe out for 4 counts', 'Hold for 4 counts'],
        duration: 240 // 4 minutes
      },
      '4_7_8': {
        title: '4-7-8 Breathing',
        instructions: ['Breathe in for 4 counts', 'Hold for 7 counts', 'Breathe out for 8 counts'],
        duration: 180 // 3 minutes
      },
      coherent_breathing: {
        title: 'Coherent Breathing',
        instructions: ['Breathe in for 5 counts', 'Breathe out for 5 counts'],
        duration: 300 // 5 minutes
      }
    };

    const exercise = exercises[exerciseType] || exercises.box_breathing;

    return {
      visual: {
        type: 'full_screen',
        title: exercise.title,
        message: 'Follow the breathing pattern',
        duration: exercise.duration,
        interactiveElements: [
          {
            type: 'breathing_guide',
            pattern: exerciseType
          }
        ],
        styling: {}
      },
      audio: {
        type: 'guided_audio',
        textToSpeech: `Let's begin ${exercise.title}. ${exercise.instructions.join('. ')}`,
        duration: exercise.duration,
        volume: 0.6,
        fadeIn: true,
        fadeOut: true
      },
      multiModal: {
        visual: {
          type: 'full_screen',
          title: exercise.title,
          message: 'Follow along with the audio guide',
          duration: exercise.duration,
          styling: {}
        },
        audio: {
          type: 'guided_audio',
          textToSpeech: `${exercise.title} session starting now`,
          duration: exercise.duration,
          volume: 0.6,
          fadeIn: true,
          fadeOut: true
        },
        synchronization: {
          startTogether: true,
          endTogether: true
        },
        fallbackMethods: [DeliveryMethod.VISUAL]
      }
    };
  }

  private async createMovementReminderContent(
    userId: string,
    movementType: string
  ): Promise<any> {
    const movements = {
      stretch: {
        title: 'Time to Stretch',
        message: 'Stand up and do some gentle stretches to relieve tension',
        duration: 120
      },
      walk: {
        title: 'Take a Walk',
        message: 'A short walk will help refresh your mind and body',
        duration: 300
      },
      posture_check: {
        title: 'Posture Check',
        message: 'Adjust your posture: shoulders back, feet flat on floor',
        duration: 30
      },
      eye_rest: {
        title: 'Rest Your Eyes',
        message: 'Look away from your screen and focus on something 20 feet away',
        duration: 60
      }
    };

    const movement = movements[movementType] || movements.stretch;

    return {
      visual: {
        type: 'notification',
        title: movement.title,
        message: movement.message,
        duration: movement.duration,
        styling: {}
      },
      haptic: {
        type: 'pulse',
        pattern: [
          { intensity: 0.4, duration: 500 },
          { intensity: 0, duration: 200 },
          { intensity: 0.4, duration: 500 }
        ],
        intensity: 0.4,
        duration: 1200,
        repeatCount: 2
      },
      multiModal: {
        visual: {
          type: 'notification',
          title: movement.title,
          message: movement.message,
          duration: movement.duration,
          styling: {}
        },
        haptic: {
          type: 'pulse',
          pattern: [{ intensity: 0.3, duration: 1000 }],
          intensity: 0.3,
          duration: 1000,
          repeatCount: 1
        },
        synchronization: {
          startTogether: true,
          endTogether: false
        },
        fallbackMethods: [DeliveryMethod.VISUAL]
      }
    };
  }

  private async createHydrationReminderContent(
    userId: string,
    reminderType: string
  ): Promise<any> {
    const reminders = {
      gentle: {
        title: 'Hydration Reminder',
        message: 'Time for a sip of water to stay hydrated',
        tone: 'gentle'
      },
      urgent: {
        title: 'Hydration Alert',
        message: 'You haven\'t had water in a while. Please hydrate now!',
        tone: 'urgent'
      },
      gamified: {
        title: 'Hydration Quest',
        message: 'Complete your hydration mission! 💧 Drink some water to earn points',
        tone: 'playful'
      }
    };

    const reminder = reminders[reminderType] || reminders.gentle;

    return {
      visual: {
        type: 'notification',
        title: reminder.title,
        message: reminder.message,
        duration: 15,
        styling: {
          theme: reminder.tone
        }
      },
      audio: {
        type: 'notification',
        textToSpeech: reminder.message,
        duration: 5,
        volume: 0.5,
        fadeIn: false,
        fadeOut: true
      },
      haptic: {
        type: 'vibration',
        pattern: [
          { intensity: 0.2, duration: 200 },
          { intensity: 0, duration: 100 },
          { intensity: 0.2, duration: 200 }
        ],
        intensity: 0.2,
        duration: 500,
        repeatCount: 1
      }
    };
  }

  private loadDefaultPreferences(): void {
    // In a real implementation, this would load from database
    this.logger.info('Default delivery preferences loaded');
  }
}

// Supporting interfaces
interface DeliveryRecord {
  deliveryId: string;
  method: DeliveryMethod;
  content: any;
  startTime: Date;
  endTime?: Date;
  status: 'delivering' | 'completed' | 'failed';
  userResponse?: UserResponse;
  responseTime?: Date;
  effectivenessScore?: number;
}

interface ActiveDelivery {
  deliveryId: string;
  userId: string;
  method: DeliveryMethod;
  content: any;
  startTime: Date;
  endTime?: Date;
  status: 'delivering' | 'completed' | 'failed';
  result?: InternalDeliveryResult;
  userResponse?: UserResponse;
  responseTime?: Date;
  effectivenessScore?: number;
}

interface UserDeliveryPreferences {
  preferredMethods: DeliveryMethod[];
  preferredTone: 'professional' | 'casual' | 'formal';
  fontSize: 'small' | 'medium' | 'large';
  colorScheme: 'default' | 'dark' | 'high_contrast';
  audioVolume: number;
  hapticIntensity: number;
  animationsEnabled: boolean;
}

interface ResponsePatterns {
  averageResponseTime: number;
  preferredResponseType: string;
  typeEffectiveness: Map<InterventionType, number>;
}

interface InternalDeliveryResult {
  success: boolean;
  userResponse?: string;
  deliveredAt: Date;
  error?: string;
}