import React from 'react';
import { motion } from 'framer-motion';
import { ChartLegendProps } from './types';

export const ChartLegend: React.FC<ChartLegendProps> = ({
  payload,
  className = '',
  onLegendClick,
  iconType = 'rect',
}) => {
  if (!payload || !payload.length) {
    return null;
  }

  const renderIcon = (color: string, type: string) => {
    const iconProps = {
      className: "w-3 h-3 flex-shrink-0",
      style: { color }
    };

    switch (type) {
      case 'line':
        return <div className="w-4 h-0.5 flex-shrink-0" style={{ backgroundColor: color }} />;
      case 'circle':
        return <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />;
      case 'rect':
      default:
        return <div className="w-3 h-3 flex-shrink-0" style={{ backgroundColor: color }} />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className={`flex flex-wrap items-center justify-center gap-4 mt-4 ${className}`}
    >
      {payload.map((entry, index) => (
        <motion.button
          key={index}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2, delay: index * 0.05 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onLegendClick?.(entry.dataKey, entry)}
          className={`flex items-center space-x-2 px-2 py-1 rounded-md transition-colors duration-200 ${
            onLegendClick 
              ? 'hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer' 
              : 'cursor-default'
          }`}
          disabled={!onLegendClick}
        >
          {renderIcon(entry.color, iconType)}
          <span className="text-sm text-gray-600 dark:text-gray-400 select-none">
            {entry.value}
          </span>
        </motion.button>
      ))}
    </motion.div>
  );
};