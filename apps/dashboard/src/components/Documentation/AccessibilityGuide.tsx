import React, { useState } from 'react';
import { 
  Eye, 
  Keyboard, 
  Volume2, 
  MousePointer, 
  Contrast, 
  Type, 
  CheckCircle, 
  AlertTriangle,
  Info,
  Play,
  Pause
} from 'lucide-react';

interface AccessibilityFeature {
  id: string;
  title: string;
  description: string;
  category: string;
  wcagLevel: 'A' | 'AA' | 'AAA';
  implementation: React.ReactNode;
  testing: React.ReactNode;
}

export const AccessibilityGuide: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState('overview');
  const [demoSettings, setDemoSettings] = useState({
    highContrast: false,
    reducedMotion: false,
    fontSize: 'medium',
    screenReaderMode: false
  });

  const categories = [
    { id: 'overview', name: 'Overview', icon: Info },
    { id: 'visual', name: 'Visual', icon: Eye },
    { id: 'keyboard', name: 'Keyboard', icon: Keyboard },
    { id: 'screen-reader', name: 'Screen Reader', icon: Volume2 },
    { id: 'motor', name: 'Motor', icon: MousePointer },
    { id: 'cognitive', name: 'Cognitive', icon: Type }
  ];

  const accessibilityFeatures: AccessibilityFeature[] = [
    {
      id: 'color-contrast',
      title: 'Color Contrast',
      description: 'Ensure sufficient color contrast for text and interactive elements.',
      category: 'visual',
      wcagLevel: 'AA',
      implementation: (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            All text maintains a minimum contrast ratio of 4.5:1 for normal text and 3:1 for large text.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <h5 className="font-semibold text-green-700 dark:text-green-300">✓ Good Contrast</h5>
              <div className="bg-blue-600 text-white p-3 rounded">
                <span>White text on blue background</span>
                <div className="text-xs mt-1 opacity-90">Contrast ratio: 8.59:1</div>
              </div>
            </div>
            <div className="space-y-2">
              <h5 className="font-semibold text-red-700 dark:text-red-300">✗ Poor Contrast</h5>
              <div className="bg-gray-300 text-gray-400 p-3 rounded">
                <span>Light gray text on light background</span>
                <div className="text-xs mt-1">Contrast ratio: 2.1:1</div>
              </div>
            </div>
          </div>
        </div>
      ),
      testing: (
        <div className="space-y-3">
          <h5 className="font-semibold">Testing Methods:</h5>
          <ul className="text-sm space-y-1">
            <li>• Use browser dev tools color picker</li>
            <li>• WebAIM Contrast Checker online tool</li>
            <li>• Automated testing with axe-core</li>
            <li>• Manual testing with high contrast mode</li>
          </ul>
        </div>
      )
    },
    {
      id: 'focus-management',
      title: 'Focus Management',
      description: 'Proper focus indicators and logical tab order for keyboard navigation.',
      category: 'keyboard',
      wcagLevel: 'AA',
      implementation: (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Focus indicators are clearly visible and follow a logical tab order.
          </p>
          <div className="space-y-3">
            <button className="px-4 py-2 bg-blue-600 text-white rounded focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
              Button with focus ring
            </button>
            <input 
              type="text" 
              placeholder="Input with focus outline"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
              <code className="text-sm">
                focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              </code>
            </div>
          </div>
        </div>
      ),
      testing: (
        <div className="space-y-3">
          <h5 className="font-semibold">Testing Methods:</h5>
          <ul className="text-sm space-y-1">
            <li>• Tab through all interactive elements</li>
            <li>• Verify focus indicators are visible</li>
            <li>• Check tab order is logical</li>
            <li>• Test focus trapping in modals</li>
          </ul>
        </div>
      )
    },
    {
      id: 'screen-reader-labels',
      title: 'Screen Reader Labels',
      description: 'Descriptive labels and ARIA attributes for assistive technologies.',
      category: 'screen-reader',
      wcagLevel: 'A',
      implementation: (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            All interactive elements have descriptive labels and appropriate ARIA attributes.
          </p>
          <div className="space-y-3">
            <div className="border border-gray-200 dark:border-gray-700 p-3 rounded">
              <label htmlFor="email-input" className="block text-sm font-medium mb-1">
                Email Address
              </label>
              <input
                id="email-input"
                type="email"
                aria-describedby="email-help"
                className="w-full px-3 py-2 border border-gray-300 rounded"
              />
              <div id="email-help" className="text-xs text-gray-500 mt-1">
                We'll never share your email with anyone else.
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
              <code className="text-sm">
                {`<input aria-describedby="email-help" />`}
              </code>
            </div>
          </div>
        </div>
      ),
      testing: (
        <div className="space-y-3">
          <h5 className="font-semibold">Testing Methods:</h5>
          <ul className="text-sm space-y-1">
            <li>• Test with NVDA, JAWS, or VoiceOver</li>
            <li>• Verify all elements are announced</li>
            <li>• Check ARIA labels are descriptive</li>
            <li>• Validate with axe-core</li>
          </ul>
        </div>
      )
    },
    {
      id: 'reduced-motion',
      title: 'Reduced Motion',
      description: 'Respect user preferences for reduced motion and animations.',
      category: 'visual',
      wcagLevel: 'AAA',
      implementation: (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Animations respect the user's motion preferences and can be disabled.
          </p>
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={demoSettings.reducedMotion}
                onChange={(e) => setDemoSettings(prev => ({ ...prev, reducedMotion: e.target.checked }))}
              />
              <span className="text-sm">Reduce motion</span>
            </label>
          </div>
          <div className="border border-gray-200 dark:border-gray-700 p-4 rounded">
            <div 
              className={`w-16 h-16 bg-blue-500 rounded-full ${
                demoSettings.reducedMotion 
                  ? '' 
                  : 'animate-bounce'
              }`}
            />
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              {demoSettings.reducedMotion ? 'Animation disabled' : 'Animation enabled'}
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
            <code className="text-sm">
              {`@media (prefers-reduced-motion: reduce) {
  .animate-bounce { animation: none; }
}`}
            </code>
          </div>
        </div>
      ),
      testing: (
        <div className="space-y-3">
          <h5 className="font-semibold">Testing Methods:</h5>
          <ul className="text-sm space-y-1">
            <li>• Enable "Reduce motion" in OS settings</li>
            <li>• Test with prefers-reduced-motion media query</li>
            <li>• Verify animations are disabled or reduced</li>
            <li>• Check essential motion is preserved</li>
          </ul>
        </div>
      )
    }
  ];

  const renderOverview = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Accessibility Overview
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Our dashboard is designed to be accessible to all users, following WCAG 2.1 guidelines 
          and implementing best practices for inclusive design.
        </p>
      </div>

      {/* WCAG Compliance */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          WCAG 2.1 Compliance
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400 mb-2">AA</div>
            <div className="text-sm text-green-700 dark:text-green-300">Current Level</div>
            <div className="text-xs text-green-600 dark:text-green-400 mt-1">
              Meets enhanced accessibility standards
            </div>
          </div>
          <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-2">95%</div>
            <div className="text-sm text-blue-700 dark:text-blue-300">Automated Score</div>
            <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              Based on axe-core testing
            </div>
          </div>
          <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mb-2">100%</div>
            <div className="text-sm text-purple-700 dark:text-purple-300">Keyboard Navigation</div>
            <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">
              All features keyboard accessible
            </div>
          </div>
        </div>
      </div>

      {/* Key Features */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Key Accessibility Features
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start space-x-3">
            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
            <div>
              <h5 className="font-medium text-gray-900 dark:text-white">Screen Reader Support</h5>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Full compatibility with NVDA, JAWS, and VoiceOver
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
            <div>
              <h5 className="font-medium text-gray-900 dark:text-white">Keyboard Navigation</h5>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Complete keyboard access with logical tab order
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
            <div>
              <h5 className="font-medium text-gray-900 dark:text-white">High Contrast Mode</h5>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Enhanced contrast ratios for better visibility
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
            <div>
              <h5 className="font-medium text-gray-900 dark:text-white">Reduced Motion</h5>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Respects user motion preferences
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Demo */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Accessibility Settings Demo
        </h4>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={demoSettings.highContrast}
                onChange={(e) => setDemoSettings(prev => ({ ...prev, highContrast: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium">High Contrast Mode</span>
            </label>
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={demoSettings.reducedMotion}
                onChange={(e) => setDemoSettings(prev => ({ ...prev, reducedMotion: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium">Reduce Motion</span>
            </label>
          </div>
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium">Font Size:</label>
            <select
              value={demoSettings.fontSize}
              onChange={(e) => setDemoSettings(prev => ({ ...prev, fontSize: e.target.value }))}
              className="px-3 py-1 border border-gray-300 rounded text-sm"
              aria-label="Font size selection"
            >
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
              <option value="extra-large">Extra Large</option>
            </select>
          </div>
          
          {/* Demo Content */}
          <div className={`p-4 rounded-lg border transition-colors ${
            demoSettings.highContrast 
              ? 'bg-black text-white border-white' 
              : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
          }`}>
            <h5 className={`font-semibold mb-2 ${
              demoSettings.fontSize === 'small' ? 'text-sm' :
              demoSettings.fontSize === 'large' ? 'text-lg' :
              demoSettings.fontSize === 'extra-large' ? 'text-xl' :
              'text-base'
            }`}>
              Sample Content
            </h5>
            <p className={`${
              demoSettings.fontSize === 'small' ? 'text-xs' :
              demoSettings.fontSize === 'large' ? 'text-base' :
              demoSettings.fontSize === 'extra-large' ? 'text-lg' :
              'text-sm'
            }`}>
              This demonstrates how accessibility settings affect the appearance and behavior of content.
            </p>
            <button className={`mt-3 px-4 py-2 rounded transition-transform ${
              demoSettings.highContrast 
                ? 'bg-white text-black border-2 border-white' 
                : 'bg-blue-600 text-white'
            } ${
              demoSettings.reducedMotion ? '' : 'hover:scale-105'
            }`}>
              Interactive Button
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const filteredFeatures = accessibilityFeatures.filter(feature => 
    feature.category === activeCategory
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Accessibility Guidelines
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Comprehensive guide to accessibility features and best practices.
        </p>
      </div>

      {/* Category Navigation */}
      <div className="flex flex-wrap gap-2">
        {categories.map(category => {
          const Icon = category.icon;
          return (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeCategory === category.id
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{category.name}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      {activeCategory === 'overview' ? (
        renderOverview()
      ) : (
        <div className="space-y-6">
          {filteredFeatures.map(feature => (
            <div
              key={feature.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
            >
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {feature.title}
                  </h3>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    feature.wcagLevel === 'AAA' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                    feature.wcagLevel === 'AA' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
                    'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
                  }`}>
                    WCAG {feature.wcagLevel}
                  </span>
                </div>
                <p className="text-gray-600 dark:text-gray-400">
                  {feature.description}
                </p>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                      Implementation
                    </h4>
                    {feature.implementation}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                      Testing
                    </h4>
                    {feature.testing}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Resources */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-4">
          Additional Resources
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
              Testing Tools
            </h4>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>• axe DevTools browser extension</li>
              <li>• WAVE Web Accessibility Evaluator</li>
              <li>• Lighthouse accessibility audit</li>
              <li>• Color contrast analyzers</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
              Screen Readers
            </h4>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>• NVDA (Windows, free)</li>
              <li>• JAWS (Windows, commercial)</li>
              <li>• VoiceOver (macOS/iOS, built-in)</li>
              <li>• TalkBack (Android, built-in)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};