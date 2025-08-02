import React, { useState, useCallback, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, RotateCcw } from 'lucide-react';

export interface TimeRange {
  start: Date;
  end: Date;
}

export interface TemporalControlsProps {
  timeRange: TimeRange;
  currentTime: Date;
  isPlaying: boolean;
  playbackSpeed: number;
  onTimeChange: (time: Date) => void;
  onPlayPause: () => void;
  onSpeedChange: (speed: number) => void;
  onReset: () => void;
  onStepForward: () => void;
  onStepBackward: () => void;
}

const TemporalControls: React.FC<TemporalControlsProps> = ({
  timeRange,
  currentTime,
  isPlaying,
  playbackSpeed,
  onTimeChange,
  onPlayPause,
  onSpeedChange,
  onReset,
  onStepForward,
  onStepBackward,
}) => {
  const [isDragging, setIsDragging] = useState(false);

  // Calculate progress as percentage
  const totalDuration = timeRange.end.getTime() - timeRange.start.getTime();
  const currentProgress = totalDuration > 0 
    ? ((currentTime.getTime() - timeRange.start.getTime()) / totalDuration) * 100
    : 0;

  // Handle timeline scrubbing
  const handleTimelineClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = new Date(
      timeRange.start.getTime() + (percentage * totalDuration)
    );
    onTimeChange(newTime);
  }, [timeRange, totalDuration, onTimeChange]);

  // Handle timeline dragging
  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    setIsDragging(true);
    handleTimelineClick(event);
  }, [handleTimelineClick]);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!isDragging) return;
    
    const timeline = document.getElementById('temporal-timeline');
    if (!timeline) return;

    const rect = timeline.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = new Date(
      timeRange.start.getTime() + (percentage * totalDuration)
    );
    onTimeChange(newTime);
  }, [isDragging, timeRange, totalDuration, onTimeChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add global mouse event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Format date for display
  const formatDate = (date: Date) => {
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const speedOptions = [0.25, 0.5, 1, 2, 4, 8];

  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-lg p-4 shadow-lg border">
      <div className="space-y-4">
        {/* Time Display */}
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-800">
            {formatDate(currentTime)}
          </div>
          <div className="text-sm text-gray-600">
            {formatDate(timeRange.start)} - {formatDate(timeRange.end)}
          </div>
        </div>

        {/* Timeline */}
        <div className="space-y-2">
          <div
            id="temporal-timeline"
            className="relative h-6 bg-gray-200 rounded-full cursor-pointer"
            onClick={handleTimelineClick}
            onMouseDown={handleMouseDown}
          >
            {/* Progress bar */}
            <div
              className="absolute top-0 left-0 h-full bg-blue-500 rounded-full transition-all duration-150"
              style={{ width: `${Math.max(0, Math.min(100, currentProgress))}%` }}
            />
            
            {/* Scrubber handle */}
            <div
              className="absolute top-1/2 transform -translate-y-1/2 w-4 h-4 bg-white border-2 border-blue-500 rounded-full shadow-md cursor-grab active:cursor-grabbing"
              style={{ left: `calc(${Math.max(0, Math.min(100, currentProgress))}% - 8px)` }}
            />
          </div>
          
          {/* Timeline markers */}
          <div className="flex justify-between text-xs text-gray-500">
            <span>Start</span>
            <span>End</span>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center justify-center space-x-2">
          <button
            onClick={onReset}
            className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
            title="Reset to Start"
          >
            <RotateCcw size={16} />
          </button>

          <button
            onClick={onStepBackward}
            className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
            title="Step Backward"
          >
            <SkipBack size={16} />
          </button>

          <button
            onClick={onPlayPause}
            className="p-3 rounded-full bg-blue-500 hover:bg-blue-600 text-white transition-colors"
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
          </button>

          <button
            onClick={onStepForward}
            className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
            title="Step Forward"
          >
            <SkipForward size={16} />
          </button>
        </div>

        {/* Speed Control */}
        <div className="flex items-center justify-center space-x-2">
          <span className="text-sm text-gray-600">Speed:</span>
          <select
            value={playbackSpeed}
            onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
            className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {speedOptions.map(speed => (
              <option key={speed} value={speed}>
                {speed}x
              </option>
            ))}
          </select>
        </div>

        {/* Animation Status */}
        <div className="text-center">
          <div className="inline-flex items-center space-x-2 px-3 py-1 bg-gray-100 rounded-full text-sm">
            <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-green-500' : 'bg-gray-400'}`} />
            <span>{isPlaying ? 'Playing' : 'Paused'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemporalControls;