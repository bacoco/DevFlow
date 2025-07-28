import React from 'react';
import { OnboardingStepProps } from '../../../types/onboarding';
import { CheckCircle, Sparkles, ArrowRight, Book, Settings, HelpCircle } from 'lucide-react';

export const CompletionStep: React.FC<OnboardingStepProps> = ({
  stepData,
}) => {
  const userRole = stepData?.role?.role || 'developer';
  const selectedWidgets = stepData?.dashboard?.preferredWidgets || [];
  const privacyLevel = stepData?.privacy?.anonymization || 'partial';
  const notificationChannels = stepData?.notifications ? 
    Object.entries(stepData.notifications)
      .filter(([key, value]) => key !== 'frequency' && key !== 'notificationTypes' && key !== 'quietHours' && value)
      .map(([key]) => key) : [];

  const nextSteps = [
    {
      icon: ArrowRight,
      title: 'Explore your dashboard',
      description: 'Start tracking your productivity with your personalized widgets',
      action: 'Go to Dashboard',
    },
    {
      icon: Book,
      title: 'Learn the features',
      description: 'Check out our quick start guide to get the most out of DevFlow',
      action: 'View Guide',
    },
    {
      icon: Settings,
      title: 'Fine-tune settings',
      description: 'Adjust privacy, notifications, and dashboard preferences anytime',
      action: 'Open Settings',
    },
    {
      icon: HelpCircle,
      title: 'Get support',
      description: 'Have questions? Our support team is here to help',
      action: 'Contact Support',
    },
  ];

  const achievements = [
    {
      icon: CheckCircle,
      title: 'Profile Configured',
      description: `Set up as ${userRole.replace('_', ' ')}`,
      completed: true,
    },
    {
      icon: CheckCircle,
      title: 'Privacy Secured',
      description: `${privacyLevel} anonymization enabled`,
      completed: true,
    },
    {
      icon: CheckCircle,
      title: 'Dashboard Ready',
      description: `${selectedWidgets.length} widgets configured`,
      completed: true,
    },
    {
      icon: CheckCircle,
      title: 'Notifications Set',
      description: notificationChannels.length > 0 
        ? `${notificationChannels.length} channels enabled`
        : 'Notifications disabled',
      completed: true,
    },
  ];

  const tips = [
    {
      title: 'Start small',
      description: 'Focus on one or two key metrics initially, then expand as you get comfortable',
    },
    {
      title: 'Review regularly',
      description: 'Check your weekly productivity trends to identify patterns and improvements',
    },
    {
      title: 'Customize freely',
      description: 'Your dashboard is fully customizable - rearrange widgets and adjust settings anytime',
    },
    {
      title: 'Privacy first',
      description: 'You have full control over your data. Review and adjust privacy settings as needed',
    },
  ];

  return (
    <div className="completion-step text-center">
      {/* Success Header */}
      <div className="mb-8">
        <div className="text-6xl mb-4">🎉</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          You're all set!
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Your personalized DevFlow Intelligence dashboard is ready to help you track, 
          analyze, and optimize your development productivity.
        </p>
      </div>

      {/* Setup Summary */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">
          Setup Complete
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {achievements.map((achievement, index) => (
            <div
              key={index}
              className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg border border-green-200"
            >
              <achievement.icon className="w-6 h-6 text-green-600" />
              <div className="text-left">
                <h4 className="font-medium text-green-900">
                  {achievement.title}
                </h4>
                <p className="text-sm text-green-700">
                  {achievement.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* What's Next */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">
          What's next?
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {nextSteps.map((step, index) => (
            <div
              key={index}
              className="p-6 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
            >
              <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mx-auto mb-4">
                <step.icon className="w-6 h-6 text-blue-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">
                {step.title}
              </h4>
              <p className="text-gray-600 text-sm mb-4">
                {step.description}
              </p>
              <button className="text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors">
                {step.action} →
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Pro Tips */}
      <div className="mb-8">
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6 border border-purple-200">
          <div className="flex items-center justify-center mb-4">
            <Sparkles className="w-6 h-6 text-purple-600 mr-2" />
            <h3 className="text-lg font-semibold text-purple-900">
              Pro Tips for Success
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
            {tips.map((tip, index) => (
              <div key={index} className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <h4 className="font-medium text-purple-900 mb-1">
                    {tip.title}
                  </h4>
                  <p className="text-purple-700 text-sm">
                    {tip.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Data Collection Notice */}
      <div className="bg-blue-50 rounded-lg p-4 mb-8">
        <h4 className="font-medium text-blue-900 mb-2">
          🔄 Data collection starts now
        </h4>
        <p className="text-blue-800 text-sm">
          Based on your privacy settings, we'll begin collecting productivity data to generate 
          your personalized insights. It may take 24-48 hours to see meaningful trends in your dashboard.
        </p>
      </div>

      {/* Support Information */}
      <div className="text-center text-sm text-gray-500">
        <p className="mb-2">
          Need help getting started? Check out our{' '}
          <a href="#" className="text-blue-600 hover:text-blue-700">documentation</a>{' '}
          or{' '}
          <a href="#" className="text-blue-600 hover:text-blue-700">contact support</a>.
        </p>
        <p>
          You can always modify these settings later in your account preferences.
        </p>
      </div>
    </div>
  );
};

export default CompletionStep;