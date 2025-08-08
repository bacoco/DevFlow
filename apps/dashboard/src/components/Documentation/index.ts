// Documentation System Components
export { DocumentationHub } from './DocumentationHub';
export { DocumentationSearch } from './DocumentationSearch';
export { InteractiveGuide } from './InteractiveGuide';
export { VideoTutorials } from './VideoTutorials';
export { InAppHelp } from './InAppHelp';
export { DeveloperDocs } from './DeveloperDocs';
export { AccessibilityGuide } from './AccessibilityGuide';

// Types and interfaces
export interface DocumentationSection {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
}

export interface HelpTopic {
  id: string;
  title: string;
  content: React.ReactNode;
  category: string;
  keywords: string[];
  relatedTopics?: string[];
}

export interface VideoTutorial {
  id: string;
  title: string;
  description: string;
  duration: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  thumbnail: string;
  videoUrl: string;
  transcript?: string;
  chapters?: VideoChapter[];
  instructor: string;
  rating: number;
  views: number;
}

export interface VideoChapter {
  id: string;
  title: string;
  startTime: number;
  duration: number;
}

export interface GuideStep {
  id: string;
  title: string;
  description: string;
  element?: string;
  action?: 'click' | 'hover' | 'type' | 'scroll';
  content: React.ReactNode;
  validation?: () => boolean;
  tips?: string[];
}

export interface SearchResult {
  id: string;
  title: string;
  excerpt: string;
  section: string;
  type: 'guide' | 'video' | 'reference' | 'example';
  url: string;
  relevance: number;
}

export interface CodeExample {
  id: string;
  title: string;
  description: string;
  language: string;
  code: string;
  category: string;
}

export interface AccessibilityFeature {
  id: string;
  title: string;
  description: string;
  category: string;
  wcagLevel: 'A' | 'AA' | 'AAA';
  implementation: React.ReactNode;
  testing: React.ReactNode;
}

// Documentation configuration
export const DOCUMENTATION_CONFIG = {
  // Search configuration
  search: {
    debounceMs: 300,
    maxResults: 10,
    minQueryLength: 2
  },
  
  // Video player configuration
  video: {
    defaultPlaybackSpeed: 1,
    availableSpeeds: [0.5, 0.75, 1, 1.25, 1.5, 2],
    autoplay: false,
    showCaptions: true
  },
  
  // Interactive guide configuration
  guide: {
    autoPlayInterval: 5000,
    showProgress: true,
    allowSkipping: true
  },
  
  // Accessibility configuration
  accessibility: {
    highContrastSupport: true,
    reducedMotionSupport: true,
    screenReaderSupport: true,
    keyboardNavigationSupport: true
  }
};

// Utility functions
export const documentationUtils = {
  // Format duration from seconds to MM:SS
  formatDuration: (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  },
  
  // Calculate reading time based on word count
  calculateReadingTime: (wordCount: number): string => {
    const wordsPerMinute = 200;
    const minutes = Math.ceil(wordCount / wordsPerMinute);
    return `${minutes} min read`;
  },
  
  // Generate table of contents from headings
  generateTableOfContents: (content: string): Array<{ id: string; title: string; level: number }> => {
    const headingRegex = /^(#{1,6})\s+(.+)$/gm;
    const toc = [];
    let match;
    
    while ((match = headingRegex.exec(content)) !== null) {
      const level = match[1].length;
      const title = match[2].trim();
      const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      
      toc.push({ id, title, level });
    }
    
    return toc;
  },
  
  // Highlight search terms in text
  highlightSearchTerms: (text: string, searchTerm: string): string => {
    if (!searchTerm) return text;
    
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  },
  
  // Validate accessibility compliance
  validateAccessibility: async (element: HTMLElement): Promise<{
    violations: Array<{ rule: string; description: string; severity: string }>;
    passes: number;
  }> => {
    // This would integrate with axe-core in a real implementation
    return {
      violations: [],
      passes: 0
    };
  }
};

// Documentation analytics
export const documentationAnalytics = {
  // Track page views
  trackPageView: (page: string, context?: string) => {
    // Implementation would send analytics data
    console.log('Documentation page view:', { page, context, timestamp: Date.now() });
  },
  
  // Track search queries
  trackSearch: (query: string, results: number) => {
    console.log('Documentation search:', { query, results, timestamp: Date.now() });
  },
  
  // Track video interactions
  trackVideoInteraction: (videoId: string, action: string, timestamp: number) => {
    console.log('Video interaction:', { videoId, action, timestamp });
  },
  
  // Track guide completion
  trackGuideCompletion: (guideId: string, stepId: string, completed: boolean) => {
    console.log('Guide progress:', { guideId, stepId, completed, timestamp: Date.now() });
  },
  
  // Track help topic views
  trackHelpTopicView: (topicId: string, category: string) => {
    console.log('Help topic view:', { topicId, category, timestamp: Date.now() });
  }
};