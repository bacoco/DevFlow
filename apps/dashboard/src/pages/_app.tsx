import type { AppProps } from 'next/app';
import { AccessibilityProvider } from '../contexts/AccessibilityContext';
import '../styles/globals.css';
import '../styles/dashboard.css';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import 'react-grid-layout/css/resizable.css';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AccessibilityProvider>
      <Component {...pageProps} />
    </AccessibilityProvider>
  );
}