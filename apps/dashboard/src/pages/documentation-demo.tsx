import React, { useState } from 'react';
import { DocumentationHub } from '../components/Documentation/DocumentationHub';
import { Book, ExternalLink, CheckCircle, Clock, Users, Star } from 'lucide-react';

const DocumentationDemo: React.FC = () => {
  const [activeDemo, setActiveDemo] = useState<string>('hub');

  const demoSections = [
    {
      id: 'hub',
      title: 'Documentation Hub',
      description: 'Central hub for all UX documentation and training materials',
      component: <DocumentationHub />,
      features: [
        'Unified documentation interface',
        'Search across all content',
        'Contextual navigation',
        'Progress tracking'
      ]
    }
  ];

  const documentationStats = {
    totalPages: 47,
    videoTutorials: 12,
    interactiveGuides: 8,
    codeExamples: 25,
    lastUpdated: '2024-01-15',
    contributors: 6,
    userRating: 4.8,
    completionRate: 89
  };

  const recentUpdates = [
    {
      title: 'Mobile Optimization Guide',
      type: 'New Content',
      date: '2024-01-15',
      author: 'Lisa Park'
    },
    {
      title: 'Accessibility Testing Framework',
      type: 'Updated',
      date: '2024-01-12',
      author: 'Marcus Rodriguez'
    },
    {
      title: 'Chart Interactions Video',
      type: 'New Video',
      date: '2024-01-10',
      author: 'David Kim'
    },
    {
      title: 'Developer API Reference',
      type: 'Updated',
      date: '2024-01-08',
      author: 'Sarah Chen'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Book className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              <div className="ml-3">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Documentation & Training System
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Comprehensive documentation for UX improvements
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                <Star className="h-4 w-4 text-yellow-400 fill-current" />
                <span>{documentationStats.userRating}/5.0</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                <Users className="h-4 w-4" />
                <span>{documentationStats.contributors} contributors</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Book className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {documentationStats.totalPages}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Documentation Pages
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {documentationStats.completionRate}%
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Completion Rate
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <ExternalLink className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {documentationStats.videoTutorials}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Video Tutorials
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                <Clock className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {documentationStats.interactiveGuides}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Interactive Guides
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Demo Navigation */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Documentation Features
              </h3>
              <nav className="space-y-2">
                {demoSections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveDemo(section.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                      activeDemo === section.id
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div className="font-medium">{section.title}</div>
                    <div className="text-sm opacity-75">{section.description}</div>
                  </button>
                ))}
              </nav>
            </div>

            {/* Recent Updates */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Recent Updates
              </h3>
              <div className="space-y-3">
                {recentUpdates.map((update, index) => (
                  <div key={index} className="border-l-2 border-blue-200 dark:border-blue-800 pl-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm text-gray-900 dark:text-white">
                        {update.title}
                      </h4>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        update.type === 'New Content' || update.type === 'New Video'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                      }`}>
                        {update.type}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {update.date} • {update.author}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Key Features */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Key Features
              </h3>
              <div className="space-y-3">
                {demoSections.find(s => s.id === activeDemo)?.features.map((feature, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {demoSections.find(s => s.id === activeDemo)?.title}
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                      {demoSections.find(s => s.id === activeDemo)?.description}
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300 text-sm rounded-full">
                      Live Demo
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {demoSections.find(s => s.id === activeDemo)?.component}
              </div>
            </div>
          </div>
        </div>

        {/* Implementation Notes */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-4">
            Implementation Highlights
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                Accessibility Features
              </h4>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <li>• Full keyboard navigation support</li>
                <li>• Screen reader compatibility</li>
                <li>• High contrast mode support</li>
                <li>• Focus management and indicators</li>
                <li>• ARIA labels and descriptions</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                User Experience
              </h4>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <li>• Contextual help and guidance</li>
                <li>• Progressive disclosure of information</li>
                <li>• Search and filtering capabilities</li>
                <li>• Interactive tutorials and demos</li>
                <li>• Progress tracking and bookmarks</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Testing Results */}
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Documentation Quality Metrics
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">
                100%
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Accessibility Compliance
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                WCAG 2.1 AA Standard
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                95%
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Content Coverage
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                All UX features documented
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-2">
                4.8/5
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                User Satisfaction
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                Based on user feedback
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentationDemo;