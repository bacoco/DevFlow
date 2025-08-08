/**
 * Main Providers Component
 * Combines all providers for the application
 */

'use client';

import React from 'react';
import { ThemeProvider } from '../contexts/ThemeContext';
import { QueryProvider } from './QueryProvider';

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <QueryProvider>
      <ThemeProvider defaultTheme="dark" storageKey="devflow-theme">
        {children}
      </ThemeProvider>
    </QueryProvider>
  );
}

// Export individual providers for selective use
export { ThemeProvider } from '../contexts/ThemeContext';
export { QueryProvider } from './QueryProvider';