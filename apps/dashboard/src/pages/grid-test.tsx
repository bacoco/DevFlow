import React, { useState } from 'react';
import Head from 'next/head';
import { Responsive, WidthProvider, Layout } from 'react-grid-layout';
// CSS imports moved to _app.tsx to avoid global CSS import issues

const ResponsiveGridLayout = WidthProvider(Responsive);

const GridTest: React.FC = () => {
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
    { id: 'widget-1', title: 'Productivity Score', color: 'bg-blue-500' },
    { id: 'widget-2', title: 'Time in Flow', color: 'bg-green-500' },
    { id: 'widget-3', title: 'Weekly Trend', color: 'bg-purple-500' },
    { id: 'widget-4', title: 'Recent Activity', color: 'bg-yellow-500' },
    { id: 'widget-5', title: 'Code Quality', color: 'bg-red-500' },
    { id: 'widget-6', title: 'Team Velocity', color: 'bg-indigo-500' },
    { id: 'widget-7', title: 'Flow State', color: 'bg-pink-500' },
  ];

  return (
    <>
      <Head>
        <title>Grid Layout Test</title>
      </Head>
      
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            Grid Layout Test
          </h1>
          
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800">
              This page tests the react-grid-layout functionality. Widgets should be distributed across the grid, not stacked on the left.
            </p>
          </div>

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
              <div key={widget.id} className="widget-container">
                <div className={`h-full ${widget.color} text-white rounded-lg p-4 flex items-center justify-center`}>
                  <div className="text-center">
                    <h3 className="text-lg font-semibold">{widget.title}</h3>
                    <p className="text-sm opacity-90">Widget ID: {widget.id}</p>
                  </div>
                </div>
              </div>
            ))}
          </ResponsiveGridLayout>
        </div>
      </div>

      <style jsx>{`
        .widget-container {
          background: transparent;
          border-radius: 8px;
          overflow: hidden;
        }
        
        .react-grid-item {
          transition: all 200ms ease;
          transition-property: left, top;
        }
        
        .react-grid-item.cssTransforms {
          transition-property: transform;
        }
        
        .react-grid-item > .react-resizable-handle {
          position: absolute;
          width: 20px;
          height: 20px;
          bottom: 0;
          right: 0;
          background: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNiIgaGVpZ2h0PSI2IiB2aWV3Qm94PSIwIDAgNiA2IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxnIGZpbGw9IiM0QTVBNjgiIGZpbGwtcnVsZT0iZXZlbm9kZCI+PHBhdGggZD0ibTUgNWgtNHYtNGg0eiIvPjwvZz48L3N2Zz4=');
          background-position: bottom right;
          padding: 0 3px 3px 0;
          background-repeat: no-repeat;
          background-origin: content-box;
          box-sizing: border-box;
          cursor: se-resize;
        }
        
        .react-grid-item.react-grid-placeholder {
          background: rgb(59 130 246 / 0.2);
          opacity: 0.2;
          transition-duration: 100ms;
          z-index: 2;
          border-radius: 0.5rem;
        }
      `}</style>
    </>
  );
};

export default GridTest;