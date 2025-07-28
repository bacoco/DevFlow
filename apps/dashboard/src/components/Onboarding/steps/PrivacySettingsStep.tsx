import React, { useState } from 'react';
import { OnboardingStepProps, PrivacyExplanation } from '../../../types/onboarding';
import { Shield, Eye, EyeOff, Info, AlertTriangle, CheckCircle } from 'lucide-react';

export const PrivacySettingsStep: React.FC<OnboardingStepProps> = ({
  onNext,
  onComplete,
  stepData,
}) => {
  const [privacySettings, setPrivacySettings] = useState({
    ideTelemetry: stepData?.ideTelemetry ?? true,
    gitActivity: stepData?.gitActivity ?? true,
    communicationData: stepData?.communicationData ?? false,
    anonymization: stepData?.anonymization ?? 'partial',
    granularControls: stepData?.granularControls ?? {
      keystrokePatterns: true,
      fileChanges: true,
      debugSessions: true,
      focusTime: true,
      commitMessages: false,
      codeContent: false,
      chatContent: false,
      reviewComments: true,
    },
  });

  const [expandedExplanation, setExpandedExplanation] = useState<string | null>(null);

  const privacyExplanations: PrivacyExplanation[] = [
    {
      setting: 'ideTelemetry',
      title: 'IDE Telemetry Data',
      description: 'Collects data about your coding patterns, focus time, and development workflow',
      example: 'Time spent in different files, keystroke patterns (not content), debugging sessions',
      impact: 'high',
      benefits: [
        'Accurate flow state detection',
        'Personalized productivity insights',
        'Focus time optimization',
        'Interruption pattern analysis',
      ],
      risks: [
        'Detailed activity tracking',
        'Potential inference of work patterns',
      ],
    },
    {
      setting: 'gitActivity',
      title: 'Git Repository Activity',
      description: 'Tracks your commits, pull requests, and code review activities',
      example: 'Commit frequency, PR creation/merge times, review participation (not code content)',
      impact: 'medium',
      benefits: [
        'Code quality metrics',
        'Collaboration insights',
        'Delivery timeline predictions',
        'Review workload balancing',
      ],
      risks: [
        'Repository activity visibility',
        'Work pattern inference',
      ],
    },
    {
      setting: 'communicationData',
      title: 'Team Communication Data',
      description: 'Analyzes team chat and collaboration patterns for workflow insights',
      example: 'Message frequency, response times, thread participation (not message content)',
      impact: 'low',
      benefits: [
        'Team collaboration metrics',
        'Communication pattern insights',
        'Response time analysis',
      ],
      risks: [
        'Communication pattern tracking',
        'Team interaction visibility',
      ],
    },
  ];

  const anonymizationOptions = [
    {
      id: 'none',
      title: 'No Anonymization',
      description: 'Data is stored with your identity for personalized insights',
      icon: Eye,
      color: 'red',
    },
    {
      id: 'partial',
      title: 'Partial Anonymization',
      description: 'Personal identifiers removed from team-shared metrics',
      icon: Shield,
      color: 'yellow',
    },
    {
      id: 'full',
      title: 'Full Anonymization',
      description: 'All data anonymized, limited personalization available',
      icon: EyeOff,
      color: 'green',
    },
  ];

  const handleSettingChange = (setting: string, value: boolean) => {
    setPrivacySettings(prev => ({
      ...prev,
      [setting]: value,
    }));
  };

  const handleGranularChange = (control: string, value: boolean) => {
    setPrivacySettings(prev => ({
      ...prev,
      granularControls: {
        ...prev.granularControls,
        [control]: value,
      },
    }));
  };

  const handleAnonymizationChange = (level: string) => {
    setPrivacySettings(prev => ({
      ...prev,
      anonymization: level,
    }));
  };

  const handleContinue = () => {
    onComplete(privacySettings);
    onNext();
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="privacy-settings-step">
      {/* Header */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-start space-x-3">
          <Shield className="w-6 h-6 text-blue-600 mt-1" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-1">
              Your Privacy is Our Priority
            </h3>
            <p className="text-blue-800 text-sm">
              Configure exactly what data we collect and how it's used. You can change these settings anytime.
            </p>
          </div>
        </div>
      </div>

      {/* Main Privacy Settings */}
      <div className="space-y-6 mb-8">
        {privacyExplanations.map((explanation) => {
          const isEnabled = privacySettings[explanation.setting as keyof typeof privacySettings];
          const isExpanded = expandedExplanation === explanation.setting;
          
          return (
            <div key={explanation.setting} className="border border-gray-200 rounded-lg">
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <h4 className="font-medium text-gray-900">
                      {explanation.title}
                    </h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getImpactColor(explanation.impact)}`}>
                      {explanation.impact} impact
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isEnabled as boolean}
                      onChange={(e) => handleSettingChange(explanation.setting, e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                
                <p className="text-gray-600 text-sm mb-3">
                  {explanation.description}
                </p>
                
                <button
                  onClick={() => setExpandedExplanation(isExpanded ? null : explanation.setting)}
                  className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 text-sm"
                >
                  <Info size={14} />
                  <span>{isExpanded ? 'Hide details' : 'Show details & examples'}</span>
                </button>
              </div>

              {isExpanded && (
                <div className="px-4 pb-4 border-t border-gray-100">
                  <div className="pt-4 space-y-4">
                    <div>
                      <h5 className="font-medium text-gray-700 mb-2">Example data collected:</h5>
                      <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                        {explanation.example}
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h5 className="font-medium text-green-700 mb-2 flex items-center space-x-1">
                          <CheckCircle size={14} />
                          <span>Benefits</span>
                        </h5>
                        <ul className="space-y-1">
                          {explanation.benefits.map((benefit, index) => (
                            <li key={index} className="text-sm text-gray-600 flex items-start space-x-2">
                              <span className="text-green-500 mt-1">•</span>
                              <span>{benefit}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div>
                        <h5 className="font-medium text-yellow-700 mb-2 flex items-center space-x-1">
                          <AlertTriangle size={14} />
                          <span>Considerations</span>
                        </h5>
                        <ul className="space-y-1">
                          {explanation.risks.map((risk, index) => (
                            <li key={index} className="text-sm text-gray-600 flex items-start space-x-2">
                              <span className="text-yellow-500 mt-1">•</span>
                              <span>{risk}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Granular Controls */}
      {privacySettings.ideTelemetry && (
        <div className="mb-8">
          <h4 className="font-medium text-gray-900 mb-4">
            Fine-tune IDE data collection:
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(privacySettings.granularControls).map(([control, enabled]) => (
              <label key={control} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => handleGranularChange(control, e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 capitalize">
                  {control.replace(/([A-Z])/g, ' $1').toLowerCase()}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Anonymization Level */}
      <div className="mb-8">
        <h4 className="font-medium text-gray-900 mb-4">
          Data anonymization level:
        </h4>
        <div className="space-y-3">
          {anonymizationOptions.map((option) => (
            <label
              key={option.id}
              className={`flex items-start space-x-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                privacySettings.anonymization === option.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="anonymization"
                value={option.id}
                checked={privacySettings.anonymization === option.id}
                onChange={(e) => handleAnonymizationChange(e.target.value)}
                className="sr-only"
              />
              <div className={`p-2 rounded-lg ${
                privacySettings.anonymization === option.id ? 'bg-blue-100' : 'bg-gray-100'
              }`}>
                <option.icon className={`w-5 h-5 ${
                  privacySettings.anonymization === option.id ? 'text-blue-600' : 'text-gray-600'
                }`} />
              </div>
              <div>
                <h5 className="font-medium text-gray-900 mb-1">
                  {option.title}
                </h5>
                <p className="text-sm text-gray-600">
                  {option.description}
                </p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Data Rights Notice */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h5 className="font-medium text-gray-900 mb-2">Your data rights:</h5>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• You can modify these settings anytime in your account preferences</li>
          <li>• Request data export or deletion at any time</li>
          <li>• Data is automatically purged after your configured retention period</li>
          <li>• All data processing complies with GDPR and privacy regulations</li>
        </ul>
      </div>

      {/* Continue Button */}
      <div className="flex justify-end">
        <button
          onClick={handleContinue}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  );
};

export default PrivacySettingsStep;