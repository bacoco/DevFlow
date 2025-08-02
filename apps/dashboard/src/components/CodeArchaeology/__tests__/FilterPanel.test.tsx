import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FilterPanel, { FilterCriteria } from '../FilterPanel';
import { CodeArtifact } from '../types';
import { Vector3 } from 'three';

// Mock data
const mockArtifacts: CodeArtifact[] = [
  {
    id: '1',
    filePath: '/src/components/Button.tsx',
    type: 'file',
    name: 'Button.tsx',
    position3D: new Vector3(0, 0, 0),
    complexity: 5,
    changeFrequency: 3,
    lastModified: new Date('2024-01-15'),
    authors: ['john.doe', 'jane.smith'],
    dependencies: ['react', 'styled-components'],
  },
  {
    id: '2',
    filePath: '/src/utils/helpers.ts',
    type: 'function',
    name: 'formatDate',
    position3D: new Vector3(1, 0, 0),
    complexity: 12,
    changeFrequency: 8,
    lastModified: new Date('2024-02-20'),
    authors: ['jane.smith'],
    dependencies: ['date-fns'],
  },
  {
    id: '3',
    filePath: '/src/models/User.ts',
    type: 'class',
    name: 'User',
    position3D: new Vector3(0, 1, 0),
    complexity: 20,
    changeFrequency: 15,
    lastModified: new Date('2024-03-10'),
    authors: ['bob.wilson', 'alice.brown'],
    dependencies: [],
  },
];

const defaultCriteria: FilterCriteria = {
  fileTypes: [],
  authors: [],
  dateRange: { start: null, end: null },
  complexityRange: { min: 0, max: 100 },
  changeFrequencyRange: { min: 0, max: 100 },
  searchQuery: '',
};

