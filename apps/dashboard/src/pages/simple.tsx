import React from 'react';
import Head from 'next/head';

const SimpleDashboard: React.FC = () => {
  return (
    <>
      <Head>
        <title>DevFlow Simple Dashboard</title>
        <meta name="description" content="Simple DevFlow Dashboard" />
      </Head>
      
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              DevFlow Intelligence Dashboard
            </h1>
            <p className="text-gray-600">Simple standalone version</p>
          </div>

          {/* Navigation */}
          <div className="mb-8">
            <nav className="flex space-x-4">
              <a href="/simple" className="bg-blue-600 text-white px-4 py-2 rounded-md">
                Dashboard
              </a>
              <a href="/simple-tasks" className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300">
                Tasks
              </a>
              <a href="/simple-archaeology" className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300">
                Code Archaeology
              </a>
            </nav>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Productivity Score */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Productivity Score</p>
                  <p className="text-3xl font-bold text-gray-900">85</p>
                </div>
                <div className="text-green-500">
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <p className="text-sm text-green-600 mt-2">+6.25% from yesterday</p>
            </div>

            {/* Time in Flow */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Time in Flow</p>
                  <p className="text-3xl font-bold text-gray-900">6.5h</p>
                </div>
                <div className="text-blue-500">
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <p className="text-sm text-blue-600 mt-2">+12% from yesterday</p>
            </div>

            {/* Code Quality */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Code Quality</p>
                  <p className="text-3xl font-bold text-gray-900">92%</p>
                </div>
                <div className="text-purple-500">
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-sm text-purple-600 mt-2">Excellent</p>
            </div>

            {/* Active Tasks */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Tasks</p>
                  <p className="text-3xl font-bold text-gray-900">12</p>
                </div>
                <div className="text-orange-500">
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <p className="text-sm text-orange-600 mt-2">3 due today</p>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Productivity Chart */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Weekly Productivity</h3>
              <div className="h-64 flex items-end justify-between space-x-2">
                <div className="flex flex-col items-center">
                  <div className="bg-blue-500 w-8 h-32 rounded-t"></div>
                  <span className="text-sm text-gray-600 mt-2">Mon</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="bg-blue-500 w-8 h-40 rounded-t"></div>
                  <span className="text-sm text-gray-600 mt-2">Tue</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="bg-blue-500 w-8 h-36 rounded-t"></div>
                  <span className="text-sm text-gray-600 mt-2">Wed</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="bg-blue-500 w-8 h-44 rounded-t"></div>
                  <span className="text-sm text-gray-600 mt-2">Thu</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="bg-blue-500 w-8 h-48 rounded-t"></div>
                  <span className="text-sm text-gray-600 mt-2">Fri</span>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Completed task: Fix login bug</p>
                    <p className="text-xs text-gray-500">2 minutes ago</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Started working on dashboard</p>
                    <p className="text-xs text-gray-500">15 minutes ago</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Code review completed</p>
                    <p className="text-xs text-gray-500">1 hour ago</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Meeting: Sprint planning</p>
                    <p className="text-xs text-gray-500">2 hours ago</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button className="bg-blue-600 text-white px-4 py-3 rounded-md hover:bg-blue-700 transition-colors">
                Create Task
              </button>
              <button className="bg-green-600 text-white px-4 py-3 rounded-md hover:bg-green-700 transition-colors">
                Start Timer
              </button>
              <button className="bg-purple-600 text-white px-4 py-3 rounded-md hover:bg-purple-700 transition-colors">
                View Reports
              </button>
              <button className="bg-orange-600 text-white px-4 py-3 rounded-md hover:bg-orange-700 transition-colors">
                Settings
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SimpleDashboard;