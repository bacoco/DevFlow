import React, { useState, useCallback, useMemo, useEffect } from 'react';
import FilterPanel, { FilterCriteria } from './FilterPanel';
import SearchHighlighter, { SearchResult } from './SearchHighlighter';
import SavedViewsManager, { SavedView } from './SavedViewsManager';
import { FilteringService } from './FilteringService';
import { CodeArtifact, RequirementNode } from './types';

export interface AdvancedFilteringProps {
  artifacts: CodeArtifact[];
  requirements?: RequirementNode[];
  onFilteredArtifactsChange: (artifacts: CodeArtifact[]) => void;
  onFilteredRequirementsChange?: (requirements: RequirementNode[]) => void;
  onArtifactSelect?: (artifact: CodeArtifact) => void;
  onRequirementSelect?: (requirement: RequirementNode) => void;
  className?: string;
}

const AdvancedFiltering: React.FC<AdvancedFilteringProps> = ({
  artifacts,
  requirements = [],
  onFilteredArtifactsChange,
  onFilteredRequirementsChange,
  onArtifactSelect,
  onRequirementSelect,
  className = '',
}) => {
  // State management
  const [filterCriteria, setFilterCriteria] = useState<FilterCriteria>(
    FilteringService.createDefaultCriteria()
  );
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isFilterPanelExpanded, setIsFilterPanelExpanded] = useState(false);

  // Load saved views from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('codeArchaeology_savedViews');
    if (saved) {
      try {
        const parsedViews = JSON.parse(saved).map((view: any) => ({
          ...view,
          createdAt: new Date(view.createdAt),
          lastUsed: new Date(view.lastUsed),
          criteria: {
            ...view.criteria,
            dateRange: {
              start: view.criteria.dateRange.start ? new Date(view.criteria.dateRange.start) : null,
              end: view.criteria.dateRange.end ? new Date(view.criteria.dateRange.end) : null,
            },
          },
        }));
        setSavedViews(parsedViews);
      } catch (error) {
        console.error('Failed to load saved views:', error);
      }
    }
  }, []);

  // Save views to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('codeArchaeology_savedViews', JSON.stringify(savedViews));
  }, [savedViews]);

  // Apply filters and update parent components
  const filteredArtifacts = useMemo(() => {
    return FilteringService.filterArtifacts(artifacts, filterCriteria);
  }, [artifacts, filterCriteria]);

  const filteredRequirements = useMemo(() => {
    return FilteringService.filterRequirements(requirements, filterCriteria);
  }, [requirements, filterCriteria]);

  // Update parent components when filtered data changes
  useEffect(() => {
    onFilteredArtifactsChange(filteredArtifacts);
  }, [filteredArtifacts, onFilteredArtifactsChange]);

  useEffect(() => {
    if (onFilteredRequirementsChange) {
      onFilteredRequirementsChange(filteredRequirements);
    }
  }, [filteredRequirements, onFilteredRequirementsChange]);

  // Get filter statistics
  const filterStats = useMemo(() => {
    return FilteringService.getFilterStats(
      artifacts,
      filteredArtifacts,
      requirements,
      filteredRequirements
    );
  }, [artifacts, filteredArtifacts, requirements, filteredRequirements]);

  // Handle filter criteria changes
  const handleCriteriaChange = useCallback((newCriteria: FilterCriteria) => {
    setFilterCriteria(newCriteria);
    setShowSearchResults(!!newCriteria.searchQuery.trim());
  }, []);

  // Handle saving a new view
  const handleSaveView = useCallback((name: string, criteria: FilterCriteria) => {
    const newView: SavedView = {
      id: `view_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      criteria,
      createdAt: new Date(),
      lastUsed: new Date(),
    };

    setSavedViews(prev => [...prev, newView]);
  }, []);

  // Handle loading a saved view
  const handleLoadView = useCallback((view: SavedView) => {
    setFilterCriteria(view.criteria);
    setShowSearchResults(!!view.criteria.searchQuery.trim());

    // Update last used timestamp
    setSavedViews(prev => 
      prev.map(v => 
        v.id === view.id 
          ? { ...v, lastUsed: new Date() }
          : v
      )
    );
  }, []);

  // Handle deleting a saved view
  const handleDeleteView = useCallback((viewId: string) => {
    setSavedViews(prev => prev.filter(v => v.id !== viewId));
  }, []);

  // Handle setting default view
  const handleSetDefaultView = useCallback((viewId: string) => {
    setSavedViews(prev => 
      prev.map(v => ({
        ...v,
        isDefault: v.id === viewId,
      }))
    );
  }, []);

  // Handle search result selection
  const handleSearchResultSelect = useCallback((result: SearchResult) => {
    if (result.type === 'artifact' && onArtifactSelect) {
      onArtifactSelect(result.item as CodeArtifact);
    } else if (result.type === 'requirement' && onRequirementSelect) {
      onRequirementSelect(result.item as RequirementNode);
    }
    setShowSearchResults(false);
  }, [onArtifactSelect, onRequirementSelect]);

  // Handle URL parameter synchronization
  useEffect(() => {
    const params = FilteringService.serializeCriteria(filterCriteria);
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);
  }, [filterCriteria]);

  // Load criteria from URL on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const criteriaFromUrl = FilteringService.deserializeCriteria(urlParams);
    
    if (FilteringService.hasActiveFilters(criteriaFromUrl)) {
      setFilterCriteria(criteriaFromUrl);
      setShowSearchResults(!!criteriaFromUrl.searchQuery.trim());
    }
  }, []);

  const hasActiveFilters = FilteringService.hasActiveFilters(filterCriteria);
  const filterDescription = FilteringService.getFilterDescription(filterCriteria);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Filter Status Bar */}
      <div className="bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              <span className="font-medium">
                {filterStats.artifacts.filtered} of {filterStats.artifacts.total} artifacts
              </span>
              {requirements.length > 0 && (
                <span className="ml-2">
                  • {filterStats.requirements.filtered} of {filterStats.requirements.total} requirements
                </span>
              )}
            </div>
            
            {hasActiveFilters && (
              <div className="text-xs text-gray-500 max-w-md truncate">
                {filterDescription}
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {hasActiveFilters && (
              <button
                onClick={() => setFilterCriteria(FilteringService.createDefaultCriteria())}
                className="text-xs px-2 py-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
              >
                Clear All
              </button>
            )}
            
            <button
              onClick={() => setIsFilterPanelExpanded(!isFilterPanelExpanded)}
              className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              {isFilterPanelExpanded ? 'Hide Filters' : 'Show Filters'}
            </button>
          </div>
        </div>

        {/* Filter Statistics */}
        {hasActiveFilters && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <div className="text-gray-500">By Type</div>
                <div className="mt-1 space-y-1">
                  {Object.entries(filterStats.typeBreakdown).map(([type, count]) => (
                    count > 0 && (
                      <div key={type} className="flex justify-between">
                        <span className="capitalize">{type}:</span>
                        <span className="font-medium">{count}</span>
                      </div>
                    )
                  ))}
                </div>
              </div>
              
              <div>
                <div className="text-gray-500">Complexity</div>
                <div className="mt-1">
                  <div>Avg: {filterStats.complexityStats.avg.toFixed(1)}</div>
                  <div>Range: {filterStats.complexityStats.min}-{filterStats.complexityStats.max}</div>
                </div>
              </div>
              
              <div>
                <div className="text-gray-500">Change Frequency</div>
                <div className="mt-1">
                  <div>Avg: {filterStats.changeFrequencyStats.avg.toFixed(1)}</div>
                  <div>Range: {filterStats.changeFrequencyStats.min}-{filterStats.changeFrequencyStats.max}</div>
                </div>
              </div>
              
              <div>
                <div className="text-gray-500">Top Authors</div>
                <div className="mt-1 space-y-1">
                  {filterStats.authorBreakdown.slice(0, 3).map(({ author, count }) => (
                    <div key={author} className="flex justify-between">
                      <span className="truncate max-w-20">{author}:</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filter Panel */}
      {isFilterPanelExpanded && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <FilterPanel
              artifacts={artifacts}
              criteria={filterCriteria}
              onCriteriaChange={handleCriteriaChange}
              onSaveView={handleSaveView}
              savedViews={savedViews}
              onLoadView={handleLoadView}
            />
          </div>
          
          <div>
            <SavedViewsManager
              savedViews={savedViews}
              onSaveView={handleSaveView}
              onLoadView={handleLoadView}
              onDeleteView={handleDeleteView}
              onSetDefaultView={handleSetDefaultView}
              currentCriteria={filterCriteria}
            />
          </div>
        </div>
      )}

      {/* Search Results */}
      {showSearchResults && filterCriteria.searchQuery.trim() && (
        <div className="relative">
          <SearchHighlighter
            artifacts={filteredArtifacts}
            requirements={filteredRequirements}
            searchQuery={filterCriteria.searchQuery}
            onResultSelect={handleSearchResultSelect}
            className="absolute top-0 left-0 right-0 z-30 max-w-md"
          />
        </div>
      )}

      {/* No Results Message */}
      {hasActiveFilters && filteredArtifacts.length === 0 && filteredRequirements.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <svg className="w-12 h-12 mx-auto mb-3 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h3 className="text-lg font-medium text-yellow-800 mb-2">No Results Found</h3>
          <p className="text-yellow-700 mb-4">
            No artifacts or requirements match your current filter criteria.
          </p>
          <button
            onClick={() => setFilterCriteria(FilteringService.createDefaultCriteria())}
            className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors"
          >
            Clear All Filters
          </button>
        </div>
      )}
    </div>
  );
};

export default AdvancedFiltering;