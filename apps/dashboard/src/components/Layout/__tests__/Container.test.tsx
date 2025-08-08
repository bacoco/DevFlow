/**
 * Container Component Tests
 * Tests for responsive container behavior and props
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { Container } from '../Container';

describe('Container', () => {
  it('renders children correctly', () => {
    render(
      <Container>
        <div>Test content</div>
      </Container>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('applies default classes', () => {
    const { container } = render(
      <Container>
        <div>Test content</div>
      </Container>
    );

    const containerElement = container.firstChild as HTMLElement;
    expect(containerElement).toHaveClass('w-full', 'max-w-full', 'px-4', 'sm:px-6', 'lg:px-8', 'mx-auto');
  });

  it('applies custom maxWidth', () => {
    const { container } = render(
      <Container maxWidth="lg">
        <div>Test content</div>
      </Container>
    );

    const containerElement = container.firstChild as HTMLElement;
    expect(containerElement).toHaveClass('max-w-lg');
  });

  it('applies custom padding', () => {
    const { container } = render(
      <Container padding="lg">
        <div>Test content</div>
      </Container>
    );

    const containerElement = container.firstChild as HTMLElement;
    expect(containerElement).toHaveClass('px-8', 'py-6');
  });

  it('handles fluid width', () => {
    const { container } = render(
      <Container fluid>
        <div>Test content</div>
      </Container>
    );

    const containerElement = container.firstChild as HTMLElement;
    expect(containerElement).toHaveClass('w-full');
    expect(containerElement).not.toHaveClass('max-w-full');
  });

  it('handles centered prop', () => {
    const { container } = render(
      <Container centered={false}>
        <div>Test content</div>
      </Container>
    );

    const containerElement = container.firstChild as HTMLElement;
    expect(containerElement).not.toHaveClass('mx-auto');
  });

  it('applies custom className', () => {
    const { container } = render(
      <Container className="custom-class">
        <div>Test content</div>
      </Container>
    );

    const containerElement = container.firstChild as HTMLElement;
    expect(containerElement).toHaveClass('custom-class');
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(
      <Container ref={ref}>
        <div>Test content</div>
      </Container>
    );

    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('passes through HTML attributes', () => {
    render(
      <Container data-testid="container" role="main">
        <div>Test content</div>
      </Container>
    );

    const containerElement = screen.getByTestId('container');
    expect(containerElement).toHaveAttribute('role', 'main');
  });
});