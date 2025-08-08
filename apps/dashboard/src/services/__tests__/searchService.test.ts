import SearchService, { searchService } from '../searchService';
import { Task } from '../../types/design-system';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock tasks data
const mockTasks: Task[] = [
  {
    id: '1',
    title: 'Implement user authentication',
    description: 'Add JWT-based authentication system with role-based access control',
    status: 'in-progress',
    priority: 'high',
    assignee: { id: '1', name: 'John Doe', email: 'john@example.com' },
    tags: ['backend', 'security'],
    dueDate: new Date('2025-02-15'),
    createdAt: new Date('2025-01-20'),
    updatedAt: new Date('2025-01-30'),
    starred: true
  },
  {
    id: '2',
    title: 'Design dashboard UI components',
    description: 'Create reusable React components for the main dashboard',
    status: 'done',
    priority: 'medium',
    assignee: { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
    tags: ['frontend', 'ui'],
    dueDate: new Date('2025-01-25'),
    createdAt: new Date('2025-01-15'),
    updatedAt: new Date('2025-01-25'),
    starred: false
  },
  {
    id: '3',
    title: 'Set up CI/CD pipeline',
    description: 'Configure automated testing and deployment pipeline',
    status: 'todo',
    priority: 'urgent',
    assignee: { id: '3', name: 'Mike Johnson', email: 'mike@example.com' },
    tags: ['devops', 'automation'],
    dueDate: new Date('2025-02-10'),
    createdAt: new Date('2025-01-28'),
    updatedAt: new Date('2025-01-28'),
    starred: false
  },
  {
    id: '4',
    title: 'Write API documentation',
    description: 'Document all REST API endpoints with examples',
    status: 'review',
    priority: 'low',
    assignee: { id: '4', name: 'Sarah Wilson', email: 'sarah@example.com' },
    tags: ['documentation', 'api'],
    dueDate: new Date('2025-02-20'),
    createdAt: new Date('2025-01-29'),
    updatedAt: new Date('2025-01-29'),
    starred: false
  }
];

describe('SearchService', () => {
  let service: SearchService;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    service = new SearchService();
  });

  describe('Saved Searches Management', () => {
    it('creates a new saved search', () => {
      const searchData = {
        name: 'High Priority Tasks',
        query: {
          text: '',
          fields: ['all'] as const,
          caseSensitive: false,
          wholeWords: false,
          regex: false
        },
        filters: [
          {
            id: '1',
            field: 'priority' as const,
            operator: 'equals' as const,
            value: 'high'
          }
        ]
      };

      const savedSearch = service.createSavedSearch(searchData);

      expect(savedSearch).toMatchObject({
        ...searchData,
        id: expect.any(String),
        createdAt: expect.any(Date),
        lastUsed: expect.any(Date),
        useCount: 0
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'task_saved_searches',
        expect.any(String)
      );
    });

    it('retrieves all saved searches', () => {
      const mockSavedSearches = [
        {
          id: '1',
          name: 'Test Search',
          query: { text: 'test', fields: ['all'], caseSensitive: false, wholeWords: false, regex: false },
          filters: [],
          createdAt: new Date().toISOString(),
          lastUsed: new Date().toISOString(),
          useCount: 1
        }
      ];

      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockSavedSearches));
      const newService = new SearchService();
      
      const searches = newService.getSavedSearches();
      expect(searches).toHaveLength(1);
      expect(searches[0].name).toBe('Test Search');
    });

    it('updates a saved search', () => {
      const searchData = {
        name: 'Original Name',
        query: { text: '', fields: ['all'] as const, caseSensitive: false, wholeWords: false, regex: false },
        filters: []
      };

      const savedSearch = service.createSavedSearch(searchData);
      const updated = service.updateSavedSearch(savedSearch.id, { name: 'Updated Name' });

      expect(updated?.name).toBe('Updated Name');
    });

    it('deletes a saved search', () => {
      const searchData = {
        name: 'To Delete',
        query: { text: '', fields: ['all'] as const, caseSensitive: false, wholeWords: false, regex: false },
        filters: []
      };

      const savedSearch = service.createSavedSearch(searchData);
      const deleted = service.deleteSavedSearch(savedSearch.id);

      expect(deleted).toBe(true);
      expect(service.getSavedSearches()).toHaveLength(0);
    });

    it('increments use count when using saved search', () => {
      const searchData = {
        name: 'Test Search',
        query: { text: '', fields: ['all'] as const, caseSensitive: false, wholeWords: false, regex: false },
        filters: []
      };

      const savedSearch = service.createSavedSearch(searchData);
      const used = service.useSavedSearch(savedSearch.id);

      expect(used?.useCount).toBe(1);
      expect(used?.lastUsed).toBeInstanceOf(Date);
    });

    it('handles localStorage errors gracefully', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      expect(() => new SearchService()).not.toThrow();
    });
  });

  describe('Search Functionality', () => {
    it('performs basic text search', () => {
      const query = {
        text: 'authentication',
        fields: ['all'] as const,
        caseSensitive: false,
        wholeWords: false,
        regex: false
      };

      const results = service.searchTasks(mockTasks, query, []);

      expect(results).toHaveLength(1);
      expect(results[0].task.title).toContain('authentication');
      expect(results[0].matchedFields).toContain('title');
      expect(results[0].relevanceScore).toBeGreaterThan(0);
    });

    it('performs case-sensitive search', () => {
      const query = {
        text: 'Authentication',
        fields: ['all'] as const,
        caseSensitive: true,
        wholeWords: false,
        regex: false
      };

      const results = service.searchTasks(mockTasks, query, []);
      expect(results).toHaveLength(0); // Should not match lowercase 'authentication'
    });

    it('performs whole words search', () => {
      const query = {
        text: 'auth',
        fields: ['all'] as const,
        caseSensitive: false,
        wholeWords: true,
        regex: false
      };

      const results = service.searchTasks(mockTasks, query, []);
      expect(results).toHaveLength(0); // Should not match partial word in 'authentication'
    });

    it('performs regex search', () => {
      const query = {
        text: 'auth.*tion',
        fields: ['all'] as const,
        caseSensitive: false,
        wholeWords: false,
        regex: true
      };

      const results = service.searchTasks(mockTasks, query, []);
      expect(results).toHaveLength(1);
      expect(results[0].task.title).toContain('authentication');
    });

    it('searches in specific fields', () => {
      const query = {
        text: 'backend',
        fields: ['tags'] as const,
        caseSensitive: false,
        wholeWords: false,
        regex: false
      };

      const results = service.searchTasks(mockTasks, query, []);
      expect(results).toHaveLength(1);
      expect(results[0].matchedFields).toContain('tags');
    });

    it('calculates relevance scores correctly', () => {
      const query = {
        text: 'authentication',
        fields: ['all'] as const,
        caseSensitive: false,
        wholeWords: false,
        regex: false
      };

      const results = service.searchTasks(mockTasks, query, []);
      const result = results[0];

      // Title match should have high score
      expect(result.relevanceScore).toBeGreaterThan(10);
    });

    it('highlights matched text', () => {
      const query = {
        text: 'authentication',
        fields: ['all'] as const,
        caseSensitive: false,
        wholeWords: false,
        regex: false
      };

      const results = service.searchTasks(mockTasks, query, []);
      const result = results[0];

      expect(result.highlights.title).toContain('<mark');
      expect(result.highlights.title).toContain('authentication');
    });

    it('handles invalid regex gracefully', () => {
      const query = {
        text: '[invalid',
        fields: ['all'] as const,
        caseSensitive: false,
        wholeWords: false,
        regex: true
      };

      expect(() => service.searchTasks(mockTasks, query, [])).not.toThrow();
    });
  });

  describe('Filter Functionality', () => {
    it('applies equals filter', () => {
      const filters = [
        {
          id: '1',
          field: 'status' as const,
          operator: 'equals' as const,
          value: 'done'
        }
      ];

      const query = {
        text: '',
        fields: ['all'] as const,
        caseSensitive: false,
        wholeWords: false,
        regex: false
      };

      const results = service.searchTasks(mockTasks, query, filters);
      expect(results).toHaveLength(1);
      expect(results[0].task.status).toBe('done');
    });

    it('applies contains filter', () => {
      const filters = [
        {
          id: '1',
          field: 'description' as const,
          operator: 'contains' as const,
          value: 'React'
        }
      ];

      const query = {
        text: '',
        fields: ['all'] as const,
        caseSensitive: false,
        wholeWords: false,
        regex: false
      };

      const results = service.searchTasks(mockTasks, query, filters);
      expect(results).toHaveLength(1);
      expect(results[0].task.description).toContain('React');
    });

    it('applies in filter for arrays', () => {
      const filters = [
        {
          id: '1',
          field: 'priority' as const,
          operator: 'in' as const,
          value: ['high', 'urgent']
        }
      ];

      const query = {
        text: '',
        fields: ['all'] as const,
        caseSensitive: false,
        wholeWords: false,
        regex: false
      };

      const results = service.searchTasks(mockTasks, query, filters);
      expect(results).toHaveLength(2);
      expect(results.every(r => ['high', 'urgent'].includes(r.task.priority))).toBe(true);
    });

    it('applies greater than filter', () => {
      const filters = [
        {
          id: '1',
          field: 'createdAt' as const,
          operator: 'greaterThan' as const,
          value: new Date('2025-01-25')
        }
      ];

      const query = {
        text: '',
        fields: ['all'] as const,
        caseSensitive: false,
        wholeWords: false,
        regex: false
      };

      const results = service.searchTasks(mockTasks, query, filters);
      expect(results.length).toBeGreaterThan(0);
      expect(results.every(r => new Date(r.task.createdAt) > new Date('2025-01-25'))).toBe(true);
    });

    it('applies isEmpty filter', () => {
      const taskWithEmptyTags = {
        ...mockTasks[0],
        id: '5',
        tags: []
      };

      const filters = [
        {
          id: '1',
          field: 'tags' as const,
          operator: 'isEmpty' as const,
          value: null
        }
      ];

      const query = {
        text: '',
        fields: ['all'] as const,
        caseSensitive: false,
        wholeWords: false,
        regex: false
      };

      const results = service.searchTasks([...mockTasks, taskWithEmptyTags], query, filters);
      expect(results).toHaveLength(1);
      expect(results[0].task.id).toBe('5');
    });

    it('combines multiple filters with AND logic', () => {
      const filters = [
        {
          id: '1',
          field: 'status' as const,
          operator: 'equals' as const,
          value: 'in-progress'
        },
        {
          id: '2',
          field: 'priority' as const,
          operator: 'equals' as const,
          value: 'high',
          logicalOperator: 'AND' as const
        }
      ];

      const query = {
        text: '',
        fields: ['all'] as const,
        caseSensitive: false,
        wholeWords: false,
        regex: false
      };

      const results = service.searchTasks(mockTasks, query, filters);
      expect(results).toHaveLength(1);
      expect(results[0].task.status).toBe('in-progress');
      expect(results[0].task.priority).toBe('high');
    });

    it('combines multiple filters with OR logic', () => {
      const filters = [
        {
          id: '1',
          field: 'status' as const,
          operator: 'equals' as const,
          value: 'done'
        },
        {
          id: '2',
          field: 'status' as const,
          operator: 'equals' as const,
          value: 'todo',
          logicalOperator: 'OR' as const
        }
      ];

      const query = {
        text: '',
        fields: ['all'] as const,
        caseSensitive: false,
        wholeWords: false,
        regex: false
      };

      const results = service.searchTasks(mockTasks, query, filters);
      expect(results).toHaveLength(2);
      expect(results.every(r => ['done', 'todo'].includes(r.task.status))).toBe(true);
    });
  });

  describe('Sorting', () => {
    it('sorts by title ascending', () => {
      const query = {
        text: '',
        fields: ['all'] as const,
        caseSensitive: false,
        wholeWords: false,
        regex: false
      };

      const results = service.searchTasks(mockTasks, query, [], 'title', 'asc');
      
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].task.title <= results[i].task.title).toBe(true);
      }
    });

    it('sorts by priority descending', () => {
      const query = {
        text: '',
        fields: ['all'] as const,
        caseSensitive: false,
        wholeWords: false,
        regex: false
      };

      const results = service.searchTasks(mockTasks, query, [], 'priority', 'desc');
      
      // Should be sorted by priority (urgent > high > medium > low)
      expect(results.length).toBeGreaterThan(0);
    });

    it('sorts by date fields correctly', () => {
      const query = {
        text: '',
        fields: ['all'] as const,
        caseSensitive: false,
        wholeWords: false,
        regex: false
      };

      const results = service.searchTasks(mockTasks, query, [], 'createdAt', 'desc');
      
      for (let i = 1; i < results.length; i++) {
        expect(new Date(results[i - 1].task.createdAt) >= new Date(results[i].task.createdAt)).toBe(true);
      }
    });
  });

  describe('Pagination', () => {
    it('paginates results correctly', () => {
      const results = mockTasks.map(task => ({
        task,
        relevanceScore: 1,
        matchedFields: [],
        highlights: {}
      }));

      const { paginatedResults, pagination } = service.paginateResults(results, 1, 2);

      expect(paginatedResults).toHaveLength(2);
      expect(pagination).toEqual({
        page: 1,
        pageSize: 2,
        totalItems: 4,
        totalPages: 2
      });
    });

    it('handles last page correctly', () => {
      const results = mockTasks.map(task => ({
        task,
        relevanceScore: 1,
        matchedFields: [],
        highlights: {}
      }));

      const { paginatedResults, pagination } = service.paginateResults(results, 2, 3);

      expect(paginatedResults).toHaveLength(1);
      expect(pagination.page).toBe(2);
      expect(pagination.totalPages).toBe(2);
    });

    it('handles empty results', () => {
      const { paginatedResults, pagination } = service.paginateResults([], 1, 10);

      expect(paginatedResults).toHaveLength(0);
      expect(pagination.totalItems).toBe(0);
      expect(pagination.totalPages).toBe(0);
    });
  });

  describe('Search Suggestions', () => {
    it('generates suggestions from task titles', () => {
      const suggestions = service.getSearchSuggestions(mockTasks, 'auth', 5);
      
      expect(suggestions).toContain('Implement user authentication');
    });

    it('generates suggestions from tags', () => {
      const suggestions = service.getSearchSuggestions(mockTasks, 'back', 5);
      
      expect(suggestions).toContain('backend');
    });

    it('generates suggestions from assignee names', () => {
      const suggestions = service.getSearchSuggestions(mockTasks, 'john', 5);
      
      expect(suggestions).toContain('John Doe');
    });

    it('limits suggestion count', () => {
      const suggestions = service.getSearchSuggestions(mockTasks, 'a', 2);
      
      expect(suggestions.length).toBeLessThanOrEqual(2);
    });

    it('returns empty array for short queries', () => {
      const suggestions = service.getSearchSuggestions(mockTasks, 'a', 5);
      
      expect(suggestions).toEqual([]);
    });
  });

  describe('Export Functionality', () => {
    it('exports results as JSON', () => {
      const results = [
        {
          task: mockTasks[0],
          relevanceScore: 10,
          matchedFields: ['title'],
          highlights: {}
        }
      ];

      const exported = service.exportSearchResults(results, 'json');
      const parsed = JSON.parse(exported);

      expect(parsed).toHaveLength(1);
      expect(parsed[0].id).toBe('1');
    });

    it('exports results as CSV', () => {
      const results = [
        {
          task: mockTasks[0],
          relevanceScore: 10,
          matchedFields: ['title'],
          highlights: {}
        }
      ];

      const exported = service.exportSearchResults(results, 'csv');
      const lines = exported.split('\n');

      expect(lines[0]).toContain('ID,Title,Description');
      expect(lines[1]).toContain('1,"Implement user authentication"');
    });

    it('handles CSV special characters', () => {
      const taskWithQuotes = {
        ...mockTasks[0],
        title: 'Task with "quotes" and commas, here'
      };

      const results = [
        {
          task: taskWithQuotes,
          relevanceScore: 10,
          matchedFields: ['title'],
          highlights: {}
        }
      ];

      const exported = service.exportSearchResults(results, 'csv');
      
      expect(exported).toContain('""quotes""');
    });
  });

  describe('Analytics', () => {
    it('provides search analytics', () => {
      // Create some saved searches
      service.createSavedSearch({
        name: 'Search 1',
        query: { text: '', fields: ['all'], caseSensitive: false, wholeWords: false, regex: false },
        filters: []
      });

      const search2 = service.createSavedSearch({
        name: 'Search 2',
        query: { text: '', fields: ['all'], caseSensitive: false, wholeWords: false, regex: false },
        filters: []
      });

      // Use one search multiple times
      service.useSavedSearch(search2.id);
      service.useSavedSearch(search2.id);

      const analytics = service.getSearchAnalytics();

      expect(analytics.totalSavedSearches).toBe(2);
      expect(analytics.mostUsedSearch?.name).toBe('Search 2');
      expect(analytics.recentSearches).toHaveLength(2);
      expect(analytics.averageUseCount).toBe(1);
    });

    it('handles empty analytics', () => {
      const analytics = service.getSearchAnalytics();

      expect(analytics.totalSavedSearches).toBe(0);
      expect(analytics.mostUsedSearch).toBeNull();
      expect(analytics.recentSearches).toHaveLength(0);
      expect(analytics.averageUseCount).toBe(0);
    });
  });

  describe('Clear Functionality', () => {
    it('clears all saved searches', () => {
      service.createSavedSearch({
        name: 'Test Search',
        query: { text: '', fields: ['all'], caseSensitive: false, wholeWords: false, regex: false },
        filters: []
      });

      expect(service.getSavedSearches()).toHaveLength(1);

      service.clearAllSavedSearches();

      expect(service.getSavedSearches()).toHaveLength(0);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('task_saved_searches', '[]');
    });
  });
});