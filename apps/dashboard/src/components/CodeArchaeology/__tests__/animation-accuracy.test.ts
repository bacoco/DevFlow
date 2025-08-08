/**
 * Animation Accuracy Tests
 * Comprehensive testing framework for temporal navigation and animation accuracy
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TemporalVisualization } from '../TemporalVisualization';
import { AnimationSystem } from '../AnimationSystem';
import { TemporalControls } from '../TemporalControls';
import type { AnimationSequence, AnimationKeyframe, ArtifactChange } from '../types';

// Mock performance.now for consistent timing
let mockTime = 0;
const originalPerformanceNow = performance.now;

beforeAll(() => {
  Object.defineProperty(performance, 'now', {
    value: jest.fn(() => mockTime),
  });
});

afterAll(() => {
  Object.defineProperty(performance, 'now', {
    value: originalPerformanceNow,
  });
});

// Animation frame management
let animationFrameId = 0;
const animationFrameCallbacks = new Map<number, FrameRequestCallback>();

const mockRequestAnimationFrame = jest.fn((callback: FrameRequestCallback) => {
  const id = ++animationFrameId;
  animationFrameCallbacks.set(id, callback);
  return id;
});

const mockCancelAnimationFrame = jest.fn((id: number) => {
  animationFrameCallbacks.delete(id);
});

global.requestAnimationFrame = mockRequestAnimationFrame;
global.cancelAnimationFrame = mockCancelAnimationFrame;

const triggerAnimationFrame = (deltaTime = 16.67) => {
  mockTime += deltaTime;
  animationFrameCallbacks.forEach(callback => callback(mockTime));
  animationFrameCallbacks.clear();
};

const advanceTime = (ms: number) => {
  mockTime += ms;
};

// Test data
const createTestAnimationSequence = (id: string, duration: number): AnimationSequence => ({
  id,
  timeRange: {
    start: new Date('2023-01-01'),
    end: new Date('2023-01-31'),
  },
  keyframes: [
    {
      timestamp: new Date('2023-01-01'),
      artifactChanges: [
        {
          artifactId: 'artifact-1',
          changeType: 'added',
          newPosition: { x: 0, y: 0, z: 0 },
          newColor: { r: 0, g: 1, b: 0 },
          transitionDuration: duration / 2,
        },
      ],
    },
    {
      timestamp: new Date('2023-01-15'),
      artifactChanges: [
        {
          artifactId: 'artifact-1',
          changeType: 'modified',
          newPosition: { x: 5, y: 0, z: 0 },
          newColor: { r: 1, g: 0, b: 0 },
          transitionDuration: duration / 2,
        },
      ],
    },
    {
      timestamp: new Date('2023-01-31'),
      artifactChanges: [
        {
          artifactId: 'artifact-1',
          changeType: 'deleted',
          transitionDuration: duration / 4,
        },
      ],
    },
  ],
  duration,
  easing: 'easeInOut',
});

const createComplexAnimationSequence = (): AnimationSequence => ({
  id: 'complex-animation',
  timeRange: {
    start: new Date('2023-01-01'),
    end: new Date('2023-12-31'),
  },
  keyframes: Array.from({ length: 12 }, (_, month) => ({
    timestamp: new Date(2023, month, 1),
    artifactChanges: Array.from({ length: 5 }, (_, i) => ({
      artifactId: `artifact-${i}`,
      changeType: 'modified' as const,
      newPosition: {
        x: Math.sin(month * Math.PI / 6) * 10,
        y: Math.cos(month * Math.PI / 6) * 10,
        z: month * 0.5,
      },
      newScale: {
        x: 1 + month * 0.1,
        y: 1 + month * 0.1,
        z: 1 + month * 0.1,
      },
      newColor: {
        r: month / 12,
        g: 0.5,
        b: 1 - month / 12,
      },
      transitionDuration: 1000,
    })),
  })),
  duration: 12000,
  easing: 'easeInOut',
});

// Animation testing utilities
class AnimationTester {
  private startTime: number = 0;
  private currentTime: number = 0;
  private isPlaying: boolean = false;
  private playbackSpeed: number = 1;
  private keyframes: AnimationKeyframe[] = [];
  private onUpdate?: (progress: number, currentKeyframe: AnimationKeyframe | null) => void;

  constructor(animation: AnimationSequence) {
    this.keyframes = animation.keyframes;
  }

  play(onUpdate?: (progress: number, currentKeyframe: AnimationKeyframe | null) => void): void {
    this.isPlaying = true;
    this.startTime = mockTime;
    this.onUpdate = onUpdate;
  }

  pause(): void {
    this.isPlaying = false;
  }

  stop(): void {
    this.isPlaying = false;
    this.currentTime = 0;
  }

  setPlaybackSpeed(speed: number): void {
    this.playbackSpeed = speed;
  }

  seekTo(time: number): void {
    this.currentTime = time;
    this.updateAnimation();
  }

  tick(deltaTime: number): void {
    if (!this.isPlaying) return;

    this.currentTime += deltaTime * this.playbackSpeed;
    this.updateAnimation();
  }

  private updateAnimation(): void {
    const progress = this.currentTime / (this.keyframes.length * 1000);
    const currentKeyframe = this.getCurrentKeyframe();
    
    if (this.onUpdate) {
      this.onUpdate(progress, currentKeyframe);
    }
  }

  private getCurrentKeyframe(): AnimationKeyframe | null {
    const keyframeIndex = Math.floor(this.currentTime / 1000);
    return this.keyframes[keyframeIndex] || null;
  }

  getCurrentTime(): number {
    return this.currentTime;
  }

  getProgress(): number {
    return this.currentTime / (this.keyframes.length * 1000);
  }

  isComplete(): boolean {
    return this.currentTime >= this.keyframes.length * 1000;
  }
}

// Easing function testing
class EasingTester {
  static testEaseInOut(t: number): number {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }

  static testEaseIn(t: number): number {
    return t * t;
  }

  static testEaseOut(t: number): number {
    return t * (2 - t);
  }

  static testLinear(t: number): number {
    return t;
  }

  static validateEasingFunction(easingFn: (t: number) => number): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Test boundary conditions
    const start = easingFn(0);
    const end = easingFn(1);

    if (Math.abs(start) > 0.001) {
      errors.push(`Easing function should return 0 at t=0, got ${start}`);
    }

    if (Math.abs(end - 1) > 0.001) {
      errors.push(`Easing function should return 1 at t=1, got ${end}`);
    }

    // Test monotonicity (should be non-decreasing)
    let previousValue = start;
    for (let i = 1; i <= 100; i++) {
      const t = i / 100;
      const value = easingFn(t);
      
      if (value < previousValue - 0.001) {
        errors.push(`Easing function is not monotonic at t=${t}`);
        break;
      }
      
      previousValue = value;
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

describe('Animation Accuracy Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTime = 0;
    animationFrameCallbacks.clear();
  });

  describe('Temporal Navigation Accuracy', () => {
    it('should accurately interpolate between keyframes', async () => {
      const animation = createTestAnimationSequence('test-interpolation', 2000);
      const tester = new AnimationTester(animation);
      
      const interpolationResults: Array<{
        time: number;
        progress: number;
        expectedPosition: { x: number; y: number; z: number };
      }> = [];

      tester.play((progress, keyframe) => {
        if (keyframe) {
          interpolationResults.push({
            time: tester.getCurrentTime(),
            progress,
            expectedPosition: keyframe.artifactChanges[0]?.newPosition || { x: 0, y: 0, z: 0 },
          });
        }
      });

      // Test interpolation at various points
      const testPoints = [0, 0.25, 0.5, 0.75, 1.0];
      
      for (const point of testPoints) {
        const targetTime = point * 2000;
        tester.seekTo(targetTime);
        tester.tick(0); // Trigger update without advancing time

        const result = interpolationResults[interpolationResults.length - 1];
        expect(result.time).toBe(targetTime);
        expect(result.progress).toBeCloseTo(point, 2);

        // Verify position interpolation
        if (point <= 0.5) {
          // First half: interpolating from (0,0,0) to (5,0,0)
          const expectedX = point * 2 * 5; // Double because we're in first half
          expect(result.expectedPosition.x).toBeCloseTo(expectedX, 1);
        }
      }
    });

    it('should handle smooth transitions between time periods', async () => {
      const { container } = render(
        <TemporalVisualization
          animations={[createTestAnimationSequence('smooth-transition', 1000)]}
          currentTime={new Date('2023-01-01')}
          onTimeChange={jest.fn()}
          width={800}
          height={600}
        />
      );

      await waitFor(() => {
        expect(container.querySelector('canvas')).toBeInTheDocument();
      });

      const transitionFrames: number[] = [];
      const frameCount = 60; // 1 second at 60fps
      
      // Capture transition smoothness
      for (let frame = 0; frame < frameCount; frame++) {
        const frameTime = (frame / frameCount) * 1000;
        advanceTime(16.67);
        triggerAnimationFrame();
        
        transitionFrames.push(frameTime);
      }

      // Verify smooth progression
      expect(transitionFrames).toHaveLength(frameCount);
      
      // Check that frame times are evenly distributed
      for (let i = 1; i < transitionFrames.length; i++) {
        const deltaTime = transitionFrames[i] - transitionFrames[i - 1];
        expect(deltaTime).toBeCloseTo(16.67, 1); // 60fps = 16.67ms per frame
      }
    });

    it('should maintain accurate timing with variable playback speeds', async () => {
      const animation = createTestAnimationSequence('variable-speed', 2000);
      const tester = new AnimationTester(animation);
      
      const playbackSpeeds = [0.5, 1.0, 1.5, 2.0];
      
      for (const speed of playbackSpeeds) {
        tester.stop();
        tester.setPlaybackSpeed(speed);
        tester.play();

        const startTime = mockTime;
        const targetProgress = 0.5; // 50% through animation
        const expectedDuration = (2000 / speed) * targetProgress;

        // Run animation to 50% completion
        while (tester.getProgress() < targetProgress) {
          tester.tick(16.67);
          advanceTime(16.67);
        }

        const actualDuration = mockTime - startTime;
        expect(actualDuration).toBeCloseTo(expectedDuration, 50); // 50ms tolerance
        expect(tester.getProgress()).toBeCloseTo(targetProgress, 0.05);
      }
    });

    it('should handle complex multi-artifact animations', async () => {
      const complexAnimation = createComplexAnimationSequence();
      const tester = new AnimationTester(complexAnimation);
      
      const artifactStates = new Map<string, {
        position: { x: number; y: number; z: number };
        scale: { x: number; y: number; z: number };
        color: { r: number; g: number; b: number };
      }>();

      tester.play((progress, keyframe) => {
        if (keyframe) {
          keyframe.artifactChanges.forEach(change => {
            artifactStates.set(change.artifactId, {
              position: change.newPosition || { x: 0, y: 0, z: 0 },
              scale: change.newScale || { x: 1, y: 1, z: 1 },
              color: change.newColor || { r: 0.5, g: 0.5, b: 0.5 },
            });
          });
        }
      });

      // Test animation at various points
      const testPoints = [0, 0.25, 0.5, 0.75, 1.0];
      
      for (const point of testPoints) {
        tester.seekTo(point * 12000);
        tester.tick(0);

        // Verify all artifacts have valid states
        expect(artifactStates.size).toBeGreaterThan(0);
        
        artifactStates.forEach((state, artifactId) => {
          expect(state.position.x).toBeFinite();
          expect(state.position.y).toBeFinite();
          expect(state.position.z).toBeFinite();
          expect(state.scale.x).toBeGreaterThan(0);
          expect(state.scale.y).toBeGreaterThan(0);
          expect(state.scale.z).toBeGreaterThan(0);
          expect(state.color.r).toBeGreaterThanOrEqual(0);
          expect(state.color.r).toBeLessThanOrEqual(1);
        });
      }
    });
  });

  describe('Easing Function Validation', () => {
    it('should validate easeInOut function', () => {
      const result = EasingTester.validateEasingFunction(EasingTester.testEaseInOut);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);

      // Test specific values
      expect(EasingTester.testEaseInOut(0)).toBeCloseTo(0, 3);
      expect(EasingTester.testEaseInOut(0.5)).toBeCloseTo(0.5, 3);
      expect(EasingTester.testEaseInOut(1)).toBeCloseTo(1, 3);
    });

    it('should validate easeIn function', () => {
      const result = EasingTester.validateEasingFunction(EasingTester.testEaseIn);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);

      // Test characteristic curve
      expect(EasingTester.testEaseIn(0.5)).toBeLessThan(0.5); // Should be slower at start
      expect(EasingTester.testEaseIn(0.8)).toBeGreaterThan(0.6); // Should accelerate
    });

    it('should validate easeOut function', () => {
      const result = EasingTester.validateEasingFunction(EasingTester.testEaseOut);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);

      // Test characteristic curve
      expect(EasingTester.testEaseOut(0.2)).toBeGreaterThan(0.3); // Should be faster at start
      expect(EasingTester.testEaseOut(0.8)).toBeLessThan(0.9); // Should decelerate
    });

    it('should validate linear function', () => {
      const result = EasingTester.validateEasingFunction(EasingTester.testLinear);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);

      // Test linearity
      for (let i = 0; i <= 10; i++) {
        const t = i / 10;
        expect(EasingTester.testLinear(t)).toBeCloseTo(t, 3);
      }
    });

    it('should detect invalid easing functions', () => {
      // Test function that doesn't start at 0
      const invalidStart = (t: number) => t + 0.1;
      const result1 = EasingTester.validateEasingFunction(invalidStart);
      expect(result1.valid).toBe(false);
      expect(result1.errors).toContain(expect.stringContaining('should return 0 at t=0'));

      // Test function that doesn't end at 1
      const invalidEnd = (t: number) => t * 0.9;
      const result2 = EasingTester.validateEasingFunction(invalidEnd);
      expect(result2.valid).toBe(false);
      expect(result2.errors).toContain(expect.stringContaining('should return 1 at t=1'));

      // Test non-monotonic function
      const nonMonotonic = (t: number) => Math.sin(t * Math.PI * 2);
      const result3 = EasingTester.validateEasingFunction(nonMonotonic);
      expect(result3.valid).toBe(false);
      expect(result3.errors).toContain(expect.stringContaining('not monotonic'));
    });
  });

  describe('Animation Performance', () => {
    it('should maintain consistent frame rates during animation', async () => {
      const animation = createComplexAnimationSequence();
      const tester = new AnimationTester(animation);
      
      const frameTimes: number[] = [];
      let frameCount = 0;
      const maxFrames = 120; // 2 seconds at 60fps

      tester.play();

      while (frameCount < maxFrames && !tester.isComplete()) {
        const frameStart = performance.now();
        
        tester.tick(16.67);
        triggerAnimationFrame();
        
        const frameEnd = performance.now();
        frameTimes.push(frameEnd - frameStart);
        frameCount++;
      }

      // Analyze frame time consistency
      const averageFrameTime = frameTimes.reduce((sum, time) => sum + time, 0) / frameTimes.length;
      const maxFrameTime = Math.max(...frameTimes);
      const minFrameTime = Math.min(...frameTimes);
      const variance = frameTimes.reduce((sum, time) => sum + Math.pow(time - averageFrameTime, 2), 0) / frameTimes.length;

      expect(averageFrameTime).toBeLessThan(16.67); // Should maintain 60fps
      expect(maxFrameTime).toBeLessThan(33.33); // No frame should drop below 30fps
      expect(variance).toBeLessThan(25); // Low variance indicates consistent performance
    });

    it('should handle animation interruption and resumption', async () => {
      const animation = createTestAnimationSequence('interruption-test', 2000);
      const tester = new AnimationTester(animation);
      
      // Start animation
      tester.play();
      
      // Run for 25% of duration
      const quarterDuration = 500;
      let elapsed = 0;
      while (elapsed < quarterDuration) {
        tester.tick(16.67);
        elapsed += 16.67;
      }
      
      const progressAtPause = tester.getProgress();
      expect(progressAtPause).toBeCloseTo(0.25, 0.05);
      
      // Pause animation
      tester.pause();
      const pauseTime = tester.getCurrentTime();
      
      // Advance time while paused (should not affect animation)
      advanceTime(1000);
      expect(tester.getCurrentTime()).toBe(pauseTime);
      
      // Resume animation
      tester.play();
      
      // Continue for another 25%
      elapsed = 0;
      while (elapsed < quarterDuration) {
        tester.tick(16.67);
        elapsed += 16.67;
      }
      
      const progressAfterResume = tester.getProgress();
      expect(progressAfterResume).toBeCloseTo(0.5, 0.05);
    });

    it('should handle seek operations accurately', async () => {
      const animation = createTestAnimationSequence('seek-test', 4000);
      const tester = new AnimationTester(animation);
      
      const seekTargets = [0, 0.25, 0.5, 0.75, 1.0];
      
      for (const target of seekTargets) {
        const targetTime = target * 4000;
        tester.seekTo(targetTime);
        
        expect(tester.getCurrentTime()).toBe(targetTime);
        expect(tester.getProgress()).toBeCloseTo(target, 0.001);
        
        // Verify animation state is correct after seek
        tester.tick(0); // Trigger update without advancing time
        
        if (target === 1.0) {
          expect(tester.isComplete()).toBe(true);
        } else {
          expect(tester.isComplete()).toBe(false);
        }
      }
    });
  });

  describe('Animation System Integration', () => {
    it('should coordinate multiple simultaneous animations', async () => {
      const animations = [
        createTestAnimationSequence('anim-1', 1000),
        createTestAnimationSequence('anim-2', 1500),
        createTestAnimationSequence('anim-3', 2000),
      ];

      const testers = animations.map(anim => new AnimationTester(anim));
      const completionTimes: number[] = [];

      // Start all animations
      testers.forEach(tester => tester.play());

      // Run until all complete
      let allComplete = false;
      while (!allComplete) {
        testers.forEach((tester, index) => {
          if (!tester.isComplete()) {
            tester.tick(16.67);
          } else if (completionTimes[index] === undefined) {
            completionTimes[index] = tester.getCurrentTime();
          }
        });

        allComplete = testers.every(tester => tester.isComplete());
        advanceTime(16.67);
      }

      // Verify completion times match expected durations
      expect(completionTimes[0]).toBeCloseTo(1000, 50);
      expect(completionTimes[1]).toBeCloseTo(1500, 50);
      expect(completionTimes[2]).toBeCloseTo(2000, 50);
    });

    it('should handle animation cleanup properly', async () => {
      const animation = createTestAnimationSequence('cleanup-test', 1000);
      const tester = new AnimationTester(animation);
      
      // Start animation
      tester.play();
      expect(mockRequestAnimationFrame).toHaveBeenCalled();
      
      // Run partially
      for (let i = 0; i < 30; i++) {
        tester.tick(16.67);
        triggerAnimationFrame();
      }
      
      // Stop animation
      tester.stop();
      
      // Verify cleanup
      expect(tester.getCurrentTime()).toBe(0);
      expect(tester.getProgress()).toBe(0);
      expect(tester.isComplete()).toBe(false);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty animation sequences', () => {
      const emptyAnimation: AnimationSequence = {
        id: 'empty',
        timeRange: {
          start: new Date('2023-01-01'),
          end: new Date('2023-01-01'),
        },
        keyframes: [],
        duration: 0,
        easing: 'linear',
      };

      const tester = new AnimationTester(emptyAnimation);
      
      expect(() => {
        tester.play();
        tester.tick(16.67);
      }).not.toThrow();
      
      expect(tester.isComplete()).toBe(true);
      expect(tester.getProgress()).toBe(0);
    });

    it('should handle invalid time values gracefully', () => {
      const animation = createTestAnimationSequence('invalid-time-test', 1000);
      const tester = new AnimationTester(animation);
      
      // Test negative seek
      expect(() => tester.seekTo(-100)).not.toThrow();
      expect(tester.getCurrentTime()).toBeGreaterThanOrEqual(0);
      
      // Test seek beyond duration
      expect(() => tester.seekTo(5000)).not.toThrow();
      expect(tester.getCurrentTime()).toBeLessThanOrEqual(5000);
      
      // Test invalid playback speed
      expect(() => tester.setPlaybackSpeed(-1)).not.toThrow();
      expect(() => tester.setPlaybackSpeed(0)).not.toThrow();
    });

    it('should handle animation with missing artifact changes', () => {
      const incompleteAnimation: AnimationSequence = {
        id: 'incomplete',
        timeRange: {
          start: new Date('2023-01-01'),
          end: new Date('2023-01-02'),
        },
        keyframes: [
          {
            timestamp: new Date('2023-01-01'),
            artifactChanges: [], // Empty changes
          },
          {
            timestamp: new Date('2023-01-02'),
            artifactChanges: [
              {
                artifactId: 'artifact-1',
                changeType: 'modified',
                // Missing position/color data
                transitionDuration: 1000,
              },
            ],
          },
        ],
        duration: 1000,
        easing: 'linear',
      };

      const tester = new AnimationTester(incompleteAnimation);
      
      expect(() => {
        tester.play();
        tester.tick(500);
        tester.tick(500);
      }).not.toThrow();
      
      expect(tester.isComplete()).toBe(true);
    });
  });
});