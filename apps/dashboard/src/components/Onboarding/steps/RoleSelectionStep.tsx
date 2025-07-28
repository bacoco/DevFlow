import React, { useState, useEffect } from 'react';
import { OnboardingStepProps } from '../../../types/onboarding';
import { Code, Users, BarChart, Settings, ChevronRight } from 'lucide-react';

interface RoleOption {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  features: string[];
  dashboardFocus: string[];
}

export const RoleSelectionStep: React.FC<OnboardingStepProps> = ({
  onNext,
  onComplete,
  stepData,
}) => {
  const [selectedRole, setSelectedRole] = useState<string>(stepData?.role || '');
  const [selectedTeam, setSelectedTeam] = useState<string>(stepData?.team || '');
  const [experience, setExperience] = useState<string>(stepData?.experience || 'intermediate');

  const roles: RoleOption[] = [
    {
      id: 'developer',
      title: 'Developer',
      description: 'Individual contributor focused on coding and development',
      icon: Code,
      features: [
        'Personal productivity tracking',
        'Code quality metrics',
        'Flow state analysis',
        'Focus time optimization',
      ],
      dashboardFocus: [
        'Time in flow',
        'Code churn rate',
        'Commit frequency',
        'Personal productivity score',
      ],
    },
    {
      id: 'team_lead',
      title: 'Team Lead',
      description: 'Leading a development team and managing technical decisions',
      icon: Users,
      features: [
        'Team performance overview',
        'Code review management',
        'Workload balancing',
        'Technical mentoring insights',
      ],
      dashboardFocus: [
        'Team velocity',
        'Review lag times',
        'Team collaboration metrics',
        'Knowledge sharing patterns',
      ],
    },
    {
      id: 'manager',
      title: 'Engineering Manager',
      description: 'Managing multiple teams and focusing on delivery outcomes',
      icon: BarChart,
      features: [
        'Cross-team analytics',
        'Delivery predictions',
        'Resource allocation',
        'Business impact correlation',
      ],
      dashboardFocus: [
        'Delivery timelines',
        'Team productivity trends',
        'Quality metrics',
        'Resource utilization',
      ],
    },
    {
      id: 'admin',
      title: 'System Administrator',
      description: 'Managing the DevFlow platform and user access',
      icon: Settings,
      features: [
        'System health monitoring',
        'User management',
        'Privacy compliance',
        'Platform configuration',
      ],
      dashboardFocus: [
        'System performance',
        'User activity',
        'Data compliance',
        'Platform metrics',
      ],
    },
  ];

  const experienceOptions = [
    { id: 'junior', label: 'Junior (0-2 years)', description: 'New to software development' },
    { id: 'intermediate', label: 'Intermediate (2-5 years)', description: 'Some experience with development workflows' },
    { id: 'senior', label: 'Senior (5+ years)', description: 'Experienced with complex development processes' },
  ];

  const teams = [
    'Frontend Team',
    'Backend Team',
    'Full Stack Team',
    'DevOps Team',
    'Mobile Team',
    'Data Team',
    'QA Team',
    'Platform Team',
    'Other',
  ];

  const selectedRoleData = roles.find(role => role.id === selectedRole);

  const handleContinue = () => {
    const data = {
      role: selectedRole,
      team: selectedTeam,
      experience,
    };
    
    onComplete(data);
    onNext();
  };

  const isValid = selectedRole && experience;

  return (
    <div className="role-selection-step">
      {/* Role Selection */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          What's your primary role?
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {roles.map((role) => (
            <button
              key={role.id}
              onClick={() => setSelectedRole(role.id)}
              className={`p-4 rounded-lg border-2 text-left transition-all hover:border-blue-300 ${
                selectedRole === role.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-start space-x-3">
                <div className={`p-2 rounded-lg ${
                  selectedRole === role.id ? 'bg-blue-100' : 'bg-gray-100'
                }`}>
                  <role.icon className={`w-5 h-5 ${
                    selectedRole === role.id ? 'text-blue-600' : 'text-gray-600'
                  }`} />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 mb-1">
                    {role.title}
                  </h4>
                  <p className="text-sm text-gray-600 mb-2">
                    {role.description}
                  </p>
                  <div className="text-xs text-gray-500">
                    Key features: {role.features.slice(0, 2).join(', ')}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Experience Level */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          What's your experience level?
        </h3>
        <div className="space-y-3">
          {experienceOptions.map((option) => (
            <label
              key={option.id}
              className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                experience === option.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="experience"
                value={option.id}
                checked={experience === option.id}
                onChange={(e) => setExperience(e.target.value)}
                className="sr-only"
              />
              <div className={`w-4 h-4 rounded-full border-2 mr-3 flex items-center justify-center ${
                experience === option.id
                  ? 'border-blue-500 bg-blue-500'
                  : 'border-gray-300'
              }`}>
                {experience === option.id && (
                  <div className="w-2 h-2 rounded-full bg-white"></div>
                )}
              </div>
              <div>
                <div className="font-medium text-gray-900">{option.label}</div>
                <div className="text-sm text-gray-600">{option.description}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Team Selection (Optional) */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Which team are you part of? <span className="text-sm font-normal text-gray-500">(Optional)</span>
        </h3>
        <select
          value={selectedTeam}
          onChange={(e) => setSelectedTeam(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Select a team...</option>
          {teams.map((team) => (
            <option key={team} value={team}>
              {team}
            </option>
          ))}
        </select>
      </div>

      {/* Role Preview */}
      {selectedRoleData && (
        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <h4 className="font-semibold text-gray-900 mb-3">
            Your personalized dashboard will include:
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h5 className="font-medium text-gray-700 mb-2">Key Features:</h5>
              <ul className="space-y-1">
                {selectedRoleData.features.map((feature, index) => (
                  <li key={index} className="flex items-center space-x-2 text-sm text-gray-600">
                    <ChevronRight size={12} className="text-blue-500" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h5 className="font-medium text-gray-700 mb-2">Dashboard Focus:</h5>
              <ul className="space-y-1">
                {selectedRoleData.dashboardFocus.map((focus, index) => (
                  <li key={index} className="flex items-center space-x-2 text-sm text-gray-600">
                    <ChevronRight size={12} className="text-green-500" />
                    <span>{focus}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Continue Button */}
      <div className="flex justify-end">
        <button
          onClick={handleContinue}
          disabled={!isValid}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  );
};

export default RoleSelectionStep;