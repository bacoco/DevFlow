import React, { useState, useCallback, useEffect } from 'react';
import { FilterCriteria } from './FilterPanel';

export interface SavedView {
  id: string;
  name: string;
  criteria: FilterCriteria;
  createdAt: Date;
  lastUsed: Date;
  isDefault?: boolean;
}

export interface SavedViewsManagerProps {
  savedViews: SavedView[];
  onSaveView: (name: string, criteria: FilterCriteria) => void;
  onLoadView: (view: SavedView) => void;
  onDeleteView: (viewId: string) => void;
  onSetDefaultView: (viewId: string) => void;
  currentCriteria: FilterCriteria;
  className?: string;
}

const SavedViewsManager: React.FC<SavedViewsManagerProps> = ({
  savedViews,
  onSaveView,
  onLoadView,
  onDeleteView,
  onSetDefaultView,
  currentCriteria,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [editingView, setEditingView] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // Common view configurations
  const commonViews: Omit<SavedView, 'id' | 'createdAt' | 'lastUsed'>[] = [
    {
      name: 'High Complexity Files',
      criteria: {
        fileTypes: ['file'],
        authors: [],
        dateRange: { start: null, end: null },
        complexityRange: { min: 15, max: 100 },
        changeFrequencyRange: { min: 0, max: 100 },
        searchQuery: '',
      },
    },
    {
      name: 'Recent Changes',
      criteria: {
        fileTypes: [],
        authors: [],
        dateRange: { 
          start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          end: new Date() 
        },
        complexityRange: { min: 0, max: 100 },
        changeFrequencyRange: { min: 0, max: 100 },
        searchQuery: '',
      },
    },
    {
      name: 'Hotspots',
      criteria: {
        fileTypes: [],
        authors: [],
        dateRange: { start: null, end: null },
        complexityRange: { min: 0, max: 100 },
        changeFrequencyRange: { min: 10, max: 100 },
        searchQuery: '',
      },
    },
    {
      name: 'Functions Only',
      criteria: {
        fileTypes: ['function'],
        authors: [],
        dateRange: { start: null, end: null },
        complexityRange: { min: 0, max: 100 },
        changeFrequencyRange: { min: 0, max: 100 },
        searchQuery: '',
      },
    },
  ];

  const handleLoadView = useCallback((view: SavedView) => {
    onLoadView(view);
    setIsExpanded(false);
  }, [onLoadView]);

  const handleSaveCurrentView = useCallback((name: string) => {
    onSaveView(name, currentCriteria);
  }, [onSaveView, currentCriteria]);

  const handleEditView = useCallback((viewId: string, currentName: string) => {
    setEditingView(viewId);
    setEditName(currentName);
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (editingView && editName.trim()) {
      // Find the view and update it
      const view = savedViews.find(v => v.id === editingView);
      if (view) {
        // Create updated view with new name
        const updatedView = { ...view, name: editName.trim() };
        onDeleteView(editingView);
        onSaveView(updatedView.name, updatedView.criteria);
      }
      setEditingView(null);
      setEditName('');
    }
  }, [editingView, editName, savedViews, onDeleteView, onSaveView]);

  const handleCancelEdit = useCallback(() => {
    setEditingView(null);
    setEditName('');
  }, []);

  const handleDeleteView = useCallback((viewId: string) => {
    onDeleteView(viewId);
    setShowDeleteConfirm(null);
  }, [onDeleteView]);

  const handleLoadCommonView = useCallback((commonView: Omit<SavedView, 'id' | 'createdAt' | 'lastUsed'>) => {
    const view: SavedView = {
      ...commonView,
      id: `common-${Date.now()}`,
      createdAt: new Date(),
      lastUsed: new Date(),
    };
    onLoadView(view);
    setIsExpanded(false);
  }, [onLoadView]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getViewSummary = (criteria: FilterCriteria) => {
    const parts: string[] = [];
    
    if (criteria.fileTypes.length > 0) {
      parts.push(`${criteria.fileTypes.length} type${criteria.fileTypes.length > 1 ? 's' : ''}`);
    }
    
    if (criteria.authors.length > 0) {
      parts.push(`${criteria.authors.length} author${criteria.authors.length > 1 ? 's' : ''}`);
    }
    
    if (criteria.dateRange.start || criteria.dateRange.end) {
      parts.push('date filtered');
    }
    
    if (criteria.complexityRange.min > 0 || criteria.complexityRange.max < 100) {
      parts.push('complexity filtered');
    }
    
    if (criteria.changeFrequencyRange.min > 0 || criteria.changeFrequencyRange.max < 100) {
      parts.push('frequency filtered');
    }
    
    if (criteria.searchQuery.trim()) {
      parts.push(`search: "${criteria.searchQuery}"`);
    }

    return parts.length > 0 ? parts.join(', ') : 'no filters';
  };

  return (
    <div className={`bg-white/95 backdrop-blur-sm rounded-lg shadow-lg ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800">Saved Views</h3>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-2 hover:bg-gray-100 rounded-md transition-colors"
          aria-label={isExpanded ? 'Collapse saved views' : 'Expand saved views'}
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

      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Common Views */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Quick Views</h4>
            <div className="grid grid-cols-2 gap-2">
              {commonViews.map((view, index) => (
                <button
                  key={index}
                  onClick={() => handleLoadCommonView(view)}
                  className="p-2 text-left text-sm bg-gray-50 hover:bg-gray-100 rounded-md transition-colors"
                >
                  <div className="font-medium text-gray-800">{view.name}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {getViewSummary(view.criteria)}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* User Saved Views */}
          {savedViews.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Your Saved Views</h4>
              <div className="space-y-2">
                {savedViews.map((view) => (
                  <div
                    key={view.id}
                    className="p-3 bg-gray-50 rounded-md border border-gray-200"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        {editingView === view.id ? (
                          <div className="flex items-center space-x-2">
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              autoFocus
                            />
                            <button
                              onClick={handleSaveEdit}
                              className="p-1 text-green-600 hover:text-green-800"
                              title="Save"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="p-1 text-gray-600 hover:text-gray-800"
                              title="Cancel"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-center space-x-2">
                              <h5 className="text-sm font-medium text-gray-800">
                                {view.name}
                              </h5>
                              {view.isDefault && (
                                <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full">
                                  Default
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {getViewSummary(view.criteria)}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              Created: {formatDate(view.createdAt)} • 
                              Last used: {formatDate(view.lastUsed)}
                            </p>
                          </div>
                        )}
                      </div>

                      {editingView !== view.id && (
                        <div className="flex items-center space-x-1 ml-2">
                          <button
                            onClick={() => handleLoadView(view)}
                            className="p-1 text-blue-600 hover:text-blue-800"
                            title="Load view"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => onSetDefaultView(view.id)}
                            className="p-1 text-gray-600 hover:text-gray-800"
                            title="Set as default"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleEditView(view.id, view.name)}
                            className="p-1 text-gray-600 hover:text-gray-800"
                            title="Edit name"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(view.id)}
                            className="p-1 text-red-600 hover:text-red-800"
                            title="Delete view"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No saved views message */}
          {savedViews.length === 0 && (
            <div className="text-center py-6 text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <p className="text-sm">No saved views yet</p>
              <p className="text-xs text-gray-400 mt-1">
                Configure filters and save your first view
              </p>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-80">
            <h3 className="text-lg font-semibold mb-4">Delete Saved View</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete this saved view? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteView(showDeleteConfirm)}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SavedViewsManager;