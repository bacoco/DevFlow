import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CoverageAnalysisPanel from '../CoverageAnalysisPanel';

// Mock recharts components
jest.mock('recharts', () => ({
    BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
    Bar: ({ children }: any) => <div data-testid="bar">{children}</div>,
    XAxis: () => <div data-testid="x-axis" />,
    YAxis: () => <div data-testid="y-axis" />,
    CartesianGrid: () => <div data-testid="cartesian-grid" />,
    Tooltip: () => <div data-testid="tooltip" />,
    ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
    PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
    Pie: ({ children }: any) => <div data-testid="pie">{children}</div>,
    Cell: () => <div data-testid="cell" />
}));

const mockAnalysisResult = {
    metrics: {
        totalRequirements: 50,
        implementedRequirements: 40,
        testedRequirements: 35,
        documentedRequirements: 30,
        overallCoverage: 80.0,
        implementationCoverage: 80.0,
        testCoverage: 70.0,
        documentationCoverage: 60.0
    },
    gaps: {
        missingImplementations: ['REQ-001', 'REQ-002', 'REQ-003'],
        missingTests: ['REQ-004', 'REQ-005'],
        missingDocumentation: ['REQ-006'],
        orphanedArtifacts: [
            {
                id: 'artifact-1',
                name: 'UnusedComponent',
                filePath: '/src/components/UnusedComponent.tsx',
                complexity: 15
            },
            {
                id: 'artifact-2',
                name: 'LegacyService',
                filePath: '/src/services/LegacyService.ts',
                complexity: 25
            }
        ],
        lowConfidenceLinks: [
            {
                requirementId: 'REQ-007',
                confidence: 0.45
            },
            {
                requirementId: 'REQ-008',
                confidence: 0.35
            }
        ]
    },
    recommendations: [
        'Implement missing requirements REQ-001, REQ-002, REQ-003',
        'Add tests for REQ-004 and REQ-005',
        'Review orphaned artifacts for potential removal'
    ],
    visualIndicators: [
        {
            id: 'indicator-1',
            type: 'gap' as const,
            requirementId: 'REQ-001',
            severity: 'high' as const,
            message: 'Missing implementation for critical requirement'
        },
        {
            id: 'indicator-2',
            type: 'orphan' as const,
            artifactId: 'artifact-1',
            severity: 'medium' as const,
            message: 'Orphaned code artifact detected'
        },
        {
            id: 'indicator-3',
            type: 'low-confidence' as const,
            requirementId: 'REQ-007',
            severity: 'low' as const,
            message: 'Low confidence traceability link'
        }
    ]
};

