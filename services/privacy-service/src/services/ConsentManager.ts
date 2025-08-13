import { ConsentRecord, ConsentType, ConsentStatus, DataCategory, ConsentRequest } from '../types';

export class ConsentManager {
  private consentRecords: Map<string, ConsentRecord[]> = new Map();

  /**
   * Request consent for specific data categories
   */
  async requestConsent(userId: string, request: ConsentRequest): Promise<string> {
    const consentId = this.generateConsentId();
    const consentRecord: ConsentRecord = {
      id: consentId,
      userId,
      consentType: request.consentType,
      dataCategories: request.dataCategories,
      purpose: request.purpose,
      status: ConsentStatus.PENDING,
      requestedAt: new Date(),
      expiresAt: request.expiresAt,
      granular: request.granular || false,
      metadata: {
        requestSource: request.source || 'system',
        legalBasis: request.legalBasis,
        processingPurpose: request.purpose,
        dataRetentionPeriod: request.retentionPeriod
      }
    };

    const userConsents = this.consentRecords.get(userId) || [];
    userConsents.push(consentRecord);
    this.consentRecords.set(userId, userConsents);

    // Log consent request for audit trail
    await this.logConsentActivity(userId, 'CONSENT_REQUESTED', consentRecord);

    return consentId;
  }

  /**
   * Grant consent for a specific request
   */
  async grantConsent(userId: string, consentId: string): Promise<void> {
    const consent = await this.getConsentRecord(userId, consentId);
    if (!consent) {
      throw new Error('Consent record not found');
    }

    if (consent.expiresAt && consent.expiresAt < new Date()) {
      throw new Error('Consent request has expired');
    }

    consent.status = ConsentStatus.GRANTED;
    consent.grantedAt = new Date();

    await this.logConsentActivity(userId, 'CONSENT_GRANTED', consent);
  }

  /**
   * Revoke consent for specific data categories
   */
  async revokeConsent(userId: string, consentId: string, reason?: string): Promise<void> {
    const consent = await this.getConsentRecord(userId, consentId);
    if (!consent) {
      throw new Error('Consent record not found');
    }

    consent.status = ConsentStatus.REVOKED;
    consent.revokedAt = new Date();
    consent.revocationReason = reason;

    await this.logConsentActivity(userId, 'CONSENT_REVOKED', consent);

    // Trigger data deletion for revoked categories
    await this.triggerDataDeletion(userId, consent.dataCategories);
  }

  /**
   * Check if user has valid consent for specific data categories
   */
  async hasValidConsent(userId: string, dataCategories: DataCategory[]): Promise<boolean> {
    const userConsents = this.consentRecords.get(userId) || [];
    
    for (const category of dataCategories) {
      const validConsent = userConsents.find(consent => 
        consent.dataCategories.includes(category) &&
        consent.status === ConsentStatus.GRANTED &&
        (!consent.expiresAt || consent.expiresAt > new Date())
      );

      if (!validConsent) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get all consent records for a user
   */
  async getUserConsents(userId: string): Promise<ConsentRecord[]> {
    return this.consentRecords.get(userId) || [];
  }

  /**
   * Update consent preferences (granular control)
   */
  async updateConsentPreferences(
    userId: string, 
    consentId: string, 
    preferences: Partial<ConsentRecord>
  ): Promise<void> {
    const consent = await this.getConsentRecord(userId, consentId);
    if (!consent) {
      throw new Error('Consent record not found');
    }

    Object.assign(consent, preferences);
    consent.updatedAt = new Date();

    await this.logConsentActivity(userId, 'CONSENT_UPDATED', consent);
  }

  /**
   * Check for expired consents and handle them
   */
  async processExpiredConsents(): Promise<void> {
    const now = new Date();
    
    for (const [userId, consents] of this.consentRecords.entries()) {
      for (const consent of consents) {
        if (consent.expiresAt && consent.expiresAt < now && consent.status === ConsentStatus.GRANTED) {
          consent.status = ConsentStatus.EXPIRED;
          await this.logConsentActivity(userId, 'CONSENT_EXPIRED', consent);
          await this.triggerDataDeletion(userId, consent.dataCategories);
        }
      }
    }
  }

  private async getConsentRecord(userId: string, consentId: string): Promise<ConsentRecord | undefined> {
    const userConsents = this.consentRecords.get(userId) || [];
    return userConsents.find(consent => consent.id === consentId);
  }

  private generateConsentId(): string {
    return `consent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async logConsentActivity(userId: string, activity: string, consent: ConsentRecord): Promise<void> {
    // This would integrate with the audit trail system
    console.log(`[CONSENT_AUDIT] ${activity} for user ${userId}:`, {
      consentId: consent.id,
      dataCategories: consent.dataCategories,
      timestamp: new Date().toISOString()
    });
  }

  private async triggerDataDeletion(userId: string, dataCategories: DataCategory[]): Promise<void> {
    // This would trigger the data deletion process
    console.log(`[DATA_DELETION] Triggered for user ${userId}, categories:`, dataCategories);
  }
}