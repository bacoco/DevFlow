/**
 * MSW API Mocks for Integration Testing
 * Mock Service Worker setup for testing API integrations
 */

import { rest } from 'msw';
import { setupServer } from 'msw/node';

// Mock data generators
const generateMockUser = (id: number = 1) => ({
  id,
  name: `User ${id}`,
  email: `user${id}@example.com`,
  avatar: `https://example.com/avatar${id}.jpg`,
  role: 'developer',
  preferences: {
    theme: 'dark',
    notifications: true,
    language: 'en',
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const generateMockTask = (id: number = 1) => ({
  id,
  title: `Task ${id}`,
  description: `Description for task ${id}`,
  status: ['todo', 'in-progress', 'done'][id % 3],
  priority: ['low', 'medium', 'high'][id % 3],
  assignee: generateMockUser(id),
  tags: [`tag${id}`, `category${id % 3}`],
  dueDate: new Date(Date.now() + id * 24 * 60 * 60 * 1000).toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const generateMockNotification = (id: number = 1) => ({
  id,
  title: `Notification ${id}`,
  message: `This is notification message ${id}`,
  type: ['info', 'success', 'warning', 'error'][id % 4],
  read: id % 2 === 0,
  timestamp: new Date().toISOString(),
  actions: [
    { label: 'View', action: 'view' },
    { label: 'Dismiss', action: 'dismiss' },
  ],
});

const generateMockDashboardData = () => ({
  metrics: {
    totalTasks: 156,
    completedTasks: 89,
    inProgressTasks: 45,
    overdueTasks: 12,
    teamMembers: 8,
    activeProjects: 5,
  },
  charts: {
    taskCompletion: Array.from({ length: 7 }, (_, i) => ({
      date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      completed: Math.floor(Math.random() * 20) + 5,
      created: Math.floor(Math.random() * 15) + 3,
    })),
    teamVelocity: Array.from({ length: 12 }, (_, i) => ({
      month: new Date(2023, i, 1).toISOString().split('T')[0],
      velocity: Math.floor(Math.random() * 50) + 20,
      capacity: Math.floor(Math.random() * 60) + 40,
    })),
  },
  recentActivity: Array.from({ length: 10 }, (_, i) => ({
    id: i + 1,
    type: ['task_created', 'task_completed', 'comment_added', 'file_uploaded'][i % 4],
    user: generateMockUser(i + 1),
    description: `Activity description ${i + 1}`,
    timestamp: new Date(Date.now() - i * 60 * 60 * 1000).toISOString(),
  })),
});

// API handlers
export const handlers = [
  // Authentication endpoints
  rest.post('/api/auth/login', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        user: generateMockUser(1),
        token: 'mock-jwt-token',
        refreshToken: 'mock-refresh-token',
      })
    );
  }),

  rest.post('/api/auth/logout', (req, res, ctx) => {
    return res(ctx.status(200), ctx.json({ success: true }));
  }),

  rest.get('/api/auth/me', (req, res, ctx) => {
    return res(ctx.status(200), ctx.json(generateMockUser(1)));
  }),

  // User endpoints
  rest.get('/api/users', (req, res, ctx) => {
    const page = parseInt(req.url.searchParams.get('page') || '1');
    const limit = parseInt(req.url.searchParams.get('limit') || '10');
    const search = req.url.searchParams.get('search');

    let users = Array.from({ length: 50 }, (_, i) => generateMockUser(i + 1));

    if (search) {
      users = users.filter(user => 
        user.name.toLowerCase().includes(search.toLowerCase()) ||
        user.email.toLowerCase().includes(search.toLowerCase())
      );
    }

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedUsers = users.slice(startIndex, endIndex);

    return res(
      ctx.status(200),
      ctx.json({
        data: paginatedUsers,
        pagination: {
          page,
          limit,
          total: users.length,
          totalPages: Math.ceil(users.length / limit),
        },
      })
    );
  }),

  rest.get('/api/users/:id', (req, res, ctx) => {
    const { id } = req.params;
    return res(ctx.status(200), ctx.json(generateMockUser(parseInt(id as string))));
  }),

  rest.put('/api/users/:id', (req, res, ctx) => {
    const { id } = req.params;
    return res(ctx.status(200), ctx.json(generateMockUser(parseInt(id as string))));
  }),

  // Task endpoints
  rest.get('/api/tasks', (req, res, ctx) => {
    const page = parseInt(req.url.searchParams.get('page') || '1');
    const limit = parseInt(req.url.searchParams.get('limit') || '10');
    const status = req.url.searchParams.get('status');
    const priority = req.url.searchParams.get('priority');
    const search = req.url.searchParams.get('search');

    let tasks = Array.from({ length: 100 }, (_, i) => generateMockTask(i + 1));

    // Apply filters
    if (status) {
      tasks = tasks.filter(task => task.status === status);
    }
    if (priority) {
      tasks = tasks.filter(task => task.priority === priority);
    }
    if (search) {
      tasks = tasks.filter(task => 
        task.title.toLowerCase().includes(search.toLowerCase()) ||
        task.description.toLowerCase().includes(search.toLowerCase())
      );
    }

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedTasks = tasks.slice(startIndex, endIndex);

    return res(
      ctx.status(200),
      ctx.json({
        data: paginatedTasks,
        pagination: {
          page,
          limit,
          total: tasks.length,
          totalPages: Math.ceil(tasks.length / limit),
        },
      })
    );
  }),

  rest.post('/api/tasks', async (req, res, ctx) => {
    const taskData = await req.json();
    const newTask = {
      ...generateMockTask(Date.now()),
      ...taskData,
    };
    return res(ctx.status(201), ctx.json(newTask));
  }),

  rest.get('/api/tasks/:id', (req, res, ctx) => {
    const { id } = req.params;
    return res(ctx.status(200), ctx.json(generateMockTask(parseInt(id as string))));
  }),

  rest.put('/api/tasks/:id', async (req, res, ctx) => {
    const { id } = req.params;
    const updates = await req.json();
    const updatedTask = {
      ...generateMockTask(parseInt(id as string)),
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    return res(ctx.status(200), ctx.json(updatedTask));
  }),

  rest.delete('/api/tasks/:id', (req, res, ctx) => {
    return res(ctx.status(204));
  }),

  // Dashboard endpoints
  rest.get('/api/dashboard', (req, res, ctx) => {
    return res(ctx.status(200), ctx.json(generateMockDashboardData()));
  }),

  rest.get('/api/dashboard/metrics', (req, res, ctx) => {
    const { metrics } = generateMockDashboardData();
    return res(ctx.status(200), ctx.json(metrics));
  }),

  rest.get('/api/dashboard/charts/:type', (req, res, ctx) => {
    const { type } = req.params;
    const { charts } = generateMockDashboardData();
    
    if (type === 'task-completion') {
      return res(ctx.status(200), ctx.json(charts.taskCompletion));
    } else if (type === 'team-velocity') {
      return res(ctx.status(200), ctx.json(charts.teamVelocity));
    }
    
    return res(ctx.status(404), ctx.json({ error: 'Chart type not found' }));
  }),

  // Notification endpoints
  rest.get('/api/notifications', (req, res, ctx) => {
    const unreadOnly = req.url.searchParams.get('unread') === 'true';
    let notifications = Array.from({ length: 20 }, (_, i) => generateMockNotification(i + 1));

    if (unreadOnly) {
      notifications = notifications.filter(n => !n.read);
    }

    return res(ctx.status(200), ctx.json({ data: notifications }));
  }),

  rest.put('/api/notifications/:id/read', (req, res, ctx) => {
    const { id } = req.params;
    const notification = {
      ...generateMockNotification(parseInt(id as string)),
      read: true,
    };
    return res(ctx.status(200), ctx.json(notification));
  }),

  rest.delete('/api/notifications/:id', (req, res, ctx) => {
    return res(ctx.status(204));
  }),

  // Search endpoints
  rest.get('/api/search', (req, res, ctx) => {
    const query = req.url.searchParams.get('q') || '';
    const type = req.url.searchParams.get('type');

    const results = {
      tasks: Array.from({ length: 5 }, (_, i) => ({
        ...generateMockTask(i + 1),
        title: `${query} Task ${i + 1}`,
      })),
      users: Array.from({ length: 3 }, (_, i) => ({
        ...generateMockUser(i + 1),
        name: `${query} User ${i + 1}`,
      })),
    };

    if (type) {
      return res(ctx.status(200), ctx.json({ data: results[type as keyof typeof results] || [] }));
    }

    return res(ctx.status(200), ctx.json({ data: results }));
  }),

  // File upload endpoints
  rest.post('/api/upload', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        id: 'mock-file-id',
        filename: 'mock-file.jpg',
        url: 'https://example.com/mock-file.jpg',
        size: 1024000,
        type: 'image/jpeg',
      })
    );
  }),

  // Settings endpoints
  rest.get('/api/settings', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        theme: 'dark',
        notifications: {
          email: true,
          push: false,
          desktop: true,
        },
        privacy: {
          profileVisible: true,
          activityVisible: false,
        },
        integrations: {
          slack: { enabled: true, webhook: 'https://hooks.slack.com/...' },
          github: { enabled: false },
        },
      })
    );
  }),

  rest.put('/api/settings', async (req, res, ctx) => {
    const settings = await req.json();
    return res(ctx.status(200), ctx.json(settings));
  }),

  // Error simulation endpoints
  rest.get('/api/error/500', (req, res, ctx) => {
    return res(
      ctx.status(500),
      ctx.json({ error: 'Internal Server Error', message: 'Something went wrong' })
    );
  }),

  rest.get('/api/error/404', (req, res, ctx) => {
    return res(
      ctx.status(404),
      ctx.json({ error: 'Not Found', message: 'Resource not found' })
    );
  }),

  rest.get('/api/error/timeout', (req, res, ctx) => {
    return res(
      ctx.delay(30000), // 30 second delay to simulate timeout
      ctx.status(200),
      ctx.json({ data: 'This should timeout' })
    );
  }),

  // Slow response simulation
  rest.get('/api/slow', (req, res, ctx) => {
    return res(
      ctx.delay(2000), // 2 second delay
      ctx.status(200),
      ctx.json({ data: 'Slow response data' })
    );
  }),
];

