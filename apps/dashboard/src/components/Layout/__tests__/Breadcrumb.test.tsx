/**
 * Breadcrumb Component Tests
 * Tests for breadcrumb navigation functionality
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Home, Folder, File } from 'lucide-react';
import { Breadcrumb, BreadcrumbItem } from '../Breadcrumb';

// Mock Framer Motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

describe('Breadcrumb', () => {
  const mockItems: BreadcrumbItem[] = [
    { id: 'projects', label: 'Projects', href: '/projects', icon: Folder },
    { id: 'project-1', label: 'My Project', href: '/projects/1' },
    { id: 'file-1', label: 'index.tsx', active: true, icon: File },
  ];

  it('renders breadcrumb items correctly', () => {
    render(<Breadcrumb items={mockItems} />);

    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.getByText('My Project')).toBeInTheDocument();
    expect(screen.getByText('index.tsx')).toBeInTheDocument();
  });

  it('renders without home item when showHome is false', () => {
    render(<Breadcrumb items={mockItems} showHome={false} />);

    expect(screen.queryByText('Home')).not.toBeInTheDocument();
    expect(screen.getByText('Projects')).toBeInTheDocument();
  });

  it('renders custom separator', () => {
    const customSeparator = <span data-testid="custom-separator">→</span>;
    
    render(<Breadcrumb items={mockItems} separator={customSeparator} />);

    expect(screen.getAllByTestId('custom-separator')).toHaveLength(3); // 3 separators for 4 items
  });

  it('handles item clicks', () => {
    const mockOnItemClick = jest.fn();
    
    render(<Breadcrumb items={mockItems} onItemClick={mockOnItemClick} />);

    const projectsLink = screen.getByText('Projects');
    fireEvent.click(projectsLink);

    expect(mockOnItemClick).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'projects',
        label: 'Projects',
      })
    );
  });

  it('truncates items when maxItems is exceeded', () => {
    const manyItems: BreadcrumbItem[] = [
      { id: '1', label: 'Item 1', href: '/1' },
      { id: '2', label: 'Item 2', href: '/2' },
      { id: '3', label: 'Item 3', href: '/3' },
      { id: '4', label: 'Item 4', href: '/4' },
      { id: '5', label: 'Item 5', href: '/5' },
      { id: '6', label: 'Item 6', href: '/6' },
      { id: '7', label: 'Item 7', active: true },
    ];

    render(<Breadcrumb items={manyItems} maxItems={5} showHome={false} />);

    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('...')).toBeInTheDocument();
    expect(screen.getByText('Item 6')).toBeInTheDocument();
    expect(screen.getByText('Item 7')).toBeInTheDocument();
    
    // Items in the middle should be hidden
    expect(screen.queryByText('Item 3')).not.toBeInTheDocument();
  });

  it('renders icons for items that have them', () => {
    render(<Breadcrumb items={mockItems} />);

    // Check that icons are rendered (we can't easily test the actual icon, but we can check the structure)
    const homeItem = screen.getByText('Home').closest('a');
    expect(homeItem).toBeInTheDocument();
  });

  it('applies correct aria attributes', () => {
    render(<Breadcrumb items={mockItems} />);

    const nav = screen.getByRole('navigation');
    expect(nav).toHaveAttribute('aria-label', 'Breadcrumb');

    const lastItem = screen.getByText('index.tsx');
    expect(lastItem).toHaveAttribute('aria-current', 'page');
  });

  it('handles ellipsis click correctly', () => {
    const manyItems: BreadcrumbItem[] = [
      { id: '1', label: 'Item 1', href: '/1' },
      { id: '2', label: 'Item 2', href: '/2' },
      { id: '3', label: 'Item 3', href: '/3' },
      { id: '4', label: 'Item 4', href: '/4' },
      { id: '5', label: 'Item 5', href: '/5' },
      { id: '6', label: 'Item 6', active: true },
    ];

    const mockOnItemClick = jest.fn();
    
    render(
      <Breadcrumb 
        items={manyItems} 
        maxItems={4} 
        showHome={false}
        onItemClick={mockOnItemClick}
      />
    );

    const ellipsis = screen.getByText('...');
    fireEvent.click(ellipsis);

    // Should not call onItemClick for ellipsis
    expect(mockOnItemClick).not.toHaveBeenCalled();
  });

  it('applies custom className', () => {
    const { container } = render(
      <Breadcrumb items={mockItems} className="custom-breadcrumb" />
    );

    expect(container.firstChild).toHaveClass('custom-breadcrumb');
  });

  it('handles empty items array', () => {
    render(<Breadcrumb items={[]} />);

    // Should only show Home when items is empty
    expect(screen.getByText('Home')).toBeInTheDocument();
  });
});