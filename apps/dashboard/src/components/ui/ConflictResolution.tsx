/**
 * Conflict Resolution Component
 * Handles data conflicts during offline synchronization
 */

import React from 'react';
import { AlertTriangle, ArrowRight, Check, X } from 'lucide-react';
import { Button } from './Button';
import { Card } from './Card';
import { Modal } from './Modal';
import { ConflictResolution as ConflictData } from '../../services/offlineService';

interface ConflictResolutionProps {
  conflicts: ConflictData[];
  onResolve: (conflictId: string, resolution: 'local' | 'server' | 'merge', resolvedData?: any) => void;
  onCancel: () => void;
  isOpen: boolean;
}

export const ConflictResolutionModal: React.FC<ConflictResolutionProps> = ({
  conflicts,
  onResolve,
  onCancel,
  isOpen,
}) => {
  const [currentConflictIndex, setCurrentConflictIndex] = React.useState(0);
  const [customResolution, setCustomResolution] = React.useState<any>(null);
  const [showCustomEditor, setShowCustomEditor] = React.useState(false);

  const currentConflict = conflicts[currentConflictIndex];

  const handleResolve = (resolution: 'local' | 'server' | 'merge', customData?: any) => {
    if (!currentConflict) return;

    onResolve(currentConflict.id, resolution, customData);

    // Move to next conflict or close modal
    if (currentConflictIndex < conflicts.length - 1) {
      setCurrentConflictIndex(currentConflictIndex + 1);
      setShowCustomEditor(false);
      setCustomResolution(null);
    } else {
      onCancel();
    }
  };

  const handleCustomResolve = () => {
    if (customResolution) {
      handleResolve('merge', customResolution);
    }
  };

  const formatData = (data: any): string => {
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  };

  const parseCustomData = (jsonString: string): any => {
    try {
      return JSON.parse(jsonString);
    } catch {
      return jsonString;
    }
  };

  if (!currentConflict) {
    return null;
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title="Resolve Data Conflict"
      size="lg"
    >
      <div className="space-y-6">
        {/* Progress indicator */}
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>Conflict {currentConflictIndex + 1} of {conflicts.length}</span>
          <div className="flex gap-1">
            {conflicts.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full ${
                  index < currentConflictIndex
                    ? 'bg-green-500'
                    : index === currentConflictIndex
                    ? 'bg-blue-500'
                    : 'bg-gray-300 dark:bg-gray-600'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Conflict description */}
        <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          <div>
            <h3 className="font-medium text-amber-800 dark:text-amber-200">
              Data Conflict Detected
            </h3>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              The data you modified offline has been changed on the server. Choose how to resolve this conflict.
            </p>
          </div>
        </div>

        {/* Data comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Local data */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <h4 className="font-medium text-gray-900 dark:text-white">
                Your Changes (Local)
              </h4>
            </div>
            <pre className="text-xs bg-gray-50 dark:bg-gray-800 p-3 rounded overflow-auto max-h-40">
              {formatData(currentConflict.localData)}
            </pre>
            <Button
              onClick={() => handleResolve('local')}
              variant="secondary"
              size="sm"
              className="w-full mt-3"
              icon={<Check className="h-4 w-4" />}
            >
              Use My Changes
            </Button>
          </Card>

          {/* Server data */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <h4 className="font-medium text-gray-900 dark:text-white">
                Server Changes
              </h4>
            </div>
            <pre className="text-xs bg-gray-50 dark:bg-gray-800 p-3 rounded overflow-auto max-h-40">
              {formatData(currentConflict.serverData)}
            </pre>
            <Button
              onClick={() => handleResolve('server')}
              variant="secondary"
              size="sm"
              className="w-full mt-3"
              icon={<Check className="h-4 w-4" />}
            >
              Use Server Changes
            </Button>
          </Card>
        </div>

        {/* Merge option */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
            <h4 className="font-medium text-gray-900 dark:text-white">
              Automatic Merge
            </h4>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Automatically merge both changes, preferring your local changes for conflicts.
          </p>
          <Button
            onClick={() => handleResolve('merge')}
            variant="primary"
            size="sm"
            className="w-full"
            icon={<ArrowRight className="h-4 w-4" />}
          >
            Auto Merge
          </Button>
        </Card>

        {/* Custom resolution */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
              <h4 className="font-medium text-gray-900 dark:text-white">
                Custom Resolution
              </h4>
            </div>
            <Button
              onClick={() => setShowCustomEditor(!showCustomEditor)}
              variant="ghost"
              size="sm"
            >
              {showCustomEditor ? 'Hide' : 'Edit'}
            </Button>
          </div>

          {showCustomEditor && (
            <div className="space-y-3">
              <textarea
                value={customResolution ? formatData(customResolution) : formatData(currentConflict.localData)}
                onChange={(e) => setCustomResolution(parseCustomData(e.target.value))}
                className="w-full h-32 p-3 text-xs font-mono bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded resize-none"
                placeholder="Edit the data manually..."
              />
              <Button
                onClick={handleCustomResolve}
                variant="primary"
                size="sm"
                className="w-full"
                disabled={!customResolution}
                icon={<Check className="h-4 w-4" />}
              >
                Apply Custom Resolution
              </Button>
            </div>
          )}
        </Card>

        {/* Actions */}
        <div className="flex justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            onClick={onCancel}
            variant="ghost"
            icon={<X className="h-4 w-4" />}
          >
            Cancel All
          </Button>
          
          <div className="flex gap-2">
            {currentConflictIndex > 0 && (
              <Button
                onClick={() => setCurrentConflictIndex(currentConflictIndex - 1)}
                variant="secondary"
              >
                Previous
              </Button>
            )}
            {currentConflictIndex < conflicts.length - 1 && (
              <Button
                onClick={() => setCurrentConflictIndex(currentConflictIndex + 1)}
                variant="secondary"
              >
                Skip
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

// Simplified conflict resolution for inline use
export const InlineConflictResolution: React.FC<{
  conflict: ConflictData;
  onResolve: (resolution: 'local' | 'server' | 'merge') => void;
  onDismiss: () => void;
}> = ({ conflict, onResolve, onDismiss }) => {
  return (
    <Card className="p-4 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-medium text-amber-800 dark:text-amber-200 mb-1">
            Data Conflict
          </h4>
          <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">
            This item was modified both locally and on the server.
          </p>
          <div className="flex gap-2">
            <Button
              onClick={() => onResolve('local')}
              variant="secondary"
              size="sm"
            >
              Use Local
            </Button>
            <Button
              onClick={() => onResolve('server')}
              variant="secondary"
              size="sm"
            >
              Use Server
            </Button>
            <Button
              onClick={() => onResolve('merge')}
              variant="primary"
              size="sm"
            >
              Merge
            </Button>
          </div>
        </div>
        <Button
          onClick={onDismiss}
          variant="ghost"
          size="sm"
          icon={<X className="h-4 w-4" />}
        />
      </div>
    </Card>
  );
};