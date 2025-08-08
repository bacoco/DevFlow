/**
 * AchievementPanel
 * Component for displaying achievements and gamification features
 */

import React, { useState, useEffect } from 'react';
import CollaborationManager from '../../services/collaboration/CollaborationManager';
import {
  User,
  Achievement,
  UserAchievement,
  AchievementCategory,
  AchievementDifficulty
} from '../../services/collaboration/types';

interface AchievementPanelProps {
  currentUser: User;
  collaborationManager: CollaborationManager;
  userAchievements: UserAchievement[];
  loading: boolean;
  onAchievementUpdate: () => void;
}

export const AchievementPanel: React.FC<AchievementPanelProps> = ({
  currentUser,
  collaborationManager,
  userAchievements,
  loading,
  onAchievementUpdate
}) => {
  const [activeTab, setActiveTab] = useState<'earned' | 'available' | 'leaderboard'>('earned');
  const [availableAchievements, setAvailableAchievements] = useState<Achievement[]>([]);
  const [userProgress, setUserProgress] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<AchievementCategory | 'all'>('all');
  const [userStats, setUserStats] = useState<{
    totalPoints: number;
    totalAchievements: number;
    rank: number;
  }>({ totalPoints: 0, totalAchievements: 0, rank: 0 });

  useEffect(() => {
    loadAchievementData();
  }, [currentUser.id]);

  const loadAchievementData = async () => {
    try {
      // Load available achievements
      const availableResponse = await collaborationManager.getAvailableAchievements();
      if (availableResponse.success && availableResponse.data) {
        setAvailableAchievements(availableResponse.data);
      }

      // Load user progress
      const progressResponse = await collaborationManager.getUserProgress?.(currentUser.id);
      if (progressResponse?.success && progressResponse.data) {
        setUserProgress(progressResponse.data);
      }

      // Load leaderboard
      const leaderboardResponse = await collaborationManager.getLeaderboard?.();
      if (leaderboardResponse?.success && leaderboardResponse.data) {
        setLeaderboard(leaderboardResponse.data);
      }

      // Calculate user stats
      const totalPoints = await collaborationManager.getUserPoints?.(currentUser.id);
      const totalAchievements = userAchievements.length;
      const rank = leaderboard.findIndex(entry => entry.userId === currentUser.id) + 1;

      setUserStats({
        totalPoints: totalPoints?.data || 0,
        totalAchievements,
        rank: rank || 0
      });
    } catch (error) {
      console.error('Failed to load achievement data:', error);
    }
  };

  const getDifficultyColor = (difficulty: AchievementDifficulty) => {
    switch (difficulty) {
      case 'bronze':
        return 'text-amber-600 bg-amber-100';
      case 'silver':
        return 'text-gray-600 bg-gray-100';
      case 'gold':
        return 'text-yellow-600 bg-yellow-100';
      case 'platinum':
        return 'text-purple-600 bg-purple-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getDifficultyIcon = (difficulty: AchievementDifficulty) => {
    switch (difficulty) {
      case 'bronze':
        return '🥉';
      case 'silver':
        return '🥈';
      case 'gold':
        return '🥇';
      case 'platinum':
        return '💎';
      default:
        return '🏆';
    }
  };

  const getCategoryIcon = (category: AchievementCategory) => {
    switch (category) {
      case 'productivity':
        return '🚀';
      case 'collaboration':
        return '🤝';
      case 'learning':
        return '📚';
      case 'quality':
        return '✨';
      case 'innovation':
        return '💡';
      default:
        return '🏆';
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };

  const filteredEarnedAchievements = userAchievements.filter(userAchievement => {
    if (selectedCategory === 'all') return true;
    const achievement = availableAchievements.find(a => a.id === userAchievement.achievementId);
    return achievement?.category === selectedCategory;
  });

  const filteredAvailableAchievements = availableAchievements.filter(achievement => {
    if (selectedCategory !== 'all' && achievement.category !== selectedCategory) return false;
    return !userAchievements.some(ua => ua.achievementId === achievement.id);
  });

  const categoryOptions: { value: AchievementCategory | 'all'; label: string }[] = [
    { value: 'all', label: 'All Categories' },
    { value: 'productivity', label: 'Productivity' },
    { value: 'collaboration', label: 'Collaboration' },
    { value: 'learning', label: 'Learning' },
    { value: 'quality', label: 'Quality' },
    { value: 'innovation', label: 'Innovation' }
  ];

  return (
    <div className="achievement-panel p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Achievements</h3>
        
        {/* User Stats */}
        <div className="flex items-center space-x-6 text-sm">
          <div className="text-center">
            <div className="font-bold text-lg text-blue-600">{userStats.totalPoints}</div>
            <div className="text-gray-500">Points</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-lg text-green-600">{userStats.totalAchievements}</div>
            <div className="text-gray-500">Earned</div>
          </div>
          {userStats.rank > 0 && (
            <div className="text-center">
              <div className="font-bold text-lg text-purple-600">#{userStats.rank}</div>
              <div className="text-gray-500">Rank</div>
            </div>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
        {[
          { key: 'earned', label: 'Earned', count: userAchievements.length },
          { key: 'available', label: 'Available', count: filteredAvailableAchievements.length },
          { key: 'leaderboard', label: 'Leaderboard', count: leaderboard.length }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === tab.key
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className="ml-2 px-2 py-1 bg-gray-200 text-gray-600 text-xs rounded-full">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Category Filter */}
      {(activeTab === 'earned' || activeTab === 'available') && (
        <div className="mb-4">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as AchievementCategory | 'all')}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {categoryOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-500">Loading achievements...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Earned Achievements */}
          {activeTab === 'earned' && (
            <>
              {filteredEarnedAchievements.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <p>No achievements earned yet</p>
                  <p className="text-sm">Start collaborating to unlock your first achievement!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredEarnedAchievements.map(userAchievement => {
                    const achievement = availableAchievements.find(a => a.id === userAchievement.achievementId);
                    if (!achievement) return null;

                    return (
                      <div key={userAchievement.achievementId} className="bg-white border border-gray-200 rounded-lg p-4 relative overflow-hidden">
                        {/* Achievement earned indicator */}
                        <div className="absolute top-0 right-0 w-0 h-0 border-l-[40px] border-l-transparent border-t-[40px] border-t-green-500">
                          <div className="absolute -top-8 -right-1 text-white text-xs font-bold transform rotate-45">
                            ✓
                          </div>
                        </div>

                        <div className="flex items-start space-x-3">
                          <div className="text-3xl">{achievement.icon}</div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h4 className="font-semibold text-gray-900">{achievement.name}</h4>
                              <span className={`px-2 py-1 text-xs rounded-full ${getDifficultyColor(achievement.difficulty)}`}>
                                {getDifficultyIcon(achievement.difficulty)} {achievement.difficulty}
                              </span>
                            </div>
                            
                            <p className="text-sm text-gray-600 mb-2">{achievement.description}</p>
                            
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center space-x-4">
                                <span className="text-blue-600 font-medium">
                                  +{achievement.points} points
                                </span>
                                <span className="text-gray-500">
                                  {getCategoryIcon(achievement.category)} {achievement.category}
                                </span>
                              </div>
                              <span className="text-gray-500">
                                {formatDate(userAchievement.unlockedAt)}
                              </span>
                            </div>

                            {/* Streak info for repeatable achievements */}
                            {achievement.isRepeatable && userAchievement.currentStreak && (
                              <div className="mt-2 text-sm">
                                <span className="text-orange-600">
                                  🔥 Current streak: {userAchievement.currentStreak}
                                </span>
                                {userAchievement.bestStreak && (
                                  <span className="text-gray-500 ml-2">
                                    (Best: {userAchievement.bestStreak})
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Available Achievements */}
          {activeTab === 'available' && (
            <>
              {filteredAvailableAchievements.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>All achievements in this category have been earned!</p>
                  <p className="text-sm">Try a different category or check back for new achievements.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredAvailableAchievements.map(achievement => {
                    // Find progress for this achievement
                    const progress = userProgress?.inProgress?.find((p: any) => p.achievement.id === achievement.id);

                    return (
                      <div key={achievement.id} className="bg-white border border-gray-200 rounded-lg p-4 opacity-75 hover:opacity-100 transition-opacity">
                        <div className="flex items-start space-x-3">
                          <div className="text-3xl grayscale">{achievement.icon}</div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h4 className="font-semibold text-gray-900">{achievement.name}</h4>
                              <span className={`px-2 py-1 text-xs rounded-full ${getDifficultyColor(achievement.difficulty)}`}>
                                {getDifficultyIcon(achievement.difficulty)} {achievement.difficulty}
                              </span>
                              {achievement.isSecret && (
                                <span className="px-2 py-1 text-xs bg-purple-100 text-purple-600 rounded-full">
                                  🔒 Secret
                                </span>
                              )}
                            </div>
                            
                            <p className="text-sm text-gray-600 mb-2">{achievement.description}</p>
                            
                            {/* Progress bar */}
                            {progress && (
                              <div className="mb-2">
                                <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                                  <span>Progress</span>
                                  <span>{progress.currentValue}/{progress.targetValue}</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${Math.min(100, progress.progress)}%` }}
                                  />
                                </div>
                              </div>
                            )}
                            
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center space-x-4">
                                <span className="text-blue-600 font-medium">
                                  +{achievement.points} points
                                </span>
                                <span className="text-gray-500">
                                  {getCategoryIcon(achievement.category)} {achievement.category}
                                </span>
                              </div>
                              {achievement.isRepeatable && (
                                <span className="text-green-600 text-xs">
                                  🔄 Repeatable
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Leaderboard */}
          {activeTab === 'leaderboard' && (
            <>
              {leaderboard.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>Leaderboard is being calculated...</p>
                  <p className="text-sm">Check back soon to see team rankings!</p>
                </div>
              ) : (
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                    <h4 className="font-semibold text-gray-900">Team Leaderboard</h4>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {leaderboard.slice(0, 10).map((entry, index) => (
                      <div
                        key={entry.userId}
                        className={`px-6 py-4 flex items-center justify-between ${
                          entry.userId === currentUser.id ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100">
                            <span className="font-bold text-gray-600">
                              {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {entry.userId === currentUser.id ? 'You' : `User ${entry.userId.slice(-4)}`}
                            </div>
                            <div className="text-sm text-gray-500">
                              {entry.achievementCount} achievements
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="font-bold text-blue-600">
                            {entry.totalPoints} points
                          </div>
                          {entry.recentAchievements.length > 0 && (
                            <div className="text-xs text-gray-500">
                              {entry.recentAchievements.length} recent
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default AchievementPanel;