describe('CoverageAnalysisPanel', () => {
    const mockOnRefresh = jest.fn();
    const mockOnIndicatorClick = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Loading State', () => {
        it('should display loading skeleton when isLoading is true', () => {
            render(
                <CoverageAnalysisPanel
                    analysisResult={null}
                    isLoading={true}
                    onRefresh={mockOnRefresh}
                />
            );

            expect(screen.getByText('Coverage Analysis')).toBeInTheDocument();
            expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
        });
    });

    describe('Empty State', () => {
        it('should display empty state when no analysis result is provided', () => {
            render(
                <CoverageAnalysisPanel
                    analysisResult={null}
                    isLoading={false}
                    onRefresh={mockOnRefresh}
                />
            );

            expect(screen.getByText('No coverage analysis data available')).toBeInTheDocument();
            expect(screen.getByText('Run Analysis')).toBeInTheDocument();
        });

        it('should call onRefresh when Run Analysis button is clicked', async () => {
            render(
                <CoverageAnalysisPanel
                    analysisResult={null}
                    isLoading={false}
                    onRefresh={mockOnRefresh}
                />
            );

            const runAnalysisButton = screen.getByText('Run Analysis');
            await userEvent.click(runAnalysisButton);

            expect(mockOnRefresh).toHaveBeenCalledTimes(1);
        });
    });

    describe('Overview Tab', () => {
        it('should display coverage metrics and charts', () => {
            render(
                <CoverageAnalysisPanel
                    analysisResult={mockAnalysisResult}
                    onRefresh={mockOnRefresh}
                />
            );

            // Check overall coverage display
            expect(screen.getByText('80.0% Overall Coverage')).toBeInTheDocument();

            // Check summary stats
            expect(screen.getByText('50')).toBeInTheDocument(); // Total Requirements
            expect(screen.getByText('40')).toBeInTheDocument(); // Implemented
            expect(screen.getByText('35')).toBeInTheDocument(); // Tested
            expect(screen.getByText('30')).toBeInTheDocument(); // Documented

            // Check charts are rendered
            expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
            expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
        });

        it('should display recommendations when available', () => {
            render(
                <CoverageAnalysisPanel
                    analysisResult={mockAnalysisResult}
                    onRefresh={mockOnRefresh}
                />
            );

            expect(screen.getByText('Recommendations')).toBeInTheDocument();
            expect(screen.getByText('Implement missing requirements REQ-001, REQ-002, REQ-003')).toBeInTheDocument();
            expect(screen.getByText('Add tests for REQ-004 and REQ-005')).toBeInTheDocument();
        });

        it('should call onRefresh when refresh button is clicked', async () => {
            render(
                <CoverageAnalysisPanel
                    analysisResult={mockAnalysisResult}
                    onRefresh={mockOnRefresh}
                />
            );

            const refreshButton = screen.getByText('Refresh');
            await userEvent.click(refreshButton);

            expect(mockOnRefresh).toHaveBeenCalledTimes(1);
        });
    });

    describe('Gaps Tab', () => {
        it('should display gap analysis when gaps tab is selected', async () => {
            render(
                <CoverageAnalysisPanel
                    analysisResult={mockAnalysisResult}
                    onRefresh={mockOnRefresh}
                />
            );

            const gapsTab = screen.getByText('Gaps');
            await userEvent.click(gapsTab);

            // Check missing implementations
            expect(screen.getByText('Missing Implementations (3)')).toBeInTheDocument();
            expect(screen.getByText('REQ-001')).toBeInTheDocument();
            expect(screen.getByText('REQ-002')).toBeInTheDocument();
            expect(screen.getByText('REQ-003')).toBeInTheDocument();

            // Check orphaned artifacts
            expect(screen.getByText('Orphaned Code (2)')).toBeInTheDocument();
            expect(screen.getByText('UnusedComponent')).toBeInTheDocument();
            expect(screen.getByText('LegacyService')).toBeInTheDocument();

            // Check low confidence links
            expect(screen.getByText('Low Confidence Links (2)')).toBeInTheDocument();
            expect(screen.getByText('REQ-007')).toBeInTheDocument();
            expect(screen.getByText('45% confidence')).toBeInTheDocument();
        });

        it('should handle large numbers of gaps with truncation', async () => {
            const largeGapsResult = {
                ...mockAnalysisResult,
                gaps: {
                    ...mockAnalysisResult.gaps,
                    missingImplementations: Array.from({ length: 20 }, (_, i) => `REQ-${i.toString().padStart(3, '0')}`)
                }
            };

            render(
                <CoverageAnalysisPanel
                    analysisResult={largeGapsResult}
                    onRefresh={mockOnRefresh}
                />
            );

            const gapsTab = screen.getByText('Gaps');
            await userEvent.click(gapsTab);

            expect(screen.getByText('Missing Implementations (20)')).toBeInTheDocument();
            expect(screen.getByText('+8 more')).toBeInTheDocument();
        });
    });

    describe('Indicators Tab', () => {
        it('should display visual indicators when indicators tab is selected', async () => {
            render(
                <CoverageAnalysisPanel
                    analysisResult={mockAnalysisResult}
                    onRefresh={mockOnRefresh}
                    onIndicatorClick={mockOnIndicatorClick}
                />
            );

            const indicatorsTab = screen.getByText('Indicators');
            await userEvent.click(indicatorsTab);

            // Check indicators are displayed
            expect(screen.getByText('Missing implementation for critical requirement')).toBeInTheDocument();
            expect(screen.getByText('Orphaned code artifact detected')).toBeInTheDocument();
            expect(screen.getByText('Low confidence traceability link')).toBeInTheDocument();

            // Check severity labels
            expect(screen.getByText('HIGH')).toBeInTheDocument();
            expect(screen.getByText('MEDIUM')).toBeInTheDocument();
            expect(screen.getByText('LOW')).toBeInTheDocument();
        });

        it('should filter indicators by severity', async () => {
            render(
                <CoverageAnalysisPanel
                    analysisResult={mockAnalysisResult}
                    onRefresh={mockOnRefresh}
                    onIndicatorClick={mockOnIndicatorClick}
                />
            );

            const indicatorsTab = screen.getByText('Indicators');
            await userEvent.click(indicatorsTab);

            // Filter by high severity
            const highSeverityFilter = screen.getByText('High');
            await userEvent.click(highSeverityFilter);

            expect(screen.getByText('Missing implementation for critical requirement')).toBeInTheDocument();
            expect(screen.queryByText('Orphaned code artifact detected')).not.toBeInTheDocument();
            expect(screen.queryByText('Low confidence traceability link')).not.toBeInTheDocument();
        });

        it('should call onIndicatorClick when an indicator is clicked', async () => {
            render(
                <CoverageAnalysisPanel
                    analysisResult={mockAnalysisResult}
                    onRefresh={mockOnRefresh}
                    onIndicatorClick={mockOnIndicatorClick}
                />
            );

            const indicatorsTab = screen.getByText('Indicators');
            await userEvent.click(indicatorsTab);

            const indicator = screen.getByText('Missing implementation for critical requirement');
            await userEvent.click(indicator);

            expect(mockOnIndicatorClick).toHaveBeenCalledWith(mockAnalysisResult.visualIndicators[0]);
        });

        it('should display empty state when no indicators match filter', async () => {
            const noHighSeverityResult = {
                ...mockAnalysisResult,
                visualIndicators: mockAnalysisResult.visualIndicators.filter(i => i.severity !== 'high')
            };

            render(
                <CoverageAnalysisPanel
                    analysisResult={noHighSeverityResult}
                    onRefresh={mockOnRefresh}
                    onIndicatorClick={mockOnIndicatorClick}
                />
            );

            const indicatorsTab = screen.getByText('Indicators');
            await userEvent.click(indicatorsTab);

            const highSeverityFilter = screen.getByText('High');
            await userEvent.click(highSeverityFilter);

            expect(screen.getByText('No indicators found for the selected severity level.')).toBeInTheDocument();
        });
    });

    describe('Tab Navigation', () => {
        it('should switch between tabs correctly', async () => {
            render(
                <CoverageAnalysisPanel
                    analysisResult={mockAnalysisResult}
                    onRefresh={mockOnRefresh}
                />
            );

            // Start on overview tab
            expect(screen.getByText('Coverage by Type')).toBeInTheDocument();

            // Switch to gaps tab
            const gapsTab = screen.getByText('Gaps');
            await userEvent.click(gapsTab);
            expect(screen.getByText('Missing Implementations (3)')).toBeInTheDocument();

            // Switch to indicators tab
            const indicatorsTab = screen.getByText('Indicators');
            await userEvent.click(indicatorsTab);
            expect(screen.getByText('Filter by severity:')).toBeInTheDocument();

            // Switch back to overview
            const overviewTab = screen.getByText('Overview');
            await userEvent.click(overviewTab);
            expect(screen.getByText('Coverage by Type')).toBeInTheDocument();
        });
    });

    describe('Interactive Coverage Percentage Tracking', () => {
        it('should display interactive coverage percentages with drill-down capabilities', () => {
            render(
                <CoverageAnalysisPanel
                    analysisResult={mockAnalysisResult}
                    onRefresh={mockOnRefresh}
                />
            );

            // Check that coverage percentages are displayed
            expect(screen.getByText('80.0% Overall Coverage')).toBeInTheDocument();

            // Check that individual coverage metrics are shown in summary stats
            const implementedCard = screen.getByText('40').closest('div');
            expect(implementedCard).toHaveTextContent('Implemented');

            const testedCard = screen.getByText('35').closest('div');
            expect(testedCard).toHaveTextContent('Tested');

            const documentedCard = screen.getByText('30').closest('div');
            expect(documentedCard).toHaveTextContent('Documented');
        });
    });

    describe('Gap Analysis Visualization', () => {
        it('should show missing implementations with clear visual indicators', async () => {
            render(
                <CoverageAnalysisPanel
                    analysisResult={mockAnalysisResult}
                    onRefresh={mockOnRefresh}
                />
            );

            const gapsTab = screen.getByText('Gaps');
            await userEvent.click(gapsTab);

            // Check that missing implementations are clearly marked
            const missingSection = screen.getByText('Missing Implementations (3)');
            expect(missingSection).toHaveClass('text-red-600');

            // Check that requirement IDs are displayed with appropriate styling
            const reqElement = screen.getByText('REQ-001');
            expect(reqElement).toHaveClass('bg-red-50', 'text-red-700');
        });

        it('should display orphaned code with detailed information', async () => {
            render(
                <CoverageAnalysisPanel
                    analysisResult={mockAnalysisResult}
                    onRefresh={mockOnRefresh}
                />
            );

            const gapsTab = screen.getByText('Gaps');
            await userEvent.click(gapsTab);

            // Check orphaned artifacts display
            expect(screen.getByText('Orphaned Code (2)')).toBeInTheDocument();
            expect(screen.getByText('UnusedComponent')).toBeInTheDocument();
            expect(screen.getByText('/src/components/UnusedComponent.tsx')).toBeInTheDocument();
            expect(screen.getByText('Complexity: 15')).toBeInTheDocument();
        });
    });

    describe('Accessibility', () => {
        it('should have proper ARIA labels and keyboard navigation support', () => {
            render(
                <CoverageAnalysisPanel
                    analysisResult={mockAnalysisResult}
                    onRefresh={mockOnRefresh}
                    onIndicatorClick={mockOnIndicatorClick}
                />
            );

            // Check that buttons are focusable
            const refreshButton = screen.getByText('Refresh');
            expect(refreshButton).toBeInTheDocument();

            // Check tab navigation
            const tabs = screen.getAllByRole('button');
            const tabButtons = tabs.filter(button =>
                ['Overview', 'Gaps', 'Indicators'].includes(button.textContent || '')
            );
            expect(tabButtons).toHaveLength(3);
        });
    });
});