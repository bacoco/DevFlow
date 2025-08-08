import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface KeyboardShortcut {
  id: string;
  keys: string[];
  description: string;
  action: () => void;
  category?: string;
  global?: boolean;
  preventDefault?: boolean;
  enabled?: boolean;
  customizable?: boolean;
}

export interface ShortcutCategory {
  id: string;
  name: string;
  shortcuts: KeyboardShortcut[];
}

interface KeyboardShortcutManagerProps {
  shortcuts: KeyboardShortcut[];
  onShortcutExecuted?: (shortcut: KeyboardShortcut) => void;
  showHelp?: boolean;
  onToggleHelp?: () => void;
}

export const KeyboardShortcutManager: React.FC<KeyboardShortcutManagerProps> = ({
  shortcuts,
  onShortcutExecuted,
  showHelp = false,
  onToggleHelp
}) => {
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());
  const [customShortcuts, setCustomShortcuts] = useState<Map<string, string[]>>(new Map());
  const [isRecording, setIsRecording] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  // Load custom shortcuts from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('keyboard-shortcuts');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCustomShortcuts(new Map(Object.entries(parsed)));
      } catch (error) {
        console.error('Failed to load custom shortcuts:', error);
      }
    }
  }, []);

  // Save custom shortcuts to localStorage
  const saveCustomShortcuts = useCallback((shortcuts: Map<string, string[]>) => {
    const obj = Object.fromEntries(shortcuts);
    localStorage.setItem('keyboard-shortcuts', JSON.stringify(obj));
  }, []);

  // Get effective shortcuts (custom overrides default)
  const getEffectiveShortcuts = useCallback(() => {
    return shortcuts.map(shortcut => ({
      ...shortcut,
      keys: customShortcuts.get(shortcut.id) || shortcut.keys
    }));
  }, [shortcuts, customShortcuts]);

  // Normalize key names
  const normalizeKey = useCallback((key: string) => {
    const keyMap: Record<string, string> = {
      'Control': 'ctrl',
      'Meta': 'cmd',
      'Alt': 'alt',
      'Shift': 'shift',
      ' ': 'space',
      'ArrowUp': 'up',
      'ArrowDown': 'down',
      'ArrowLeft': 'left',
      'ArrowRight': 'right',
      'Escape': 'esc',
      'Enter': 'enter',
      'Backspace': 'backspace',
      'Delete': 'delete',
      'Tab': 'tab'
    };
    return keyMap[key] || key.toLowerCase();
  }, []);

  // Check if key combination matches shortcut
  const matchesShortcut = useCallback((keys: Set<string>, shortcutKeys: string[]) => {
    if (keys.size !== shortcutKeys.length) return false;
    return shortcutKeys.every(key => keys.has(normalizeKey(key)));
  }, [normalizeKey]);

  // Handle key down
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isRecording) {
        event.preventDefault();
        return;
      }

      const key = normalizeKey(event.key);
      setPressedKeys(prev => new Set([...prev, key]));

      // Clear timeout if exists
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set timeout to clear pressed keys
      timeoutRef.current = setTimeout(() => {
        setPressedKeys(new Set());
      }, 1000);

      // Check for matching shortcuts
      const effectiveShortcuts = getEffectiveShortcuts();
      for (const shortcut of effectiveShortcuts) {
        if (shortcut.enabled === false) continue;
        
        const currentKeys = new Set([...pressedKeys, key]);
        if (matchesShortcut(currentKeys, shortcut.keys)) {
          if (shortcut.preventDefault !== false) {
            event.preventDefault();
          }
          
          shortcut.action();
          onShortcutExecuted?.(shortcut);
          setPressedKeys(new Set());
          
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
          break;
        }
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (isRecording) return;
      
      const key = normalizeKey(event.key);
      setPressedKeys(prev => {
        const newSet = new Set(prev);
        newSet.delete(key);
        return newSet;
      });
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [pressedKeys, isRecording, getEffectiveShortcuts, matchesShortcut, onShortcutExecuted]);

  // Start recording new shortcut
  const startRecording = useCallback((shortcutId: string) => {
    setIsRecording(shortcutId);
    setPressedKeys(new Set());
  }, []);

  // Stop recording and save shortcut
  const stopRecording = useCallback((keys?: string[]) => {
    if (!isRecording) return;

    if (keys && keys.length > 0) {
      const newCustomShortcuts = new Map(customShortcuts);
      newCustomShortcuts.set(isRecording, keys);
      setCustomShortcuts(newCustomShortcuts);
      saveCustomShortcuts(newCustomShortcuts);
    }

    setIsRecording(null);
    setPressedKeys(new Set());
  }, [isRecording, customShortcuts, saveCustomShortcuts]);

  // Reset shortcut to default
  const resetShortcut = useCallback((shortcutId: string) => {
    const newCustomShortcuts = new Map(customShortcuts);
    newCustomShortcuts.delete(shortcutId);
    setCustomShortcuts(newCustomShortcuts);
    saveCustomShortcuts(newCustomShortcuts);
  }, [customShortcuts, saveCustomShortcuts]);

  // Group shortcuts by category
  const groupedShortcuts = getEffectiveShortcuts().reduce((acc, shortcut) => {
    const category = shortcut.category || 'General';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(shortcut);
    return acc;
  }, {} as Record<string, KeyboardShortcut[]>);

  // Format key combination for display
  const formatKeys = useCallback((keys: string[]) => {
    const keyMap: Record<string, string> = {
      'ctrl': '⌃',
      'cmd': '⌘',
      'alt': '⌥',
      'shift': '⇧',
      'space': '␣',
      'enter': '↵',
      'esc': '⎋',
      'backspace': '⌫',
      'delete': '⌦',
      'tab': '⇥',
      'up': '↑',
      'down': '↓',
      'left': '←',
      'right': '→'
    };

    return keys.map(key => keyMap[key.toLowerCase()] || key.toUpperCase()).join(' + ');
  }, []);

  return (
    <>
      <AnimatePresence>
        {showHelp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={onToggleHelp}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Keyboard Shortcuts</h2>
                  <button
                    onClick={onToggleHelp}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="p-6 overflow-y-auto max-h-[60vh]">
                {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
                  <div key={category} className="mb-6">
                    <h3 className="text-lg font-medium mb-3 text-gray-900 dark:text-gray-100">
                      {category}
                    </h3>
                    <div className="space-y-2">
                      {categoryShortcuts.map(shortcut => (
                        <div
                          key={shortcut.id}
                          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                        >
                          <div className="flex-1">
                            <div className="font-medium text-gray-900 dark:text-gray-100">
                              {shortcut.description}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <kbd className="px-2 py-1 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded text-sm font-mono">
                              {formatKeys(shortcut.keys)}
                            </kbd>
                            
                            {shortcut.customizable && (
                              <div className="flex gap-1">
                                <button
                                  onClick={() => startRecording(shortcut.id)}
                                  className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                                  disabled={isRecording === shortcut.id}
                                >
                                  {isRecording === shortcut.id ? 'Recording...' : 'Edit'}
                                </button>
                                
                                {customShortcuts.has(shortcut.id) && (
                                  <button
                                    onClick={() => resetShortcut(shortcut.id)}
                                    className="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
                                  >
                                    Reset
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recording overlay */}
      <AnimatePresence>
        {isRecording && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4"
            >
              <h3 className="text-lg font-semibold mb-4">Record New Shortcut</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Press the key combination you want to use:
              </p>
              
              <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg mb-4 min-h-[60px] flex items-center justify-center">
                {pressedKeys.size > 0 ? (
                  <kbd className="text-lg font-mono">
                    {formatKeys(Array.from(pressedKeys))}
                  </kbd>
                ) : (
                  <span className="text-gray-500">Waiting for keys...</span>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => stopRecording(Array.from(pressedKeys))}
                  disabled={pressedKeys.size === 0}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  onClick={() => stopRecording()}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};