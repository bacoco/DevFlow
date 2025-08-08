/**
 * Integration Demo Page
 * 
 * Showcases the UX integration layer functionality
 */

import React from 'react';
import Head from 'next/head';
import { IntegrationDemo } from '../components/Integration/IntegrationDemo';

export default function IntegrationDemoPage() {
  const handleFeatureToggle = (featureId: string, enabled: boolean) => {
    console.log(`Feature ${featureId} ${enabled ? 'enabled' : 'disabled'}`);
  };

  const handleValidationComplete = (report: any) => {
    console.log('Validation completed:', report);
  };

  return (
    <>
      <Head>
        <title>UX Integration Demo - DevFlow Intelligence</title>
        <meta name="description" content="UX Integration Layer demonstration" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        <IntegrationDemo
          userId="demo-user-123"
          onFeatureToggle={handleFeatureToggle}
          onValidationComplete={handleValidationComplete}
        />
      </div>
    </>
  );
}