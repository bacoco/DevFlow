import React, { useMemo } from 'react';
import { CodeArtifact, RequirementNode } from './types';

export interface SearchResult {
  id: string;
  type: 'artifact' | 'requirement';
  item: CodeArtifact | RequirementNode;
  matchedFields: string[];
  relevanceScore: number;
}

export interface SearchHighlighterProps {
  artifacts: CodeArtifact[];
  requirements?: RequirementNode[];
  searchQuery: string;
  onResultSelect?: (result: SearchResult) => void;
  maxResults?: number;
  className?: string;
}

const SearchHighlighter: React.FC<SearchHighlighterProps> = ({
  artifacts,
  requirements = [],
  searchQuery,
  onResultSelect,
  maxResults = 10,
  className = '',
}) => {
  // Perform search and calculate relevance scores
  const searchResults = useMemo((): SearchResult[] => {
    if (!searchQuery.trim()) return [];

    const query = searchQuery.toLowerCase().trim();
    const results: SearchResult[] = [];

    // Search artifacts
    artifacts.forEach(artifact => {
      const matchedFields: string[] = [];
      let relevanceScore = 0;

      // Check name (highest weight)
      if (artifact.name.toLowerCase().includes(query)) {
        matchedFields.push('name');
        relevanceScore += 10;
      }

      // Check file path
      if (artifact.filePath.toLowerCase().includes(query)) {
        matchedFields.push('filePath');
        relevanceScore += 8;
      }

      // Check type
      if (artifact.type.toLowerCase().includes(query)) {
        matchedFields.push('type');
        relevanceScore += 6;
      }

      // Check authors
      if (artifact.authors.some(author => author.toLowerCase().includes(query))) {
        matchedFields.push('authors');
        relevanceScore += 5;
      }

      // Check dependencies
      if (artifact.dependencies.some(dep => dep.toLowerCase().includes(query))) {
        matchedFields.push('dependencies');
        relevanceScore += 3;
      }

      // Boost score for exact matches
      if (artifact.name.toLowerCase() === query) {
        relevanceScore += 20;
      }

      if (matchedFields.length > 0) {
        results.push({
          id: artifact.id,
          type: 'artifact',
          item: artifact,
          matchedFields,
          relevanceScore,
        });
      }
    });

    // Search requirements
    requirements.forEach(requirement => {
      const matchedFields: string[] = [];
      let relevanceScore = 0;

      // Check title (highest weight)
      if (requirement.title.toLowerCase().includes(query)) {
        matchedFields.push('title');
        relevanceScore += 10;
      }

      // Check description
      if (requirement.description.toLowerCase().includes(query)) {
        matchedFields.push('description');
        relevanceScore += 8;
      }

      // Check requirement ID
      if (requirement.requirementId.toLowerCase().includes(query)) {
        matchedFields.push('requirementId');
        relevanceScore += 6;
      }

      // Check spec file
      if (requirement.specFile.toLowerCase().includes(query)) {
        matchedFields.push('specFile');
        relevanceScore += 4;
      }

      // Boost score for exact matches
      if (requirement.title.toLowerCase() === query || requirement.requirementId.toLowerCase() === query) {
        relevanceScore += 20;
      }

      if (matchedFields.length > 0) {
        results.push({
          id: requirement.id,
          type: 'requirement',
          item: requirement,
          matchedFields,
          relevanceScore,
        });
      }
    });

    // Sort by relevance score and limit results
    return results
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, maxResults);
  }, [artifacts, requirements, searchQuery, maxResults]);

  const highlightText = (text: string, query: string): React.ReactNode => {
    if (!query.trim()) return text;

    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 px-1 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const handleResultClick = (result: SearchResult) => {
    if (onResultSelect) {
      onResultSelect(result);
    }
  };

  const getResultIcon = (type: 'artifact' | 'requirement') => {
    if (type === 'artifact') {
      return (
        <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    } else {
      return (
        <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      );
    }
  };

  const getArtifactTypeColor = (type: string) => {
    switch (type) {
      case 'file': return 'text-blue-600';
      case 'function': return 'text-green-600';
      case 'class': return 'text-orange-600';
      case 'interface': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  if (!searchQuery.trim() || searchResults.length === 0) {
    return null;
  }

  return (
    <div className={`bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 ${className}`}>
      <div className="p-3 border-b border-gray-200">
        <h4 className="text-sm font-semibold text-gray-800">
          Search Results ({searchResults.length})
        </h4>
      </div>
      
      <div className="max-h-80 overflow-y-auto">
        {searchResults.map((result) => (
          <div
            key={result.id}
            onClick={() => handleResultClick(result)}
            className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors"
          >
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-0.5">
                {getResultIcon(result.type)}
              </div>
              
              <div className="flex-1 min-w-0">
                {result.type === 'artifact' ? (
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <h5 className="text-sm font-medium text-gray-900 truncate">
                        {highlightText((result.item as CodeArtifact).name, searchQuery)}
                      </h5>
                      <span className={`text-xs px-2 py-0.5 rounded-full bg-gray-100 ${getArtifactTypeColor((result.item as CodeArtifact).type)}`}>
                        {(result.item as CodeArtifact).type}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 truncate">
                      {highlightText((result.item as CodeArtifact).filePath, searchQuery)}
                    </p>
                    {result.matchedFields.includes('authors') && (
                      <p className="text-xs text-gray-400 mt-1">
                        Authors: {(result.item as CodeArtifact).authors.map(author => 
                          highlightText(author, searchQuery)
                        ).reduce((prev, curr, index) => 
                          index === 0 ? [curr] : [...prev, ', ', curr], [] as React.ReactNode[]
                        )}
                      </p>
                    )}
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <h5 className="text-sm font-medium text-gray-900">
                        {highlightText((result.item as RequirementNode).title, searchQuery)}
                      </h5>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-600">
                        {(result.item as RequirementNode).requirementId}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-2">
                      {highlightText((result.item as RequirementNode).description, searchQuery)}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Coverage: {Math.round((result.item as RequirementNode).coverage * 100)}%
                    </p>
                  </div>
                )}
                
                {/* Matched fields indicator */}
                <div className="flex flex-wrap gap-1 mt-2">
                  {result.matchedFields.map(field => (
                    <span
                      key={field}
                      className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded"
                    >
                      {field}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="flex-shrink-0">
                <div className="text-xs text-gray-400">
                  Score: {result.relevanceScore}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {searchResults.length === maxResults && (
        <div className="p-2 text-center text-xs text-gray-500 border-t border-gray-200">
          Showing top {maxResults} results
        </div>
      )}
    </div>
  );
};

export default SearchHighlighter;