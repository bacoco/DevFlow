import type { Preview } from '@storybook/react';
import React from 'react';
import '../src/styles/globals.css';
import '../src/design-system/theme/global-styles.css';
import { ThemeProvider } from '../src/design-system/theme/theme-provider';

// Decorator to wrap stories with ThemeProvider
const withThemeProvider = (Story, context) => {
  const theme = context.globals.theme || 'light';
  
  return React.createElement(
    ThemeProvider,
    { defaultTheme: theme },
    React.createElement(Story)
  );
};

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
    backgrounds: {
      default: 'light',
      values: [
        {
          name: 'light',
          value: 'var(--color-background-primary)',
        },
        {
          name: 'dark',
          value: 'var(--color-background-primary)',
        },
      ],
    },
    viewport: {
      viewports: {
        mobile: {
          name: 'Mobile',
          styles: {
            width: '375px',
            height: '667px',
          },
        },
        tablet: {
          name: 'Tablet',
          styles: {
            width: '768px',
            height: '1024px',
          },
        },
        desktop: {
          name: 'Desktop',
          styles: {
            width: '1024px',
            height: '768px',
          },
        },
        largeDesktop: {
          name: 'Large Desktop',
          styles: {
            width: '1440px',
            height: '900px',
          },
        },
      },
    },
    docs: {
      theme: {
        base: 'light',
        colorPrimary: '#3b82f6',
        colorSecondary: '#64748b',
        appBg: '#fafafa',
        appContentBg: '#ffffff',
        appBorderColor: '#e5e5e5',
        textColor: '#171717',
        textInverseColor: '#ffffff',
        barTextColor: '#737373',
        barSelectedColor: '#3b82f6',
        barBg: '#ffffff',
        inputBg: '#ffffff',
        inputBorder: '#e5e5e5',
        inputTextColor: '#171717',
        inputBorderRadius: 6,
      },
    },
  },
  globalTypes: {
    theme: {
      description: 'Global theme for components',
      defaultValue: 'light',
      toolbar: {
        title: 'Theme',
        icon: 'paintbrush',
        items: [
          { value: 'light', title: 'Light', icon: 'sun' },
          { value: 'dark', title: 'Dark', icon: 'moon' },
          { value: 'system', title: 'System', icon: 'browser' },
        ],
        dynamicTitle: true,
      },
    },
    accessibility: {
      description: 'Accessibility preferences',
      defaultValue: 'default',
      toolbar: {
        title: 'A11y',
        icon: 'accessibility',
        items: [
          { value: 'default', title: 'Default' },
          { value: 'high-contrast', title: 'High Contrast' },
          { value: 'reduced-motion', title: 'Reduced Motion' },
        ],
      },
    },
  },
  decorators: [withThemeProvider],
};

export default preview;