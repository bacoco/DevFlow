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

class TaskService {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:3000/api') {
    this.baseUrl = baseUrl;
  }

  async getTasks(): Promise<Task[]> {
    try {
      const response = await fetch(`${this.baseUrl}/tasks`);
      if (!response.ok) {
        throw new Error('Failed to fetch tasks');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching tasks:', error);
      throw error;
    }
  }

  async getTask(id: string): Promise<Task> {
    try {
      const response = await fetch(`${this.baseUrl}/tasks/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch task');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching task:', error);
      throw error;
    }
  }

  async createTask(taskData: CreateTaskData): Promise<Task> {
    try {
      const response = await fetch(`${this.baseUrl}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...taskData,
          id: Date.now().toString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          starred: false,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create task');
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  }

  async updateTask(id: string, taskData: UpdateTaskData): Promise<Task> {
    try {
      const response = await fetch(`${this.baseUrl}/tasks/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...taskData,
          updatedAt: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update task');
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  }

  async deleteTask(id: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/tasks/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete task');
      }
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  }

  async toggleTaskStatus(id: string): Promise<Task> {
    try {
      const response = await fetch(`${this.baseUrl}/tasks/${id}/toggle-status`, {
        method: 'PATCH',
      });

      if (!response.ok) {
        throw new Error('Failed to toggle task status');
      }

      return await response.json();
    } catch (error) {
      console.error('Error toggling task status:', error);
      throw error;
    }
  }

  async toggleTaskStar(id: string): Promise<Task> {
    try {
      const response = await fetch(`${this.baseUrl}/tasks/${id}/toggle-star`, {
        method: 'PATCH',
      });

      if (!response.ok) {
        throw new Error('Failed to toggle task star');
      }

      return await response.json();
    } catch (error) {
      console.error('Error toggling task star:', error);
      throw error;
    }
  }

  async searchTasks(query: string): Promise<Task[]> {
    try {
      const response = await fetch(`${this.baseUrl}/tasks/search?q=${encodeURIComponent(query)}`);
      if (!response.ok) {
        throw new Error('Failed to search tasks');
      }
      return await response.json();
    } catch (error) {
      console.error('Error searching tasks:', error);
      throw error;
    }
  }

  async getTasksByStatus(status: string): Promise<Task[]> {
    try {
      const response = await fetch(`${this.baseUrl}/tasks?status=${status}`);
      if (!response.ok) {
        throw new Error('Failed to fetch tasks by status');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching tasks by status:', error);
      throw error;
    }
  }

  async getTasksByPriority(priority: string): Promise<Task[]> {
    try {
      const response = await fetch(`${this.baseUrl}/tasks?priority=${priority}`);
      if (!response.ok) {
        throw new Error('Failed to fetch tasks by priority');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching tasks by priority:', error);
      throw error;
    }
  }

  async getTasksByAssignee(assignee: string): Promise<Task[]> {
    try {
      const response = await fetch(`${this.baseUrl}/tasks?assignee=${encodeURIComponent(assignee)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch tasks by assignee');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching tasks by assignee:', error);
      throw error;
    }
  }

  async getOverdueTasks(): Promise<Task[]> {
    try {
      const response = await fetch(`${this.baseUrl}/tasks/overdue`);
      if (!response.ok) {
        throw new Error('Failed to fetch overdue tasks');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching overdue tasks:', error);
      throw error;
    }
  }

  async getTaskStats(): Promise<{
    total: number;
    completed: number;
    inProgress: number;
    todo: number;
    overdue: number;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/tasks/stats`);
      if (!response.ok) {
        throw new Error('Failed to fetch task stats');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching task stats:', error);
      throw error;
    }
  }
}

export const taskService = new TaskService();
export default TaskService;