import { useEffect, useRef, useState, useCallback } from 'react';
import { GestureRecognitionEngine, GesturePattern, GestureResult } from '../services/GestureRecognitionEngine';

export interface GestureRecognitionOptions {
  enableCamera?: boolean;
  enableTouch?: boolean;
  enableMouse?: boolean;
  enableKeyboard?: boolean;
  context?: string[];
  autoStart?: boolean;
}

export interface GestureRecognitionState {
  isInitialized: boolean;
  isSupported: boolean;
  cameraActive: boolean;
  lastGesture: GestureResult | null;
  error: string | null;
  isCalibrating: boolean;
  gestureHistory: Array<{ gesture: string; time: number }>;
}

export function useGestureRecognition(options: GestureRecognitionOptions = {}) {
  const engineRef = useRef<GestureRecognitionEngine | null>(null);
  const [state, setState] = useState<GestureRecognitionState>({
    isInitialized: false,
    isSupported: false,
    cameraActive: false,
    lastGesture: null,
    error: null,
    isCalibrating: false,
    gestureHistory: []
  });

  // Initialize gesture recognition engine
  useEffect(() => {
    const engine = new GestureRecognitionEngine();
    engineRef.current = engine;

    // Set up event listeners
    engine.on('initialized', () => {
      setState(prev => ({ ...prev, isInitialized: true }));
    });

    engine.on('gesture', (result: GestureResult) => {
      setState(prev => ({ 
        ...prev, 
        lastGesture: result,
        gestureHistory: [...prev.gestureHistory.slice(-19), { gesture: result.pattern.name, time: Date.now() }]
      }));
    });

    engine.on('error', (error: string) => {
      setState(prev => ({ ...prev, error }));
    });

    engine.on('calibrationStart', () => {
      setState(prev => ({ ...prev, isCalibrating: true }));
    });

    engine.on('calibrationComplete', () => {
      setState(prev => ({ ...prev, isCalibrating: false }));
    });

    // Check if supported
    setState(prev => ({ ...prev, isSupported: engine.isSupported() }));

    // Initialize if auto-start is enabled
    if (options.autoStart !== false) {
      engine.initialize().catch(error => {
        setState(prev => ({ ...prev, error: error.message }));
      });
    }

    return () => {
      engine.destroy();
    };
  }, [options.autoStart]);

  // Start camera gestures
  const startCameraGestures = useCallback(async () => {
    if (engineRef.current && options.enableCamera !== false) {
      try {
        await engineRef.current.startCameraGestures();
        setState(prev => ({ ...prev, cameraActive: true }));
      } catch (error) {
        setState(prev => ({ ...prev, error: (error as Error).message }));
      }
    }
  }, [options.enableCamera]);

  // Stop camera gestures
  const stopCameraGestures = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.stopCameraGestures();
      setState(prev => ({ ...prev, cameraActive: false }));
    }
  }, []);

  // Add custom gesture pattern
  const addGesturePattern = useCallback((pattern: GesturePattern) => {
    engineRef.current?.addPattern(pattern);
  }, []);

  // Remove gesture pattern
  const removeGesturePattern = useCallback((patternId: string) => {
    engineRef.current?.removePattern(patternId);
  }, []);

  // Get all gesture patterns
  const getGesturePatterns = useCallback(() => {
    return engineRef.current?.getPatterns() || [];
  }, []);

  // Start calibration
  const startCalibration = useCallback(() => {
    engineRef.current?.calibrateGestures();
  }, []);

  // Clear gesture history
  const clearHistory = useCallback(() => {
    engineRef.current?.clearGestureHistory();
    setState(prev => ({ ...prev, gestureHistory: [] }));
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Get engine stats
  const getStats = useCallback(() => {
    return engineRef.current?.getStats() || {};
  }, []);

  return {
    // State
    ...state,
    
    // Actions
    startCameraGestures,
    stopCameraGestures,
    addGesturePattern,
    removeGesturePattern,
    getGesturePatterns,
    startCalibration,
    clearHistory,
    clearError,
    getStats,
    
    // Engine reference for advanced usage
    engine: engineRef.current
  };
}