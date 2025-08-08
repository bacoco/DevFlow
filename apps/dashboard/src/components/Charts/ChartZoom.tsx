import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { ChartZoomProps } from './types';

export const ChartZoom: React.FC<ChartZoomProps> = ({
  onZoom,
  onReset,
  enabled = true,
  className = '',
}) => {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isZoomed, setIsZoomed] = useState(false);

  const handleZoomIn = useCallback(() => {
    if (!enabled) return;
    
    const newZoomLevel = Math.min(zoomLevel * 1.5, 5);
    setZoomLevel(newZoomLevel);
    setIsZoomed(newZoomLevel > 1);
    
    onZoom?.({
      x: [0, 1 / newZoomLevel],
      y: [0, 1 / newZoomLevel]
    });
  }, [zoomLevel, enabled, onZoom]);

  const handleZoomOut = useCallback(() => {
    if (!enabled) return;
    
    const newZoomLevel = Math.max(zoomLevel / 1.5, 1);
    setZoomLevel(newZoomLevel);
    setIsZoomed(newZoomLevel > 1);
    
    onZoom?.({
      x: [0, 1 / newZoomLevel],
      y: [0, 1 / newZoomLevel]
    });
  }, [zoomLevel, enabled, onZoom]);

  const handleReset = useCallback(() => {
    if (!enabled) return;
    
    setZoomLevel(1);
    setIsZoomed(false);
    onReset?.();
  }, [enabled, onReset]);

  if (!enabled) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={`flex items-center space-x-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-1 shadow-sm ${className}`}
    >
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={handleZoomIn}
        disabled={zoomLevel >= 5}
        className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
        title="Zoom In"
      >
        <ZoomIn className="w-4 h-4 text-gray-600 dark:text-gray-400" />
      </motion.button>

      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={handleZoomOut}
        disabled={zoomLevel <= 1}
        className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
        title="Zoom Out"
      >
        <ZoomOut className="w-4 h-4 text-gray-600 dark:text-gray-400" />
      </motion.button>

      {isZoomed && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleReset}
          className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
          title="Reset Zoom"
        >
          <RotateCcw className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        </motion.button>
      )}

      <div className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400 border-l border-gray-200 dark:border-gray-700">
        {Math.round(zoomLevel * 100)}%
      </div>
    </motion.div>
  );
};