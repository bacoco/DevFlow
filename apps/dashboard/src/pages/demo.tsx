import React from 'react';
import Head from 'next/head';
import { MetricCard } from '../components/Widget/MetricCard';
import { LineChart } from '../components/Charts/LineChart';
import { BarChart } from '../components/Charts/BarChart';
import { Widget as WidgetType } from '../types/dashboard';

const DemoPage: React.FC = () => {
  const mockMetricWidget: WidgetType = {
    id: 'demo-metric',
    type: 'metric_card',
    title: 'Demo Productivity Score',
    config: {
      timeRange: 'day',
      metrics: ['productivity_score'],
      filters: {},
      chartOptions: { responsive: true, maintainAspectRatio: false },
    },
    data: {
      metrics: [],
      chartData: { labels: [], datasets: [] },
      summary: {
        current: 87,
        previous: 82,
        change: 5,
        changePercent: 6.1,
        trend: 'up',
      },
      lastUpdated: new Date(),
    },
    permissions: [],
    position: { x: 0, y: 0, w: 4, h: 3 },
  };

  const mockLineChartData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    datasets: [
      {
        label: 'Productivity Score',
        data: [75, 82, 78, 85, 90],
        borderColor: '#3b82f6',
        borderWidth: 2,
      },
      {
        label: 'Code Quality',
        data: [80, 85, 83, 88, 92],
        borderColor: '#10b981',
        borderWidth: 2,
      },
    ],
  };

  const mockBarChartData = {
    labels: ['Sprint 1', 'Sprint 2', 'Sprint 3', 'Sprint 4'],
    datasets: [
      {
        label: 'Completed Stories',
        data: [12, 15, 18, 14],
        backgroundColor: '#3b82f6',
      },
      {
        label: 'Bug Fixes',
        data: [3, 2, 4, 1],
        backgroundColor: '#ef4444',
      },
    ],
  };

  return (
    <>
      <Head>
        <title>Dashboard Components Demo</title>
        <meta name="description" content="Demo of dashboard components" />
      </Head>
      <main className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            Dashboard Components Demo
          </h1>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            {/* Metric Card Demo */}
            <div className="lg:col-span-1">
              <h2 className="text-xl font-semibold mb-4">Metric Card</h2>
              <MetricCard widget={mockMetricWidget} />
            </div>
            
            {/* Line Chart Demo */}
            <div className="lg:col-span-2">
              <h2 className="text-xl font-semibold mb-4">Line Chart</h2>
              <div className="bg-white p-6 rounded-lg shadow-md">
                <LineChart 
                  data={mockLineChartData}
                  width={600}
                  height={300}
                />
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Bar Chart Demo */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Bar Chart</h2>
              <div className="bg-white p-6 rounded-lg shadow-md">
                <BarChart 
                  data={mockBarChartData}
                  width={400}
                  height={300}
                />
              </div>
            </div>
            
            {/* Component Features */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Features Implemented</h2>
              <div className="bg-white p-6 rounded-lg shadow-md">
                <ul className="space-y-3">
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    Reusable widget components with TypeScript
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    Responsive dashboard layout system
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    Interactive charts using D3.js and React
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    Component unit tests with Jest
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    TypeScript interfaces and type safety
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    Accessibility features (ARIA labels, keyboard navigation)
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    Loading and error states
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    Metric formatting and trend indicators
                  </li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="mt-8 text-center">
            <a 
              href="/"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              ← Back to Main Dashboard
            </a>
          </div>
        </div>
      </main>
    </>
  );
};

export default DemoPage;