/**
 * Accessibility Demo Component
 * Demonstrates the comprehensive accessibility infrastructure in action
 */

import React, { useState, useRef, useEffect } from 'react';
import { useAccessibility } from './accessibility-manager';

export const AccessibilityDemo: React.FC = () => {
  const {
    focusManagement,
    screenReader,
    keyboardNavigation,
    visualPreferences,
    accessibilityTesting,
    status
  } = useAccessibility();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Set up keyboard navigation for toolbar
  useEffect(() => {
    const toolbar = document.querySelector('[data-toolbar]') as HTMLElement;
    if (toolbar) {
      keyboardNavigation.setupNavigationContext(toolbar, {
        container: toolbar,
        orientation: 'horizontal',
        wrap: true
      });
    }
  }, [keyboardNavigation]);

  // Handle modal focus management
  useEffect(() => {
    if (isModalOpen && modalRef.current) {
      focusManagement.manageFocus(modalRef.current, {
        trapFocus: true,
        restoreOnUnmount: true
      });
    }
  }, [isModalOpen, focusManagement]);

  const handleOpenModal = () => {
    setIsModalOpen(true);
    screenReader.announce('Modal dialog opened', 'polite');
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    screenReader.announce('Modal dialog closed', 'polite');
    if (triggerRef.current) {
      focusManagement.restoreFocus();
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
      screenReader.announceFormError('Name', 'Name is required');
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
      screenReader.announceFormError('Email', 'Email is required');
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
      screenReader.announceFormError('Email', 'Please enter a valid email address');
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      setIsLoading(true);
      screenReader.announceLoadingState(true, 'form submission');
      
      // Simulate form submission
      setTimeout(() => {
        setIsLoading(false);
        screenReader.announceLoadingState(false, 'form submission');
        screenReader.announce('Form submitted successfully', 'assertive');
        setFormData({ name: '', email: '', message: '' });
      }, 2000);
    }
  };

  const runAccessibilityTest = async () => {
    try {
      const results = await accessibilityTesting.runAudit();
      setTestResults(results);
      screenReader.announce(
        `Accessibility audit complete. Found ${results.violations.length} violations`,
        'polite'
      );
    } catch (error) {
      screenReader.announce('Accessibility test failed', 'assertive');
    }
  };

  const toggleHighContrast = () => {
    const current = visualPreferences.preferences.highContrast;
    visualPreferences.updatePreference('highContrast', !current);
    screenReader.announce(
      `High contrast mode ${!current ? 'enabled' : 'disabled'}`,
      'polite'
    );
  };

  const toggleReducedMotion = () => {
    const current = visualPreferences.preferences.reducedMotion;
    visualPreferences.updatePreference('reducedMotion', !current);
    screenReader.announce(
      `Reduced motion ${!current ? 'enabled' : 'disabled'}`,
      'polite'
    );
  };

  const changeFontSize = (size: 'small' | 'medium' | 'large' | 'extra-large') => {
    visualPreferences.updatePreference('fontSize', size);
    screenReader.announce(`Font size changed to ${size}`, 'polite');
  };

  return (
    <div className="accessibility-demo">
      <header>
        <h1>Accessibility Infrastructure Demo</h1>
        <p>This demo showcases comprehensive accessibility features including focus management, screen reader support, keyboard navigation, and visual preferences.</p>
      </header>

      {/* Skip Links */}
      <nav aria-label="Skip links" className="skip-links">
        <a href="#main-content" data-skip-link>Skip to main content</a>
        <a href="#form-section" data-skip-link>Skip to form</a>
        <a href="#settings-section" data-skip-link>Skip to settings</a>
      </nav>

      {/* Status Information */}
      <section aria-labelledby="status-heading">
        <h2 id="status-heading">Accessibility Status</h2>
        <ul>
          <li>Focus Management: {status.focusManagement ? '✅ Active' : '❌ Inactive'}</li>
          <li>Screen Reader Support: {status.screenReaderSupport ? '✅ Active' : '❌ Inactive'}</li>
          <li>Keyboard Navigation: {status.keyboardNavigation ? '✅ Active' : '❌ Inactive'}</li>
          <li>Visual Preferences: {status.visualPreferences ? '✅ Active' : '❌ Inactive'}</li>
        </ul>
      </section>

      {/* Toolbar with Keyboard Navigation */}
      <section aria-labelledby="toolbar-heading">
        <h2 id="toolbar-heading">Keyboard Navigation Demo</h2>
        <div 
          role="toolbar" 
          aria-label="Demo toolbar"
          data-toolbar
          className="toolbar"
        >
          <button onClick={() => screenReader.announce('Action 1 executed', 'polite')}>
            Action 1
          </button>
          <button onClick={() => screenReader.announce('Action 2 executed', 'polite')}>
            Action 2
          </button>
          <button onClick={() => screenReader.announce('Action 3 executed', 'polite')}>
            Action 3
          </button>
          <button 
            ref={triggerRef}
            onClick={handleOpenModal}
          >
            Open Modal
          </button>
        </div>
        <p><small>Use arrow keys to navigate between toolbar buttons</small></p>
      </section>

      {/* Form Section */}
      <section id="form-section" aria-labelledby="form-heading">
        <h2 id="form-heading">Form with Error Handling</h2>
        <form onSubmit={handleFormSubmit}>
          <div className="form-group">
            <label htmlFor="name">Name *</label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              aria-describedby={errors.name ? 'name-error' : undefined}
              aria-invalid={!!errors.name}
              aria-required="true"
            />
            {errors.name && (
              <div id="name-error" role="alert" className="error">
                {errors.name}
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="email">Email *</label>
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              aria-describedby={errors.email ? 'email-error' : undefined}
              aria-invalid={!!errors.email}
              aria-required="true"
            />
            {errors.email && (
              <div id="email-error" role="alert" className="error">
                {errors.email}
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="message">Message</label>
            <textarea
              id="message"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              rows={4}
            />
          </div>

          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Submitting...' : 'Submit Form'}
          </button>
        </form>
      </section>

      {/* Visual Preferences */}
      <section id="settings-section" aria-labelledby="settings-heading">
        <h2 id="settings-heading">Visual Preferences</h2>
        
        <div className="preference-group">
          <h3>Display Options</h3>
          <button onClick={toggleHighContrast}>
            {visualPreferences.preferences.highContrast ? 'Disable' : 'Enable'} High Contrast
          </button>
          <button onClick={toggleReducedMotion}>
            {visualPreferences.preferences.reducedMotion ? 'Enable' : 'Disable'} Motion
          </button>
        </div>

        <div className="preference-group">
          <h3>Font Size</h3>
          <div role="radiogroup" aria-labelledby="font-size-label">
            <span id="font-size-label">Choose font size:</span>
            {(['small', 'medium', 'large', 'extra-large'] as const).map(size => (
              <label key={size}>
                <input
                  type="radio"
                  name="fontSize"
                  value={size}
                  checked={visualPreferences.preferences.fontSize === size}
                  onChange={() => changeFontSize(size)}
                />
                {size.charAt(0).toUpperCase() + size.slice(1).replace('-', ' ')}
              </label>
            ))}
          </div>
        </div>
      </section>

      {/* Accessibility Testing */}
      <section aria-labelledby="testing-heading">
        <h2 id="testing-heading">Accessibility Testing</h2>
        <button onClick={runAccessibilityTest}>
          Run Accessibility Audit
        </button>
        
        {testResults && (
          <div className="test-results" role="region" aria-labelledby="results-heading">
            <h3 id="results-heading">Test Results</h3>
            <ul>
              <li>Violations: {testResults.violations.length}</li>
              <li>Passes: {testResults.passes.length}</li>
              <li>Incomplete: {testResults.incomplete.length}</li>
            </ul>
            
            {testResults.violations.length > 0 && (
              <details>
                <summary>View Violations</summary>
                <ul>
                  {testResults.violations.map((violation: any, index: number) => (
                    <li key={index}>
                      <strong>{violation.description}</strong>
                      <br />
                      Impact: {violation.impact}
                      <br />
                      Help: {violation.help}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}
      </section>

      {/* Modal Dialog */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            className="modal"
            onClick={(e) => e.stopPropagation()}
          >
            <header>
              <h2 id="modal-title">Accessible Modal Dialog</h2>
            </header>
            <div>
              <p>This modal demonstrates proper focus management and keyboard navigation.</p>
              <p>Try using Tab to navigate and Escape to close.</p>
              
              <div className="modal-actions">
                <button onClick={() => screenReader.announce('Primary action executed', 'polite')}>
                  Primary Action
                </button>
                <button onClick={handleCloseModal} data-close>
                  Close Modal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Live Region for Dynamic Updates */}
      <div aria-live="polite" aria-atomic="true" className="sr-only" id="live-updates">
        {/* Dynamic content announcements will appear here */}
      </div>

      <style jsx>{`
        .accessibility-demo {
          max-width: 800px;
          margin: 0 auto;
          padding: 2rem;
          font-family: system-ui, -apple-system, sans-serif;
        }

        .skip-links {
          position: absolute;
          top: -40px;
          left: 6px;
          z-index: 1000;
        }

        .skip-links a {
          position: absolute;
          left: -10000px;
          top: auto;
          width: 1px;
          height: 1px;
          overflow: hidden;
        }

        .skip-links a:focus {
          position: static;
          width: auto;
          height: auto;
          padding: 8px;
          background: #000;
          color: #fff;
          text-decoration: none;
          border-radius: 4px;
        }

        .toolbar {
          display: flex;
          gap: 0.5rem;
          padding: 1rem;
          border: 2px solid #ccc;
          border-radius: 4px;
          margin: 1rem 0;
        }

        .toolbar button {
          padding: 0.5rem 1rem;
          border: 1px solid #ccc;
          background: #f5f5f5;
          cursor: pointer;
          border-radius: 4px;
        }

        .toolbar button:focus {
          outline: 2px solid #005fcc;
          outline-offset: 2px;
        }

        .form-group {
          margin-bottom: 1rem;
        }

        .form-group label {
          display: block;
          margin-bottom: 0.25rem;
          font-weight: bold;
        }

        .form-group input,
        .form-group textarea {
          width: 100%;
          padding: 0.5rem;
          border: 1px solid #ccc;
          border-radius: 4px;
          font-size: 1rem;
        }

        .form-group input:focus,
        .form-group textarea:focus {
          outline: 2px solid #005fcc;
          outline-offset: 2px;
        }

        .form-group input[aria-invalid="true"],
        .form-group textarea[aria-invalid="true"] {
          border-color: #d32f2f;
        }

        .error {
          color: #d32f2f;
          font-size: 0.875rem;
          margin-top: 0.25rem;
        }

        .preference-group {
          margin: 1rem 0;
          padding: 1rem;
          border: 1px solid #ccc;
          border-radius: 4px;
        }

        .preference-group h3 {
          margin-top: 0;
        }

        .preference-group button {
          margin-right: 0.5rem;
          margin-bottom: 0.5rem;
          padding: 0.5rem 1rem;
          border: 1px solid #ccc;
          background: #f5f5f5;
          cursor: pointer;
          border-radius: 4px;
        }

        .preference-group label {
          display: block;
          margin: 0.25rem 0;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal {
          background: white;
          padding: 2rem;
          border-radius: 8px;
          max-width: 500px;
          width: 90%;
          max-height: 80vh;
          overflow-y: auto;
        }

        .modal-actions {
          display: flex;
          gap: 1rem;
          margin-top: 1rem;
        }

        .modal-actions button {
          padding: 0.5rem 1rem;
          border: 1px solid #ccc;
          background: #f5f5f5;
          cursor: pointer;
          border-radius: 4px;
        }

        .test-results {
          margin-top: 1rem;
          padding: 1rem;
          border: 1px solid #ccc;
          border-radius: 4px;
        }

        .sr-only {
          position: absolute !important;
          width: 1px !important;
          height: 1px !important;
          padding: 0 !important;
          margin: -1px !important;
          overflow: hidden !important;
          clip: rect(0, 0, 0, 0) !important;
          white-space: nowrap !important;
          border: 0 !important;
        }

        /* High contrast mode styles */
        :global(.high-contrast) .toolbar button {
          border: 2px solid #000;
          background: #fff;
          color: #000;
        }

        :global(.high-contrast) .form-group input,
        :global(.high-contrast) .form-group textarea {
          border: 2px solid #000;
          background: #fff;
          color: #000;
        }

        /* Reduced motion styles */
        :global(.reduced-motion) * {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
      `}</style>
    </div>
  );
};

export default AccessibilityDemo;