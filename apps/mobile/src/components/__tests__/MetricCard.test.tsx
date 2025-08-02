import React from 'react';
import {render} from '@testing-library/react-native';
import {Provider as PaperProvider} from 'react-native-paper';

import {MetricCard} from '../MetricCard';
import {theme} from '../../theme';

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <PaperProvider theme={theme}>
      {component}
    </PaperProvider>
  );
};

describe('MetricCard', () => {
  it('renders basic metric card correctly', () => {
    const {getByText} = renderWithTheme(
      <MetricCard
        title="Test Metric"
        value={42}
        unit="ms"
      />
    );

    expect(getByText('Test Metric')).toBeTruthy();
    expect(getByText('42ms')).toBeTruthy();
  });

  it('formats large numbers correctly', () => {
    const {getByText} = renderWithTheme(
      <MetricCard
        title="Large Number"
        value={1500}
      />
    );

    expect(getByText('1.5K')).toBeTruthy();
  });

  it('formats millions correctly', () => {
    const {getByText} = renderWithTheme(
      <MetricCard
        title="Million"
        value={2500000}
      />
    );

    expect(getByText('2.5M')).toBeTruthy();
  });

  it('displays trend indicator for upward trend', () => {
    const {getByText} = renderWithTheme(
      <MetricCard
        title="Trending Up"
        value={100}
        trend="up"
        change={15.5}
      />
    );

    expect(getByText('+15.5%')).toBeTruthy();
  });

  it('displays trend indicator for downward trend', () => {
    const {getByText} = renderWithTheme(
      <MetricCard
        title="Trending Down"
        value={100}
        trend="down"
        change={-10.2}
      />
    );

    expect(getByText('-10.2%')).toBeTruthy();
  });

  it('does not display trend for stable trend', () => {
    const {queryByText} = renderWithTheme(
      <MetricCard
        title="Stable"
        value={100}
        trend="stable"
        change={0}
      />
    );

    expect(queryByText('0.0%')).toBeFalsy();
  });

  it('handles decimal values correctly', () => {
    const {getByText} = renderWithTheme(
      <MetricCard
        title="Decimal"
        value={42.7}
      />
    );

    expect(getByText('42.7')).toBeTruthy();
  });

  it('handles integer values correctly', () => {
    const {getByText} = renderWithTheme(
      <MetricCard
        title="Integer"
        value={42}
      />
    );

    expect(getByText('42')).toBeTruthy();
  });

  it('truncates long titles', () => {
    const longTitle = 'This is a very long title that should be truncated';
    const {getByText} = renderWithTheme(
      <MetricCard
        title={longTitle}
        value={100}
      />
    );

    const titleElement = getByText(longTitle);
    expect(titleElement.props.numberOfLines).toBe(2);
  });
});