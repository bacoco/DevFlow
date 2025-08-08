/**
 * SocialLearningPanel
 * Component for social learning features and best practice suggestions
 */

import React, { useState, useEffect } from 'react';
import CollaborationManager from '../../services/collaboration/CollaborationManager';
import {
  User,
  BestPractice,
  LearningRecommendation,
  BestPracticeCategory,
  LearningDifficulty
} from '../../services/collaboration/types';

interface SocialLearningPanelProps {
  currentUser: User;
  collaborationManager: CollaborationManager;
  bestPractices: BestPractice[];
  loading: boolean;
  onLearningUpdate: () => void;
}

export const SocialLearningPanel: React.FC<SocialLearningPanelProps> = ({
  currentUser,
  collaborationManager,
  bestPractices,
  loading,
  onLearningUpdate
}) => {
  const [activeTab, setActiveTab] = useState<'recommended' | 'browse' | 'trending' | 'my-learning'>('recommended');
  const [recommendations, setRecommendations] = useState<LearningRecommendation[]>([]);
  const [trendingPractices, setTrendingPractices] = useState<BestPractice[]>([]);
  const [learningStats, setLearningStats] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<BestPracticeCategory | 'all'>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<LearningDifficulty | 'all'>('all');
  const [expandedPractice, setExpandedPractice] = useState<string | null>(null);

  useEffect(() => {
    loadLearningData();
  }, [currentUser.id]);

  const loadLearningData = async () => {
    try {
      // Load personalized recommendations
      const recommendationsResponse = await collaborationManager.getLearningRecommendations(currentUser.id);
      if (recommendationsResponse.success && recommendationsResponse.data) {
        setRecommendations(recommendationsResponse.data);
      }

      // Load trending practices
      const trendingResponse = await collaborationManager.getTrendingPractices?.('week');
      if (trendingResponse?.success && trendingResponse.data) {
        setTrendingPractices(trendingResponse.data);
      }

      // Load user learning stats
      const statsResponse = await collaborationManager.getUserLearningStats?.(currentUser.id);
      if (statsResponse?.success && statsResponse.data) {
        setLearningStats(statsResponse.data);
      }
    } catch (error) {
      console.error('Failed to load learning data:', error);
    }
  };

  const handlePracticeAction = async (practiceId: string, action: 'view' | 'implement' | 'rate') => {
    try {
      const response = await collaborationManager.recordBestPracticeUsage(currentUser.id, practiceId, action);
      if (response.success) {
        onLearningUpdate();
        loadLearningData(); // Refresh recommendations and stats
      }
    } catch (error) {
      console.error(`Failed to record ${action}:`, error);
    }
  };

  const handleRating = async (practiceId: string, rating: number, comment?: string) => {
    // In a real implementation, would call the collaboration manager
    console.log(`Rating practice ${practiceId}: ${rating}/5`, comment);
    await handlePracticeAction(practiceId, 'rate');
  };

  const getDifficultyColor = (difficulty: LearningDifficulty) => {
    switch (difficulty) {
      case 'beginner':
        return 'text-green-600 bg-green-100';
      case 'intermediate':
        return 'text-yellow-600 bg-yellow-100';
      case 'advanced':
        return 'text-orange-600 bg-orange-100';
      case 'expert':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getCategoryIcon = (category: BestPracticeCategory) => {
    switch (category) {
      case 'workflow':
        return '⚡';
      case 'code_quality':
        return '✨';
      case 'collaboration':
        return '🤝';
      case 'productivity':
        return '🚀';
      case 'tools':
        return '🔧';
      default:
        return '📚';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-gray-600';
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };

  const filteredPractices = bestPractices.filter(practice => {
    if (selectedCategory !== 'all' && practice.category !== selectedCategory) return false;
    if (selectedDifficulty !== 'all' && practice.difficulty !== selectedDifficulty) return false;
    return true;
  });

  const categoryOptions: { value: BestPracticeCategory | 'all'; label: string }[] = [
    { value: 'all', label: 'All Categories' },
    { value: 'workflow', label: 'Workflow' },
    { value: 'code_quality', label: 'Code Quality' },
    { value: 'collaboration', label: 'Collaboration' },
    { value: 'productivity', label: 'Productivity' },
    { value: 'tools', label: 'Tools' }
  ];

  const difficultyOptions: { value: LearningDifficulty | 'all'; label: string }[] = [
    { value: 'all', label: 'All Levels' },
    { value: 'beginner', label: 'Beginner' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'advanced', label: 'Advanced' },
    { value: 'expert', label: 'Expert' }
  ];

  const renderPracticeCard = (practice: BestPractice, isRecommended = false, confidence?: number) => (
    <div key={practice.id} className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start space-x-3">
          <span className="text-2xl">{getCategoryIcon(practice.category)}</span>
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <h4 className="font-semibold text-gray-900">{practice.title}</h4>
              <span className={`px-2 py-1 text-xs rounded-full ${getDifficultyColor(practice.difficulty)}`}>
                {practice.difficulty}
              </span>
              {isRecommended && confidence && (
                <span className={`px-2 py-1 text-xs rounded-full bg-blue-100 ${getConfidenceColor(confidence)}`}>
                  {Math.round(confidence * 100)}% match
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 mb-2">{practice.description}</p>
            
            {/* Tags */}
            <div className="flex flex-wrap gap-1 mb-2">
              {practice.tags.slice(0, 3).map(tag => (
                <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                  {tag}
                </span>
              ))}
              {practice.tags.length > 3 && (
                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                  +{practice.tags.length - 3} more
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
        <div className="flex items-center space-x-4">
          <span>👍 {practice.votes}</span>
          <span>👀 {practice.usage.views}</span>
          <span>✅ {practice.usage.implementations}</span>
        </div>
        <span>by {practice.author}</span>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex space-x-2">
          <button
            onClick={() => {
              handlePracticeAction(practice.id, 'view');
              setExpandedPractice(expandedPractice === practice.id ? null : practice.id);
            }}
            className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
          >
            {expandedPractice === practice.id ? 'Hide Details' : 'View Details'}
          </button>
          <button
            onClick={() => handlePracticeAction(practice.id, 'implement')}
            className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
          >
            Mark as Implemented
          </button>
        </div>
        
        {/* Quick rating */}
        <div className="flex items-center space-x-1">
          {[1, 2, 3, 4, 5].map(rating => (
            <button
              key={rating}
              onClick={() => handleRating(practice.id, rating)}
              className="text-gray-300 hover:text-yellow-400 transition-colors"
            >
              ⭐
            </button>
          ))}
        </div>
      </div>

      {/* Expanded content */}
      {expandedPractice === practice.id && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="space-y-4">
            {/* Steps */}
            {practice.content.steps.length > 0 && (
              <div>
                <h5 className="font-medium text-gray-900 mb-2">Implementation Steps</h5>
                <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                  {practice.content.steps.map((step, index) => (
                    <li key={index}>
                      <strong>{step.title}:</strong> {step.description}
                      {step.expectedOutcome && (
                        <div className="ml-6 mt-1 text-gray-600">
                          Expected: {step.expectedOutcome}
                        </div>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Code Examples */}
            {practice.content.examples.length > 0 && (
              <div>
                <h5 className="font-medium text-gray-900 mb-2">Examples</h5>
                {practice.content.examples.map((example, index) => (
                  <div key={index} className="mb-3">
                    <div className="bg-gray-50 rounded-md p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-500 uppercase">
                          {example.language}
                        </span>
                      </div>
                      <pre className="text-sm text-gray-800 overflow-x-auto">
                        <code>{example.code}</code>
                      </pre>
                      {example.explanation && (
                        <p className="mt-2 text-sm text-gray-600">{example.explanation}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tips */}
            {practice.content.tips.length > 0 && (
              <div>
                <h5 className="font-medium text-gray-900 mb-2">Tips</h5>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                  {practice.content.tips.map((tip, index) => (
                    <li key={index}>{tip}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Resources */}
            {practice.content.resources.length > 0 && (
              <div>
                <h5 className="font-medium text-gray-900 mb-2">Additional Resources</h5>
                <div className="space-y-2">
                  {practice.content.resources.map((resource, index) => (
                    <div key={index} className="flex items-center space-x-2 text-sm">
                      <span>{resource.type === 'video' ? '🎥' : resource.type === 'article' ? '📄' : '🔗'}</span>
                      <a
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline"
                      >
                        {resource.title}
                      </a>
                      {resource.description && (
                        <span className="text-gray-500">- {resource.description}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="social-learning-panel p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Social Learning</h3>
        
        {/* Learning Stats */}
        {learningStats && (
          <div className="flex items-center space-x-4 text-sm">
            <div className="text-center">
              <div className="font-bold text-lg text-blue-600">{learningStats.practicesViewed}</div>
              <div className="text-gray-500">Viewed</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-lg text-green-600">{learningStats.practicesImplemented}</div>
              <div className="text-gray-500">Implemented</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-lg text-orange-600">{learningStats.learningStreak}</div>
              <div className="text-gray-500">Day Streak</div>
            </div>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
        {[
          { key: 'recommended', label: 'For You', count: recommendations.length },
          { key: 'browse', label: 'Browse All', count: filteredPractices.length },
          { key: 'trending', label: 'Trending', count: trendingPractices.length },
          { key: 'my-learning', label: 'My Learning', count: learningStats?.practicesImplemented || 0 }
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

      {/* Filters */}
      {(activeTab === 'browse' || activeTab === 'trending') && (
        <div className="flex space-x-4 mb-4">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as BestPracticeCategory | 'all')}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {categoryOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value as LearningDifficulty | 'all')}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {difficultyOptions.map(option => (
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
          <p className="mt-2 text-gray-500">Loading learning content...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Recommended Tab */}
          {activeTab === 'recommended' && (
            <>
              {recommendations.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p>No personalized recommendations yet</p>
                  <p className="text-sm">Start viewing and implementing best practices to get personalized suggestions!</p>
                </div>
              ) : (
                <>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <h4 className="font-medium text-blue-900 mb-2">Personalized for You</h4>
                    <p className="text-sm text-blue-800">
                      These recommendations are based on your activity, skill level, and team trends.
                    </p>
                  </div>
                  
                  {recommendations.map(recommendation => {
                    const practice = bestPractices.find(p => p.id === recommendation.bestPracticeId);
                    if (!practice) return null;
                    
                    return (
                      <div key={recommendation.bestPracticeId}>
                        {renderPracticeCard(practice, true, recommendation.confidence)}
                        <div className="mt-2 p-3 bg-gray-50 rounded-md text-sm">
                          <strong>Why this is recommended:</strong> {recommendation.reason.explanation}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </>
          )}

          {/* Browse All Tab */}
          {activeTab === 'browse' && (
            <>
              {filteredPractices.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No practices found matching your filters</p>
                  <p className="text-sm">Try adjusting the category or difficulty filters</p>
                </div>
              ) : (
                filteredPractices.map(practice => renderPracticeCard(practice))
              )}
            </>
          )}

          {/* Trending Tab */}
          {activeTab === 'trending' && (
            <>
              {trendingPractices.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No trending practices this week</p>
                  <p className="text-sm">Check back later for popular content!</p>
                </div>
              ) : (
                <>
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                    <h4 className="font-medium text-orange-900 mb-2">🔥 Trending This Week</h4>
                    <p className="text-sm text-orange-800">
                      Most viewed and implemented practices by the community.
                    </p>
                  </div>
                  
                  {trendingPractices.map(practice => renderPracticeCard(practice))}
                </>
              )}
            </>
          )}

          {/* My Learning Tab */}
          {activeTab === 'my-learning' && (
            <div className="text-center py-8 text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>Your learning progress will appear here</p>
              <p className="text-sm">Start implementing best practices to track your progress!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SocialLearningPanel;