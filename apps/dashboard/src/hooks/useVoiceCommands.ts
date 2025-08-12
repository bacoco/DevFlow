import { useEffect, useRef, useState, useCallback } from 'react';
import { VoiceCommandProcessor, VoiceCommand, VoiceCommandResult } from '../services/VoiceCommandProcessor';

export interface VoiceCommandHookOptions {
  autoStart?: boolean;
  language?: string;
  continuous?: boolean;
  context?: string[];
}

export interface VoiceCommandState {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  confidence: number;
  lastCommand: VoiceCommandResult | null;
  error: string | null;
  isSpeaking: boolean;
}

export function useVoiceCommands(options: VoiceCommandHookOptions = {}) {
  const processorRef = useRef<VoiceCommandProcessor | null>(null);
  const [state, setState] = useState<VoiceCommandState>({
    isListening: false,
    isSupported: false,
    transcript: '',
    confidence: 0,
    lastCommand: null,
    error: null,
    isSpeaking: false
  });

  // Initialize voice processor
  useEffect(() => {
    const processor = new VoiceCommandProcessor({
      language: options.language || 'en-US',
      continuous: options.continuous !== false,
      interimResults: true,
      maxAlternatives: 3
    });

    processorRef.current = processor;

    // Set initial context
    if (options.context) {
      processor.setContext(options.context);
    }

    // Set up event listeners
    processor.on('listening', (isListening: boolean) => {
      setState(prev => ({ ...prev, isListening }));
    });

    processor.on('transcript', ({ transcript, confidence, isFinal }: any) => {
      setState(prev => ({ 
        ...prev, 
        transcript: isFinal ? transcript : prev.transcript,
        confidence: isFinal ? confidence : prev.confidence
      }));
    });

    processor.on('command', (result: VoiceCommandResult) => {
      setState(prev => ({ ...prev, lastCommand: result }));
    });

    processor.on('error', (error: string) => {
      setState(prev => ({ ...prev, error }));
    });

    processor.on('speechStart', () => {
      setState(prev => ({ ...prev, isSpeaking: true }));
    });

    processor.on('speechEnd', () => {
      setState(prev => ({ ...prev, isSpeaking: false }));
    });

    // Check if supported
    setState(prev => ({ ...prev, isSupported: processor.isSupported() }));

    // Auto-start if requested
    if (options.autoStart && processor.isSupported()) {
      processor.startListening();
    }

    return () => {
      processor.stopListening();
      processor.removeAllListeners();
    };
  }, [options.language, options.continuous, options.autoStart]);

  // Update context when it changes
  useEffect(() => {
    if (processorRef.current && options.context) {
      processorRef.current.setContext(options.context);
    }
  }, [options.context]);

  const startListening = useCallback(() => {
    processorRef.current?.startListening();
  }, []);

  const stopListening = useCallback(() => {
    processorRef.current?.stopListening();
  }, []);

  const toggleListening = useCallback(() => {
    processorRef.current?.toggleListening();
  }, []);

  const speak = useCallback((text: string, options?: any) => {
    processorRef.current?.speak(text, options);
  }, []);

  const addCommand = useCallback((command: VoiceCommand) => {
    processorRef.current?.addCommand(command);
  }, []);

  const removeCommand = useCallback((commandId: string) => {
    processorRef.current?.removeCommand(commandId);
  }, []);

  const getCommands = useCallback(() => {
    return processorRef.current?.getCommands() || [];
  }, []);

  const trainCommand = useCallback((transcript: string, commandId: string) => {
    processorRef.current?.trainCommand(transcript, commandId);
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const clearTranscript = useCallback(() => {
    setState(prev => ({ ...prev, transcript: '', confidence: 0 }));
  }, []);

  return {
    // State
    ...state,
    
    // Actions
    startListening,
    stopListening,
    toggleListening,
    speak,
    addCommand,
    removeCommand,
    getCommands,
    trainCommand,
    clearError,
    clearTranscript,
    
    // Processor reference for advanced usage
    processor: processorRef.current
  };
}