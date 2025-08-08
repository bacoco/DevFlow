import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card } from './Card';
import { Button } from './Button';
import { ShareAnalytics as ShareAnalyticsType, ShareLink } from '../../types/export';
import { sharingService } from '../../services/sharingService';

interface ShareAnalyticsProps {
  dashboardId?: string;
  className?: string;
}

export const ShareAnalytics: React.FC<ShareAnalyticsProps> = ({
  dashboardId,
  className,
}) => {
  const [stats, setStats] = useState<{
    totalLinks: number;
    activeLinks: number;
    totalViews: number;
    uniqueViewers: number;
    topLinks: Array<{ linkId: string; views: number; url: string }>;
  } | null>(null);
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([]);
  const [selectedLinkAnalytics, setSelectedLinkAnalytics] = useState<ShareAnalyticsType | null>(null);
  const [selectedLinkId, setSelectedLinkId] = useState<string>('');

  useEffect(() => {
    loadStats();
    loadShareLinks();
  }, [dashboardId]);

  const loadStats = () => {
    const sharingStats = sharingService.getSharingStats(dashboardId);
    setStats(sharingStats);
  };

  const loadShareLinks = () => {
    if (dashboardId) {
      const links = sharingService.getShareLinks(dashboardId);
      setShareLinks(links);
    }
  };

  const loadLinkAnalytics = (linkId: string) => {
    const analytics = sharingService.getAnalytics(linkId);
    setSelectedLinkAnalytics(analytics);
    setSelectedLinkId(linkId);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getTopViewDates = (viewsByDate: Record<string, number>) => {
    return Object.entries(viewsByDate)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 7)
      .map(([date, views]) => ({ date, views }));
  };

  const getTopLocations = (viewerLocations: Record<string, number>) => {
    return Object.entries(viewerLocations)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([location, views]) => ({ location, views }));
  };

  if (!stats) {
    return (
      <div className={`animate-pulse ${className}`}>
        <Card variant="outlined" padding="lg">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-4/6"></div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Overview Stats */}
      <Card variant="outlined" padding="lg">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
          Sharing Overview
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {stats.totalLinks}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Total Links
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {stats.activeLinks}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Active Links
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {stats.totalViews}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Total Views
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {stats.uniqueViewers}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Unique Viewers
            </div>
          </div>
        </div>
      </Card>

      {/* Top Performing Links */}
      {stats.topLinks.length > 0 && (
        <Card variant="outlined" padding="lg">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
            Top Performing Links
          </h3>
          
          <div className="space-y-3">
            {stats.topLinks.map((link, index) => (
              <motion.div
                key={link.linkId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      #{index + 1}
                    </span>
                    <code className="text-xs font-mono text-gray-600 dark:text-gray-400 truncate">
                      {link.url.split('/').pop()}
                    </code>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {link.views} views
                  </div>
                </div>
                
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => loadLinkAnalytics(link.linkId)}
                >
                  View Details
                </Button>
              </motion.div>
            ))}
          </div>
        </Card>
      )}

      {/* Link Selection for Detailed Analytics */}
      {shareLinks.length > 0 && (
        <Card variant="outlined" padding="lg">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
            Detailed Analytics
          </h3>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Link
            </label>
            <select
              value={selectedLinkId}
              onChange={(e) => {
                setSelectedLinkId(e.target.value);
                if (e.target.value) {
                  loadLinkAnalytics(e.target.value);
                } else {
                  setSelectedLinkAnalytics(null);
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="">Select a link...</option>
              {shareLinks.map((link) => (
                <option key={link.id} value={link.id}>
                  {link.url.split('/').pop()} ({link.viewCount} views)
                </option>
              ))}
            </select>
          </div>

          {selectedLinkAnalytics && (
            <div className="space-y-6">
              {/* Views by Date */}
              {Object.keys(selectedLinkAnalytics.viewsByDate).length > 0 && (
                <div>
                  <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-3">
                    Views by Date
                  </h4>
                  <div className="space-y-2">
                    {getTopViewDates(selectedLinkAnalytics.viewsByDate).map(({ date, views }) => (
                      <div key={date} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {formatDate(date)}
                        </span>
                        <div className="flex items-center space-x-2">
                          <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{
                                width: `${(views / Math.max(...Object.values(selectedLinkAnalytics.viewsByDate))) * 100}%`,
                              }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100 w-8 text-right">
                            {views}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Viewer Locations */}
              {Object.keys(selectedLinkAnalytics.viewerLocations).length > 0 && (
                <div>
                  <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-3">
                    Top Locations
                  </h4>
                  <div className="space-y-2">
                    {getTopLocations(selectedLinkAnalytics.viewerLocations).map(({ location, views }) => (
                      <div key={location} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {location}
                        </span>
                        <div className="flex items-center space-x-2">
                          <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-green-600 h-2 rounded-full"
                              style={{
                                width: `${(views / Math.max(...Object.values(selectedLinkAnalytics.viewerLocations))) * 100}%`,
                              }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100 w-8 text-right">
                            {views}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Additional Stats */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {selectedLinkAnalytics.totalViews}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Total Views
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {Math.round(selectedLinkAnalytics.averageViewDuration)}s
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Avg. Duration
                  </div>
                </div>
              </div>

              {selectedLinkAnalytics.lastViewedAt && (
                <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                  Last viewed: {selectedLinkAnalytics.lastViewedAt.toLocaleString()}
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {shareLinks.length === 0 && (
        <Card variant="outlined" padding="lg">
          <div className="text-center py-8">
            <svg className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
            </svg>
            <p className="text-gray-600 dark:text-gray-400">
              No share links created yet
            </p>
          </div>
        </Card>
      )}
    </div>
  );
};