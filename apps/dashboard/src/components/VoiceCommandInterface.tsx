import React, { useState, useEffect } from 'react';
import { useVoiceCommands } from '../hooks/useVoiceCommands';
import { VoiceCommand } from '../services/VoiceCommandProcessor';

interface VoiceCommandInterfaceProps {
  context?: string[];
  onCommand?: (command: any) => void;
  className?: string;
}

export const VoiceCommandInterface: React.FC<VoiceCommandInterfaceProps> = ({
  context = [],
  onCommand,
  className = ''
}) => {
  const [showCommands, setShowCommands] = useState(false);
  const [showTraining, setShowTraining] = useState(false);
  const [trainingTranscript, setTrainingTranscript] = useState('');
  const [selectedCommandId, setSelectedCommandId] = useState('');

  const {
    isListening,
    isSupported,
    transcript,
    confidence,
    lastCommand,
    error,
    isSpeaking,
    startListening,
    stopListening,
    toggleListening,
    speak,
    getCommands,
    trainCommand,
    clearError,
    clearTranscript
  } = useVoiceCommands({
    context,
    autoStart: false,
    continuous: true
  });

  // Handle command execution
  useEffect(() => {
    if (lastCommand && onCommand) {
      onCommand(lastCommand);
    }
  }, [lastCommand, onCommand]);

  const handleTrainCommand = () => {
    if (trainingTranscript && selectedCommandId) {
      trainCommand(trainingTranscript, selectedCommandId);
      setTrainingTranscript('');
      setSelectedCommandId('');
      speak('Command trained successfully');
    }
  };

  const getStatusColor = () => {
    if (!isSupported) return 'text-gray-400';
    if (error) return 'text-red-500';
    if (isSpeaking) return 'text-blue-500';
    if (isListening) return 'text-green-500';
    return 'text-gray-600';
  };

  const getStatusText = () => {
    if (!isSupported) return 'Voice commands not supported';
    if (error) return `Error: ${error}`;
    if (isSpeaking) return 'Speaking...';
    if (isListening) return 'Listening...';
    return 'Voice commands ready';
  };

  if (!isSupported) {
    return (
      <div className={`voice-command-interface ${className}`}>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="text-yellow-800">Voice commands are not supported in this browser</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`voice-command-interface ${className}`}>
      {/* Main Voice Control */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={toggleListening}
              className={`p-3 rounded-full transition-all duration-200 ${
                isListening 
                  ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg' 
                  : 'bg-blue-500 hover:bg-blue-600 text-white shadow-md'
              }`}
              disabled={!isSupported}
            >
              {isListening ? (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                </svg>
              )}
            </button>
            
            <div>
              <div className={`font-medium ${getStatusColor()}`}>
                {getStatusText()}
              </div>
              {transcript && (
                <div className="text-sm text-gray-600 mt-1">
                  "{transcript}" {confidence > 0 && `(${Math.round(confidence * 100)}%)`}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowCommands(!showCommands)}
              className="p-2 text-gray-500 hover:text-gray-700 rounded-md hover:bg-gray-100"
              title="Show available commands"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            
            <button
              onClick={() => setShowTraining(!showTraining)}
              className="p-2 text-gray-500 hover:text-gray-700 rounded-md hover:bg-gray-100"
              title="Train commands"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
            <div className="flex items-center justify-between">
              <span className="text-red-800 text-sm">{error}</span>
              <button
                onClick={clearError}
                className="text-red-600 hover:text-red-800"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Last Command Display */}
        {lastCommand && (
          <div className="bg-green-50 border border-green-200 rounded-md p-3 mb-4">
            <div className="text-green-800 text-sm">
              <strong>Command executed:</strong> {lastCommand.command.name}
              <br />
              <span className="text-green-600">"{lastCommand.transcript}" ({Math.round(lastCommand.confidence * 100)}% confidence)</span>
            </div>
          </div>
        )}
      </div>

      {/* Available Commands */}
      {showCommands && (
        <div className="mt-4 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="font-medium text-gray-900 mb-3">Available Voice Commands</h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {getCommands().map((command: VoiceCommand) => (
              <div key={command.id} className="border-l-4 border-blue-200 pl-3">
                <div className="font-medium text-sm text-gray-900">{command.name}</div>
                <div className="text-xs text-gray-600 mb-1">{command.description}</div>
                <div className="text-xs text-gray-500">
                  Examples: {command.patterns.slice(0, 2).map(pattern => `"${pattern}"`).join(', ')}
                  {command.patterns.length > 2 && ` +${command.patterns.length - 2} more`}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Command Training */}
      {showTraining && (
        <div className="mt-4 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="font-medium text-gray-900 mb-3">Train Voice Commands</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Command to train
              </label>
              <select
                value={selectedCommandId}
                onChange={(e) => setSelectedCommandId(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">Select a command...</option>
                {getCommands().map((command: VoiceCommand) => (
                  <option key={command.id} value={command.id}>
                    {command.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New phrase to recognize
              </label>
              <input
                type="text"
                value={trainingTranscript}
                onChange={(e) => setTrainingTranscript(e.target.value)}
                placeholder="Enter a new way to say this command..."
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            
            <button
              onClick={handleTrainCommand}
              disabled={!trainingTranscript || !selectedCommandId}
              className="bg-blue-500 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Train Command
            </button>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={() => speak('Voice commands are ready. Try saying "help" to see what I can do.')}
          className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded-md text-sm"
        >
          Test Speech
        </button>
        
        <button
          onClick={clearTranscript}
          className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded-md text-sm"
        >
          Clear Transcript
        </button>
        
        <button
          onClick={() => speak('help')}
          className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded-md text-sm"
        >
          Show Help
        </button>
      </div>
    </div>
  );
};