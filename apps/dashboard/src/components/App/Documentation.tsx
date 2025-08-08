/**
 * Documentation Component
 * Comprehensive documentation for component usage and customization
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Book, 
  Code, 
  Palette, 
  Settings, 
  Zap, 
  Shield, 
  Smartphone,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';
import { cn } from '../../utils/cn';

interface DocumentationSection {
  id: string;
  title: string;
  icon: React.ComponentType<any>;
  content: React.ReactNode;
  subsections?: DocumentationSection[];
}

const documentationSections: DocumentationSection[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: Book,
    content: (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Quick Start Guide
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            The DevFlow Intelligence Dashboard is built with modern React patterns and provides
            a comprehensive UI system for developer productivity tracking.
          </p>
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Key Features:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <li>Real-time data synchronization with WebSocket integration</li>
              <li>Responsive design with dark/light theme support</li>
              <li>Comprehensive accessibility features (WCAG 2.1 AA compliant)</li>
              <li>Advanced task management with drag-and-drop functionality</li>
              <li>Interactive data visualization with multiple chart types</li>
              <li>Customizable dashboard layouts with widget management</li>
            </ul>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'components',
    title: 'Components',
    icon: Code,
    content: (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Component Library
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Our component library follows atomic design principles with a comprehensive
            set of reusable components.
          </p>
        </div>
      </div>
    ),
    subsections: [
      {
        id: 'atoms',
        title: 'Atoms',
        icon: Code,
        content: (
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 dark:text-gray-100">Base Components</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <h5 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Button</h5>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Versatile button component with multiple variants and states.
                </p>
                <code className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                  {'<Button variant="primary" size="md">Click me</Button>'}
                </code>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <h5 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Input</h5>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Input component with validation states and floating labels.
                </p>
                <code className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                  {'<Input label="Email" type="email" />'}
                </code>
              </div>
            </div>
          </div>
        ),
      },
      {
        id: 'molecules',
        title: 'Molecules',
        icon: Code,
        content: (
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 dark:text-gray-100">Composite Components</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <h5 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Card</h5>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Flexible card component with glass morphism effects.
                </p>
                <code className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                  {'<Card variant="glass">Content</Card>'}
                </code>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <h5 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Modal</h5>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Modal component with backdrop blur and animations.
                </p>
                <code className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                  {'<Modal isOpen={true}>Modal content</Modal>'}
                </code>
              </div>
            </div>
          </div>
        ),
      },
    ],
  },
  {
    id: 'theming',
    title: 'Theming',
    icon: Palette,
    content: (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Design System
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Our design system provides consistent theming across all components with
            support for light, dark, and auto themes.
          </p>
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Design Tokens:</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-600 rounded-lg mx-auto mb-2"></div>
                <span className="text-xs text-gray-600 dark:text-gray-400">Primary</span>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-gray-600 rounded-lg mx-auto mb-2"></div>
                <span className="text-xs text-gray-600 dark:text-gray-400">Secondary</span>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-green-600 rounded-lg mx-auto mb-2"></div>
                <span className="text-xs text-gray-600 dark:text-gray-400">Success</span>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-red-600 rounded-lg mx-auto mb-2"></div>
                <span className="text-xs text-gray-600 dark:text-gray-400">Error</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'state-management',
    title: 'State Management',
    icon: Settings,
    content: (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
            State Architecture
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            The application uses Zustand for global state management with separate stores
            for UI, data, and user state.
          </p>
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">UI Store</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Manages theme, sidebar state, modals, notifications, and loading states.
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Data Store</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Handles dashboard data, tasks, analytics, and real-time synchronization.
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">User Store</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Manages authentication, preferences, permissions, and session data.
              </p>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'performance',
    title: 'Performance',
    icon: Zap,
    content: (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Performance Optimizations
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            The application implements various performance optimizations for optimal user experience.
          </p>
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Code Splitting</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Pages are lazy-loaded to reduce initial bundle size and improve loading times.
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Virtual Scrolling</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Large datasets use virtual scrolling to maintain smooth performance.
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Memoization</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Components use React.memo and useMemo for optimal re-rendering.
              </p>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'accessibility',
    title: 'Accessibility',
    icon: Shield,
    content: (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Accessibility Features
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            The application is built with accessibility in mind, following WCAG 2.1 AA guidelines.
          </p>
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Keyboard Navigation</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Full keyboard navigation support with proper focus management and tab order.
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Screen Reader Support</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                ARIA labels, descriptions, and live regions for comprehensive screen reader support.
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">High Contrast Mode</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Support for high contrast themes and scalable text for visual accessibility.
              </p>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'responsive',
    title: 'Responsive Design',
    icon: Smartphone,
    content: (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Mobile-First Approach
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            The application uses a mobile-first responsive design approach with flexible layouts.
          </p>
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Breakpoints</h4>
              <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <div>Mobile: 0-640px</div>
                <div>Tablet: 641-1024px</div>
                <div>Desktop: 1025px+</div>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Flexible Layouts</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                CSS Grid and Flexbox for responsive layouts that adapt to different screen sizes.
              </p>
            </div>
          </div>
        </div>
      </div>
    ),
  },
];

interface DocumentationProps {
  className?: string;
}

export const Documentation: React.FC<DocumentationProps> = ({ className }) => {
  const [activeSection, setActiveSection] = useState('getting-started');
  const [expandedSections, setExpandedSections] = useState<string[]>(['components']);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const renderSection = (section: DocumentationSection, level = 0) => {
    const isActive = activeSection === section.id;
    const isExpanded = expandedSections.includes(section.id);
    const hasSubsections = section.subsections && section.subsections.length > 0;

    return (
      <div key={section.id} className={cn('border-l-2 border-gray-200 dark:border-gray-700', level > 0 && 'ml-4')}>
        <button
          onClick={() => {
            setActiveSection(section.id);
            if (hasSubsections) {
              toggleSection(section.id);
            }
          }}
          className={cn(
            'flex items-center w-full p-3 text-left transition-colors',
            'hover:bg-gray-50 dark:hover:bg-gray-800',
            isActive && 'bg-blue-50 dark:bg-blue-900/20 border-l-blue-600'
          )}
        >
          <section.icon className="w-4 h-4 mr-3 text-gray-600 dark:text-gray-400" />
          <span className="font-medium text-gray-900 dark:text-gray-100 flex-1">
            {section.title}
          </span>
          {hasSubsections && (
            <div className="ml-2">
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-400" />
              )}
            </div>
          )}
        </button>

        {hasSubsections && isExpanded && (
          <div className="ml-4">
            {section.subsections!.map(subsection => renderSection(subsection, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const activeContent = documentationSections
    .flatMap(section => [section, ...(section.subsections || [])])
    .find(section => section.id === activeSection);

  return (
    <div className={cn('flex h-full bg-white dark:bg-gray-900', className)}>
      {/* Sidebar */}
      <div className="w-80 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">
            Documentation
          </h2>
          <nav className="space-y-1">
            {documentationSections.map(section => renderSection(section))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {activeContent && (
                <div>
                  <div className="flex items-center mb-6">
                    <activeContent.icon className="w-6 h-6 mr-3 text-blue-600" />
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                      {activeContent.title}
                    </h1>
                  </div>
                  <div className="prose prose-gray dark:prose-invert max-w-none">
                    {activeContent.content}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default Documentation;