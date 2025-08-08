/**
 * Analytics Filters Component
 * Provides filtering options for analytics data
 */

import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { AnalyticsFilters as IAnalyticsFilters, TimeRange } from '../../types/analytics';
import {
  CalendarIcon,
  UserIcon,
  UserGroupIcon,
  TagIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';

interface AnalyticsFiltersProps {
  filters: IAnalyticsFilters;
  onChange: (filters: IAnalyticsFilters) => void;
  onApply: () => void;
  className?: string;
}

export const AnalyticsFilters: React.FC<AnalyticsFiltersProps> = ({
  filters,
  onChange,
  onApply,
  className = '',
}) => {
  const [localFilters, setLocalFilters] = useState<IAnalyticsFilters>(filters);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const timeRangeOptions: Array<{ value: TimeRange; label: string }> = [
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'last7days', label: 'Last 7 Days' },
    { value: 'last30days', label: 'Last 30 Days' },
    { value: 'last90days', label: 'Last 90 Days' },
    { value: 'thisWeek', label: 'This Week' },
    { value: 'lastWeek', label: 'Last Week' },
    { value: 'thisMonth', label: 'This Month' },
    { value: 'lastMonth', label: 'Last Month' },
    { value: 'thisQuarter', label: 'This Quarter' },
    { value: 'lastQuarter', label: 'Last Quarter' },
    { value: 'thisYear', label: 'This Year' },
    { value: 'lastYear', label: 'Last Year' },
    { value: 'custom', label: 'Custom Range' },
  ];

  const taskStatuses = [
    { value: 'todo', label: 'To Do' },
    { value: 'in-progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
  ];

  const taskPriorities = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' },
  ];

  const groupByOptions = [
    { value: 'day', label: 'Day' },
    { value: 'week', label: 'Week' },
    { value: 'month', label: 'Month' },
    { value: 'quarter', label: 'Quarter' },
    { value: 'year', label: 'Year' },
    { value: 'user', label: 'User' },
    { value: 'team', label: 'Team' },
    { value: 'project', label: 'Project' },
  ];

  const aggregationOptions = [
    { value: 'sum', label: 'Sum' },
    { value: 'avg', label: 'Average' },
    { value: 'min', label: 'Minimum' },
    { value: 'max', label: 'Maximum' },
    { value: 'count', label: 'Count' },
  ];

  const handleFilterChange = (key: keyof IAnalyticsFilters, value: any) => {
    setLocalFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleArrayFilterChange = (key: keyof IAnalyticsFilters, value: string, checked: boolean) => {
    setLocalFilters(prev => {
      const currentArray = (prev[key] as string[]) || [];
      const newArray = checked
        ? [...currentArray, value]
        : currentArray.filter(item => item !== value);
      
      return { ...prev, [key]: newArray.length > 0 ? newArray : undefined };
    });
  };

  const handleApply = () => {
    onChange(localFilters);
    onApply();
  };

  const handleReset = () => {
    const resetFilters: IAnalyticsFilters = {
      timeRange: 'last30days',
    };
    setLocalFilters(resetFilters);
    onChange(resetFilters);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Time Range */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <CalendarIcon className="h-5 w-5 text-gray-500" />
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Time Range
          </label>
        </div>
        <select
          value={localFilters.timeRange || 'last30days'}
          onChange={(e) => handleFilterChange('timeRange', e.target.value as TimeRange)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {timeRangeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Custom Date Range */}
      {localFilters.timeRange === 'custom' && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Start Date
            </label>
            <Input
              type="date"
              value={localFilters.startDate || ''}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              End Date
            </label>
            <Input
              type="date"
              value={localFilters.endDate || ''}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Task Statuses */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <FunnelIcon className="h-5 w-5 text-gray-500" />
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Task Status
          </label>
        </div>
        <div className="space-y-2">
          {taskStatuses.map((status) => (
            <label key={status.value} className="flex items-center">
              <input
                type="checkbox"
                checked={(localFilters.taskStatuses || []).includes(status.value)}
                onChange={(e) => handleArrayFilterChange('taskStatuses', status.value, e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                {status.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Task Priorities */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <TagIcon className="h-5 w-5 text-gray-500" />
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Priority
          </label>
        </div>
        <div className="space-y-2">
          {taskPriorities.map((priority) => (
            <label key={priority.value} className="flex items-center">
              <input
                type="checkbox"
                checked={(localFilters.taskPriorities || []).includes(priority.value)}
                onChange={(e) => handleArrayFilterChange('taskPriorities', priority.value, e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                {priority.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* User IDs */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <UserIcon className="h-5 w-5 text-gray-500" />
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Users
          </label>
        </div>
        <Input
          placeholder="Enter user IDs (comma-separated)"
          value={(localFilters.userIds || []).join(', ')}
          onChange={(e) => {
            const userIds = e.target.value
              .split(',')
              .map(id => id.trim())
              .filter(id => id.length > 0);
            handleFilterChange('userIds', userIds.length > 0 ? userIds : undefined);
          }}
        />
      </div>

      {/* Team IDs */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <UserGroupIcon className="h-5 w-5 text-gray-500" />
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Teams
          </label>
        </div>
        <Input
          placeholder="Enter team IDs (comma-separated)"
          value={(localFilters.teamIds || []).join(', ')}
          onChange={(e) => {
            const teamIds = e.target.value
              .split(',')
              .map(id => id.trim())
              .filter(id => id.length > 0);
            handleFilterChange('teamIds', teamIds.length > 0 ? teamIds : undefined);
          }}
        />
      </div>

      {/* Tags */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <TagIcon className="h-5 w-5 text-gray-500" />
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Tags
          </label>
        </div>
        <Input
          placeholder="Enter tags (comma-separated)"
          value={(localFilters.tags || []).join(', ')}
          onChange={(e) => {
            const tags = e.target.value
              .split(',')
              .map(tag => tag.trim())
              .filter(tag => tag.length > 0);
            handleFilterChange('tags', tags.length > 0 ? tags : undefined);
          }}
        />
      </div>

      {/* Group By */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Group By
        </label>
        <select
          value={localFilters.groupBy || 'day'}
          onChange={(e) => handleFilterChange('groupBy', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {groupByOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Aggregation */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Aggregation
        </label>
        <select
          value={localFilters.aggregation || 'sum'}
          onChange={(e) => handleFilterChange('aggregation', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {aggregationOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Actions */}
      <div className="flex justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
        <Button variant="ghost" onClick={handleReset}>
          Reset
        </Button>
        <Button onClick={handleApply}>
          Apply Filters
        </Button>
      </div>
    </div>
  );
};