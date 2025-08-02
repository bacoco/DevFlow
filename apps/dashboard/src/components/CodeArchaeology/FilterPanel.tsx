import React, { useState, useCallback, useMemo } from 'react';
import { CodeArtifact } from './types';

export interface FilterCriteria {
  fileTypes: ('file' | 'function' | 'class' | 'interface')[];
  authors: string[];
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  complexityRange: {
    min: number;
    max: number;
  };
  changeFrequencyRange: {
    min: number;
    max: number;
  };
  searchQuery: string;
}

export interface FilterPanelProps {
  artifacts: CodeArtifact[];
  criteria: FilterCriteria;
  onCriteriaChange: (criteria: FilterCriteria) => void;
  onSaveView?: (name: string, criteria: FilterCriteria) => void;
  savedViews?: { name: string; criteria: FilterCriteria }[];
  onLoadView?: (criteria: FilterCriteria) => void;
  className?: string;
}

const FilterPanel: React.FC<FilterPanelProps> = ({
  artifacts,
  criteria,
  onCriteriaChange,
  onSaveView,
  savedViews = [],
  onLoadView,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [saveViewName, setSaveViewName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  // Extract unique values from artifacts for filter options
  const filterOptions = useMemo(() => {
    const authors = new Set<string>();
    const fileTypes = new Set<'file' | 'function' | 'class' | 'interface'>();
    let minComplexity = Infinity;
    let maxComplexity = -Infinity;
    let minChangeFreq = Infinity;
    let maxChangeFreq = -Infinity;
    let minDate = new Date();
    let maxDate = new Date(0);

    artifacts.forEach(artifact => {
      artifact.authors.forEach(author => authors.add(author));
      fileTypes.add(artifact.type);
      
      minComplexity = Math.min(minComplexity, artifact.complexity);
      maxComplexity = Math.max(maxComplexity, artifact.complexity);
      minChangeFreq = Math.min(minChangeFreq, artifact.changeFrequency);
      maxChangeFreq = Math.max(maxChangeFreq, artifact.changeFrequency);
      
      if (artifact.lastModified < minDate) minDate = artifact.lastModified;
      if (artifact.lastModified > maxDate) maxDate = artifact.lastModified;
    });

    return {
      authors: Array.from(authors).sort(),
      fileTypes: Array.from(fileTypes),
      complexityRange: { min: minComplexity, max: maxComplexity },
      changeFrequencyRange: { min: minChangeFreq, max: maxChangeFreq },
      dateRange: { min: minDate, max: maxDate },
    };
  }, [artifacts]);

  const handleFileTypeChange = useCallback((type: 'file' | 'function' | 'class' | 'interface', checked: boolean) => {
    const newFileTypes = checked
      ? [...criteria.fileTypes, type]
      : criteria.fileTypes.filter(t => t !== type);
    
    onCriteriaChange({
      ...criteria,
      fileTypes: newFileTypes,
    });
  }, [criteria, onCriteriaChange]);

  const handleAuthorChange = useCallback((author: string, checked: boolean) => {
    const newAuthors = checked
      ? [...criteria.authors, author]
      : criteria.authors.filter(a => a !== author);
    
    onCriteriaChange({
      ...criteria,
      authors: newAuthors,
    });
  }, [criteria, onCriteriaChange]);

  const handleDateRangeChange = useCallback((field: 'start' | 'end', value: string) => {
    const date = value ? new Date(value) : null;
    onCriteriaChange({
      ...criteria,
      dateRange: {
        ...criteria.dateRange,
        [field]: date,
      },
    });
  }, [criteria, onCriteriaChange]);

  const handleComplexityRangeChange = useCallback((field: 'min' | 'max', value: number) => {
    onCriteriaChange({
      ...criteria,
      complexityRange: {
        ...criteria.complexityRange,
        [field]: value,
      },
    });
  }, [criteria, onCriteriaChange]);

  const handleChangeFrequencyRangeChange = useCallback((field: 'min' | 'max', value: number) => {
    onCriteriaChange({
      ...criteria,
      changeFrequencyRange: {
        ...criteria.changeFrequencyRange,
        [field]: value,
      },
    });
  }, [criteria, onCriteriaChange]);

  const handleSearchQueryChange = useCallback((query: string) => {
    onCriteriaChange({
      ...criteria,
      searchQuery: query,
    });
  }, [criteria, onCriteriaChange]);

  const handleClearFilters = useCallback(() => {
    onCriteriaChange({
      fileTypes: [],
      authors: [],
      dateRange: { start: null, end: null },
      complexityRange: { min: 0, max: 100 },
      changeFrequencyRange: { min: 0, max: 100 },
      searchQuery: '',
    });
  }, [onCriteriaChange]);

  const handleSaveView = useCallback(() => {
    if (saveViewName.trim() && onSaveView) {
      onSaveView(saveViewName.trim(), criteria);
      setSaveViewName('');
      setShowSaveDialog(false);
    }
  }, [saveViewName, criteria, onSaveView]);

  const handleLoadView = useCallback((viewCriteria: FilterCriteria) => {
    if (onLoadView) {
      onLoadView(viewCriteria);
    }
  }, [onLoadView]);

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  return (
    <div className={`bg-white/95 backdrop-blur-sm rounded-lg shadow-lg ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800">Filters & Search</h3>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-2 hover:bg-gray-100 rounded-md transition-colors"
          aria-label={isExpanded ? 'Collapse filters' : 'Expand filters'}
        >
          <svg
            className={`w-5 h-5 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Search Bar */}
      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <input
            type="text"
            placeholder="Search artifacts and requirements..."
            value={criteria.searchQuery}
            onChange={(e) => handleSearchQueryChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <svg
            className="absolute left-3 top-2.5 w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Filter Content */}
      {isExpanded && (
        <div className="p-4 space-y-6">
          {/* File Types */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">File Types</h4>
            <div className="space-y-2">
              {filterOptions.fileTypes.map(type => (
                <label key={type} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={criteria.fileTypes.includes(type)}
                    onChange={(e) => handleFileTypeChange(type, e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-600 capitalize">{type}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Authors */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Authors</h4>
            <div className="max-h-32 overflow-y-auto space-y-2">
              {filterOptions.authors.map(author => (
                <label key={author} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={criteria.authors.includes(author)}
                    onChange={(e) => handleAuthorChange(author, e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-600">{author}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Date Range</h4>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1">From</label>
                <input
                  type="date"
                  value={criteria.dateRange.start ? formatDate(criteria.dateRange.start) : ''}
                  onChange={(e) => handleDateRangeChange('start', e.target.value)}
                  min={formatDate(filterOptions.dateRange.min)}
                  max={formatDate(filterOptions.dateRange.max)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">To</label>
                <input
                  type="date"
                  value={criteria.dateRange.end ? formatDate(criteria.dateRange.end) : ''}
                  onChange={(e) => handleDateRangeChange('end', e.target.value)}
                  min={formatDate(filterOptions.dateRange.min)}
                  max={formatDate(filterOptions.dateRange.max)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Complexity Range */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Complexity Range</h4>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Min</label>
                <input
                  type="number"
                  value={criteria.complexityRange.min}
                  onChange={(e) => handleComplexityRangeChange('min', Number(e.target.value))}
                  min={filterOptions.complexityRange.min}
                  max={filterOptions.complexityRange.max}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Max</label>
                <input
                  type="number"
                  value={criteria.complexityRange.max}
                  onChange={(e) => handleComplexityRangeChange('max', Number(e.target.value))}
                  min={filterOptions.complexityRange.min}
                  max={filterOptions.complexityRange.max}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Change Frequency Range */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Change Frequency Range</h4>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Min</label>
                <input
                  type="number"
                  value={criteria.changeFrequencyRange.min}
                  onChange={(e) => handleChangeFrequencyRangeChange('min', Number(e.target.value))}
                  min={filterOptions.changeFrequencyRange.min}
                  max={filterOptions.changeFrequencyRange.max}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Max</label>
                <input
                  type="number"
                  value={criteria.changeFrequencyRange.max}
                  onChange={(e) => handleChangeFrequencyRangeChange('max', Number(e.target.value))}
                  min={filterOptions.changeFrequencyRange.min}
                  max={filterOptions.changeFrequencyRange.max}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200">
            <button
              onClick={handleClearFilters}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
            >
              Clear All
            </button>
            <button
              onClick={() => setShowSaveDialog(true)}
              className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
            >
              Save View
            </button>
          </div>

          {/* Saved Views */}
          {savedViews.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Saved Views</h4>
              <div className="space-y-1">
                {savedViews.map((view, index) => (
                  <button
                    key={index}
                    onClick={() => handleLoadView(view.criteria)}
                    className="w-full text-left px-2 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
                  >
                    {view.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Save View Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-80">
            <h3 className="text-lg font-semibold mb-4">Save Current View</h3>
            <input
              type="text"
              placeholder="Enter view name..."
              value={saveViewName}
              onChange={(e) => setSaveViewName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
              autoFocus
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowSaveDialog(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveView}
                disabled={!saveViewName.trim()}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterPanel;