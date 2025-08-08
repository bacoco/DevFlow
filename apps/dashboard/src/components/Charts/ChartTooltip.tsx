import React from 'react';
import { motion } from 'framer-motion';
import { ChartTooltipProps } from './types';

export const ChartTooltip: React.FC<ChartTooltipProps> = ({
  active,
  payload,
  label,
  className = '',
  formatter,
  labelFormatter,
}) => {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const formattedLabel = labelFormatter ? labelFormatter(label) : label;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: 10 }}
      transition={{ duration: 0.15 }}
      className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 max-w-xs ${className}`}
    >
      {formattedLabel && (
        <p className="text-sm font-medium text-gray-900 dark:text-white mb-2 border-b border-gray-100 dark:border-gray-700 pb-2">
          {formattedLabel}
        </p>
      )}
      
      <div className="space-y-1">
        {payload.map((entry, index) => {
          const [formattedValue, formattedName] = formatter 
            ? formatter(entry.value, entry.name || entry.dataKey, entry)
            : [entry.value, entry.name || entry.dataKey];

          return (
            <div key={index} className="flex items-center justify-between space-x-3">
              <div className="flex items-center space-x-2">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-sm text-gray-600 dark:text-gray-400 truncate">
                  {formattedName}
                </span>
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {formattedValue}
              </span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};