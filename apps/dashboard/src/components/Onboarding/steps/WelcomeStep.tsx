import React from 'react';
import { OnboardingStepProps } from '../../../types/onboarding';
import { BarChart3, Brain, Shield, Zap } from 'lucide-react';

export const WelcomeStep: React.FC<OnboardingStepProps> = ({
  onNext,
  onComplete,
}) => {
  const features = [
    {
      icon: BarChart3,
      title: 'Real-time Analytics',
      description: 'Track productivity metrics, flow states, and code quality in real-time',
    },
    {
      icon: Brain,
      title: 'AI-Powered Insights',
      description: 'Get personalized recommendations and predictive analytics for your workflow',
    },
    {
      icon: Shield,
      title: 'Privacy First',
      description: 'Full control over your data with granular privacy settings and anonymization',
    },
    {
      icon: Zap,
      title: 'Smart Automation',
      description: 'Automated alerts, code review assignments, and workflow optimizations',
    },
  ];

  const handleGetStarted = () => {
    onComplete({});
    onNext();
  };

  return (
    <div className="welcome-step text-center">
      {/* Hero Section */}
      <div className="mb-8">
        <div className="text-6xl mb-4">🚀</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Welcome to DevFlow Intelligence
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Transform your development workflow with AI-powered productivity insights. 
          Let's set up your personalized dashboard in just a few steps.
        </p>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {features.map((feature, index) => (
          <div
            key={index}
            className="p-6 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
          >
            <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mx-auto mb-4">
              <feature.icon className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {feature.title}
            </h3>
            <p className="text-gray-600 text-sm">
              {feature.description}
            </p>
          </div>
        ))}
      </div>

      {/* What to Expect */}
      <div className="bg-blue-50 rounded-lg p-6 mb-8">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">
          What to expect in this setup:
        </h3>
        <div className="text-left space-y-2">
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
            <span className="text-blue-800">Tell us about your role and experience</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
            <span className="text-blue-800">Configure privacy and data collection preferences</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
            <span className="text-blue-800">Choose your preferred dashboard widgets and layout</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
            <span className="text-blue-800">Set up notification preferences</span>
          </div>
        </div>
      </div>

      {/* Time Estimate */}
      <div className="text-sm text-gray-500 mb-6">
        ⏱️ This setup takes about 3-5 minutes to complete
      </div>

      {/* CTA Button */}
      <button
        onClick={handleGetStarted}
        className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
      >
        Let's Get Started
      </button>
    </div>
  );
};

export default WelcomeStep;