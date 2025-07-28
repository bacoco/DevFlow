import React, { useState } from 'react';
import { useAccessibility } from '../../contexts/AccessibilityContext';
import { 
  Eye, 
  Type, 
  Pause, 
  Volume2, 
  Keyboard, 
  Settings,
  X,
  Minus,
  Plus
} from 'lucide-react';

interface AccessibilityToolbarProps {
  className?: string;
}

export const AccessibilityToolbar: React.FC<AccessibilityToolbarProps> = ({ 
  className = '' 
}) => {
  const { settings, updateSettings, announceToScreenReader } = useAccessibility();
  const [isExpanded, setIsExpanded] = useState(false);

  const fontSizeOptions = [
    { value: 'small', label: 'Small', size: '12px' },
    { value: 'medium', label: 'Medium', size: '14px' },
    { value: 'large', label: 'Large', size: '16px' },
    { value: 'extra-large', label: 'Extra Large', size: '18px' },
  ] as const;

  const handleToggleHighContrast = () => {
    const newValue = !settings.highContrast;
    updateSettings({ highContrast: newValue });
    announceToScreenReader(
      `High contrast mode ${newValue ? 'enabled' : 'disabled'}`
    );
  };

  const handleFontSizeChange = (fontSize: typeof settings.fontSize) => {
    updateSettings({ fontSize });
    announceToScreenReader(`Font size changed to ${fontSize}`);
  };

  const handleToggleReducedMotion = () => {
    const newValue = !settings.reducedMotion;
    updateSettings({ reducedMotion: newValue });
    announceToScreenReader(
      `Reduced motion ${newValue ? 'enabled' : 'disabled'}`
    );
  };

  const handleToggleScreenReader = () => {
    const newValue = !settings.screenReaderMode;
    updateSettings({ screenReaderMode: newValue });
    announceToScreenReader(
      `Screen reader mode ${newValue ? 'enabled' : 'disabled'}`
    );
  };

  const handleToggleKeyboardNav = () => {
    const newValue = !settings.keyboardNavigation;
    updateSettings({ keyboardNavigation: newValue });
    announceToScreenReader(
      `Keyboard navigation ${newValue ? 'enabled' : 'disabled'}`
    );
  };

  return (
    <div className={`accessibility-toolbar ${className}`}>
      {/* Skip Links */}
      <div className="skip-links">
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <a href="#navigation" className="skip-link">
          Skip to navigation
        </a>
      </div>

      {/* Accessibility Toolbar */}
      <div 
        className={`fixed top-0 right-0 z-50 bg-white border-l border-b border-gray-200 shadow-lg transition-transform ${
          isExpanded ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="toolbar"
        aria-label="Accessibility options"
        aria-expanded={isExpanded}
      >
        {/* Toggle Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`absolute left-0 top-1/2 transform -translate-x-full -translate-y-1/2 bg-blue-600 text-white p-2 rounded-l-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            isExpanded ? 'rounded-r-none' : ''
          }`}
          aria-label={`${isExpanded ? 'Close' : 'Open'} accessibility toolbar`}
          aria-expanded={isExpanded}
        >
          {isExpanded ? <X size={20} /> : <Settings size={20} />}
        </button>

        {/* Toolbar Content */}
        <div className="p-4 w-80 max-h-screen overflow-y-auto">
          <h2 className="text-lg font-semibold mb-4 text-gray-900">
            Accessibility Options
          </h2>

          <div className="space-y-4">
            {/* High Contrast */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Eye size={20} className="text-gray-600" />
                <label htmlFor="high-contrast" className="text-sm font-medium text-gray-700">
                  High Contrast
                </label>
              </div>
              <button
                id="high-contrast"
                onClick={handleToggleHighContrast}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  settings.highContrast ? 'bg-blue-600' : 'bg-gray-200'
                }`}
                role="switch"
                aria-checked={settings.highContrast}
                aria-label="Toggle high contrast mode"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.highContrast ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Font Size */}
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <Type size={20} className="text-gray-600" />
                <label className="text-sm font-medium text-gray-700">
                  Font Size
                </label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {fontSizeOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleFontSizeChange(option.value)}
                    className={`px-3 py-2 text-sm rounded-md border transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      settings.fontSize === option.value
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                    aria-pressed={settings.fontSize === option.value}
                    style={{ fontSize: option.size }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Reduced Motion */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Pause size={20} className="text-gray-600" />
                <label htmlFor="reduced-motion" className="text-sm font-medium text-gray-700">
                  Reduce Motion
                </label>
              </div>
              <button
                id="reduced-motion"
                onClick={handleToggleReducedMotion}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  settings.reducedMotion ? 'bg-blue-600' : 'bg-gray-200'
                }`}
                role="switch"
                aria-checked={settings.reducedMotion}
                aria-label="Toggle reduced motion"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.reducedMotion ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Screen Reader Mode */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Volume2 size={20} className="text-gray-600" />
                <label htmlFor="screen-reader" className="text-sm font-medium text-gray-700">
                  Screen Reader Mode
                </label>
              </div>
              <button
                id="screen-reader"
                onClick={handleToggleScreenReader}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  settings.screenReaderMode ? 'bg-blue-600' : 'bg-gray-200'
                }`}
                role="switch"
                aria-checked={settings.screenReaderMode}
                aria-label="Toggle screen reader mode"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.screenReaderMode ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Keyboard Navigation */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Keyboard size={20} className="text-gray-600" />
                <label htmlFor="keyboard-nav" className="text-sm font-medium text-gray-700">
                  Keyboard Navigation
                </label>
              </div>
              <button
                id="keyboard-nav"
                onClick={handleToggleKeyboardNav}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  settings.keyboardNavigation ? 'bg-blue-600' : 'bg-gray-200'
                }`}
                role="switch"
                aria-checked={settings.keyboardNavigation}
                aria-label="Toggle keyboard navigation"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.keyboardNavigation ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Quick Font Size Controls */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Quick Font Size</span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      const currentIndex = fontSizeOptions.findIndex(opt => opt.value === settings.fontSize);
                      if (currentIndex > 0) {
                        handleFontSizeChange(fontSizeOptions[currentIndex - 1].value);
                      }
                    }}
                    disabled={settings.fontSize === 'small'}
                    className="p-1 rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="Decrease font size"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="text-sm text-gray-600 min-w-16 text-center">
                    {fontSizeOptions.find(opt => opt.value === settings.fontSize)?.label}
                  </span>
                  <button
                    onClick={() => {
                      const currentIndex = fontSizeOptions.findIndex(opt => opt.value === settings.fontSize);
                      if (currentIndex < fontSizeOptions.length - 1) {
                        handleFontSizeChange(fontSizeOptions[currentIndex + 1].value);
                      }
                    }}
                    disabled={settings.fontSize === 'extra-large'}
                    className="p-1 rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="Increase font size"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* Reset Button */}
            <div className="border-t pt-4">
              <button
                onClick={() => {
                  updateSettings({
                    highContrast: false,
                    fontSize: 'medium',
                    reducedMotion: false,
                    screenReaderMode: false,
                    keyboardNavigation: true,
                  });
                  announceToScreenReader('Accessibility settings reset to defaults');
                }}
                className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Reset to Defaults
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Announcement Region */}
      <div
        id="announcement-region"
        className="announcement-region"
        aria-live="polite"
        aria-atomic="true"
      />
    </div>
  );
};

export default AccessibilityToolbar;