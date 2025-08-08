/**
 * Integration Demo Component
 * 
 * Demonstrates the UX integration layer functionality and provides
 * a UI for managing UX feature rollouts and compatibility.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  RefreshCw, 
  Download,
  Upload,
  Play,
  Pause,
  Info,
  Zap,
  Shield,
  Smartphone,
  Users,
  BarChart3,
  Palette,
  Navigation,
  Accessibility
} from 'lucide-react';

import { 
  integrationService,
  UXFeature,
  ValidationReport,
  getUXIntegrationHealth
} from '../../services/integration';

interface IntegrationDemoProps {
  userId?: string;
  onFeatureToggle?: (featureId: string, enabled: boolean) => void;
  onValidationComplete?: (report: ValidationReport) => void;
}

interface FeatureCardProps {
  feature: UXFeature;
  enabled: boolean;
  compatible: boolean;
  dependenciesMet: boolean;
  onToggle: (featureId: string, enabled: boolean) => void;
  loading: boolean;
}

const FeatureCard: React.FC<FeatureCardProps> = ({
  feature,
  enabled,
  compatible,
  dependenciesMet,
  onToggle,
  loading
}) => {
  const getFeatureIcon = (featureId: string) => {
    const iconMap: { [key: string]: React.ReactNode } = {
      'design-system-v2': <Palette className="w-5 h-5" />,
      'responsive-layout-engine': <Smartphone className="w-5 h-5" />,
      'accessibility-enhancements': <Accessibility className="w-5 h-5" />,
      'adaptive-navigation': <Navigation className="w-5 h-5" />,
      'performance-optimizations': <Zap className="w-5 h-5" />,
      'personalization-engine': <Users className="w-5 h-5" />,
      'enhanced-charts': <BarChart3 className="w-5 h-5" />,
      'mobile-optimizations': <Smartphone className="w-5 h-5" />,
      'collaboration-features': <Users className="w-5 h-5" />,
      'power-user-features': <Settings className="w-5 h-5" />
    };
    return iconMap[featureId] || <Settings className="w-5 h-5" />;
  };

  const getStatusColor = () => {
    if (!enabled) return 'bg-gray-100 border-gray-200';
    if (!compatible || !dependenciesMet) return 'bg-red-50 border-red-200';
    return 'bg-green-50 border-green-200';
  };

  const getStatusIcon = () => {
    if (!enabled) return null;
    if (!compatible || !dependenciesMet) return <XCircle className="w-4 h-4 text-red-500" />;
    return <CheckCircle className="w-4 h-4 text-green-500" />;
  };

  return (
    <motion.div
      layout
      className={`p-4 rounded-lg border-2 transition-all duration-200 ${getStatusColor()}`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${enabled ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
            {getFeatureIcon(feature.id)}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{feature.name}</h3>
            <p className="text-sm text-gray-600">{feature.description}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {getStatusIcon()}
          <button
            onClick={() => onToggle(feature.id, !enabled)}
            disabled={loading}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              enabled ? 'bg-blue-600' : 'bg-gray-200'
            } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Version:</span>
          <span className="font-mono text-gray-900">{feature.version}</span>
        </div>

        {feature.dependencies.length > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Dependencies:</span>
            <div className="flex items-center space-x-1">
              {dependenciesMet ? (
                <CheckCircle className="w-3 h-3 text-green-500" />
              ) : (
                <XCircle className="w-3 h-3 text-red-500" />
              )}
              <span className={dependenciesMet ? 'text-green-600' : 'text-red-600'}>
                {feature.dependencies.length} deps
              </span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Rollout:</span>
          <span className="text-gray-900 capitalize">
            {feature.rolloutStrategy.type}
            {feature.rolloutStrategy.percentage && ` (${feature.rolloutStrategy.percentage}%)`}
          </span>
        </div>

        {feature.beta && (
          <div className="flex items-center space-x-1 text-sm text-orange-600">
            <AlertTriangle className="w-3 h-3" />
            <span>Beta Feature</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export const IntegrationDemo: React.FC<IntegrationDemoProps> = ({
  userId = 'demo-user',
  onFeatureToggle,
  onValidationComplete
}) => {
  const [features, setFeatures] = useState<UXFeature[]>([]);
  const [integrationStatus, setIntegrationStatus] = useState<{ [key: string]: any }>({});
  const [validationReport, setValidationReport] = useState<ValidationReport | null>(null);
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'features' | 'validation' | 'health' | 'recommendations'>('features');
  const [recommendations, setRecommendations] = useState<{ recommended: UXFeature[]; reasons: { [key: string]: string[] } }>({ recommended: [], reasons: {} });

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Ensure integration service is initialized
      if (!integrationService.isInitialized()) {
        await integrationService.initialize();
      }

      // Load features and status
      const availableFeatures = integrationService.getAvailableFeatures();
      const status = integrationService.getIntegrationStatus();
      const health = await getUXIntegrationHealth();
      const recs = integrationService.getFeatureRecommendations(userId);

      setFeatures(availableFeatures);
      setIntegrationStatus(status);
      setHealthStatus(health);
      setRecommendations(recs);
    } catch (error) {
      console.error('Failed to load integration data:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const handleFeatureToggle = async (featureId: string, enabled: boolean) => {
    try {
      setLoading(true);
      
      if (enabled) {
        await integrationService.enableFeature(featureId, userId);
      } else {
        await integrationService.disableFeature(featureId, userId);
      }

      // Reload data
      await loadData();
      
      // Notify parent
      onFeatureToggle?.(featureId, enabled);
    } catch (error) {
      console.error(`Failed to ${enabled ? 'enable' : 'disable'} feature ${featureId}:`, error);
      alert(`Failed to ${enabled ? 'enable' : 'disable'} feature: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleValidation = async () => {
    try {
      setLoading(true);
      const report = await integrationService.validateIntegration();
      setValidationReport(report);
      onValidationComplete?.(report);
    } catch (error) {
      console.error('Validation failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportConfig = () => {
    try {
      const config = integrationService.exportConfiguration();
      const blob = new Blob([config], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ux-integration-config.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleReset = async () => {
    if (confirm('Are you sure you want to reset all UX features? This will disable all features and clear preferences.')) {
      try {
        setLoading(true);
        await integrationService.reset();
        await loadData();
      } catch (error) {
        console.error('Reset failed:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const enabledFeatures = features.filter(f => integrationStatus[f.id]?.feature?.enabled);
  const availableFeatures = features.filter(f => !integrationStatus[f.id]?.feature?.enabled);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">UX Integration Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Manage UX feature rollouts and monitor integration health
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={handleValidation}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Validate</span>
          </button>
          
          <button
            onClick={handleExportConfig}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
          
          <button
            onClick={handleReset}
            className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            <XCircle className="w-4 h-4" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Health Status Banner */}
      {healthStatus && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-lg border-l-4 ${
            healthStatus.healthy 
              ? 'bg-green-50 border-green-400' 
              : 'bg-red-50 border-red-400'
          }`}
        >
          <div className="flex items-center space-x-3">
            {healthStatus.healthy ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-500" />
            )}
            <div>
              <h3 className={`font-semibold ${healthStatus.healthy ? 'text-green-800' : 'text-red-800'}`}>
                Integration {healthStatus.healthy ? 'Healthy' : 'Issues Detected'}
              </h3>
              <p className={`text-sm ${healthStatus.healthy ? 'text-green-700' : 'text-red-700'}`}>
                {healthStatus.healthy 
                  ? `${enabledFeatures.length} features enabled and working properly`
                  : `${healthStatus.issues.length} issues need attention`
                }
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'features', label: 'Features', icon: Settings },
            { id: 'validation', label: 'Validation', icon: Shield },
            { id: 'health', label: 'Health', icon: Info },
            { id: 'recommendations', label: 'Recommendations', icon: Zap }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'features' && (
          <motion.div
            key="features"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {/* Enabled Features */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Enabled Features ({enabledFeatures.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {enabledFeatures.map(feature => (
                  <FeatureCard
                    key={feature.id}
                    feature={feature}
                    enabled={true}
                    compatible={integrationStatus[feature.id]?.compatible || false}
                    dependenciesMet={integrationStatus[feature.id]?.dependenciesMet || false}
                    onToggle={handleFeatureToggle}
                    loading={loading}
                  />
                ))}
              </div>
            </div>

            {/* Available Features */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Available Features ({availableFeatures.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableFeatures.map(feature => (
                  <FeatureCard
                    key={feature.id}
                    feature={feature}
                    enabled={false}
                    compatible={integrationStatus[feature.id]?.compatible || false}
                    dependenciesMet={integrationStatus[feature.id]?.dependenciesMet || false}
                    onToggle={handleFeatureToggle}
                    loading={loading}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'validation' && (
          <motion.div
            key="validation"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {validationReport ? (
              <div className="space-y-4">
                {/* Summary */}
                <div className="bg-white p-6 rounded-lg border">
                  <h3 className="text-lg font-semibold mb-4">Validation Summary</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">{validationReport.summary.totalRules}</div>
                      <div className="text-sm text-gray-600">Total Rules</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{validationReport.summary.passedRules}</div>
                      <div className="text-sm text-gray-600">Passed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">{validationReport.summary.failedRules}</div>
                      <div className="text-sm text-gray-600">Failed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">{validationReport.summary.warningRules}</div>
                      <div className="text-sm text-gray-600">Warnings</div>
                    </div>
                  </div>
                </div>

                {/* Issues */}
                {validationReport.issues.length > 0 && (
                  <div className="bg-red-50 p-6 rounded-lg border border-red-200">
                    <h3 className="text-lg font-semibold text-red-800 mb-4">Issues</h3>
                    <div className="space-y-3">
                      {validationReport.issues.map((issue, index) => (
                        <div key={index} className="flex items-start space-x-3">
                          <XCircle className="w-5 h-5 text-red-500 mt-0.5" />
                          <div>
                            <div className="font-medium text-red-800">{issue.message}</div>
                            {issue.details && (
                              <div className="text-sm text-red-600 mt-1">{issue.details}</div>
                            )}
                            {issue.suggestions && issue.suggestions.length > 0 && (
                              <div className="text-sm text-red-600 mt-1">
                                Suggestions: {issue.suggestions.join(', ')}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Warnings */}
                {validationReport.warnings.length > 0 && (
                  <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200">
                    <h3 className="text-lg font-semibold text-yellow-800 mb-4">Warnings</h3>
                    <div className="space-y-3">
                      {validationReport.warnings.map((warning, index) => (
                        <div key={index} className="flex items-start space-x-3">
                          <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
                          <div>
                            <div className="font-medium text-yellow-800">{warning.message}</div>
                            {warning.details && (
                              <div className="text-sm text-yellow-600 mt-1">{warning.details}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggestions */}
                {validationReport.suggestions.length > 0 && (
                  <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                    <h3 className="text-lg font-semibold text-blue-800 mb-4">Suggestions</h3>
                    <ul className="space-y-2">
                      {validationReport.suggestions.map((suggestion, index) => (
                        <li key={index} className="flex items-start space-x-3">
                          <Info className="w-4 h-4 text-blue-500 mt-0.5" />
                          <span className="text-blue-700">{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Validation Report</h3>
                <p className="text-gray-600 mb-4">Click "Validate" to run integration validation</p>
                <button
                  onClick={handleValidation}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Run Validation
                </button>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'health' && (
          <motion.div
            key="health"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {healthStatus && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Overall Health */}
                <div className="bg-white p-6 rounded-lg border">
                  <div className="flex items-center space-x-3 mb-4">
                    {healthStatus.healthy ? (
                      <CheckCircle className="w-8 h-8 text-green-500" />
                    ) : (
                      <XCircle className="w-8 h-8 text-red-500" />
                    )}
                    <div>
                      <h3 className="text-lg font-semibold">Overall Health</h3>
                      <p className={`text-sm ${healthStatus.healthy ? 'text-green-600' : 'text-red-600'}`}>
                        {healthStatus.healthy ? 'Healthy' : 'Issues Detected'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Issues Count */}
                <div className="bg-white p-6 rounded-lg border">
                  <div className="flex items-center space-x-3 mb-4">
                    <AlertTriangle className="w-8 h-8 text-red-500" />
                    <div>
                      <h3 className="text-lg font-semibold">Issues</h3>
                      <p className="text-2xl font-bold text-red-600">{healthStatus.issues.length}</p>
                    </div>
                  </div>
                </div>

                {/* Warnings Count */}
                <div className="bg-white p-6 rounded-lg border">
                  <div className="flex items-center space-x-3 mb-4">
                    <Info className="w-8 h-8 text-yellow-500" />
                    <div>
                      <h3 className="text-lg font-semibold">Warnings</h3>
                      <p className="text-2xl font-bold text-yellow-600">{healthStatus.warnings.length}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'recommendations' && (
          <motion.div
            key="recommendations"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {recommendations.recommended.length > 0 ? (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Recommended Features</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {recommendations.recommended.map(feature => (
                    <div key={feature.id} className="bg-white p-6 rounded-lg border">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                            <Zap className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">{feature.name}</h4>
                            <p className="text-sm text-gray-600">{feature.description}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <h5 className="text-sm font-medium text-gray-700">Why recommended:</h5>
                        <ul className="space-y-1">
                          {recommendations.reasons[feature.id]?.map((reason, index) => (
                            <li key={index} className="text-sm text-gray-600 flex items-start space-x-2">
                              <span className="w-1 h-1 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
                              <span>{reason}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <button
                        onClick={() => handleFeatureToggle(feature.id, true)}
                        disabled={loading}
                        className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                      >
                        Enable Feature
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <Zap className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Recommendations</h3>
                <p className="text-gray-600">All recommended features are already enabled or dependencies are not met.</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default IntegrationDemo;