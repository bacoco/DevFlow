/**
 * Grid Component Tests
 * Tests for responsive grid system behavior
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { Grid } from '../Grid';

describe('Grid', () => {
  it('renders children correctly', () => {
    render(
      <Grid>
        <div>Grid item 1</div>
        <div>Grid item 2</div>
      </Grid>
    );

    expect(screen.getByText('Grid item 1')).toBeInTheDocument();
    expect(screen.getByText('Grid item 2')).toBeInTheDocument();
  });

  it('applies default grid classes', () => {
    const { container } = render(
      <Grid>
        <div>Grid item</div>
      </Grid>
    );

    const gridElement = container.firstChild as HTMLElement;
    expect(gridElement).toHaveClass('grid', 'grid-cols-1', 'gap-4');
  });

  it('applies numeric columns', () => {
    const { container } = render(
      <Grid columns={3}>
        <div>Grid item</div>
      </Grid>
    );

    const gridElement = container.firstChild as HTMLElement;
    expect(gridElement).toHaveClass('grid-cols-3');
  });

  it('applies responsive columns', () => {
    const { container } = render(
      <Grid columns={{ xs: 1, sm: 2, md: 3, lg: 4 }}>
        <div>Grid item</div>
      </Grid>
    );

    const gridElement = container.firstChild as HTMLElement;
    expect(gridElement).toHaveClass('grid-cols-1', 'sm:grid-cols-2', 'md:grid-cols-3', 'lg:grid-cols-4');
  });

  it('applies gap classes', () => {
    const { container } = render(
      <Grid gap="lg">
        <div>Grid item</div>
      </Grid>
    );

    const gridElement = container.firstChild as HTMLElement;
    expect(gridElement).toHaveClass('gap-6');
  });

  it('applies separate row and column gaps', () => {
    const { container } = render(
      <Grid rowGap="sm" columnGap="lg">
        <div>Grid item</div>
      </Grid>
    );

    const gridElement = container.firstChild as HTMLElement;
    expect(gridElement).toHaveClass('row-gap-2', 'column-gap-6');
  });

  it('applies alignment classes', () => {
    const { container } = render(
      <Grid alignItems="center" justifyItems="end">
        <div>Grid item</div>
      </Grid>
    );

    const gridElement = container.firstChild as HTMLElement;
    expect(gridElement).toHaveClass('items-center', 'justify-items-end');
  });

  it('applies content alignment classes', () => {
    const { container } = render(
      <Grid alignContent="start" justifyContent="between">
        <div>Grid item</div>
      </Grid>
    );

    const gridElement = container.firstChild as HTMLElement;
    expect(gridElement).toHaveClass('content-start', 'justify-between');
  });

  it('handles auto-fit with minColumnWidth', () => {
    const { container } = render(
      <Grid autoFit minColumnWidth="200px">
        <div>Grid item</div>
      </Grid>
    );

    const gridElement = container.firstChild as HTMLElement;
    expect(gridElement.style.gridTemplateColumns).toBe('repeat(auto-fit, minmax(200px, 1fr))');
  });

  it('handles auto-fill with min and max column width', () => {
    const { container } = render(
      <Grid autoFill minColumnWidth="150px" maxColumnWidth="300px">
        <div>Grid item</div>
      </Grid>
    );

    const gridElement = container.firstChild as HTMLElement;
    expect(gridElement.style.gridTemplateColumns).toBe('repeat(auto-fill, minmax(150px, 300px))');
  });

  it('handles grid template areas', () => {
    const areas = [
      'header header header',
      'sidebar main main',
      'footer footer footer'
    ];

    const { container } = render(
      <Grid areas={areas}>
        <div>Grid item</div>
      </Grid>
    );

    const gridElement = container.firstChild as HTMLElement;
    expect(gridElement.style.gridTemplateAreas).toBe('"header header header" "sidebar main main" "footer footer footer"');
  });

  it('applies custom className', () => {
    const { container } = render(
      <Grid className="custom-grid">
        <div>Grid item</div>
      </Grid>
    );

    const gridElement = container.firstChild as HTMLElement;
    expect(gridElement).toHaveClass('custom-grid');
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(
      <Grid ref={ref}>
        <div>Grid item</div>
      </Grid>
    );

    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});