import React, { useRef, useMemo, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3, Color } from 'three';
import { CodeArtifact } from './types';

export interface AnimationKeyframe {
  timestamp: Date;
  artifactChanges: ArtifactChange[];
  cameraPosition?: Vector3;
  highlightedArtifacts?: string[];
}

export interface ArtifactChange {
  artifactId: string;
  changeType: 'added' | 'modified' | 'deleted' | 'moved';
  newPosition?: Vector3;
  newScale?: Vector3;
  newColor?: Color;
  transitionDuration: number;
}

export interface AnimationSequence {
  id: string;
  timeRange: {
    start: Date;
    end: Date;
  };
  keyframes: AnimationKeyframe[];
  duration: number;
  easing: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';
}

export interface AnimationSystemProps {
  artifacts: CodeArtifact[];
  currentTime: Date;
  animationSequences: AnimationSequence[];
  isPlaying: boolean;
  playbackSpeed: number;
  onArtifactUpdate: (artifactId: string, updates: Partial<CodeArtifact>) => void;
}

const AnimationSystem: React.FC<AnimationSystemProps> = ({
  artifacts,
  currentTime,
  animationSequences,
  isPlaying,
  playbackSpeed,
  onArtifactUpdate,
}) => {
  const lastUpdateTime = useRef<number>(0);
  const animationState = useRef<Map<string, any>>(new Map());

  // Easing functions
  const easingFunctions = useMemo(() => ({
    linear: (t: number) => t,
    easeIn: (t: number) => t * t,
    easeOut: (t: number) => 1 - (1 - t) * (1 - t),
    easeInOut: (t: number) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
  }), []);

  // Find active keyframes for current time
  const getActiveKeyframes = useCallback((time: Date): AnimationKeyframe[] => {
    const activeKeyframes: AnimationKeyframe[] = [];
    
    animationSequences.forEach(sequence => {
      if (time >= sequence.timeRange.start && time <= sequence.timeRange.end) {
        // Find keyframes that should be active at this time
        const relevantKeyframes = sequence.keyframes.filter(keyframe => 
          keyframe.timestamp <= time
        );
        
        // Sort by timestamp and take the most recent ones
        relevantKeyframes.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        activeKeyframes.push(...relevantKeyframes.slice(0, 5)); // Limit to prevent performance issues
      }
    });

    return activeKeyframes;
  }, [animationSequences]);

  // Interpolate between two values
  const interpolate = useCallback((
    start: number,
    end: number,
    progress: number,
    easing: keyof typeof easingFunctions = 'linear'
  ): number => {
    const easedProgress = easingFunctions[easing](Math.max(0, Math.min(1, progress)));
    return start + (end - start) * easedProgress;
  }, [easingFunctions]);

  // Interpolate Vector3
  const interpolateVector3 = useCallback((
    start: Vector3,
    end: Vector3,
    progress: number,
    easing: keyof typeof easingFunctions = 'linear'
  ): Vector3 => {
    return new Vector3(
      interpolate(start.x, end.x, progress, easing),
      interpolate(start.y, end.y, progress, easing),
      interpolate(start.z, end.z, progress, easing)
    );
  }, [interpolate]);

  // Interpolate Color
  const interpolateColor = useCallback((
    start: Color,
    end: Color,
    progress: number,
    easing: keyof typeof easingFunctions = 'linear'
  ): Color => {
    const easedProgress = easingFunctions[easing](Math.max(0, Math.min(1, progress)));
    return new Color().lerpColors(start, end, easedProgress);
  }, [easingFunctions]);

  // Apply artifact changes based on keyframes
  const applyArtifactChanges = useCallback((keyframes: AnimationKeyframe[]) => {
    const artifactUpdates = new Map<string, Partial<CodeArtifact>>();

    keyframes.forEach(keyframe => {
      keyframe.artifactChanges.forEach(change => {
        const artifact = artifacts.find(a => a.id === change.artifactId);
        if (!artifact) return;

        const currentState = animationState.current.get(change.artifactId) || {
          position: artifact.position3D.clone(),
          scale: new Vector3(1, 1, 1),
          color: new Color(artifact.color || '#4a90e2'),
          opacity: 1,
        };

        let updates: Partial<CodeArtifact> = {};

        // Calculate time-based progress for smooth transitions
        const timeSinceKeyframe = currentTime.getTime() - keyframe.timestamp.getTime();
        const progress = Math.min(1, timeSinceKeyframe / (change.transitionDuration * 1000));

        switch (change.changeType) {
          case 'added':
            // Fade in effect
            updates = {
              ...updates,
              color: change.newColor?.getHexString() || artifact.color,
            };
            currentState.opacity = interpolate(0, 1, progress, 'easeOut');
            break;

          case 'deleted':
            // Fade out effect
            currentState.opacity = interpolate(1, 0, progress, 'easeIn');
            break;

          case 'modified':
            // Color change to indicate modification
            if (change.newColor) {
              const originalColor = new Color(artifact.color || '#4a90e2');
              const modifiedColor = interpolateColor(originalColor, change.newColor, progress, 'easeInOut');
              updates.color = modifiedColor.getHexString();
            }
            break;

          case 'moved':
            // Position animation
            if (change.newPosition) {
              const newPosition = interpolateVector3(
                currentState.position,
                change.newPosition,
                progress,
                'easeInOut'
              );
              updates.position3D = newPosition;
            }
            break;
        }

        // Store updated state
        animationState.current.set(change.artifactId, {
          ...currentState,
          ...updates,
        });

        if (Object.keys(updates).length > 0) {
          artifactUpdates.set(change.artifactId, updates);
        }
      });
    });

    // Apply all updates
    artifactUpdates.forEach((updates, artifactId) => {
      onArtifactUpdate(artifactId, updates);
    });
  }, [artifacts, currentTime, interpolate, interpolateVector3, interpolateColor, onArtifactUpdate]);

  // Generate temporal layers based on time
  const generateTemporalLayers = useCallback((time: Date) => {
    const layers: Array<{
      depth: number;
      artifacts: string[];
      opacity: number;
    }> = [];

    // Create layers based on time periods
    const timeRanges = [
      { start: new Date(time.getTime() - 30 * 24 * 60 * 60 * 1000), depth: 0, opacity: 1.0 }, // Last 30 days
      { start: new Date(time.getTime() - 90 * 24 * 60 * 60 * 1000), depth: -2, opacity: 0.7 }, // Last 90 days
      { start: new Date(time.getTime() - 180 * 24 * 60 * 60 * 1000), depth: -4, opacity: 0.4 }, // Last 180 days
      { start: new Date(0), depth: -6, opacity: 0.2 }, // Everything older
    ];

    timeRanges.forEach((range, index) => {
      const layerArtifacts = artifacts
        .filter(artifact => artifact.lastModified >= range.start)
        .map(artifact => artifact.id);

      if (layerArtifacts.length > 0) {
        layers.push({
          depth: range.depth,
          artifacts: layerArtifacts,
          opacity: range.opacity,
        });
      }
    });

    return layers;
  }, [artifacts]);

  // Animation loop
  useFrame((state, delta) => {
    if (!isPlaying) return;

    const now = state.clock.getElapsedTime() * 1000;
    const deltaTime = now - lastUpdateTime.current;
    lastUpdateTime.current = now;

    // Get active keyframes for current time
    const activeKeyframes = getActiveKeyframes(currentTime);
    
    if (activeKeyframes.length > 0) {
      applyArtifactChanges(activeKeyframes);
    }

    // Apply temporal layering
    const layers = generateTemporalLayers(currentTime);
    layers.forEach(layer => {
      layer.artifacts.forEach(artifactId => {
        const currentState = animationState.current.get(artifactId) || {};
        animationState.current.set(artifactId, {
          ...currentState,
          depth: layer.depth,
          opacity: layer.opacity,
        });
      });
    });
  });

  // This component doesn't render anything directly - it's a system component
  return null;
};

export default AnimationSystem;