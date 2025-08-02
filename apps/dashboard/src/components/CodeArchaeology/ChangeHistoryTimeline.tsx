import React, { useState } from 'react';
import './ChangeHistoryTimeline.css';

interface ChangeHistoryEntry {
  id: string;
  timestamp: Date;
  author: string;
  message: string;
  changeType: 'added' | 'modified' | 'deleted' | 'moved';
  linesAdded: number;
  linesRemoved: number;
  complexity: number;
}

interface ChangeHistoryTimelineProps {
  changes: ChangeHistoryEntry[];
  artifactName: string;
  maxEntries?: number;
  className?: string;
}

const ChangeHistoryTimeline: React.FC<ChangeHistoryTimelineProps> = ({
  changes,
  artifactName,
  maxEntries = 10,
  className = '',
}) => {
  const [showAll, setShowAll] = useState(false);
  const [selectedChange, setSelectedChange] = useState<string | null>(null);

  // Sort changes by timestamp (most recent first)
  const sortedChanges = [...changes].sort(
    (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
  );

  // Determine which changes to display
  const displayedChanges = showAll 
    ? sortedChanges 
    : sortedChanges.slice(0, maxEntries);

  const formatDate = (date: Date): string => {
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) {
      return 'Today';
    } else if (diffInDays === 1) {
      return 'Yesterday';
    } else if (diffInDays < 7) {
      return `${diffInDays} days ago`;
    } else if (diffInDays < 30) {
      const weeks = Math.floor(diffInDays / 7);
      return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    }
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getChangeTypeIcon = (changeType: string): string => {
    const icons = {
      added: '➕',
      modified: '✏️',
      deleted: '🗑️',
      moved: '📁',
    };
    return icons[changeType as keyof typeof icons] || '📝';
  };

  const getChangeTypeColor = (changeType: string): string => {
    const colors = {
      added: '#4CAF50',
      modified: '#2196F3',
      deleted: '#F44336',
      moved: '#FF9800',
    };
    return colors[changeType as keyof typeof colors] || '#757575';
  };

  const getComplexityTrend = (currentComplexity: number, index: number): string => {
    if (index === displayedChanges.length - 1) return ''; // No previous entry
    
    const previousComplexity = displayedChanges[index + 1].complexity;
    if (currentComplexity > previousComplexity) return '📈';
    if (currentComplexity < previousComplexity) return '📉';
    return '➡️';
  };

  const calculateNetChanges = (change: ChangeHistoryEntry): string => {
    const net = change.linesAdded - change.linesRemoved;
    if (net > 0) return `+${net}`;
    if (net < 0) return `${net}`;
    return '0';
  };

  const handleChangeClick = (changeId: string) => {
    setSelectedChange(selectedChange === changeId ? null : changeId);
  };

  if (changes.length === 0) {
    return (
      <div className={`change-history-timeline empty ${className}`}>
        <div className="empty-state">
          <div className="empty-icon">📝</div>
          <h4>No Change History</h4>
          <p>No changes have been recorded for {artifactName} yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`change-history-timeline ${className}`}>
      <div className="timeline-header">
        <h4>Change History ({changes.length})</h4>
        {changes.length > maxEntries && (
          <button
            className="toggle-button"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? 'Show Less' : 'Show All'}
          </button>
        )}
      </div>

      <div className="timeline-container">
        <div className="timeline-line"></div>
        
        {displayedChanges.map((change, index) => (
          <div
            key={change.id}
            className={`timeline-entry ${selectedChange === change.id ? 'selected' : ''}`}
            onClick={() => handleChangeClick(change.id)}
          >
            <div
              className="timeline-marker"
              style={{ backgroundColor: getChangeTypeColor(change.changeType) }}
            >
              <span className="change-icon">
                {getChangeTypeIcon(change.changeType)}
              </span>
            </div>

            <div className="timeline-content">
              <div className="change-header">
                <div className="change-meta">
                  <span className="change-author">{change.author}</span>
                  <span className="change-date">{formatDate(change.timestamp)}</span>
                  <span className="change-time">{formatTime(change.timestamp)}</span>
                </div>
                <div className="change-stats">
                  <span className="lines-changed">
                    {calculateNetChanges(change)} lines
                  </span>
                  <span className="complexity-trend">
                    {getComplexityTrend(change.complexity, index)}
                  </span>
                </div>
              </div>

              <div className="change-message">
                {change.message}
              </div>

              {selectedChange === change.id && (
                <div className="change-details">
                  <div className="detail-grid">
                    <div className="detail-item">
                      <span className="detail-label">Change Type:</span>
                      <span className="detail-value">
                        <span
                          className="change-type-badge"
                          style={{ backgroundColor: getChangeTypeColor(change.changeType) }}
                        >
                          {change.changeType}
                        </span>
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Lines Added:</span>
                      <span className="detail-value added">+{change.linesAdded}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Lines Removed:</span>
                      <span className="detail-value removed">-{change.linesRemoved}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Complexity:</span>
                      <span className="detail-value">{change.complexity}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {!showAll && changes.length > maxEntries && (
        <div className="timeline-footer">
          <button
            className="show-more-button"
            onClick={() => setShowAll(true)}
          >
            Show {changes.length - maxEntries} more changes
          </button>
        </div>
      )}
    </div>
  );
};

export default ChangeHistoryTimeline;
export { ChangeHistoryTimeline };