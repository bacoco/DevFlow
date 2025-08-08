import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { TooltipConfig } from './types';

interface ContextualTooltipProps {
  config: TooltipConfig;
  children?: React.ReactNode;
  onDismiss?: () => void;
}

interface TooltipPosition {
  top: number;
  left: number;
  arrow: {
    position: 'top' | 'bottom' | 'left' | 'right';
    offset: number;
  };
}

function calculateTooltipPosition(
  targetElement: HTMLElement,
  tooltipElement: HTMLElement,
  preferredPosition: TooltipConfig['position']
): TooltipPosition {
  const targetRect = targetElement.getBoundingClientRect();
  const tooltipRect = tooltipElement.getBoundingClientRect();
  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight
  };

  const spacing = 8; // Space between target and tooltip
  const arrowSize = 6;

  // Calculate positions for each side
  const positions = {
    top: {
      top: targetRect.top - tooltipRect.height - spacing,
      left: targetRect.left + (targetRect.width - tooltipRect.width) / 2,
      arrow: { position: 'bottom' as const, offset: tooltipRect.width / 2 }
    },
    bottom: {
      top: targetRect.bottom + spacing,
      left: targetRect.left + (targetRect.width - tooltipRect.width) / 2,
      arrow: { position: 'top' as const, offset: tooltipRect.width / 2 }
    },
    left: {
      top: targetRect.top + (targetRect.height - tooltipRect.height) / 2,
      left: targetRect.left - tooltipRect.width - spacing,
      arrow: { position: 'right' as const, offset: tooltipRect.height / 2 }
    },
    right: {
      top: targetRect.top + (targetRect.height - tooltipRect.height) / 2,
      left: targetRect.right + spacing,
      arrow: { position: 'left' as const, offset: tooltipRect.height / 2 }
    }
  };

  // Check if preferred position fits
  const checkFits = (pos: typeof positions.top) => {
    return (
      pos.top >= 0 &&
      pos.left >= 0 &&
      pos.top + tooltipRect.height <= viewport.height &&
      pos.left + tooltipRect.width <= viewport.width
    );
  };

  // Try preferred position first
  if (preferredPosition !== 'auto' && checkFits(positions[preferredPosition])) {
    return positions[preferredPosition];
  }

  // Try other positions in order of preference
  const fallbackOrder: Array<keyof typeof positions> = ['bottom', 'top', 'right', 'left'];
  for (const position of fallbackOrder) {
    if (checkFits(positions[position])) {
      return positions[position];
    }
  }

  // If nothing fits, use bottom and adjust to viewport
  const fallback = positions.bottom;
  return {
    top: Math.max(0, Math.min(fallback.top, viewport.height - tooltipRect.height)),
    left: Math.max(0, Math.min(fallback.left, viewport.width - tooltipRect.width)),
    arrow: fallback.arrow
  };
}

