import React, { useState } from 'react';
import Head from 'next/head';
import { AuthProvider } from '../contexts/AuthContext';
import { ProtectedRoute } from '../components/Auth/ProtectedRoute';
import { WebSocketProvider } from '../contexts/WebSocketContext';
import { TaskModal } from '../components/TaskManager/TaskModal';

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  assignee: string;
  dueDate?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

const TasksContent: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: '1',
      title: 'Implement Real-time Dashboard Updates',
      description: 'Add WebSocket integration for live dashboard updates and real-time metrics',
      status: 'in-progress',
      priority: 'high',
      assignee: 'Loic',
      dueDate: '2025-08-10',
      tags: ['frontend', 'websocket', 'dashboard'],
      createdAt: '2025-08-01T10:00:00Z',
      updatedAt: '2025-08-04T14:30:00Z'
    },
    {
      id: '2',
      title: 'Code Archaeology 3D Visualization',
      description: 'Create interactive 3D visualization for code complexity and dependency analysis',
      status: 'todo',
      priority: 'medium',
      assignee: 'Loic',
      dueDate: '2025-08-15',
      tags: ['3d', 'visualization', 'webgl'],
      createdAt: '2025-08-02T09:15:00Z',
      updatedAt: '2025-08-02T09:15:00Z'
    },
    {
      id: '3',
      title: 'Performance Optimization',
      description: 'Optimize dashboard rendering performance and reduce bundle size',
      status: 'todo',
      priority: 'medium',
      assignee: 'Loic',
      dueDate: '2025-08-12',
      tags: ['performance', 'optimization'],
      createdAt: '2025-08-03T11:20:00Z',
      updatedAt: '2025-08-03T11:20:00Z'
    },
    {
      id: '4',
      title: 'Authentication System Enhancement',
      description: 'Add multi-factor authentication and role-based access control',
      status: 'done',
      priority: 'high',
      assignee: 'Loic',
      tags: ['auth', 'security'],
      createdAt: '2025-07-28T08:00:00Z',
      updatedAt: '2025-08-01T16:45:00Z'
    }
  ]);

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const handleCreateTask = () => {
    setEditingTask(null);
    setShowTaskModal(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setShowTaskModal(true);
  };

  const handleSaveTask = (taskData: Partial<Task>) => {
    if (editingTask) {
      // Update existing task
      setTasks(tasks.map(task => 
        task.id === editingTask.id 
          ? { ...task, ...taskData, updatedAt: new Date().toISOString() }
          : task
      ));
    } else {
      // Create new task
      const newTask: Task = {
        id: Date.now().toString(),
        title: taskData.title || '',
        description: taskData.description || '',
        status: taskData.status || 'todo',
        priority: taskData.priority || 'medium',
        assignee: taskData.assignee || 'Loic',
        dueDate: taskData.dueDate,
        tags: taskData.tags || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      setTasks([...tasks, newTask]);
    }
    setShowTaskModal(false);
    setEditingTask(null);
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks(tasks.filter(task => task.id !== taskId));
  };

  const updateTaskStatus = (taskId: string, newStatus: Task['status']) => {
    setTasks(tasks.map(task => 
      task.id === taskId 
        ? { ...task, status: newStatus, updatedAt: new Date().toISOString() }
        : task
    ));
  };

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'todo': return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'in-progress': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'done': return 'bg-green-100 text-green-800 border-green-300';
    }
  };

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'low': return 'bg-gray-100 text-gray-600';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      case 'high': return 'bg-red-100 text-red-700';
    }
  };

  const todoTasks = tasks.filter(task => task.status === 'todo');
  const inProgressTasks = tasks.filter(task => task.status === 'in-progress');
  const doneTasks = tasks.filter(task => task.status === 'done');

  return (
    <>
      <Head>
        <title>Task Manager - DevFlow Dashboard</title>
        <meta name="description" content="Advanced task management for development teams" />
      </Head>
      
      <div className="min-h-screen bg-gray-50">
        {/* Navigation */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="max-w-7xl mx-auto">
            <nav className="flex space-x-4">
              <a href="/" className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300">
                Dashboard
              </a>
              <a href="/tasks" className="bg-blue-600 text-white px-4 py-2 rounded-md">
                Task Manager
              </a>
              <a href="/code-archaeology" className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300">
                Code Archaeology
              </a>
              <a href="/analytics" className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300">
                Analytics
              </a>
            </nav>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Task Manager</h1>
              <p className="text-gray-600 mt-2">Manage development tasks and track progress</p>
            </div>
            <button
              onClick={handleCreateTask}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Create Task
            </button>
          </div>

          {/* Task Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <div className="text-2xl font-bold text-gray-900">{tasks.length}</div>
              <div className="text-sm text-gray-600">Total Tasks</div>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <div className="text-2xl font-bold text-blue-600">{inProgressTasks.length}</div>
              <div className="text-sm text-gray-600">In Progress</div>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <div className="text-2xl font-bold text-green-600">{doneTasks.length}</div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <div className="text-2xl font-bold text-gray-600">{todoTasks.length}</div>
              <div className="text-sm text-gray-600">Todo</div>
            </div>
          </div>

          {/* Kanban Board */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Todo Column */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">Todo ({todoTasks.length})</h3>
              </div>
              <div className="p-4 space-y-4">
                {todoTasks.map(task => (
                  <div key={task.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow cursor-pointer">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-gray-900 text-sm">{task.title}</h4>
                      <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{task.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-1">
                        {task.tags.map(tag => (
                          <span key={tag} className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEditTask(task)}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => updateTaskStatus(task.id, 'in-progress')}
                          className="text-green-600 hover:text-green-800 text-sm"
                        >
                          Start
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* In Progress Column */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">In Progress ({inProgressTasks.length})</h3>
              </div>
              <div className="p-4 space-y-4">
                {inProgressTasks.map(task => (
                  <div key={task.id} className="bg-blue-50 rounded-lg p-4 border border-blue-200 hover:shadow-md transition-shadow cursor-pointer">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-gray-900 text-sm">{task.title}</h4>
                      <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{task.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-1">
                        {task.tags.map(tag => (
                          <span key={tag} className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEditTask(task)}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => updateTaskStatus(task.id, 'done')}
                          className="text-green-600 hover:text-green-800 text-sm"
                        >
                          Complete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Done Column */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">Done ({doneTasks.length})</h3>
              </div>
              <div className="p-4 space-y-4">
                {doneTasks.map(task => (
                  <div key={task.id} className="bg-green-50 rounded-lg p-4 border border-green-200 hover:shadow-md transition-shadow cursor-pointer">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-gray-900 text-sm">{task.title}</h4>
                      <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{task.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-1">
                        {task.tags.map(tag => (
                          <span key={tag} className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEditTask(task)}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Task Modal */}
        {showTaskModal && (
          <TaskModal
            isOpen={showTaskModal}
            onClose={() => {
              setShowTaskModal(false);
              setEditingTask(null);
            }}
            onSave={handleSaveTask}
            task={editingTask}
          />
        )}
      </div>
    </>
  );
};

export default function TasksPage() {
  return (
    <AuthProvider>
      <ProtectedRoute>
        <WebSocketProvider autoConnect={false}>
          <TasksContent />
        </WebSocketProvider>
      </ProtectedRoute>
    </AuthProvider>
  );
}