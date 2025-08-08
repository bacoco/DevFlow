/**
 * Card Component Tests
 * Tests for the design system Card component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../card';

describe('Card', () => {
  it('renders correctly with default props', () => {
    render(<Card>Card content</Card>);
    
    const card = screen.getByText('Card content');
    expect(card).toBeInTheDocument();
    expect(card).toHaveClass('rounded-lg', 'border', 'bg-background-elevated');
  });

  it('applies variant classes correctly', () => {
    const { rerender } = render(<Card variant="default">Default</Card>);
    expect(screen.getByText('Default')).toHaveClass('border-border-primary');

    rerender(<Card variant="outline">Outline</Card>);
    expect(screen.getByText('Outline')).toHaveClass('border-border-secondary');

    rerender(<Card variant="elevated">Elevated</Card>);
    expect(screen.getByText('Elevated')).toHaveClass('border-border-primary', 'shadow-md');

    rerender(<Card variant="ghost">Ghost</Card>);
    expect(screen.getByText('Ghost')).toHaveClass('border-transparent', 'bg-transparent');
  });

  it('applies padding classes correctly', () => {
    const { rerender } = render(<Card padding="none">No padding</Card>);
    expect(screen.getByText('No padding')).toHaveClass('p-0');

    rerender(<Card padding="sm">Small padding</Card>);
    expect(screen.getByText('Small padding')).toHaveClass('p-4');

    rerender(<Card padding="md">Medium padding</Card>);
    expect(screen.getByText('Medium padding')).toHaveClass('p-6');

    rerender(<Card padding="lg">Large padding</Card>);
    expect(screen.getByText('Large padding')).toHaveClass('p-8');
  });

  it('handles interactive state correctly', () => {
    render(<Card interactive>Interactive card</Card>);
    
    const card = screen.getByText('Interactive card');
    expect(card).toHaveClass('cursor-pointer', 'hover:bg-interactive-secondary');
    expect(card).toHaveAttribute('tabIndex', '0');
    expect(card).toHaveAttribute('role', 'button');
  });

  it('handles click events when interactive', async () => {
    const handleClick = jest.fn();
    const user = userEvent.setup();
    
    render(<Card interactive onClick={handleClick}>Clickable card</Card>);
    
    await user.click(screen.getByText('Clickable card'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('supports keyboard navigation when interactive', async () => {
    const handleClick = jest.fn();
    const user = userEvent.setup();
    
    render(<Card interactive onClick={handleClick}>Keyboard card</Card>);
    
    const card = screen.getByText('Keyboard card');
    card.focus();
    
    await user.keyboard('{Enter}');
    expect(handleClick).toHaveBeenCalledTimes(1);
    
    await user.keyboard(' ');
    expect(handleClick).toHaveBeenCalledTimes(2);
  });

  it('applies custom className', () => {
    render(<Card className="custom-class">Custom card</Card>);
    
    expect(screen.getByText('Custom card')).toHaveClass('custom-class');
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLDivElement>();
    
    render(<Card ref={ref}>Ref test</Card>);
    
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
    expect(ref.current).toBe(screen.getByText('Ref test'));
  });

  it('passes through additional props', () => {
    render(
      <Card data-testid="custom-card" aria-label="Custom label">
        Custom Props
      </Card>
    );
    
    const card = screen.getByTestId('custom-card');
    expect(card).toHaveAttribute('aria-label', 'Custom label');
  });
});

describe('CardHeader', () => {
  it('renders correctly', () => {
    render(<CardHeader>Header content</CardHeader>);
    
    const header = screen.getByText('Header content');
    expect(header).toBeInTheDocument();
    expect(header).toHaveClass('flex', 'flex-col', 'space-y-1.5', 'p-6');
  });

  it('applies custom className', () => {
    render(<CardHeader className="custom-header">Header</CardHeader>);
    
    expect(screen.getByText('Header')).toHaveClass('custom-header');
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLDivElement>();
    
    render(<CardHeader ref={ref}>Header ref test</CardHeader>);
    
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});

describe('CardTitle', () => {
  it('renders as h3 element', () => {
    render(<CardTitle>Card Title</CardTitle>);
    
    const title = screen.getByRole('heading', { level: 3 });
    expect(title).toBeInTheDocument();
    expect(title).toHaveTextContent('Card Title');
    expect(title).toHaveClass('text-lg', 'font-semibold', 'text-text-primary');
  });

  it('applies custom className', () => {
    render(<CardTitle className="custom-title">Title</CardTitle>);
    
    expect(screen.getByRole('heading')).toHaveClass('custom-title');
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLHeadingElement>();
    
    render(<CardTitle ref={ref}>Title ref test</CardTitle>);
    
    expect(ref.current).toBeInstanceOf(HTMLHeadingElement);
  });
});

describe('CardDescription', () => {
  it('renders correctly', () => {
    render(<CardDescription>Card description</CardDescription>);
    
    const description = screen.getByText('Card description');
    expect(description).toBeInTheDocument();
    expect(description).toHaveClass('text-sm', 'text-text-secondary');
  });

  it('applies custom className', () => {
    render(<CardDescription className="custom-description">Description</CardDescription>);
    
    expect(screen.getByText('Description')).toHaveClass('custom-description');
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLParagraphElement>();
    
    render(<CardDescription ref={ref}>Description ref test</CardDescription>);
    
    expect(ref.current).toBeInstanceOf(HTMLParagraphElement);
  });
});

describe('CardContent', () => {
  it('renders correctly', () => {
    render(<CardContent>Card content</CardContent>);
    
    const content = screen.getByText('Card content');
    expect(content).toBeInTheDocument();
    expect(content).toHaveClass('p-6', 'pt-0');
  });

  it('applies custom className', () => {
    render(<CardContent className="custom-content">Content</CardContent>);
    
    expect(screen.getByText('Content')).toHaveClass('custom-content');
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLDivElement>();
    
    render(<CardContent ref={ref}>Content ref test</CardContent>);
    
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});

describe('CardFooter', () => {
  it('renders correctly', () => {
    render(<CardFooter>Footer content</CardFooter>);
    
    const footer = screen.getByText('Footer content');
    expect(footer).toBeInTheDocument();
    expect(footer).toHaveClass('flex', 'items-center', 'p-6', 'pt-0');
  });

  it('applies custom className', () => {
    render(<CardFooter className="custom-footer">Footer</CardFooter>);
    
    expect(screen.getByText('Footer')).toHaveClass('custom-footer');
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLDivElement>();
    
    render(<CardFooter ref={ref}>Footer ref test</CardFooter>);
    
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});

describe('Card Composition', () => {
  it('renders complete card structure correctly', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Test Card</CardTitle>
          <CardDescription>This is a test card</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Main content goes here</p>
        </CardContent>
        <CardFooter>
          <button>Action</button>
        </CardFooter>
      </Card>
    );

    expect(screen.getByRole('heading', { name: 'Test Card' })).toBeInTheDocument();
    expect(screen.getByText('This is a test card')).toBeInTheDocument();
    expect(screen.getByText('Main content goes here')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
  });

  it('works with interactive card and nested elements', async () => {
    const handleCardClick = jest.fn();
    const handleButtonClick = jest.fn((e: React.MouseEvent) => {
      e.stopPropagation(); // Prevent event bubbling
    });
    const user = userEvent.setup();
    
    render(
      <Card interactive onClick={handleCardClick}>
        <CardHeader>
          <CardTitle>Interactive Card</CardTitle>
        </CardHeader>
        <CardContent>
          <button onClick={handleButtonClick}>Nested Button</button>
        </CardContent>
      </Card>
    );

    // Clicking the nested button should not trigger card click due to stopPropagation
    await user.click(screen.getByRole('button', { name: 'Nested Button' }));
    expect(handleButtonClick).toHaveBeenCalledTimes(1);
    expect(handleCardClick).not.toHaveBeenCalled();

    // Clicking the card (but not the button) should trigger card click
    await user.click(screen.getByRole('heading', { name: 'Interactive Card' }));
    expect(handleCardClick).toHaveBeenCalledTimes(1);
  });
});