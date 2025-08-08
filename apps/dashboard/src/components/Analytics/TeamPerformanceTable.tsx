/**
 * Team Performance Table Component
 * Displays team member performance metrics in a sortable table
 */

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { TeamPerformanceMetrics, TeamMemberMetrics } from '../../types/analytics';
import {
  ChevronUpIcon,
  ChevronDownIcon,
  UserIcon,
  TrophyIcon,
  ChartBarIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

interface TeamPerformanceTableProps {
  teamPerformance: TeamPerformanceMetrics;
  loading?: boolean;
  className?: string;
}

type SortField = 'name' | 'completedTasks' | 'velocity' | 'productivityScore' | 'cycleTime';
type SortDirection = 'asc' | 'desc';

export const TeamPerformanceTable: React.FC<TeamPerformanceTableProps> = ({
  teamPerformance,
  loading = false,
  className = '',
}) => {
  const [sortField, setSortField] = useState<SortField>('productivityScore');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const sortedMembers = useMemo(() => {
    return [...teamPerformance.members].sort((a, b) => {
      let aValue: number | string;
      let bValue: number | string;

      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'completedTasks':
          aValue = a.metrics.completedTasks;
          bValue = b.metrics.completedTasks;
          break;
        case 'velocity':
          aValue = a.metrics.velocity;
          bValue = b.metrics.velocity;
          break;
        case 'productivityScore':
          aValue = a.productivityScore;
          bValue = b.productivityScore;
          break;
        case 'cycleTime':
          aValue = a.metrics.cycleTime;
          bValue = b.metrics.cycleTime;
          break;
        default:
          aValue = 0;
          bValue = 0;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      const numA = Number(aValue);
      const numB = Number(bValue);
      
      return sortDirection === 'asc' ? numA - numB : numB - numA;
    });
  }, [teamPerformance.members, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ChevronUpIcon className="h-4 w-4 text-gray-400" />;
    }
    return sortDirection === 'asc' 
      ? <ChevronUpIcon className="h-4 w-4 text-blue-600" />
      : <ChevronDownIcon className="h-4 w-4 text-blue-600" />;
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 90) return 'text-green-600 dark:text-green-400';
    if (score >= 80) return 'text-blue-600 dark:text-blue-400';
    if (score >= 70) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getPerformanceBadge = (score: number) => {
    if (score >= 90) return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
    if (score >= 80) return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
    if (score >= 70) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
    return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
  };

  if (loading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-4 w-1/3"></div>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Team Performance
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {teamPerformance.teamName} • {teamPerformance.members.length} members
          </p>
        </div>
        
        <div className="flex items-center gap-4 text-sm">
          <div className="text-gray-600 dark:text-gray-400">
            Team Avg: <span className="font-medium">{teamPerformance.aggregatedMetrics.velocity.toFixed(1)} tasks/day</span>
          </div>
          <div className="text-gray-600 dark:text-gray-400">
            Completion: <span className="font-medium">{teamPerformance.aggregatedMetrics.completionRate.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left py-3 px-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('name')}
                  className="font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                >
                  Member
                  {getSortIcon('name')}
                </Button>
              </th>
              <th className="text-center py-3 px-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('completedTasks')}
                  className="font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                >
                  Completed
                  {getSortIcon('completedTasks')}
                </Button>
              </th>
              <th className="text-center py-3 px-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('velocity')}
                  className="font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                >
                  Velocity
                  {getSortIcon('velocity')}
                </Button>
              </th>
              <th className="text-center py-3 px-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('cycleTime')}
                  className="font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                >
                  Cycle Time
                  {getSortIcon('cycleTime')}
                </Button>
              </th>
              <th className="text-center py-3 px-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('productivityScore')}
                  className="font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                >
                  Score
                  {getSortIcon('productivityScore')}
                </Button>
              </th>
              <th className="text-center py-3 px-4">
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  Performance
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedMembers.map((member, index) => (
              <motion.tr
                key={member.userId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                      <UserIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {member.name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {member.role || 'Team Member'}
                      </div>
                    </div>
                  </div>
                </td>
                
                <td className="py-4 px-4 text-center">
                  <div className="font-semibold text-gray-900 dark:text-white">
                    {member.metrics.completedTasks}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    of {member.metrics.totalTasks}
                  </div>
                </td>
                
                <td className="py-4 px-4 text-center">
                  <div className="font-semibold text-gray-900 dark:text-white">
                    {member.metrics.velocity.toFixed(1)}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    tasks/day
                  </div>
                </td>
                
                <td className="py-4 px-4 text-center">
                  <div className="font-semibold text-gray-900 dark:text-white">
                    {member.metrics.cycleTime < 24 
                      ? `${member.metrics.cycleTime.toFixed(1)}h`
                      : `${(member.metrics.cycleTime / 24).toFixed(1)}d`
                    }
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    avg cycle
                  </div>
                </td>
                
                <td className="py-4 px-4 text-center">
                  <div className={`text-2xl font-bold ${getPerformanceColor(member.productivityScore)}`}>
                    {member.productivityScore}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    productivity
                  </div>
                </td>
                
                <td className="py-4 px-4 text-center">
                  <div className="space-y-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPerformanceBadge(member.productivityScore)}`}>
                      {member.productivityScore >= 90 ? 'Excellent' :
                       member.productivityScore >= 80 ? 'Good' :
                       member.productivityScore >= 70 ? 'Average' : 'Needs Improvement'}
                    </span>
                    
                    <div className="flex items-center justify-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                      <TrophyIcon className="h-3 w-3" />
                      <span>F: {member.focusScore}</span>
                      <ChartBarIcon className="h-3 w-3 ml-1" />
                      <span>Q: {member.qualityScore}</span>
                    </div>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Team Summary */}
      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {teamPerformance.aggregatedMetrics.totalTasks}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Tasks</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {teamPerformance.aggregatedMetrics.completedTasks}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Completed</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {teamPerformance.aggregatedMetrics.velocity.toFixed(1)}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Avg Velocity</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {(teamPerformance.aggregatedMetrics.cycleTime / 24).toFixed(1)}d
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Avg Cycle Time</div>
          </div>
        </div>
      </div>
    </Card>
  );
};