describe('FilterPanel', () => {
  const mockOnCriteriaChange = jest.fn();
  const mockOnSaveView = jest.fn();
  const mockOnLoadView = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with default state', () => {
    render(
      <FilterPanel
        artifacts={mockArtifacts}
        criteria={defaultCriteria}
        onCriteriaChange={mockOnCriteriaChange}
      />
    );

    expect(screen.getByText('Filters & Search')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search artifacts and requirements...')).toBeInTheDocument();
  });

  it('expands and collapses filter panel', async () => {
    const user = userEvent.setup();
    
    render(
      <FilterPanel
        artifacts={mockArtifacts}
        criteria={defaultCriteria}
        onCriteriaChange={mockOnCriteriaChange}
      />
    );

    const expandButton = screen.getByLabelText('Expand filters');
    
    // Initially collapsed
    expect(screen.queryByText('File Types')).not.toBeInTheDocument();
    
    // Expand
    await user.click(expandButton);
    expect(screen.getByText('File Types')).toBeInTheDocument();
    
    // Collapse
    const collapseButton = screen.getByLabelText('Collapse filters');
    await user.click(collapseButton);
    expect(screen.queryByText('File Types')).not.toBeInTheDocument();
  });

  it('handles search query changes', async () => {
    const user = userEvent.setup();
    
    render(
      <FilterPanel
        artifacts={mockArtifacts}
        criteria={defaultCriteria}
        onCriteriaChange={mockOnCriteriaChange}
      />
    );

    const searchInput = screen.getByPlaceholderText('Search artifacts and requirements...');
    await user.type(searchInput, 'Button');

    expect(mockOnCriteriaChange).toHaveBeenCalledWith({
      ...defaultCriteria,
      searchQuery: 'Button',
    });
  });

  it('handles file type filter changes', async () => {
    const user = userEvent.setup();
    
    render(
      <FilterPanel
        artifacts={mockArtifacts}
        criteria={defaultCriteria}
        onCriteriaChange={mockOnCriteriaChange}
      />
    );

    // Expand panel
    await user.click(screen.getByLabelText('Expand filters'));
    
    // Check file type
    const fileCheckbox = screen.getByLabelText('File');
    await user.click(fileCheckbox);

    expect(mockOnCriteriaChange).toHaveBeenCalledWith({
      ...defaultCriteria,
      fileTypes: ['file'],
    });
  });

  it('handles author filter changes', async () => {
    const user = userEvent.setup();
    
    render(
      <FilterPanel
        artifacts={mockArtifacts}
        criteria={defaultCriteria}
        onCriteriaChange={mockOnCriteriaChange}
      />
    );

    // Expand panel
    await user.click(screen.getByLabelText('Expand filters'));
    
    // Check author
    const authorCheckbox = screen.getByLabelText('john.doe');
    await user.click(authorCheckbox);

    expect(mockOnCriteriaChange).toHaveBeenCalledWith({
      ...defaultCriteria,
      authors: ['john.doe'],
    });
  });

  it('handles date range changes', async () => {
    const user = userEvent.setup();
    
    render(
      <FilterPanel
        artifacts={mockArtifacts}
        criteria={defaultCriteria}
        onCriteriaChange={mockOnCriteriaChange}
      />
    );

    // Expand panel
    await user.click(screen.getByLabelText('Expand filters'));
    
    // Set start date
    const startDateInput = screen.getByLabelText('From');
    await user.type(startDateInput, '2024-02-01');

    expect(mockOnCriteriaChange).toHaveBeenCalledWith({
      ...defaultCriteria,
      dateRange: {
        start: new Date('2024-02-01'),
        end: null,
      },
    });
  });

  it('handles complexity range changes', async () => {
    const user = userEvent.setup();
    
    render(
      <FilterPanel
        artifacts={mockArtifacts}
        criteria={defaultCriteria}
        onCriteriaChange={mockOnCriteriaChange}
      />
    );

    // Expand panel
    await user.click(screen.getByLabelText('Expand filters'));
    
    // Change complexity min
    const complexityMinInput = screen.getByDisplayValue('0');
    await user.clear(complexityMinInput);
    await user.type(complexityMinInput, '10');

    expect(mockOnCriteriaChange).toHaveBeenCalledWith({
      ...defaultCriteria,
      complexityRange: { min: 10, max: 100 },
    });
  });

  it('clears all filters', async () => {
    const user = userEvent.setup();
    
    const criteriaWithFilters: FilterCriteria = {
      fileTypes: ['file'],
      authors: ['john.doe'],
      dateRange: { start: new Date('2024-01-01'), end: null },
      complexityRange: { min: 5, max: 50 },
      changeFrequencyRange: { min: 0, max: 100 },
      searchQuery: 'test',
    };

    render(
      <FilterPanel
        artifacts={mockArtifacts}
        criteria={criteriaWithFilters}
        onCriteriaChange={mockOnCriteriaChange}
      />
    );

    // Expand panel
    await user.click(screen.getByLabelText('Expand filters'));
    
    // Click clear all
    const clearButton = screen.getByText('Clear All');
    await user.click(clearButton);

    expect(mockOnCriteriaChange).toHaveBeenCalledWith(defaultCriteria);
  });

  it('saves a view', async () => {
    const user = userEvent.setup();
    
    render(
      <FilterPanel
        artifacts={mockArtifacts}
        criteria={defaultCriteria}
        onCriteriaChange={mockOnCriteriaChange}
        onSaveView={mockOnSaveView}
      />
    );

    // Expand panel
    await user.click(screen.getByLabelText('Expand filters'));
    
    // Click save view
    const saveButton = screen.getByText('Save View');
    await user.click(saveButton);

    // Enter view name
    const nameInput = screen.getByPlaceholderText('Enter view name...');
    await user.type(nameInput, 'My Custom View');

    // Save
    const saveDialogButton = screen.getByRole('button', { name: 'Save' });
    await user.click(saveDialogButton);

    expect(mockOnSaveView).toHaveBeenCalledWith('My Custom View', defaultCriteria);
  });

  it('loads a saved view', async () => {
    const user = userEvent.setup();
    
    const savedViews = [
      {
        name: 'Test View',
        criteria: {
          ...defaultCriteria,
          fileTypes: ['file'],
        },
      },
    ];

    render(
      <FilterPanel
        artifacts={mockArtifacts}
        criteria={defaultCriteria}
        onCriteriaChange={mockOnCriteriaChange}
        savedViews={savedViews}
        onLoadView={mockOnLoadView}
      />
    );

    // Expand panel
    await user.click(screen.getByLabelText('Expand filters'));
    
    // Click saved view
    const viewButton = screen.getByText('Test View');
    await user.click(viewButton);

    expect(mockOnLoadView).toHaveBeenCalledWith(savedViews[0].criteria);
  });

  it('displays correct filter options based on artifacts', async () => {
    const user = userEvent.setup();
    
    render(
      <FilterPanel
        artifacts={mockArtifacts}
        criteria={defaultCriteria}
        onCriteriaChange={mockOnCriteriaChange}
      />
    );

    // Expand panel
    await user.click(screen.getByLabelText('Expand filters'));

    // Check file types
    expect(screen.getByLabelText('File')).toBeInTheDocument();
    expect(screen.getByLabelText('Function')).toBeInTheDocument();
    expect(screen.getByLabelText('Class')).toBeInTheDocument();

    // Check authors
    expect(screen.getByLabelText('john.doe')).toBeInTheDocument();
    expect(screen.getByLabelText('jane.smith')).toBeInTheDocument();
    expect(screen.getByLabelText('bob.wilson')).toBeInTheDocument();
    expect(screen.getByLabelText('alice.brown')).toBeInTheDocument();
  });

  it('validates save dialog input', async () => {
    const user = userEvent.setup();
    
    render(
      <FilterPanel
        artifacts={mockArtifacts}
        criteria={defaultCriteria}
        onCriteriaChange={mockOnCriteriaChange}
        onSaveView={mockOnSaveView}
      />
    );

    // Expand panel and open save dialog
    await user.click(screen.getByLabelText('Expand filters'));
    await user.click(screen.getByText('Save View'));

    // Try to save without name
    const saveButton = screen.getByRole('button', { name: 'Save' });
    expect(saveButton).toBeDisabled();

    // Enter name
    const nameInput = screen.getByPlaceholderText('Enter view name...');
    await user.type(nameInput, 'Test');
    expect(saveButton).toBeEnabled();

    // Clear name
    await user.clear(nameInput);
    expect(saveButton).toBeDisabled();
  });

  it('cancels save dialog', async () => {
    const user = userEvent.setup();
    
    render(
      <FilterPanel
        artifacts={mockArtifacts}
        criteria={defaultCriteria}
        onCriteriaChange={mockOnCriteriaChange}
        onSaveView={mockOnSaveView}
      />
    );

    // Expand panel and open save dialog
    await user.click(screen.getByLabelText('Expand filters'));
    await user.click(screen.getByText('Save View'));

    expect(screen.getByText('Save Current View')).toBeInTheDocument();

    // Cancel
    const cancelButton = screen.getByText('Cancel');
    await user.click(cancelButton);

    expect(screen.queryByText('Save Current View')).not.toBeInTheDocument();
    expect(mockOnSaveView).not.toHaveBeenCalled();
  });
});