export function ContextualTooltip({ config, children, onDismiss }: ContextualTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<TooltipPosition>({ 
    top: 0, 
    left: 0, 
    arrow: { position: 'bottom', offset: 0 } 
  });
  const tooltipRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLElement | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const updatePosition = useCallback(() => {
    if (!targetRef.current || !tooltipRef.current) return;

    const newPosition = calculateTooltipPosition(
      targetRef.current,
      tooltipRef.current,
      config.position
    );
    setPosition(newPosition);
  }, [config.position]);

  const showTooltip = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const delay = config.delay || 0;
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
      // Update position after showing to ensure accurate measurements
      requestAnimationFrame(updatePosition);
    }, delay);
  }, [config.delay, updatePosition]);

  const hideTooltip = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  }, []);

  const handleDismiss = useCallback(() => {
    hideTooltip();
    onDismiss?.();
  }, [hideTooltip, onDismiss]);

  useEffect(() => {
    const targetElement = document.querySelector(config.target) as HTMLElement;
    if (!targetElement) {
      console.warn(`Tooltip target "${config.target}" not found`);
      return;
    }

    targetRef.current = targetElement;

    const handleTrigger = () => {
      if (config.trigger === 'manual') return;
      showTooltip();
    };

    const handleHide = () => {
      if (config.trigger === 'manual') return;
      hideTooltip();
    };

    // Add event listeners based on trigger type
    switch (config.trigger) {
      case 'hover':
        targetElement.addEventListener('mouseenter', handleTrigger);
        targetElement.addEventListener('mouseleave', handleHide);
        break;
      case 'click':
        targetElement.addEventListener('click', handleTrigger);
        break;
      case 'focus':
        targetElement.addEventListener('focus', handleTrigger);
        targetElement.addEventListener('blur', handleHide);
        break;
      case 'manual':
        // Manual trigger - show immediately
        showTooltip();
        break;
    }

    // Handle window resize
    const handleResize = () => {
      if (isVisible) {
        updatePosition();
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      switch (config.trigger) {
        case 'hover':
          targetElement.removeEventListener('mouseenter', handleTrigger);
          targetElement.removeEventListener('mouseleave', handleHide);
          break;
        case 'click':
          targetElement.removeEventListener('click', handleTrigger);
          break;
        case 'focus':
          targetElement.removeEventListener('focus', handleTrigger);
          targetElement.removeEventListener('blur', handleHide);
          break;
      }

      window.removeEventListener('resize', handleResize);
    };
  }, [config.target, config.trigger, showTooltip, hideTooltip, isVisible, updatePosition]);

  // Handle click outside to dismiss
  useEffect(() => {
    if (!isVisible || !config.dismissible) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(target) &&
        targetRef.current &&
        !targetRef.current.contains(target)
      ) {
        handleDismiss();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isVisible, config.dismissible, handleDismiss]);

  // Handle escape key
  useEffect(() => {
    if (!isVisible || !config.dismissible) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleDismiss();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isVisible, config.dismissible, handleDismiss]);

  if (!isVisible) {
    return children ? <>{children}</> : null;
  }

  const tooltipContent = (
    <div
      ref={tooltipRef}
      className={`fixed z-50 bg-gray-900 text-white text-sm rounded-lg shadow-lg px-3 py-2 max-w-xs ${config.className || ''}`}
      style={{
        top: position.top,
        left: position.left,
        maxWidth: config.maxWidth || 320
      }}
      role="tooltip"
      aria-live="polite"
    >
      {/* Arrow */}
      <div
        className={`absolute w-0 h-0 ${
          position.arrow.position === 'top'
            ? 'border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-gray-900 -top-1'
            : position.arrow.position === 'bottom'
            ? 'border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900 -bottom-1'
            : position.arrow.position === 'left'
            ? 'border-t-4 border-b-4 border-r-4 border-t-transparent border-b-transparent border-r-gray-900 -left-1'
            : 'border-t-4 border-b-4 border-l-4 border-t-transparent border-b-transparent border-l-gray-900 -right-1'
        }`}
        style={{
          [position.arrow.position === 'top' || position.arrow.position === 'bottom' ? 'left' : 'top']: 
            position.arrow.offset - 4
        }}
      />

      {/* Content */}
      <div className="relative">
        {typeof config.content === 'string' ? (
          <div dangerouslySetInnerHTML={{ __html: config.content }} />
        ) : (
          config.content
        )}
      </div>

      {/* Dismiss button */}
      {config.dismissible && (
        <button
          onClick={handleDismiss}
          className="absolute top-1 right-1 w-4 h-4 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          aria-label="Dismiss tooltip"
        >
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      )}
    </div>
  );

  return (
    <>
      {children}
      {createPortal(tooltipContent, document.body)}
    </>
  );
}

// Hook for managing multiple tooltips
export function useTooltips() {
  const [tooltips, setTooltips] = useState<TooltipConfig[]>([]);

  const addTooltip = useCallback((config: TooltipConfig) => {
    setTooltips(prev => [...prev.filter(t => t.id !== config.id), config]);
  }, []);

  const removeTooltip = useCallback((id: string) => {
    setTooltips(prev => prev.filter(t => t.id !== id));
  }, []);

  const clearTooltips = useCallback(() => {
    setTooltips([]);
  }, []);

  return {
    tooltips,
    addTooltip,
    removeTooltip,
    clearTooltips
  };
}

// Component for rendering multiple tooltips
interface TooltipManagerProps {
  tooltips: TooltipConfig[];
  onDismiss?: (id: string) => void;
}

export function TooltipManager({ tooltips, onDismiss }: TooltipManagerProps) {
  return (
    <>
      {tooltips.map(config => (
        <ContextualTooltip
          key={config.id}
          config={config}
          onDismiss={() => onDismiss?.(config.id)}
        />
      ))}
    </>
  );
}