// Setup MSW server
export const server = setupServer(...handlers);

// Test utilities
export const mockApiResponse = (endpoint: string, response: any, status: number = 200) => {
  server.use(
    rest.get(endpoint, (req, res, ctx) => {
      return res(ctx.status(status), ctx.json(response));
    })
  );
};

export const mockApiError = (endpoint: string, status: number = 500, message: string = 'Server Error') => {
  server.use(
    rest.get(endpoint, (req, res, ctx) => {
      return res(ctx.status(status), ctx.json({ error: message }));
    })
  );
};

export const mockApiDelay = (endpoint: string, delay: number = 1000) => {
  server.use(
    rest.get(endpoint, (req, res, ctx) => {
      return res(
        ctx.delay(delay),
        ctx.status(200),
        ctx.json({ data: 'Delayed response' })
      );
    })
  );
};

// Setup and teardown helpers
export const setupMockServer = () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());
};

// Request interceptors for testing
export const getLastRequest = () => {
  // This would be implemented with a request logger
  // For now, it's a placeholder
  return null;
};

export const clearRequestHistory = () => {
  // Clear any stored request history
};

// Mock data exports for use in tests
export const mockData = {
  user: generateMockUser(1),
  users: Array.from({ length: 10 }, (_, i) => generateMockUser(i + 1)),
  task: generateMockTask(1),
  tasks: Array.from({ length: 10 }, (_, i) => generateMockTask(i + 1)),
  notification: generateMockNotification(1),
  notifications: Array.from({ length: 10 }, (_, i) => generateMockNotification(i + 1)),
  dashboard: generateMockDashboardData(),
};