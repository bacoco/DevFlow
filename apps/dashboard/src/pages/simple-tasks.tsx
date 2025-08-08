import React, { useState } from 'react';
import Head from 'next/head';

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  assignee: string;
}

const SimpleTasksPage: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: '1',
      title: 'Fix authentication bug',
      description: 'Users are unable to login with valid credentials',
      status: 'in-progress',
      priority: 'high',
      assignee: 'Loic'
    },
    {
      id: '2',
      title: 'Implement dashboard widgets',
      description: 'Create interactive widgets for the main dashboard',
      status: 'todo',
      priority: 'medium',
      assignee: 'Loic'
    },
    {
      id: '3',
      title: 'Write unit tests',
      description: 'Add comprehensive test coverage for authentication module',
      status: 'todo',
      priority: 'medium',
      assignee: 'Loic'
    },
    {
      id: '4',
      title: 'Update documentation',
      description: 'Update API documentation with latest changes',
      status: 'done',
      priority: 'low',
      assignee: 'Loic'
    }
  ]);

  const [newTaskTitle, setNewTaskTitle] = useState('');

  const addTask = () => {
    if (newTaskTitle.trim()) {
      const newTask: Task = {
        id: Date.now().toString(),
        title: newTaskTitle,
        description: '',
        status: 'todo',
        priority: 'medium',
        assignee: 'Loic'
      };
      setTasks([...tasks, newTask]);
      setNewTaskTitle('');
    }
  };

  const updateTaskStatus = (taskId: string, newStatus: Task['status']) => {
    setTasks(tasks.map(task => 
      task.id === taskId ? { ...task, status: newStatus } : task
    ));
  };

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'todo': return 'bg-gray-100 text-gray-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      case 'done': return 'bg-green-100 text-green-800';
    }
  };

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'low': return 'bg-gray-100 text-gray-600';
      case 'medium': return 'bg-yellow-100 text-yellow-600';
      case 'high': return 'bg-red-100 text-red-600';
    }
  };

  const todoTasks = tasks.filter(task => task.status === 'todo');
  const inProgressTasks = tasks.filter(task => task.status === 'in-progress');
  const doneTasks = tasks.filter(task => task.status === 'done');

  return (
    <>
      <Head>
        <title>Tasks - DevFlow Dashboard</title>
        <meta name="description" content="Task Management" />
      </Head>
      
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Task Management</h1>
            <p className="text-gray-600">Organize and track your development tasks</p>
          </div>

          {/* Navigation */}
          <div className="mb-8">
            <nav className="flex space-x-4">
              <a href="/simple" className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300">
                Dashboard
              </a>
              <a href="/simple-tasks" className="bg-blue-600 text-white px-4 py-2 rounded-md">
                Tasks
              </a>
              <a href="/simple-archaeology" className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300">
                Code Archaeology
              </a>
            </nav>
          </div>

          {/* Add Task */}
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Task</h3>
            <div className="flex space-x-4">
              <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Enter task title..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) => e.key === 'Enter' && addTask()}
              />
              <button
                onClick={addTask}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Add Task
              </button>
            </div>
          </div>

          {/* Kanban Board */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* To Do Column */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">To Do</h3>
                <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-sm">
                  {todoTasks.length}
                </span>
              </div>
              <div className="space-y-4">
                {todoTasks.map(task => (
                  <div key={task.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{task.title}</h4>
                      <span className={`px-2 py-1 rounded-full text-xs ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                    </div>
                    {task.description && (
                      <p className="text-sm text-gray-600 mb-3">{task.description}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">{task.assignee}</span>
                      <button
                        onClick={() => updateTaskStatus(task.id, 'in-progress')}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Start →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* In Progress Column */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">In Progress</h3>
                <span className="bg-blue-100 text-blue-600 px-2 py-1 rounded-full text-sm">
                  {inProgressTasks.length}
                </span>
              </div>
              <div className="space-y-4">
                {inProgressTasks.map(task => (
                  <div key={task.id} className="border border-blue-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{task.title}</h4>
                      <span className={`px-2 py-1 rounded-full text-xs ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                    </div>
                    {task.description && (
                      <p className="text-sm text-gray-600 mb-3">{task.description}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">{task.assignee}</span>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => updateTaskStatus(task.id, 'todo')}
                          className="text-gray-600 hover:text-gray-800 text-sm"
                        >
                          ← Back
                        </button>
                        <button
                          onClick={() => updateTaskStatus(task.id, 'done')}
                          className="text-green-600 hover:text-green-800 text-sm"
                        >
                          Done →
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Done Column */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Done</h3>
                <span className="bg-green-100 text-green-600 px-2 py-1 rounded-full text-sm">
                  {doneTasks.length}
                </span>
              </div>
              <div className="space-y-4">
                {doneTasks.map(task => (
                  <div key={task.id} className="border border-green-200 rounded-lg p-4 hover:shadow-md transition-shadow opacity-75">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-gray-900 line-through">{task.title}</h4>
                      <span className={`px-2 py-1 rounded-full text-xs ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                    </div>
                    {task.description && (
                      <p className="text-sm text-gray-600 mb-3">{task.description}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">{task.assignee}</span>
                      <button
                        onClick={() => updateTaskStatus(task.id, 'in-progress')}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        ← Reopen
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SimpleTasksPage;