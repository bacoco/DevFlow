/**
 * Accessibility Testing Configuration
 * Comprehensive WCAG compliance testing setup
 */

module.exports = {
  // axe-core configuration
  axeConfig: {
    // WCAG compliance level
    level: 'AA', // Can be 'A', 'AA', or 'AAA'
    
    // Standards to test against
    tags: [
      'wcag2a',
      'wcag2aa',
      'wcag21aa',
      'best-practice',
      'section508',
    ],
    
    // Rules configuration
    rules: {
      // Color and contrast
      'color-contrast': {
        enabled: true,
        options: {
          noScroll: true,
          ignoreUseColor: false,
          ignorePseudo: false,
        },
      },
      'color-contrast-enhanced': {
        enabled: true, // WCAG AAA level
      },
      
      // Keyboard navigation
      'keyboard': {
        enabled: true,
      },
      'focus-order-semantics': {
        enabled: true,
      },
      'focusable-content': {
        enabled: true,
      },
      'tabindex': {
        enabled: true,
      },
      
      // Semantic structure
      'heading-order': {
        enabled: true,
      },
      'landmark-one-main': {
        enabled: true,
      },
      'landmark-complementary-is-top-level': {
        enabled: true,
      },
      'landmark-no-duplicate-banner': {
        enabled: true,
      },
      'landmark-no-duplicate-contentinfo': {
        enabled: true,
      },
      'landmark-unique': {
        enabled: true,
      },
      
      // Form accessibility
      'label': {
        enabled: true,
      },
      'label-title-only': {
        enabled: true,
      },
      'form-field-multiple-labels': {
        enabled: true,
      },
      'required-attr': {
        enabled: true,
      },
      'required-children': {
        enabled: true,
      },
      'required-context': {
        enabled: true,
      },
      'required-parent': {
        enabled: true,
      },
      
      // Interactive elements
      'button-name': {
        enabled: true,
      },
      'link-name': {
        enabled: true,
      },
      'link-in-text-block': {
        enabled: true,
      },
      'interactive-supports-focus': {
        enabled: true,
      },
      'nested-interactive': {
        enabled: true,
      },
      
      // Images and media
      'image-alt': {
        enabled: true,
      },
      'image-redundant-alt': {
        enabled: true,
      },
      'object-alt': {
        enabled: true,
      },
      'video-caption': {
        enabled: true,
      },
      'audio-caption': {
        enabled: true,
      },
      
      // ARIA
      'aria-valid-attr': {
        enabled: true,
      },
      'aria-valid-attr-value': {
        enabled: true,
      },
      'aria-required-attr': {
        enabled: true,
      },
      'aria-required-children': {
        enabled: true,
      },
      'aria-required-parent': {
        enabled: true,
      },
      'aria-roles': {
        enabled: true,
      },
      'aria-allowed-attr': {
        enabled: true,
      },
      'aria-hidden-body': {
        enabled: true,
      },
      'aria-hidden-focus': {
        enabled: true,
      },
      'aria-labelledby': {
        enabled: true,
      },
      'aria-describedby': {
        enabled: true,
      },
      
      // Tables
      'table-fake-caption': {
        enabled: true,
      },
      'td-headers-attr': {
        enabled: true,
      },
      'th-has-data-cells': {
        enabled: true,
      },
      'scope-attr-valid': {
        enabled: true,
      },
      
      // Language
      'html-has-lang': {
        enabled: true,
      },
      'html-lang-valid': {
        enabled: true,
      },
      'valid-lang': {
        enabled: true,
      },
      
      // Page structure
      'page-has-heading-one': {
        enabled: true,
      },
      'bypass': {
        enabled: true,
      },
      'skip-link': {
        enabled: true,
      },
      
      // Custom rules for our components
      'custom-button-accessible-name': {
        enabled: true,
        selector: 'button, [role="button"]',
        evaluate: function(node) {
          const accessibleName = node.getAttribute('aria-label') || 
                                node.getAttribute('aria-labelledby') || 
                                node.textContent?.trim();
          return !!accessibleName;
        },
        metadata: {
          description: 'Ensures all buttons have accessible names',
          help: 'Buttons must have accessible names for screen readers',
        },
      },
      
      'custom-interactive-keyboard': {
        enabled: true,
        selector: '[role="button"], [role="link"], [role="tab"], [role="menuitem"]',
        evaluate: function(node) {
          const tabIndex = node.getAttribute('tabindex');
          return tabIndex !== '-1' && !node.hasAttribute('disabled');
        },
        metadata: {
          description: 'Ensures interactive elements are keyboard accessible',
          help: 'Interactive elements must be focusable via keyboard',
        },
      },
    },
    
    // Global options
    options: {
      // Include hidden elements in testing
      includeHidden: false,
      
      // Restore scroll position after testing
      restoreScroll: true,
      
      // Performance optimization
      performanceTimer: true,
      
      // Result types to include
      resultTypes: ['violations', 'incomplete', 'passes'],
      
      // Selectors to exclude from testing
      exclude: [
        '.chromatic-ignore',
        '[data-chromatic="ignore"]',
        '.storybook-addon',
      ],
      
      // Selectors to include (overrides exclude)
      include: [],
    },
  },

  // Custom accessibility matchers
  customMatchers: {
    // Enhanced accessibility matcher
    toBeAccessible: async function(received, options = {}) {
      const { axe } = await import('jest-axe');
      const config = { ...this.axeConfig, ...options };
      
      try {
        const results = await axe(received, config);
        
        if (results.violations.length === 0) {
          return {
            message: () => `Expected element to have accessibility violations, but none were found`,
            pass: true,
          };
        }

        const violationMessages = results.violations.map(violation => {
          const nodes = violation.nodes.map(node => 
            `  - ${node.target.join(', ')}: ${node.failureSummary || 'No details available'}`
          ).join('\n');
          
          return `${violation.id} (${violation.impact}): ${violation.description}\n${violation.help}\n${nodes}`;
        }).join('\n\n');

        return {
          message: () => `Expected element to be accessible, but found ${results.violations.length} violations:\n\n${violationMessages}`,
          pass: false,
        };
      } catch (error) {
        return {
          message: () => `Accessibility test failed with error: ${error.message}`,
          pass: false,
        };
      }
    },

    // Keyboard navigation matcher
    toSupportKeyboardNavigation: function(received) {
      const focusableElements = received.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"]), [role="button"], [role="link"], [role="tab"], [role="menuitem"]'
      );

      const issues = [];

      focusableElements.forEach((element, index) => {
        // Check if element is focusable
        const tabIndex = element.getAttribute('tabindex');
        const isDisabled = element.hasAttribute('disabled') || element.getAttribute('aria-disabled') === 'true';
        
        if (isDisabled && tabIndex !== '-1') {
          issues.push(`Element ${index + 1} is disabled but still focusable`);
        }
        
        // Check for accessible name
        const hasAccessibleName = element.getAttribute('aria-label') || 
                                 element.getAttribute('aria-labelledby') || 
                                 element.textContent?.trim();
        
        if (!hasAccessibleName) {
          issues.push(`Element ${index + 1} lacks accessible name`);
        }
        
        // Check for proper role
        const role = element.getAttribute('role') || element.tagName.toLowerCase();
        const interactiveRoles = ['button', 'link', 'tab', 'menuitem', 'option', 'checkbox', 'radio'];
        const interactiveTags = ['button', 'a', 'input', 'select', 'textarea'];
        
        if (!interactiveRoles.includes(role) && !interactiveTags.includes(element.tagName.toLowerCase())) {
          issues.push(`Element ${index + 1} may not be properly identified as interactive`);
        }
      });

      if (issues.length === 0) {
        return {
          message: () => `Expected element to have keyboard navigation issues`,
          pass: true,
        };
      }

      return {
        message: () => `Expected element to support keyboard navigation, but found issues:\n${issues.join('\n')}`,
        pass: false,
      };
    },

    // Screen reader compatibility matcher
    toBeScreenReaderFriendly: function(received) {
      const issues = [];
      
      // Check for proper heading structure
      const headings = received.querySelectorAll('h1, h2, h3, h4, h5, h6, [role="heading"]');
      let previousLevel = 0;
      
      headings.forEach((heading, index) => {
        const level = parseInt(heading.tagName.charAt(1)) || parseInt(heading.getAttribute('aria-level')) || 1;
        
        if (index === 0 && level !== 1) {
          issues.push('First heading should be h1');
        }
        
        if (level > previousLevel + 1) {
          issues.push(`Heading level jumps from ${previousLevel} to ${level}`);
        }
        
        previousLevel = level;
      });
      
      // Check for proper landmark usage
      const landmarks = received.querySelectorAll('[role="main"], [role="navigation"], [role="banner"], [role="contentinfo"], [role="complementary"], main, nav, header, footer, aside');
      
      if (landmarks.length === 0 && received.children.length > 0) {
        issues.push('No landmark elements found');
      }
      
      // Check for proper list structure
      const lists = received.querySelectorAll('ul, ol, [role="list"]');
      lists.forEach((list, index) => {
        const listItems = list.querySelectorAll('li, [role="listitem"]');
        if (listItems.length === 0) {
          issues.push(`List ${index + 1} has no list items`);
        }
      });
      
      // Check for proper form labeling
      const formControls = received.querySelectorAll('input, select, textarea');
      formControls.forEach((control, index) => {
        const hasLabel = control.getAttribute('aria-label') || 
                        control.getAttribute('aria-labelledby') || 
                        received.querySelector(`label[for="${control.id}"]`) ||
                        control.closest('label');
        
        if (!hasLabel) {
          issues.push(`Form control ${index + 1} lacks proper labeling`);
        }
      });

      if (issues.length === 0) {
        return {
          message: () => `Expected element to have screen reader issues`,
          pass: true,
        };
      }

      return {
        message: () => `Expected element to be screen reader friendly, but found issues:\n${issues.join('\n')}`,
        pass: false,
      };
    },

    // Color contrast matcher
    toHaveProperColorContrast: async function(received) {
      const { axe } = await import('jest-axe');
      
      const results = await axe(received, {
        rules: {
          'color-contrast': { enabled: true },
          'color-contrast-enhanced': { enabled: true },
        },
      });
      
      const contrastViolations = results.violations.filter(v => 
        v.id === 'color-contrast' || v.id === 'color-contrast-enhanced'
      );
      
      if (contrastViolations.length === 0) {
        return {
          message: () => `Expected element to have color contrast issues`,
          pass: true,
        };
      }
      
      const violationMessages = contrastViolations.map(violation => 
        `${violation.description}: ${violation.nodes.map(n => n.target.join(', ')).join(', ')}`
      ).join('\n');
      
      return {
        message: () => `Expected element to have proper color contrast, but found issues:\n${violationMessages}`,
        pass: false,
      };
    },
  },

  // Testing utilities
  testingUtilities: {
    // Simulate screen reader announcements
    simulateScreenReader: (element) => {
      const announcements = [];
      
      // Get all aria-live regions
      const liveRegions = element.querySelectorAll('[aria-live]');
      liveRegions.forEach(region => {
        const politeness = region.getAttribute('aria-live');
        const content = region.textContent?.trim();
        if (content) {
          announcements.push({ type: politeness, content });
        }
      });
      
      return announcements;
    },
    
    // Simulate keyboard navigation
    simulateKeyboardNavigation: (element) => {
      const focusableElements = element.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      const navigationPath = [];
      focusableElements.forEach((el, index) => {
        navigationPath.push({
          index,
          element: el.tagName.toLowerCase(),
          accessibleName: el.getAttribute('aria-label') || el.textContent?.trim(),
          tabIndex: el.getAttribute('tabindex') || '0',
        });
      });
      
      return navigationPath;
    },
    
    // Check focus management
    checkFocusManagement: (element) => {
      const issues = [];
      
      // Check for focus traps in modals
      const modals = element.querySelectorAll('[role="dialog"], [role="alertdialog"]');
      modals.forEach((modal, index) => {
        const focusableInModal = modal.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        if (focusableInModal.length === 0) {
          issues.push(`Modal ${index + 1} has no focusable elements`);
        }
      });
      
      // Check for skip links
      const skipLinks = element.querySelectorAll('a[href^="#"], [role="link"][href^="#"]');
      const hasSkipToMain = Array.from(skipLinks).some(link => 
        link.textContent?.toLowerCase().includes('skip') && 
        link.textContent?.toLowerCase().includes('main')
      );
      
      if (skipLinks.length > 0 && !hasSkipToMain) {
        issues.push('Skip links found but no "skip to main content" link');
      }
      
      return issues;
    },
  },

  // Reporting configuration
  reporting: {
    // Generate detailed accessibility reports
    generateReport: true,
    
    // Report format
    format: 'html',
    
    // Output directory
    outputDir: './accessibility-reports',
    
    // Include screenshots of violations
    includeScreenshots: true,
    
    // Group violations by severity
    groupBySeverity: true,
    
    // Include remediation suggestions
    includeRemediation: true,
  },

  // Integration with CI/CD
  ciIntegration: {
    // Fail build on accessibility violations
    failOnViolations: true,
    
    // Severity threshold for failing build
    failureThreshold: 'serious', // 'minor', 'moderate', 'serious', 'critical'
    
    // Maximum allowed violations
    maxViolations: {
      critical: 0,
      serious: 0,
      moderate: 5,
      minor: 10,
    },
    
    // Generate JUnit XML for CI reporting
    junitOutput: true,
    junitOutputFile: './accessibility-reports/junit.xml',
  },
};