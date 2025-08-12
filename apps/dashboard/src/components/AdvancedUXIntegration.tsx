import React, { useEffect, useState } from 'react';
import { useVoiceCommands } from '../hooks/useVoiceCommands';
import { useGestureRecognition } from '../hooks/useGestureRecognition';
import { VoiceCommandInterface } from './VoiceCommandInterface';

interface AdvancedUXIntegrationProps {
  currentPage: string;
  userId: string;
  onContextChange?: (context: any) => void;
}

export const AdvancedUXIntegration: React.FC<AdvancedUXIntegrationProps> = ({
  currentPage,
  userId,
  onContextChange
}) => {
  const [isEnabled, setIsEnabled] = useState(true);
  const [contextData, setContextData] = useState<any>({});

  // Voice commands integration
  const {
    isListening,
    lastCommand,
    speak,
    startListening,
    stopListening
  } = useVoiceCommands({
    context: [currentPage],
    autoStart: false
  });

  // Gesture recognition integration
  const {
    isInitialized: gestureInitialized,
    lastGesture,
    startCameraGestures,
    stopCameraGestures
  } = useGestureRecognition({
    enableCamera: true,
    enableTouch: true,
    enableMouse: true,
    context: [currentPage]
  });

  // Context engine integration
  useEffect(() => {
    const updateContext = async () => {
      try {
        // Update context with current state
        const context = {
          currentPage,
          userId,
          timestamp: new Date(),
          voiceActive: isListening,
          gestureActive: gestureInitialized,
          focusLevel: calculateFocusLevel(),
          activityType: determineActivityType()
        };

        setContextData(context);
        onContextChange?.(context);

        // Send to context engine
        await fetch('/api/context/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, context })
        });
      } catch (error) {
        console.error('Failed to update context:', error);
      }
    };

    updateContext();
    const interval = setInterval(updateContext, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [currentPage, userId, isListening, gestureInitialized, onContextChange]);

  // Handle voice commands
  useEffect(() => {
    if (lastCommand) {
      handleCommand(lastCommand);
    }
  }, [lastCommand]);

  // Handle gestures
  useEffect(() => {
    if (lastGesture) {
      handleGesture(lastGesture);
    }
  }, [lastGesture]);

  const calculateFocusLevel = (): number => {
    // Simple focus calculation based on activity
    let focus = 70; // Base level
    
    if (isListening) focus += 10; // Voice interaction shows engagement
    if (gestureInitialized) focus += 5; // Gesture setup shows engagement
    
    return Math.min(100, focus);
  };

  const determineActivityType = (): string => {
    // Determine activity based on current page and interactions
    const pageActivityMap: Record<string, string> = {
      'dashboard': 'planning',
      'tasks': 'coding',
      'analytics': 'reviewing',
      'settings': 'planning'
    };
    
    return pageActivityMap[currentPage] || 'coding';
  };

  const handleCommand = (command: any) => {
    console.log('Executing voice command:', command);
    
    // Provide voice feedback
    speak(`Executing ${command.command.name}`);
    
    // Execute the command based on its action
    switch (command.command.action) {
      case 'navigate':
        window.location.hash = `#/${command.command.parameters.page}`;
        break;
      case 'create_task':
        // Emit event for task creation
        window.dispatchEvent(new CustomEvent('createTask', {
          detail: command.parameters
        }));
        break;
      case 'search':
        // Emit event for search
        window.dispatchEvent(new CustomEvent('search', {
          detail: { query: command.parameters.query }
        }));
        break;
      default:
        console.log('Unknown command action:', command.command.action);
    }
  };

  const handleGesture = (gesture: any) => {
    console.log('Executing gesture:', gesture);
    
    // Execute gesture-based actions
    switch (gesture.pattern.action) {
      case 'refresh':
        window.location.reload();
        break;
      case 'navigate_back':
        window.history.back();
        break;
      case 'navigate_forward':
        window.history.forward();
        break;
      case 'select':
        // Emit selection event
        window.dispatchEvent(new CustomEvent('gestureSelect', {
          detail: { coordinates: gesture.coordinates }
        }));
        break;
      default:
        console.log('Unknown gesture action:', gesture.pattern.action);
    }
  };

  if (!isEnabled) {
    return (
      <div className="advanced-ux-integration">
        <button
          onClick={() => setIsEnabled(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded-md"
        >
          Enable Advanced UX Features
        </button>
      </div>
    );
  }

  return (
    <div className="advanced-ux-integration">
      {/* Voice Command Interface */}
      <VoiceCommandInterface
        context={[currentPage]}
        onCommand={handleCommand}
        className="mb-4"
      />

      {/* Status Indicators */}
      <div className="flex items-center space-x-4 mb-4">
        <div className={`flex items-center space-x-2 ${isListening ? 'text-green-600' : 'text-gray-400'}`}>
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
          </svg>
          <span className="text-sm">Voice {isListening ? 'Active' : 'Ready'}</span>
        </div>

        <div className={`flex items-center space-x-2 ${gestureInitialized ? 'text-green-600' : 'text-gray-400'}`}>
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M5.5 16a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 16h-8z" />
          </svg>
          <span className="text-sm">Gestures {gestureInitialized ? 'Active' : 'Ready'}</span>
        </div>

        <div className="flex items-center space-x-2 text-blue-600">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
          </svg>
          <span className="text-sm">Focus: {contextData.focusLevel || 70}%</span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => isListening ? stopListening() : startListening()}
          className={`px-3 py-1 rounded-md text-sm ${
            isListening 
              ? 'bg-red-100 text-red-700 hover:bg-red-200' 
              : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
          }`}
        >
          {isListening ? 'Stop Voice' : 'Start Voice'}
        </button>

        <button
          onClick={() => gestureInitialized ? stopCameraGestures() : startCameraGestures()}
          className="bg-green-100 text-green-700 hover:bg-green-200 px-3 py-1 rounded-md text-sm"
        >
          {gestureInitialized ? 'Stop Camera' : 'Start Camera'}
        </button>

        <button
          onClick={() => setIsEnabled(false)}
          className="bg-gray-100 text-gray-700 hover:bg-gray-200 px-3 py-1 rounded-md text-sm"
        >
          Disable UX Features
        </button>
      </div>

      {/* Context Information */}
      <div className="mt-4 p-3 bg-gray-50 rounded-md">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Current Context</h4>
        <div className="text-xs text-gray-600 space-y-1">
          <div>Page: {currentPage}</div>
          <div>Activity: {contextData.activityType}</div>
          <div>Focus Level: {contextData.focusLevel}%</div>
          <div>Last Updated: {contextData.timestamp?.toLocaleTimeString()}</div>
        </div>
      </div>
    </div>
  );
};