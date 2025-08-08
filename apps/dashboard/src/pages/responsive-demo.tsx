/**
 * Responsive Layout Engine Demo
 * Demonstrates the responsive breakpoint system and layout components
 */

'use client';

import React from 'react';
import { ResponsiveProvider, useResponsive, useBreakpoint } from '../design-system/layout/responsive-engine';
import { Grid, GridItem, Flex, Container, Stack, HStack, VStack, Center } from '../design-system/layout/grid';
import { Text, Heading, Display } from '../design-system/components/typography';

// Demo component to show current responsive state
const ResponsiveInfo = () => {
  const responsive = useResponsive();
  const breakpoint = useBreakpoint();

  return (
    <Container maxWidth="2xl" padding={{ xs: 4, md: 6, lg: 8 }}>
      <VStack gap={6}>
        <Display level="lg" align="center">
          Responsive Layout Demo
        </Display>
        
        <Center>
          <Stack gap={2} align="center">
            <Text size="lg" weight="semibold">Current Breakpoint: {breakpoint}</Text>
            <Text>Width: {responsive.width}px × Height: {responsive.height}px</Text>
            <Text>Device: {responsive.device} ({responsive.orientation})</Text>
            <Text>Touch: {responsive.isTouch ? 'Yes' : 'No'}</Text>
          </Stack>
        </Center>

        {/* Responsive Grid Demo */}
        <Stack gap={4}>
          <Heading level={2}>Responsive Grid System</Heading>
          <Text>This grid adapts from 1 column on mobile to 4 columns on desktop:</Text>
          
          <Grid 
            columns={{ xs: 1, sm: 2, md: 3, lg: 4 }}
            gap={{ xs: 4, md: 6 }}
          >
            {Array.from({ length: 8 }, (_, i) => (
              <GridItem key={i}>
                <div 
                  style={{
                    padding: '1rem',
                    backgroundColor: 'var(--color-primary-100)',
                    borderRadius: '0.5rem',
                    textAlign: 'center',
                  }}
                >
                  <Text weight="semibold">Item {i + 1}</Text>
                </div>
              </GridItem>
            ))}
          </Grid>
        </Stack>

        {/* Responsive Typography Demo */}
        <Stack gap={4}>
          <Heading level={2}>Responsive Typography</Heading>
          <Text>Typography scales automatically based on screen size:</Text>
          
          <Stack gap={3}>
            <Display level={{ xs: 'sm', md: 'md', lg: 'lg' }}>
              Display Text
            </Display>
            <Heading level={{ xs: 3, md: 2, lg: 1 }}>
              Responsive Heading
            </Heading>
            <Text size={{ xs: 'sm', md: 'md', lg: 'lg' }}>
              This text changes size based on the current breakpoint. 
              On mobile it's small, on tablet it's medium, and on desktop it's large.
            </Text>
          </Stack>
        </Stack>

        {/* Responsive Flex Layout Demo */}
        <Stack gap={4}>
          <Heading level={2}>Responsive Flex Layouts</Heading>
          <Text>Flex direction changes from column on mobile to row on desktop:</Text>
          
          <Flex 
            direction={{ xs: 'column', md: 'row' }}
            gap={{ xs: 4, md: 6 }}
            justify="space-between"
            align="stretch"
          >
            <div style={{ 
              flex: 1, 
              padding: '1.5rem', 
              backgroundColor: 'var(--color-secondary-100)',
              borderRadius: '0.5rem'
            }}>
              <Heading level={3}>Card 1</Heading>
              <Text>This layout stacks vertically on mobile and horizontally on desktop.</Text>
            </div>
            <div style={{ 
              flex: 1, 
              padding: '1.5rem', 
              backgroundColor: 'var(--color-secondary-100)',
              borderRadius: '0.5rem'
            }}>
              <Heading level={3}>Card 2</Heading>
              <Text>Resize your browser window to see the responsive behavior in action.</Text>
            </div>
            <div style={{ 
              flex: 1, 
              padding: '1.5rem', 
              backgroundColor: 'var(--color-secondary-100)',
              borderRadius: '0.5rem'
            }}>
              <Heading level={3}>Card 3</Heading>
              <Text>The gap between cards also changes responsively.</Text>
            </div>
          </Flex>
        </Stack>

        {/* Container Demo */}
        <Stack gap={4}>
          <Heading level={2}>Responsive Container</Heading>
          <Text>Container max-width and padding adapt to screen size:</Text>
          
          <Container 
            maxWidth={{ xs: false, md: 'md', lg: 'lg', xl: 'xl' }}
            padding={{ xs: 4, md: 6, lg: 8 }}
            style={{ 
              backgroundColor: 'var(--color-accent-50)',
              borderRadius: '0.5rem',
              border: '2px dashed var(--color-accent-200)'
            }}
          >
            <Text align="center">
              This container has responsive max-width and padding. 
              On mobile it's full-width, but on larger screens it has max-width constraints.
            </Text>
          </Container>
        </Stack>

        {/* Utility Components Demo */}
        <Stack gap={4}>
          <Heading level={2}>Utility Components</Heading>
          
          <Grid columns={{ xs: 1, md: 2 }} gap={6}>
            <Stack gap={3}>
              <Heading level={3}>VStack (Vertical)</Heading>
              <VStack gap={2} align="center">
                <div style={{ padding: '0.5rem', backgroundColor: 'var(--color-primary-100)', borderRadius: '0.25rem' }}>Item 1</div>
                <div style={{ padding: '0.5rem', backgroundColor: 'var(--color-primary-100)', borderRadius: '0.25rem' }}>Item 2</div>
                <div style={{ padding: '0.5rem', backgroundColor: 'var(--color-primary-100)', borderRadius: '0.25rem' }}>Item 3</div>
              </VStack>
            </Stack>
            
            <Stack gap={3}>
              <Heading level={3}>HStack (Horizontal)</Heading>
              <HStack gap={2} justify="center">
                <div style={{ padding: '0.5rem', backgroundColor: 'var(--color-secondary-100)', borderRadius: '0.25rem' }}>A</div>
                <div style={{ padding: '0.5rem', backgroundColor: 'var(--color-secondary-100)', borderRadius: '0.25rem' }}>B</div>
                <div style={{ padding: '0.5rem', backgroundColor: 'var(--color-secondary-100)', borderRadius: '0.25rem' }}>C</div>
              </HStack>
            </Stack>
          </Grid>
        </Stack>

        {/* Instructions */}
        <Container 
          maxWidth="lg" 
          padding={6}
          style={{ 
            backgroundColor: 'var(--color-info-50)',
            borderRadius: '0.5rem',
            border: '1px solid var(--color-info-200)'
          }}
        >
          <Stack gap={3}>
            <Heading level={3}>Try It Out!</Heading>
            <Text>
              Resize your browser window to see how all these components adapt to different screen sizes. 
              The breakpoints are:
            </Text>
            <HStack gap={4} wrap="wrap">
              <Text size="sm"><strong>xs:</strong> 0px+</Text>
              <Text size="sm"><strong>sm:</strong> 640px+</Text>
              <Text size="sm"><strong>md:</strong> 768px+</Text>
              <Text size="sm"><strong>lg:</strong> 1024px+</Text>
              <Text size="sm"><strong>xl:</strong> 1280px+</Text>
              <Text size="sm"><strong>2xl:</strong> 1536px+</Text>
            </HStack>
          </Stack>
        </Container>
      </VStack>
    </Container>
  );
};

const ResponsiveDemo = () => {
  return (
    <ResponsiveProvider>
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-background)' }}>
        <ResponsiveInfo />
      </div>
    </ResponsiveProvider>
  );
};

export default ResponsiveDemo;