import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, Play, Pause, RotateCcw, CheckCircle } from 'lucide-react';

interface GuideStep {
  id: string;
  title: string;
  description: string;
  element?: string;
  action?: 'click' | 'hover' | 'type' | 'scroll';
  content: React.ReactNode;
  validation?: () => boolean;
  tips?: string[];
}

interface InteractiveGuideProps {
  context?: string;
}

export const InteractiveGuide: React.FC<InteractiveGuideProps> = ({ context }) => {
  const [activeGuide, setActiveGuide] = useState<string>('navigation');
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [userProgress, setUserProgress] = useState<Record<string, number>>({});

  const guides = {
    navigation: {
      title: 'Smart Navigation',
      description: 'Learn to navigate efficiently with adaptive menus and shortcuts',
      estimatedTime: '5 minutes',
      steps: [
        {
          id: 'nav-1',
          title: 'Understanding the Navigation Bar',
          description: 'The navigation bar adapts based on your role and frequently used features.',
          content: (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  Adaptive Navigation
                </h4>
                <p className="text-blue-800 dark:text-blue-200 text-sm">
                  Notice how the navigation menu highlights your most-used sections and 
                  provides quick access to recent pages.
                </p>
              </div>
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 p-4 rounded-lg">
                <div className="flex items-center space-x-4 mb-2">
                  <div className="w-8 h-8 bg-blue-500 rounded"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-1"></div>
                    <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-2/3"></div>
                  </div>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Interactive navigation preview
                </div>
              </div>
            </div>
          ),
          tips: [
            'The navigation learns from your usage patterns',
            'Frequently accessed items appear higher in the menu',
            'Use Cmd/Ctrl + K to open the command palette'
          ]
        },
        {
          id: 'nav-2',
          title: 'Using Breadcrumbs',
          description: 'Navigate your path history with clickable breadcrumbs.',
          content: (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-sm">
                <span className="text-blue-600 dark:text-blue-400 cursor-pointer hover:underline">Dashboard</span>
                <ChevronRight className="h-4 w-4 text-gray-400" />
                <span className="text-blue-600 dark:text-blue-400 cursor-pointer hover:underline">Analytics</span>
                <ChevronRight className="h-4 w-4 text-gray-400" />
                <span className="text-gray-700 dark:text-gray-300">Performance</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Click any breadcrumb item to navigate back to that section. The breadcrumb 
                trail helps you understand your current location and provides quick navigation.
              </p>
            </div>
          ),
          action: 'click',
          element: '.breadcrumb-item',
          tips: [
            'Breadcrumbs show your navigation path',
            'Click any item to jump back to that level',
            'Breadcrumbs are keyboard accessible with Tab navigation'
          ]
        },
        {
          id: 'nav-3',
          title: 'Global Search',
          description: 'Find anything quickly with intelligent search suggestions.',
          content: (
            <div className="space-y-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search features, data, or help..."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                           bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
                <div className="absolute right-2 top-2 text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                  ⌘K
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="space-y-2">
                  <div className="flex items-center space-x-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded">
                    <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded flex items-center justify-center">
                      📊
                    </div>
                    <div>
                      <div className="font-medium text-sm">Performance Dashboard</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Analytics</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded">
                    <div className="w-6 h-6 bg-green-100 dark:bg-green-900 rounded flex items-center justify-center">
                      ⚙️
                    </div>
                    <div>
                      <div className="font-medium text-sm">Performance Settings</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Configuration</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ),
          action: 'type',
          element: '.search-input',
          tips: [
            'Use Cmd/Ctrl + K to open search from anywhere',
            'Search includes features, data, and help content',
            'Use arrow keys to navigate search results'
          ]
        }
      ]
    },
    accessibility: {
      title: 'Accessibility Features',
      description: 'Master keyboard navigation and screen reader support',
      estimatedTime: '8 minutes',
      steps: [
        {
          id: 'a11y-1',
          title: 'Keyboard Navigation Basics',
          description: 'Navigate the entire dashboard using only your keyboard.',
          content: (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Essential Keys</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Tab</span>
                      <span className="text-gray-500">Next element</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Shift + Tab</span>
                      <span className="text-gray-500">Previous element</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Enter/Space</span>
                      <span className="text-gray-500">Activate</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Escape</span>
                      <span className="text-gray-500">Close/Cancel</span>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Arrow Keys</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>↑↓</span>
                      <span className="text-gray-500">Menu items</span>
                    </div>
                    <div className="flex justify-between">
                      <span>←→</span>
                      <span className="text-gray-500">Tabs/Charts</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Home/End</span>
                      <span className="text-gray-500">First/Last</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Try it:</strong> Use Tab to navigate through this guide. 
                  Notice how focus indicators clearly show your current position.
                </p>
              </div>
            </div>
          ),
          tips: [
            'Focus indicators are always visible and high-contrast',
            'Skip links allow jumping to main content',
            'All interactive elements are keyboard accessible'
          ]
        },
        {
          id: 'a11y-2',
          title: 'Screen Reader Support',
          description: 'Understanding how screen readers interact with the dashboard.',
          content: (
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2">
                  Screen Reader Features
                </h4>
                <ul className="text-sm text-green-800 dark:text-green-200 space-y-1">
                  <li>• Descriptive labels for all interactive elements</li>
                  <li>• Live regions announce dynamic content changes</li>
                  <li>• Proper heading structure for easy navigation</li>
                  <li>• Alternative text for charts and visualizations</li>
                </ul>
              </div>
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h4 className="font-semibold mb-2">Example: Chart Description</h4>
                <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-sm">
                  <p className="font-mono text-xs text-gray-600 dark:text-gray-400 mb-2">
                    Screen reader announces:
                  </p>
                  <p className="italic">
                    "Line chart showing performance metrics over time. 
                    Data ranges from January to December 2024. 
                    Performance increased 25% from 75% to 94% over the period. 
                    Press Enter to access data table."
                  </p>
                </div>
              </div>
            </div>
          ),
          tips: [
            'Charts include detailed alternative descriptions',
            'Data tables are available for all visualizations',
            'Live regions announce important updates'
          ]
        }
      ]
    },
    mobile: {
      title: 'Mobile Experience',
      description: 'Optimize your workflow for mobile and tablet devices',
      estimatedTime: '6 minutes',
      steps: [
        {
          id: 'mobile-1',
          title: 'Touch Gestures',
          description: 'Learn the touch gestures for efficient mobile navigation.',
          content: (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <h4 className="font-semibold mb-3">Basic Gestures</h4>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                        👆
                      </div>
                      <div>
                        <div className="font-medium text-sm">Tap</div>
                        <div className="text-xs text-gray-500">Select/Activate</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                        👆👆
                      </div>
                      <div>
                        <div className="font-medium text-sm">Double Tap</div>
                        <div className="text-xs text-gray-500">Zoom/Details</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                        ↔️
                      </div>
                      <div>
                        <div className="font-medium text-sm">Swipe</div>
                        <div className="text-xs text-gray-500">Navigate/Dismiss</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <h4 className="font-semibold mb-3">Advanced Gestures</h4>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center">
                        🤏
                      </div>
                      <div>
                        <div className="font-medium text-sm">Pinch</div>
                        <div className="text-xs text-gray-500">Zoom in/out</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
                        ✋
                      </div>
                      <div>
                        <div className="font-medium text-sm">Long Press</div>
                        <div className="text-xs text-gray-500">Context menu</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-teal-100 dark:bg-teal-900 rounded-full flex items-center justify-center">
                        ↕️
                      </div>
                      <div>
                        <div className="font-medium text-sm">Pull to Refresh</div>
                        <div className="text-xs text-gray-500">Update data</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ),
          tips: [
            'All gestures work consistently across the app',
            'Visual feedback confirms gesture recognition',
            'Gestures can be disabled in accessibility settings'
          ]
        }
      ]
    }
  };

  const currentGuide = guides[activeGuide as keyof typeof guides];
  const currentStepData = currentGuide.steps[currentStep];

  useEffect(() => {
    if (isPlaying) {
      const timer = setTimeout(() => {
        if (currentStep < currentGuide.steps.length - 1) {
          setCurrentStep(prev => prev + 1);
        } else {
          setIsPlaying(false);
        }
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [isPlaying, currentStep, currentGuide.steps.length]);

  const handleStepComplete = (stepId: string) => {
    setCompletedSteps(prev => new Set([...prev, stepId]));
    setUserProgress(prev => ({
      ...prev,
      [activeGuide]: Math.max(prev[activeGuide] || 0, currentStep + 1)
    }));
  };

  const nextStep = () => {
    if (currentStep < currentGuide.steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const resetGuide = () => {
    setCurrentStep(0);
    setIsPlaying(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Interactive Guides
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Step-by-step walkthroughs to master the dashboard's features.
        </p>
      </div>

      {/* Guide Selection */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(guides).map(([key, guide]) => (
          <button
            key={key}
            onClick={() => {
              setActiveGuide(key);
              setCurrentStep(userProgress[key] || 0);
            }}
            className={`p-4 rounded-lg border-2 text-left transition-colors ${
              activeGuide === key
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              {guide.title}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              {guide.description}
            </p>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500 dark:text-gray-400">
                {guide.estimatedTime}
              </span>
              <div className="flex items-center space-x-1">
                <div className="w-16 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ 
                      width: `${((userProgress[key] || 0) / guide.steps.length) * 100}%` 
                    }}
                  />
                </div>
                <span className="text-gray-500 dark:text-gray-400">
                  {userProgress[key] || 0}/{guide.steps.length}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Active Guide */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        {/* Guide Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {currentGuide.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Step {currentStep + 1} of {currentGuide.steps.length}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-800"
                aria-label={isPlaying ? 'Pause guide' : 'Play guide'}
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </button>
              <button
                onClick={resetGuide}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                aria-label="Reset guide"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${((currentStep + 1) / currentGuide.steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Content */}
        <div className="p-6">
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {currentStepData.title}
            </h4>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {currentStepData.description}
            </p>
          </div>

          {currentStepData.content}

          {/* Tips */}
          {currentStepData.tips && (
            <div className="mt-6 bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
              <h5 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
                💡 Pro Tips
              </h5>
              <ul className="text-sm text-yellow-800 dark:text-yellow-200 space-y-1">
                {currentStepData.tips.map((tip, index) => (
                  <li key={index}>• {tip}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <button
            onClick={prevStep}
            disabled={currentStep === 0}
            className="flex items-center space-x-2 px-4 py-2 text-gray-600 dark:text-gray-400 
                     disabled:opacity-50 disabled:cursor-not-allowed hover:text-gray-800 dark:hover:text-gray-200"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Previous</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleStepComplete(currentStepData.id)}
              className="flex items-center space-x-2 px-4 py-2 bg-green-100 dark:bg-green-900 
                       text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-800"
            >
              <CheckCircle className="h-4 w-4" />
              <span>Mark Complete</span>
            </button>
          </div>

          <button
            onClick={nextStep}
            disabled={currentStep === currentGuide.steps.length - 1}
            className="flex items-center space-x-2 px-4 py-2 text-blue-600 dark:text-blue-400 
                     disabled:opacity-50 disabled:cursor-not-allowed hover:text-blue-800 dark:hover:text-blue-200"
          >
            <span>Next</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};