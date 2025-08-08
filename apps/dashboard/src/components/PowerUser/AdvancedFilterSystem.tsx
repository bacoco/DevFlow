import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface FilterCondition {
  id: string;
  field: string;
  operator: FilterOperator;
  value: any;
  type: FilterType;
}

export interface FilterGroup {
  id: string;
  conditions: FilterCondition[];
  operator: 'AND' | 'OR';
  groups?: FilterGroup[];
}

export interface SavedFilterSet {
  id: string;
  name: string;
  description?: string;
  filter: FilterGroup;
  createdAt: Date;
  updatedAt: Date;
  isPublic?: boolean;
  tags?: string[];
}

export type FilterOperator = 
  | 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'starts_with' | 'ends_with'
  | 'greater_than' | 'less_than' | 'greater_equal' | 'less_equal' | 'between'
  | 'in' | 'not_in' | 'is_null' | 'is_not_null' | 'regex';

export type FilterType = 'string' | 'number' | 'date' | 'boolean' | 'array' | 'object';

export interface FilterField {
  key: string;
  label: string;
  type: FilterType;
  options?: { value: any; label: string }[];
  placeholder?: string;
  validation?: (value: any) => boolean;
}

interface AdvancedFilterSystemProps {
  fields: FilterField[];
  onFilterChange: (filter: FilterGroup) => void;
  savedFilters?: SavedFilterSet[];
  onSaveFilter?: (filter: SavedFilterSet) => void;
  onDeleteFilter?: (filterId: string) => void;
  className?: string;
}

