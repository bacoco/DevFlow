/**
 * React Query hooks for task data management
 * Provides caching, background updates, and optimistic updates for task operations
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { taskService } from '../../services/taskService';

// Task interfaces (matching the service)
interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignee: string;
  dueDate: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  starred: boolean;
}

interface CreateTaskData {
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignee: string;
  dueDate: string;
  tags: string[];
}

interface UpdateTaskData extends Partial<CreateTaskData> {
  starred?: boolean;
}

interface TaskStats {
  total: number;
  completed: number;
  inProgress: number;
  todo: number;
  overdue: number;
}

// Query keys for consistent cache management
export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...taskKeys.lists(), filters] as const,
  details: () => [...taskKeys.all, 'detail'] as const,
  detail: (id: string) => [...taskKeys.details(), id] as const,
  search: (query: string) => [...taskKeys.all, 'search', query] as const,
  stats: () => [...taskKeys.all, 'stats'] as const,
  byStatus: (status: string) => [...taskKeys.all, 'status', status] as const,
  byPriority: (priority: string) => [...taskKeys.all, 'priority', priority] as const,
  byAssignee: (assignee: string) => [...taskKeys.all, 'assignee', assignee] as const,
  overdue: () => [...taskKeys.all, 'overdue'] as const,
} as const;

// Get all tasks query hook
export function useTasks(
  options?: Omit<UseQueryOptions<Task[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: taskKeys.lists(),
    queryFn: () => taskService.getTasks(),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error) => {
      // Don't retry on 4xx errors
      if (error.message.includes('Failed to fetch') && failureCount > 0) {
        return false;
      }
      return failureCount < 3;
    },
    ...options,
  });
}

// Get single task query hook
export function useTask(
  id: string,
  options?: Omit<UseQueryOptions<Task, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: taskKeys.detail(id),
    queryFn: () => taskService.getTask(id),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!id,
    ...options,
  });
}

// Search tasks query hook
export function useSearchTasks(
  query: string,
  options?: Omit<UseQueryOptions<Task[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: taskKeys.search(query),
    queryFn: () => taskService.searchTasks(query),
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    enabled: query.length > 0,
    ...options,
  });
}

// Get tasks by status query hook
export function useTasksByStatus(
  status: string,
  options?: Omit<UseQueryOptions<Task[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: taskKeys.byStatus(status),
    queryFn: () => taskService.getTasksByStatus(status),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!status,
    ...options,
  });
}

// Get tasks by priority query hook
export function useTasksByPriority(
  priority: string,
  options?: Omit<UseQueryOptions<Task[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: taskKeys.byPriority(priority),
    queryFn: () => taskService.getTasksByPriority(priority),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!priority,
    ...options,
  });
}

// Get tasks by assignee query hook
export function useTasksByAssignee(
  assignee: string,
  options?: Omit<UseQueryOptions<Task[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: taskKeys.byAssignee(assignee),
    queryFn: () => taskService.getTasksByAssignee(assignee),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!assignee,
    ...options,
  });
}

// Get overdue tasks query hook
export function useOverdueTasks(
  options?: Omit<UseQueryOptions<Task[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: taskKeys.overdue(),
    queryFn: () => taskService.getOverdueTasks(),
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

// Get task stats query hook
export function useTaskStats(
  options?: Omit<UseQueryOptions<TaskStats, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: taskKeys.stats(),
    queryFn: () => taskService.getTaskStats(),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

// Create task mutation
export function useCreateTask(
  options?: UseMutationOptions<Task, Error, CreateTaskData>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskData: CreateTaskData) => taskService.createTask(taskData),
    onMutate: async (newTaskData) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: taskKeys.all });

      // Create optimistic task
      const optimisticTask: Task = {
        id: `temp-${Date.now()}`,
        ...newTaskData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        starred: false,
      };

      // Snapshot previous values
      const previousTasks = queryClient.getQueryData(taskKeys.lists());
      const previousStats = queryClient.getQueryData(taskKeys.stats());

      // Optimistically update tasks list
      if (previousTasks) {
        queryClient.setQueryData(taskKeys.lists(), (old: Task[] | undefined) => 
          old ? [optimisticTask, ...old] : [optimisticTask]
        );
      }

      // Optimistically update stats
      if (previousStats) {
        queryClient.setQueryData(taskKeys.stats(), (old: TaskStats | undefined) => {
          if (!old) return old;
          return {
            ...old,
            total: old.total + 1,
            [newTaskData.status === 'todo' ? 'todo' : 
             newTaskData.status === 'in-progress' ? 'inProgress' : 'completed']: 
             old[newTaskData.status === 'todo' ? 'todo' : 
                 newTaskData.status === 'in-progress' ? 'inProgress' : 'completed'] + 1,
          };
        });
      }

      return { previousTasks, previousStats, optimisticTask };
    },
    onError: (err, newTaskData, context) => {
      // Roll back optimistic updates
      if (context?.previousTasks) {
        queryClient.setQueryData(taskKeys.lists(), context.previousTasks);
      }
      if (context?.previousStats) {
        queryClient.setQueryData(taskKeys.stats(), context.previousStats);
      }
    },
    onSuccess: (data, variables, context) => {
      // Replace optimistic task with real data
      if (context?.optimisticTask) {
        queryClient.setQueryData(taskKeys.lists(), (old: Task[] | undefined) => 
          old ? old.map(task => task.id === context.optimisticTask.id ? data : task) : [data]
        );
      }
    },
    onSettled: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
    ...options,
  });
}

// Update task mutation
export function useUpdateTask(
  options?: UseMutationOptions<Task, Error, { id: string; data: UpdateTaskData }>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => taskService.updateTask(id, data),
    onMutate: async ({ id, data }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: taskKeys.all });

      // Snapshot previous values
      const previousTask = queryClient.getQueryData(taskKeys.detail(id));
      const previousTasks = queryClient.getQueryData(taskKeys.lists());

      // Optimistically update task detail
      if (previousTask) {
        const updatedTask = {
          ...previousTask as Task,
          ...data,
          updatedAt: new Date().toISOString(),
        };
        queryClient.setQueryData(taskKeys.detail(id), updatedTask);
      }

      // Optimistically update tasks list
      if (previousTasks) {
        queryClient.setQueryData(taskKeys.lists(), (old: Task[] | undefined) =>
          old ? old.map(task => 
            task.id === id 
              ? { ...task, ...data, updatedAt: new Date().toISOString() }
              : task
          ) : []
        );
      }

      return { previousTask, previousTasks };
    },
    onError: (err, { id }, context) => {
      // Roll back optimistic updates
      if (context?.previousTask) {
        queryClient.setQueryData(taskKeys.detail(id), context.previousTask);
      }
      if (context?.previousTasks) {
        queryClient.setQueryData(taskKeys.lists(), context.previousTasks);
      }
    },
    onSettled: (data, error, { id }) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taskKeys.stats() });
    },
    ...options,
  });
}

// Delete task mutation
export function useDeleteTask(
  options?: UseMutationOptions<void, Error, string>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => taskService.deleteTask(id),
    onMutate: async (id) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: taskKeys.all });

      // Snapshot previous values
      const previousTask = queryClient.getQueryData(taskKeys.detail(id));
      const previousTasks = queryClient.getQueryData(taskKeys.lists());

      // Optimistically remove task from lists
      if (previousTasks) {
        queryClient.setQueryData(taskKeys.lists(), (old: Task[] | undefined) =>
          old ? old.filter(task => task.id !== id) : []
        );
      }

      // Remove task detail from cache
      queryClient.removeQueries({ queryKey: taskKeys.detail(id) });

      return { previousTask, previousTasks };
    },
    onError: (err, id, context) => {
      // Roll back optimistic updates
      if (context?.previousTask) {
        queryClient.setQueryData(taskKeys.detail(id), context.previousTask);
      }
      if (context?.previousTasks) {
        queryClient.setQueryData(taskKeys.lists(), context.previousTasks);
      }
    },
    onSettled: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
    ...options,
  });
}

// Toggle task status mutation
export function useToggleTaskStatus(
  options?: UseMutationOptions<Task, Error, string>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => taskService.toggleTaskStatus(id),
    onMutate: async (id) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: taskKeys.all });

      // Snapshot previous values
      const previousTask = queryClient.getQueryData(taskKeys.detail(id)) as Task;
      const previousTasks = queryClient.getQueryData(taskKeys.lists()) as Task[];

      if (previousTask) {
        // Determine next status
        const statusOrder: Array<'todo' | 'in-progress' | 'completed'> = ['todo', 'in-progress', 'completed'];
        const currentIndex = statusOrder.indexOf(previousTask.status);
        const nextStatus = statusOrder[(currentIndex + 1) % statusOrder.length];

        const updatedTask = {
          ...previousTask,
          status: nextStatus,
          updatedAt: new Date().toISOString(),
        };

        // Optimistically update task detail
        queryClient.setQueryData(taskKeys.detail(id), updatedTask);

        // Optimistically update tasks list
        if (previousTasks) {
          queryClient.setQueryData(taskKeys.lists(), 
            previousTasks.map(task => task.id === id ? updatedTask : task)
          );
        }
      }

      return { previousTask, previousTasks };
    },
    onError: (err, id, context) => {
      // Roll back optimistic updates
      if (context?.previousTask) {
        queryClient.setQueryData(taskKeys.detail(id), context.previousTask);
      }
      if (context?.previousTasks) {
        queryClient.setQueryData(taskKeys.lists(), context.previousTasks);
      }
    },
    onSettled: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
    ...options,
  });
}

// Toggle task star mutation
export function useToggleTaskStar(
  options?: UseMutationOptions<Task, Error, string>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => taskService.toggleTaskStar(id),
    onMutate: async (id) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: taskKeys.all });

      // Snapshot previous values
      const previousTask = queryClient.getQueryData(taskKeys.detail(id)) as Task;
      const previousTasks = queryClient.getQueryData(taskKeys.lists()) as Task[];

      if (previousTask) {
        const updatedTask = {
          ...previousTask,
          starred: !previousTask.starred,
          updatedAt: new Date().toISOString(),
        };

        // Optimistically update task detail
        queryClient.setQueryData(taskKeys.detail(id), updatedTask);

        // Optimistically update tasks list
        if (previousTasks) {
          queryClient.setQueryData(taskKeys.lists(), 
            previousTasks.map(task => task.id === id ? updatedTask : task)
          );
        }
      }

      return { previousTask, previousTasks };
    },
    onError: (err, id, context) => {
      // Roll back optimistic updates
      if (context?.previousTask) {
        queryClient.setQueryData(taskKeys.detail(id), context.previousTask);
      }
      if (context?.previousTasks) {
        queryClient.setQueryData(taskKeys.lists(), context.previousTasks);
      }
    },
    onSettled: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
    ...options,
  });
}