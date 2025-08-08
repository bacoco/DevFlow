import React, { useState } from 'react';
import Head from 'next/head';
import { Responsive, WidthProvider, Layout } from 'react-grid-layout';
// CSS imports moved to _app.tsx to avoid global CSS import issues

const ResponsiveGridLayout = WidthProvider(Responsive);

const DebugDashboard: React.FC = () => {
  const [layouts, setLayouts] = useState<{ [key: string]: Layout[] }>({
    lg: [
      { i: 'widget-1', x: 0, y: 0, w: 3, h: 3 },
      { i: 'widget-2', x: 3, y: 0, w: 3, h: 3 },
      { i: 'widget-3', x: 6, y: 0, w: 6, h: 4 },
      { i: 'widget-4', x: 0, y: 3, w: 12, h: 4 },
      { i: 'widget-5', x: 0, y: 7, w: 4, h: 3 },
      { i: 'widget-6', x: 4, y: 7, w: 4, h: 3 },
      { i: 'widget-7', x: 8, y: 7, w: 4, h: 3 },
    ]
  });

  const handleLayoutChange = (layout: Layout[], layouts: { [key: string]: Layout[] }) => {
    setLayouts(layouts);
    console.log('Layout changed:', layout);
  };

  const widgets = [
    { id: 'widget-1', title: 'Productivity Score', value: '85%', color: 'bg-blue-500' },
    { id: 'widget-2', title: 'Time in Flow', value: '6.5h', color: 'bg-green-500' },
    { id: 'widget-3', title: 'Weekly Trend', value: 'Chart', color: 'bg-purple-500' },
    { id: 'widget-4', title: 'Recent Activity', value: 'Feed', color: 'bg-yellow-500' },
    { id: 'widget-5', title: 'Code Quality', value: '92%', color: 'bg-red-500' },
    { id: 'widget-6', title: 'Team Velocity', value: '42', color: 'bg-indigo-500' },
    { id: 'widget-7', title: 'Flow State', value: '78%', color: 'bg-pink-500' },
  ];

  return (
    <>
      <Head>
        <title>Debug Dashboard</title>
      </Head>
      
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            Debug Dashboard - Simplified Version
          </h1>
          
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800">
              This is a simplified version of the main dashboard to debug the grid layout issue.
            </p>
          </div>

          <div style={{ width: '100%', minHeight: '600px' }}>
            <ResponsiveGridLayout
              className="layout"
              layouts={layouts}
              breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
              cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
              rowHeight={60}
              margin={[16, 16]}
              containerPadding={[16, 16]}
              onLayoutChange={handleLayoutChange}
              isDraggable={true}
              isResizable={true}
              compactType="vertical"
              preventCollision={false}
              useCSSTransforms={true}
              autoSize={true}
              verticalCompact={true}
            >
              {widgets.map((widget) => (
                <div key={widget.id} className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
                  <div className={`h-full ${widget.color} text-white p-4 flex flex-col justify-center items-center`}>
                    <h3 className="text-lg font-semibold mb-2">{widget.title}</h3>
                    <p className="text-2xl font-bold">{widget.value}</p>
                    <p className="text-sm opacity-90 mt-2">ID: {widget.id}</p>
                  </div>
                </div>
              ))}
            </ResponsiveGridLayout>
          </div>
        </div>
      </div>
    </>
  );
};

export default DebugDashboard;