export const AdvancedFilterSystem: React.FC<AdvancedFilterSystemProps> = ({
  fields,
  onFilterChange,
  savedFilters = [],
  onSaveFilter,
  onDeleteFilter,
  className = ''
}) => {
  const [currentFilter, setCurrentFilter] = useState<FilterGroup>({
    id: 'root',
    conditions: [],
    operator: 'AND'
  });
  
  const [showQueryBuilder, setShowQueryBuilder] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [queryText, setQueryText] = useState('');
  const [filterName, setFilterName] = useState('');
  const [filterDescription, setFilterDescription] = useState('');
  const [searchSavedFilters, setSearchSavedFilters] = useState('');
  
  const queryBuilderRef = useRef<HTMLDivElement>(null);

  // Operators for different field types
  const getOperatorsForType = useCallback((type: FilterType): { value: FilterOperator; label: string }[] => {
    const baseOperators = [
      { value: 'equals' as FilterOperator, label: 'Equals' },
      { value: 'not_equals' as FilterOperator, label: 'Not Equals' }
    ];

    switch (type) {
      case 'string':
        return [
          ...baseOperators,
          { value: 'contains', label: 'Contains' },
          { value: 'not_contains', label: 'Does Not Contain' },
          { value: 'starts_with', label: 'Starts With' },
          { value: 'ends_with', label: 'Ends With' },
          { value: 'regex', label: 'Regex Match' },
          { value: 'is_null', label: 'Is Empty' },
          { value: 'is_not_null', label: 'Is Not Empty' }
        ];
      case 'number':
      case 'date':
        return [
          ...baseOperators,
          { value: 'greater_than', label: 'Greater Than' },
          { value: 'less_than', label: 'Less Than' },
          { value: 'greater_equal', label: 'Greater or Equal' },
          { value: 'less_equal', label: 'Less or Equal' },
          { value: 'between', label: 'Between' },
          { value: 'is_null', label: 'Is Null' },
          { value: 'is_not_null', label: 'Is Not Null' }
        ];
      case 'array':
        return [
          { value: 'in', label: 'In' },
          { value: 'not_in', label: 'Not In' },
          { value: 'contains', label: 'Contains' },
          { value: 'not_contains', label: 'Does Not Contain' }
        ];
      case 'boolean':
        return baseOperators;
      default:
        return baseOperators;
    }
  }, []);

  // Add new condition
  const addCondition = useCallback((groupId: string = 'root') => {
    const newCondition: FilterCondition = {
      id: `condition_${Date.now()}`,
      field: fields[0]?.key || '',
      operator: 'equals',
      value: '',
      type: fields[0]?.type || 'string'
    };

    setCurrentFilter(prev => {
      const updateGroup = (group: FilterGroup): FilterGroup => {
        if (group.id === groupId) {
          return {
            ...group,
            conditions: [...group.conditions, newCondition]
          };
        }
        return {
          ...group,
          groups: group.groups?.map(updateGroup)
        };
      };
      return updateGroup(prev);
    });
  }, [fields]);

  // Remove condition
  const removeCondition = useCallback((conditionId: string) => {
    setCurrentFilter(prev => {
      const updateGroup = (group: FilterGroup): FilterGroup => {
        return {
          ...group,
          conditions: group.conditions.filter(c => c.id !== conditionId),
          groups: group.groups?.map(updateGroup)
        };
      };
      return updateGroup(prev);
    });
  }, []);

  // Update condition
  const updateCondition = useCallback((conditionId: string, updates: Partial<FilterCondition>) => {
    setCurrentFilter(prev => {
      const updateGroup = (group: FilterGroup): FilterGroup => {
        return {
          ...group,
          conditions: group.conditions.map(c => 
            c.id === conditionId ? { ...c, ...updates } : c
          ),
          groups: group.groups?.map(updateGroup)
        };
      };
      return updateGroup(prev);
    });
  }, []);

  // Add new group
  const addGroup = useCallback((parentGroupId: string = 'root') => {
    const newGroup: FilterGroup = {
      id: `group_${Date.now()}`,
      conditions: [],
      operator: 'AND'
    };

    setCurrentFilter(prev => {
      const updateGroup = (group: FilterGroup): FilterGroup => {
        if (group.id === parentGroupId) {
          return {
            ...group,
            groups: [...(group.groups || []), newGroup]
          };
        }
        return {
          ...group,
          groups: group.groups?.map(updateGroup)
        };
      };
      return updateGroup(prev);
    });
  }, []);

  // Convert filter to query text
  const filterToQuery = useCallback((filter: FilterGroup): string => {
    const conditionToQuery = (condition: FilterCondition): string => {
      const field = fields.find(f => f.key === condition.field);
      const fieldLabel = field?.label || condition.field;
      
      switch (condition.operator) {
        case 'equals':
          return `${fieldLabel} = "${condition.value}"`;
        case 'not_equals':
          return `${fieldLabel} != "${condition.value}"`;
        case 'contains':
          return `${fieldLabel} contains "${condition.value}"`;
        case 'not_contains':
          return `${fieldLabel} not contains "${condition.value}"`;
        case 'starts_with':
          return `${fieldLabel} starts with "${condition.value}"`;
        case 'ends_with':
          return `${fieldLabel} ends with "${condition.value}"`;
        case 'greater_than':
          return `${fieldLabel} > ${condition.value}`;
        case 'less_than':
          return `${fieldLabel} < ${condition.value}`;
        case 'between':
          return `${fieldLabel} between ${condition.value[0]} and ${condition.value[1]}`;
        case 'in':
          return `${fieldLabel} in [${condition.value.join(', ')}]`;
        case 'is_null':
          return `${fieldLabel} is null`;
        case 'is_not_null':
          return `${fieldLabel} is not null`;
        default:
          return `${fieldLabel} ${condition.operator} "${condition.value}"`;
      }
    };

    const groupToQuery = (group: FilterGroup): string => {
      const conditionQueries = group.conditions.map(conditionToQuery);
      const groupQueries = group.groups?.map(g => `(${groupToQuery(g)})`) || [];
      const allQueries = [...conditionQueries, ...groupQueries];
      
      if (allQueries.length === 0) return '';
      if (allQueries.length === 1) return allQueries[0];
      
      return allQueries.join(` ${group.operator} `);
    };

    return groupToQuery(filter);
  }, [fields]);

  // Parse query text to filter (simplified implementation)
  const queryToFilter = useCallback((query: string): FilterGroup => {
    // This is a simplified parser - in a real implementation, you'd want a proper parser
    // For now, just return the current filter
    return currentFilter;
  }, [currentFilter]);

  // Apply current filter
  useEffect(() => {
    onFilterChange(currentFilter);
  }, [currentFilter, onFilterChange]);

  // Update query text when filter changes
  useEffect(() => {
    setQueryText(filterToQuery(currentFilter));
  }, [currentFilter, filterToQuery]);

  // Save filter
  const saveFilter = useCallback(() => {
    if (!filterName.trim()) return;

    const savedFilter: SavedFilterSet = {
      id: `filter_${Date.now()}`,
      name: filterName.trim(),
      description: filterDescription.trim() || undefined,
      filter: currentFilter,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    onSaveFilter?.(savedFilter);
    setShowSaveDialog(false);
    setFilterName('');
    setFilterDescription('');
  }, [filterName, filterDescription, currentFilter, onSaveFilter]);

  // Load saved filter
  const loadFilter = useCallback((savedFilter: SavedFilterSet) => {
    setCurrentFilter(savedFilter.filter);
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setCurrentFilter({
      id: 'root',
      conditions: [],
      operator: 'AND'
    });
  }, []);

  // Render condition
  const renderCondition = useCallback((condition: FilterCondition, groupId: string) => {
    const field = fields.find(f => f.key === condition.field);
    const operators = getOperatorsForType(condition.type);

    return (
      <motion.div
        key={condition.id}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
      >
        <select
          value={condition.field}
          onChange={(e) => {
            const newField = fields.find(f => f.key === e.target.value);
            updateCondition(condition.id, {
              field: e.target.value,
              type: newField?.type || 'string',
              operator: 'equals',
              value: ''
            });
          }}
          className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
        >
          {fields.map(field => (
            <option key={field.key} value={field.key}>
              {field.label}
            </option>
          ))}
        </select>

        <select
          value={condition.operator}
          onChange={(e) => updateCondition(condition.id, { operator: e.target.value as FilterOperator })}
          className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
        >
          {operators.map(op => (
            <option key={op.value} value={op.value}>
              {op.label}
            </option>
          ))}
        </select>

        {!['is_null', 'is_not_null'].includes(condition.operator) && (
          <input
            type={condition.type === 'number' ? 'number' : condition.type === 'date' ? 'date' : 'text'}
            value={condition.value}
            onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
            placeholder={field?.placeholder}
            className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 flex-1"
          />
        )}

        <button
          onClick={() => removeCondition(condition.id)}
          className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
        >
          ✕
        </button>
      </motion.div>
    );
  }, [fields, getOperatorsForType, updateCondition, removeCondition]);

  // Render group
  const renderGroup = useCallback((group: FilterGroup, depth: number = 0) => {
    return (
      <div key={group.id} className={`border-l-2 border-gray-300 dark:border-gray-600 pl-4 ${depth > 0 ? 'ml-4' : ''}`}>
        <div className="flex items-center gap-2 mb-3">
          <select
            value={group.operator}
            onChange={(e) => {
              setCurrentFilter(prev => {
                const updateGroup = (g: FilterGroup): FilterGroup => {
                  if (g.id === group.id) {
                    return { ...g, operator: e.target.value as 'AND' | 'OR' };
                  }
                  return {
                    ...g,
                    groups: g.groups?.map(updateGroup)
                  };
                };
                return updateGroup(prev);
              });
            }}
            className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
          >
            <option value="AND">AND</option>
            <option value="OR">OR</option>
          </select>
          
          <button
            onClick={() => addCondition(group.id)}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Add Condition
          </button>
          
          <button
            onClick={() => addGroup(group.id)}
            className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
          >
            Add Group
          </button>
        </div>

        <div className="space-y-2">
          <AnimatePresence>
            {group.conditions.map(condition => renderCondition(condition, group.id))}
          </AnimatePresence>
          
          {group.groups?.map(subGroup => renderGroup(subGroup, depth + 1))}
        </div>
      </div>
    );
  }, [addCondition, addGroup, renderCondition]);

  const filteredSavedFilters = savedFilters.filter(filter =>
    filter.name.toLowerCase().includes(searchSavedFilters.toLowerCase()) ||
    filter.description?.toLowerCase().includes(searchSavedFilters.toLowerCase())
  );

  return (
    <div className={`advanced-filter-system ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setShowQueryBuilder(!showQueryBuilder)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          {showQueryBuilder ? 'Hide' : 'Show'} Query Builder
        </button>
        
        <button
          onClick={() => setShowSaveDialog(true)}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Save Filter
        </button>
        
        <button
          onClick={clearFilters}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          Clear All
        </button>
      </div>

      {/* Query text display */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Current Query:</label>
        <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg font-mono text-sm">
          {queryText || 'No filters applied'}
        </div>
      </div>

      {/* Saved filters */}
      {savedFilters.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-3">Saved Filters</h3>
          <input
            type="text"
            placeholder="Search saved filters..."
            value={searchSavedFilters}
            onChange={(e) => setSearchSavedFilters(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded mb-3 bg-white dark:bg-gray-800"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredSavedFilters.map(filter => (
              <div
                key={filter.id}
                className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                onClick={() => loadFilter(filter)}
              >
                <div className="font-medium">{filter.name}</div>
                {filter.description && (
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {filter.description}
                  </div>
                )}
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-500">
                    {filter.createdAt.toLocaleDateString()}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteFilter?.(filter.id);
                    }}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Query builder */}
      <AnimatePresence>
        {showQueryBuilder && (
          <motion.div
            ref={queryBuilderRef}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border border-gray-300 dark:border-gray-600 rounded-lg p-4"
          >
            <h3 className="text-lg font-medium mb-4">Query Builder</h3>
            {renderGroup(currentFilter)}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Save dialog */}
      <AnimatePresence>
        {showSaveDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowSaveDialog(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold mb-4">Save Filter</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Name *</label>
                  <input
                    type="text"
                    value={filterName}
                    onChange={(e) => setFilterName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                    placeholder="Enter filter name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={filterDescription}
                    onChange={(e) => setFilterDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                    placeholder="Optional description"
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  onClick={saveFilter}
                  disabled={!filterName.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  onClick={() => setShowSaveDialog(false)}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};