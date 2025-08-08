/**
 * Deployment Monitoring Demo Page
 * Showcases the UX deployment monitoring dashboard
 */

import React from 'react'
import { UXMonitoringDashboard } from '../components/Deployment/UXMonitoringDashboard'

const DeploymentMonitoringPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <UXMonitoringDashboard />
    </div>
  )
}

export default DeploymentMonitoringPage