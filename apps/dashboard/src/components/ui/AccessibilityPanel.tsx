import React, { useState } from 'react';
import { useAccessibility } from '../../contexts/AccessibilityContext';
import { Button } from './Button';
import { Card } from './Card';
import { Modal } from './Modal';

interface AccessibilityPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AccessibilityPanel: React.FC<AccessibilityPanelProps> = ({
  isOpen,
  onClose,
}) => {
  const { settings, updateSettings, runAccessibilityTests, announceToScreenReader } = useAccessibility();
  const [testResults, setTestResults] = useState<{ category: string; issues: string[] }[]>([]);
  const [showTestResults, setShowTestResults] = useState(false);

  const handleSettingChange = (key: keyof typeof settings, value: any) => {
    updateSettings({ [key]: value });
    announceToScreenReader(`${key} ${value ? 'enabled' : 'disabled'}`, 'polite');
  };

  const handleRunTests = () => {
    const results = runAccessibilityTests();
    setTestResults(results);
    setShowTestResults(true);
    
    const totalIssues = results.reduce((sum, result) => sum + result.issues.length, 0);
    announceToScreenReader(
      `Accessibility test completed. Found ${totalIssues} issues across ${results.length} categories.`,
      'assertive'
    );
  };

  const resetToDefaults = () => {
    updateSettings({
      highContrast: false,
      fontSize: 'medium',
      reducedMotion: false,
      screenReaderMode: false,
      keyboardNavigation: true,
      focusIndicators: true,
      skipLinks: true,
    });
    announceToScreenReader('Accessibility settings reset to defaults', 'polite');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Accessibility Settings"
      size="lg"
      aria-labelledby="accessibility-panel-title"
      aria-describedby="accessibility-panel-description"
    >
      <div className="space-y-6">
        <div id="accessibility-panel-description" className="text-sm text-gray-600 dark:text-gray-400">
          Customize accessibility features to improve your experience with the dashboard.
        </div>

        {/* Visual Settings */}
        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-4">Visual Settings</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label htmlFor="high-contrast" className="text-sm font-medium">
                High Contrast Mode
                <span className="block text-xs text-gray-500 dark:text-gray-400">
                  Increases contrast for better visibility
                </span>
              </label>
              <button
                id="high-contrast"
                role="switch"
                aria-checked={settings.highContrast}
                onClick={() => handleSettingChange('highContrast', !settings.highContrast)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  settings.highContrast ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.highContrast ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <label htmlFor="font-size" className="text-sm font-medium">
                Font Size
                <span className="block text-xs text-gray-500 dark:text-gray-400">
                  Adjust text size for better readability
                </span>
              </label>
              <select
                id="font-size"
                value={settings.fontSize}
                onChange={(e) => handleSettingChange('fontSize', e.target.value)}
                className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                aria-label="Select font size"
              >
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
                <option value="extra-large">Extra Large</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <label htmlFor="reduced-motion" className="text-sm font-medium">
                Reduced Motion
                <span className="block text-xs text-gray-500 dark:text-gray-400">
                  Minimizes animations and transitions
                </span>
              </label>
              <button
                id="reduced-motion"
                role="switch"
                aria-checked={settings.reducedMotion}
                onClick={() => handleSettingChange('reducedMotion', !settings.reducedMotion)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  settings.reducedMotion ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.reducedMotion ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </Card>

        {/* Navigation Settings */}
        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-4">Navigation Settings</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label htmlFor="keyboard-navigation" className="text-sm font-medium">
                Keyboard Navigation
                <span className="block text-xs text-gray-500 dark:text-gray-400">
                  Enable arrow key navigation
                </span>
              </label>
              <button
                id="keyboard-navigation"
                role="switch"
                aria-checked={settings.keyboardNavigation}
                onClick={() => handleSettingChange('keyboardNavigation', !settings.keyboardNavigation)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  settings.keyboardNavigation ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.keyboardNavigation ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <label htmlFor="focus-indicators" className="text-sm font-medium">
                Enhanced Focus Indicators
                <span className="block text-xs text-gray-500 dark:text-gray-400">
                  Show clear focus outlines
                </span>
              </label>
              <button
                id="focus-indicators"
                role="switch"
                aria-checked={settings.focusIndicators}
                onClick={() => handleSettingChange('focusIndicators', !settings.focusIndicators)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  settings.focusIndicators ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.focusIndicators ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <label htmlFor="skip-links" className="text-sm font-medium">
                Skip Links
                <span className="block text-xs text-gray-500 dark:text-gray-400">
                  Show skip navigation links
                </span>
              </label>
              <button
                id="skip-links"
                role="switch"
                aria-checked={settings.skipLinks}
                onClick={() => handleSettingChange('skipLinks', !settings.skipLinks)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  settings.skipLinks ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.skipLinks ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </Card>

        {/* Screen Reader Settings */}
        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-4">Screen Reader Settings</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label htmlFor="screen-reader-mode" className="text-sm font-medium">
                Screen Reader Mode
                <span className="block text-xs text-gray-500 dark:text-gray-400">
                  Optimizes interface for screen readers
                </span>
              </label>
              <button
                id="screen-reader-mode"
                role="switch"
                aria-checked={settings.screenReaderMode}
                onClick={() => handleSettingChange('screenReaderMode', !settings.screenReaderMode)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  settings.screenReaderMode ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.screenReaderMode ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </Card>

        {/* Testing and Actions */}
        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-4">Accessibility Testing</h3>
          
          <div className="space-y-4">
            <Button
              onClick={handleRunTests}
              variant="secondary"
              className="w-full"
              aria-describedby="test-description"
            >
              Run Accessibility Tests
            </Button>
            <p id="test-description" className="text-xs text-gray-500 dark:text-gray-400">
              Check the current page for common accessibility issues
            </p>

            {showTestResults && (
              <div className="mt-4 space-y-2">
                <h4 className="font-medium">Test Results:</h4>
                {testResults.map((result, index) => (
                  <div key={index} className="text-sm">
                    <strong>{result.category}:</strong> {result.issues.length} issues
                    {result.issues.length > 0 && (
                      <ul className="ml-4 mt-1 list-disc text-xs text-gray-600 dark:text-gray-400">
                        {result.issues.map((issue, issueIndex) => (
                          <li key={issueIndex}>{issue}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-between pt-4">
          <Button
            onClick={resetToDefaults}
            variant="ghost"
            aria-label="Reset all accessibility settings to default values"
          >
            Reset to Defaults
          </Button>
          <Button onClick={onClose} variant="primary">
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default AccessibilityPanel;