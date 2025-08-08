import React, { useState, useEffect } from 'react';
import { Search, Book, Video, HelpCircle, FileText, Users, Accessibility } from 'lucide-react';
import { InteractiveGuide } from './InteractiveGuide';
import { VideoTutorials } from './VideoTutorials';
import { InAppHelp } from './InAppHelp';
import { DeveloperDocs } from './DeveloperDocs';
import { AccessibilityGuide } from './AccessibilityGuide';
import { DocumentationSearch } from './DocumentationSearch';

interface DocumentationHubProps {
  initialSection?: string;
  context?: string;
}

export const DocumentationHub: React.FC<DocumentationHubProps> = ({
  initialSection = 'overview',
  context
}) => {
  const [activeSection, setActiveSection] = useState(initialSection);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  const sections = [
    {
      id: 'overview',
      title: 'Getting Started',
      icon: Book,
      description: 'Introduction to UX improvements and key features'
    },
    {
      id: 'interactive',
      title: 'Interactive Guides',
      icon: HelpCircle,
      description: 'Step-by-step walkthroughs for complex workflows'
    },
    {
      id: 'videos',
      title: 'Video Tutorials',
      icon: Video,
      description: 'Visual learning with video demonstrations'
    },
    {
      id: 'help',
      title: 'In-App Help',
      icon: FileText,
      description: 'Contextual assistance and feature discovery'
    },
    {
      id: 'developer',
      title: 'Developer Docs',
      icon: Users,
      description: 'Technical documentation for developers'
    },
    {
      id: 'accessibility',
      title: 'Accessibility Guide',
      icon: Accessibility,
      description: 'Guidelines and best practices for accessibility'
    }
  ];

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'overview':
        return <OverviewSection context={context} />;
      case 'interactive':
        return <InteractiveGuide context={context} />;
      case 'videos':
        return <VideoTutorials context={context} />;
      case 'help':
        return <InAppHelp context={context} />;
      case 'developer':
        return <DeveloperDocs />;
      case 'accessibility':
        return <AccessibilityGuide />;
      default:
        return <OverviewSection context={context} />;
    }
  };

  return (
    <div className="documentation-hub min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Book className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              <h1 className="ml-3 text-2xl font-bold text-gray-900 dark:text-white">
                UX Documentation
              </h1>
            </div>
            
            {/* Search */}
            <div className="flex-1 max-w-lg mx-8">
              <DocumentationSearch
                query={searchQuery}
                onQueryChange={setSearchQuery}
                onResults={setSearchResults}
                context={context}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar Navigation */}
          <div className="w-64 flex-shrink-0">
            <nav className="space-y-2">
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors ${
                      activeSection === section.id
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <Icon className="h-5 w-5 mr-3" />
                    <div>
                      <div className="font-medium">{section.title}</div>
                      <div className="text-sm opacity-75">{section.description}</div>
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {searchQuery && searchResults.length > 0 ? (
              <SearchResults results={searchResults} query={searchQuery} />
            ) : (
              renderSectionContent()
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const OverviewSection: React.FC<{ context?: string }> = ({ context }) => {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Welcome to UX Improvements Documentation
        </h2>
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
          Discover the enhanced user experience features designed to make your productivity 
          dashboard more intuitive, accessible, and efficient.
        </p>
      </div>

      {/* Quick Start Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <QuickStartCard
          title="New User?"
          description="Start with our interactive tour to learn the key features"
          action="Take the Tour"
          icon={HelpCircle}
          onClick={() => {/* Start product tour */}}
        />
        <QuickStartCard
          title="Accessibility Features"
          description="Learn about keyboard navigation, screen reader support, and more"
          action="View Guide"
          icon={Accessibility}
          onClick={() => {/* Navigate to accessibility */}}
        />
        <QuickStartCard
          title="Mobile Experience"
          description="Optimize your workflow for mobile and tablet devices"
          action="Learn More"
          icon={Video}
          onClick={() => {/* Navigate to mobile docs */}}
        />
      </div>

      {/* Feature Highlights */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          What's New in UX Improvements
        </h3>
        <div className="space-y-4">
          <FeatureHighlight
            title="Smart Navigation"
            description="Adaptive navigation that learns from your usage patterns"
            status="new"
          />
          <FeatureHighlight
            title="Enhanced Accessibility"
            description="Full keyboard navigation and screen reader support"
            status="improved"
          />
          <FeatureHighlight
            title="Mobile Optimization"
            description="Touch-friendly interface with gesture support"
            status="new"
          />
          <FeatureHighlight
            title="Personalization Engine"
            description="AI-powered layout recommendations based on your workflow"
            status="new"
          />
        </div>
      </div>
    </div>
  );
};

const QuickStartCard: React.FC<{
  title: string;
  description: string;
  action: string;
  icon: React.ComponentType<any>;
  onClick: () => void;
}> = ({ title, description, action, icon: Icon, onClick }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
      <Icon className="h-8 w-8 text-blue-600 dark:text-blue-400 mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {title}
      </h3>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        {description}
      </p>
      <button
        onClick={onClick}
        className="text-blue-600 dark:text-blue-400 font-medium hover:underline"
      >
        {action} →
      </button>
    </div>
  );
};

const FeatureHighlight: React.FC<{
  title: string;
  description: string;
  status: 'new' | 'improved' | 'updated';
}> = ({ title, description, status }) => {
  const statusColors = {
    new: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    improved: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    updated: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
  };

  return (
    <div className="flex items-start space-x-3">
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[status]}`}>
        {status.toUpperCase()}
      </span>
      <div>
        <h4 className="font-medium text-gray-900 dark:text-white">{title}</h4>
        <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
      </div>
    </div>
  );
};

const SearchResults: React.FC<{
  results: any[];
  query: string;
}> = ({ results, query }) => {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
        Search Results for "{query}"
      </h2>
      <div className="space-y-4">
        {results.map((result, index) => (
          <div
            key={index}
            className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
          >
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              {result.title}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-2">
              {result.excerpt}
            </p>
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
              <span>{result.section}</span>
              <span className="mx-2">•</span>
              <span>{result.type}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};