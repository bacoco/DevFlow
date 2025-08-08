/**
 * Tests for task React Query hooks
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { taskService } from '../../../services/taskService';
import {
  useTasks,
  useTask,
  useSearchTasks,
  useTasksByStatus,
  useTasksByPriority,
  useTasksByAssignee,
  useOverdueTasks,
  useTaskStats,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useToggleTaskStatus,
  useToggleTaskStar,
} from '../useTaskQueries';

// Mock the task service
jest.mock('../../../services/taskService');
const mockTaskService = taskService as jest.Mocked<typeof taskService>;

// Test data
const mockTask = {
  id: 'task-1',
  title: 'Test Task',
  description: 'Test task description',
  status: 'todo' as const,
  priority: 'medium' as const,
  assignee: 'test-user',
  dueDate: '2024-12-31',
  tags: ['test', 'development'],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  starred: false,
};

const mockTasks = [
  mockTask,
  {
    id: 'task-2',
    title: 'Another Task',
    description: 'Another task description',
    status: 'in-progress' as const,
    priority: 'high' as const,
    assignee: 'another-user',
    dueDate: '2024-11-30',
    tags: ['urgent'],
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
    starred: true,
  },
];

const mockTaskStats = {
  total: 10,
  completed: 3,
  inProgress: 4,
  todo: 3,
  overdue: 1,
};

const mockCreateTaskData = {
  title: 'New Task',
  description: 'New task description',
  status: 'todo' as const,
  priority: 'low' as const,
  assignee: 'test-user',
  dueDate: '2024-12-31',
  tags: ['new'],
};

// Test wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useTasks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch tasks successfully', async () => {
    mockTaskService.getTasks.mockResolvedValue(mockTasks);

    const { result } = renderHook(() => useTasks(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockTasks);
    expect(mockTaskService.getTasks).toHaveBeenCalled();
  });

  it('should handle fetch tasks error', async () => {
    const error = new Error('Failed to fetch tasks');
    mockTaskService.getTasks.mockRejectedValue(error);

    const { result } = renderHook(() => useTasks(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(error);
  });
});

describe('useTask', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch single task successfully', async () => {
    mockTaskService.getTask.mockResolvedValue(mockTask);

    const { result } = renderHook(() => useTask('task-1'), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockTask);
    expect(mockTaskService.getTask).toHaveBeenCalledWith('task-1');
  });

  it('should not fetch when id is empty', async () => {
    const { result } = renderHook(() => useTask(''), { wrapper: createWrapper() });

    expect(result.current.isIdle).toBe(true);
    expect(mockTaskService.getTask).not.toHaveBeenCalled();
  });

  it('should handle fetch task error', async () => {
    const error = new Error('Task not found');
    mockTaskService.getTask.mockRejectedValue(error);

    const { result } = renderHook(() => useTask('nonexistent'), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(error);
  });
});

describe('useSearchTasks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should search tasks successfully', async () => {
    mockTaskService.searchTasks.mockResolvedValue([mockTask]);

    const { result } = renderHook(() => useSearchTasks('test'), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([mockTask]);
    expect(mockTaskService.searchTasks).toHaveBeenCalledWith('test');
  });

  it('should not search when query is empty', async () => {
    const { result } = renderHook(() => useSearchTasks(''), { wrapper: createWrapper() });

    expect(result.current.isIdle).toBe(true);
    expect(mockTaskService.searchTasks).not.toHaveBeenCalled();
  });
});

describe('useTasksByStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch tasks by status successfully', async () => {
    const todoTasks = [mockTask];
    mockTaskService.getTasksByStatus.mockResolvedValue(todoTasks);

    const { result } = renderHook(() => useTasksByStatus('todo'), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(todoTasks);
    expect(mockTaskService.getTasksByStatus).toHaveBeenCalledWith('todo');
  });
});

describe('useTasksByPriority', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch tasks by priority successfully', async () => {
    const highPriorityTasks = [mockTasks[1]];
    mockTaskService.getTasksByPriority.mockResolvedValue(highPriorityTasks);

    const { result } = renderHook(() => useTasksByPriority('high'), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(highPriorityTasks);
    expect(mockTaskService.getTasksByPriority).toHaveBeenCalledWith('high');
  });
});

describe('useTasksByAssignee', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch tasks by assignee successfully', async () => {
    const userTasks = [mockTask];
    mockTaskService.getTasksByAssignee.mockResolvedValue(userTasks);

    const { result } = renderHook(() => useTasksByAssignee('test-user'), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(userTasks);
    expect(mockTaskService.getTasksByAssignee).toHaveBeenCalledWith('test-user');
  });
});

describe('useOverdueTasks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch overdue tasks successfully', async () => {
    const overdueTasks = [mockTask];
    mockTaskService.getOverdueTasks.mockResolvedValue(overdueTasks);

    const { result } = renderHook(() => useOverdueTasks(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(overdueTasks);
    expect(mockTaskService.getOverdueTasks).toHaveBeenCalled();
  });
});

describe('useTaskStats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch task stats successfully', async () => {
    mockTaskService.getTaskStats.mockResolvedValue(mockTaskStats);

    const { result } = renderHook(() => useTaskStats(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockTaskStats);
    expect(mockTaskService.getTaskStats).toHaveBeenCalled();
  });
});

describe('useCreateTask', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create task successfully', async () => {
    const createdTask = { ...mockCreateTaskData, id: 'new-task-id', createdAt: '2024-01-03T00:00:00Z', updatedAt: '2024-01-03T00:00:00Z', starred: false };
    mockTaskService.createTask.mockResolvedValue(createdTask);

    const { result } = renderHook(() => useCreateTask(), { wrapper: createWrapper() });

    result.current.mutate(mockCreateTaskData);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(createdTask);
    expect(mockTaskService.createTask).toHaveBeenCalledWith(mockCreateTaskData);
  });

  it('should handle create task error', async () => {
    const error = new Error('Failed to create task');
    mockTaskService.createTask.mockRejectedValue(error);

    const { result } = renderHook(() => useCreateTask(), { wrapper: createWrapper() });

    result.current.mutate(mockCreateTaskData);

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(error);
  });
});

describe('useUpdateTask', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should update task successfully', async () => {
    const updateData = { title: 'Updated Task Title' };
    const updatedTask = { ...mockTask, ...updateData, updatedAt: '2024-01-03T00:00:00Z' };
    mockTaskService.updateTask.mockResolvedValue(updatedTask);

    const { result } = renderHook(() => useUpdateTask(), { wrapper: createWrapper() });

    result.current.mutate({ id: 'task-1', data: updateData });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(updatedTask);
    expect(mockTaskService.updateTask).toHaveBeenCalledWith('task-1', updateData);
  });

  it('should handle update task error', async () => {
    const error = new Error('Failed to update task');
    mockTaskService.updateTask.mockRejectedValue(error);

    const { result } = renderHook(() => useUpdateTask(), { wrapper: createWrapper() });

    result.current.mutate({ id: 'task-1', data: { title: 'Updated' } });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(error);
  });
});

describe('useDeleteTask', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should delete task successfully', async () => {
    mockTaskService.deleteTask.mockResolvedValue(undefined);

    const { result } = renderHook(() => useDeleteTask(), { wrapper: createWrapper() });

    result.current.mutate('task-1');

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockTaskService.deleteTask).toHaveBeenCalledWith('task-1');
  });

  it('should handle delete task error', async () => {
    const error = new Error('Failed to delete task');
    mockTaskService.deleteTask.mockRejectedValue(error);

    const { result } = renderHook(() => useDeleteTask(), { wrapper: createWrapper() });

    result.current.mutate('task-1');

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(error);
  });
});

describe('useToggleTaskStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should toggle task status successfully', async () => {
    const toggledTask = { ...mockTask, status: 'in-progress' as const, updatedAt: '2024-01-03T00:00:00Z' };
    mockTaskService.toggleTaskStatus.mockResolvedValue(toggledTask);

    const { result } = renderHook(() => useToggleTaskStatus(), { wrapper: createWrapper() });

    result.current.mutate('task-1');

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(toggledTask);
    expect(mockTaskService.toggleTaskStatus).toHaveBeenCalledWith('task-1');
  });

  it('should handle toggle task status error', async () => {
    const error = new Error('Failed to toggle task status');
    mockTaskService.toggleTaskStatus.mockRejectedValue(error);

    const { result } = renderHook(() => useToggleTaskStatus(), { wrapper: createWrapper() });

    result.current.mutate('task-1');

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(error);
  });
});

describe('useToggleTaskStar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should toggle task star successfully', async () => {
    const starredTask = { ...mockTask, starred: true, updatedAt: '2024-01-03T00:00:00Z' };
    mockTaskService.toggleTaskStar.mockResolvedValue(starredTask);

    const { result } = renderHook(() => useToggleTaskStar(), { wrapper: createWrapper() });

    result.current.mutate('task-1');

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(starredTask);
    expect(mockTaskService.toggleTaskStar).toHaveBeenCalledWith('task-1');
  });

  it('should handle toggle task star error', async () => {
    const error = new Error('Failed to toggle task star');
    mockTaskService.toggleTaskStar.mockRejectedValue(error);

    const { result } = renderHook(() => useToggleTaskStar(), { wrapper: createWrapper() });

    result.current.mutate('task-1');

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(error);
  });
});