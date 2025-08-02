import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Vector3 } from 'three';
import TemporalControls, { TimeRange } from './TemporalControls';
import AnimationSystem, { AnimationSequence } from './AnimationSystem';
import TemporalLayer from './TemporalLayer';
import { CodeArtifact, VisualizationConfig } from './types';

export interface TemporalVisualizationProps {
  artifacts: CodeArtifact[];
  config: VisualizationConfig;
  onArtifactSelect?: (artifact: CodeArtifact) => void;
  onArtifactHover?: (artifact: CodeArtifact | null) => void;
}

const TemporalVisualization: React.FC<TemporalVisualizationProps> = ({
  artifacts,
  config,
  onArtifactSelect,
  onArtifactHover,
}) => {
  // Temporal state
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [artifactStates, setArtifactStates] = useState<Map<string, Partial<CodeArtifact>>>(new Map());

  // Calculate time range from artifacts
  const timeRange = useMemo((): TimeRange => {
    if (artifacts.length === 0) {
      const now = new Date();
      return {
        start: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000), // 1 year ago
        end: now,
      };
    }

    const dates = artifacts.map(a => a.lastModified.getTime());
    const minDate = Math.min(...dates);
    const maxDate = Math.max(...dates);

    return {
      start: new Date(minDate),
      end: new Date(maxDate),
    };
  }, [artifacts]);

  // Generate animation sequences based on artifact history
  const animationSequences = useMemo((): AnimationSequence[] => {
    const sequences: AnimationSequence[] = [];

    // Group artifacts by time periods to create animation sequences
    const timeGroups = new Map<string, CodeArtifact[]>();
    
    artifacts.forEach(artifact => {
      const monthKey = `${artifact.lastModified.getFullYear()}-${artifact.lastModified.getMonth()}`;
      if (!timeGroups.has(monthKey)) {
        timeGroups.set(monthKey, []);
      }
      timeGroups.get(monthKey)!.push(artifact);
    });

    // Create sequences for each time group
    Array.from(timeGroups.entries()).forEach(([monthKey, groupArtifacts], index) => {
      const [year, month] = monthKey.split('-').map(Number);
      const sequenceStart = new Date(year, month, 1);
      const sequenceEnd = new Date(year, month + 1, 0);

      const keyframes = groupArtifacts.map(artifact => ({
        timestamp: artifact.lastModified,
        artifactChanges: [{
          artifactId: artifact.id,
          changeType: 'added' as const,
          newPosition: artifact.position3D,
          transitionDuration: 2, // 2 seconds
        }],
      }));

      sequences.push({
        id: `sequence-${monthKey}`,
        timeRange: { start: sequenceStart, end: sequenceEnd },
        keyframes,
        duration: 30, // 30 seconds per sequence
        easing: 'easeInOut',
      });
    });

    return sequences;
  }, [artifacts]);

  // Generate temporal layers
  const temporalLayers = useMemo(() => {
    const layers = [
      {
        name: 'Current',
        depth: 0,
        opacity: 1.0,
        artifacts: artifacts.filter(a => {
          const daysDiff = (currentTime.getTime() - a.lastModified.getTime()) / (1000 * 60 * 60 * 24);
          return daysDiff <= 30;
        }),
      },
      {
        name: 'Recent',
        depth: -2,
        opacity: 0.7,
        artifacts: artifacts.filter(a => {
          const daysDiff = (currentTime.getTime() - a.lastModified.getTime()) / (1000 * 60 * 60 * 24);
          return daysDiff > 30 && daysDiff <= 90;
        }),
      },
      {
        name: 'Historical',
        depth: -4,
        opacity: 0.4,
        artifacts: artifacts.filter(a => {
          const daysDiff = (currentTime.getTime() - a.lastModified.getTime()) / (1000 * 60 * 60 * 24);
          return daysDiff > 90 && daysDiff <= 180;
        }),
      },
      {
        name: 'Archaeological',
        depth: -6,
        opacity: 0.2,
        artifacts: artifacts.filter(a => {
          const daysDiff = (currentTime.getTime() - a.lastModified.getTime()) / (1000 * 60 * 60 * 24);
          return daysDiff > 180;
        }),
      },
    ];

    return layers.filter(layer => layer.artifacts.length > 0);
  }, [artifacts, currentTime]);

  // Playback control handlers
  const handlePlayPause = useCallback(() => {
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const handleTimeChange = useCallback((time: Date) => {
    setCurrentTime(time);
  }, []);

  const handleSpeedChange = useCallback((speed: number) => {
    setPlaybackSpeed(speed);
  }, []);

  const handleReset = useCallback(() => {
    setCurrentTime(timeRange.start);
    setIsPlaying(false);
  }, [timeRange.start]);

  const handleStepForward = useCallback(() => {
    const stepSize = 24 * 60 * 60 * 1000; // 1 day
    const newTime = new Date(Math.min(currentTime.getTime() + stepSize, timeRange.end.getTime()));
    setCurrentTime(newTime);
  }, [currentTime, timeRange.end]);

  const handleStepBackward = useCallback(() => {
    const stepSize = 24 * 60 * 60 * 1000; // 1 day
    const newTime = new Date(Math.max(currentTime.getTime() - stepSize, timeRange.start.getTime()));
    setCurrentTime(newTime);
  }, [currentTime, timeRange.start]);

  // Handle artifact updates from animation system
  const handleArtifactUpdate = useCallback((artifactId: string, updates: Partial<CodeArtifact>) => {
    setArtifactStates(prev => {
      const newStates = new Map(prev);
      newStates.set(artifactId, { ...newStates.get(artifactId), ...updates });
      return newStates;
    });
  }, []);

  // Auto-advance time when playing
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentTime(prevTime => {
        const stepSize = (24 * 60 * 60 * 1000) * playbackSpeed; // Scale by playback speed
        const newTime = new Date(prevTime.getTime() + stepSize);
        
        if (newTime >= timeRange.end) {
          setIsPlaying(false);
          return timeRange.end;
        }
        
        return newTime;
      });
    }, 100); // Update every 100ms for smooth animation

    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed, timeRange.end]);

  return (
    <>
      {/* Animation System */}
      <AnimationSystem
        artifacts={artifacts}
        currentTime={currentTime}
        animationSequences={animationSequences}
        isPlaying={isPlaying}
        playbackSpeed={playbackSpeed}
        onArtifactUpdate={handleArtifactUpdate}
      />

      {/* Temporal Layers */}
      {temporalLayers.map(layer => (
        <TemporalLayer
          key={layer.name}
          artifacts={layer.artifacts}
          config={config}
          currentTime={currentTime}
          layerDepth={layer.depth}
          layerOpacity={layer.opacity}
          onArtifactSelect={onArtifactSelect}
          onArtifactHover={onArtifactHover}
        />
      ))}

      {/* Temporal Controls UI */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20">
        <TemporalControls
          timeRange={timeRange}
          currentTime={currentTime}
          isPlaying={isPlaying}
          playbackSpeed={playbackSpeed}
          onTimeChange={handleTimeChange}
          onPlayPause={handlePlayPause}
          onSpeedChange={handleSpeedChange}
          onReset={handleReset}
          onStepForward={handleStepForward}
          onStepBackward={handleStepBackward}
        />
      </div>

      {/* Layer Legend */}
      <div className="absolute top-4 right-4 z-10 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
        <h4 className="text-sm font-semibold mb-2">Temporal Layers</h4>
        <div className="space-y-1 text-xs">
          {temporalLayers.map(layer => (
            <div key={layer.name} className="flex items-center space-x-2">
              <div
                className="w-3 h-3 rounded border"
                style={{
                  backgroundColor: `rgba(74, 144, 226, ${layer.opacity})`,
                  borderColor: '#4a90e2',
                }}
              />
              <span>{layer.name} ({layer.artifacts.length})</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default TemporalVisualization;