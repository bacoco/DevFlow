import type { Meta, StoryObj } from '@storybook/react';
import { Heart, Download, Loader2 } from 'lucide-react';
import { Button } from './Button';
import { AccessibilityProvider } from '../../contexts/AccessibilityContext';

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  decorators: [
    (Story) => (
      <AccessibilityProvider>
        <Story />
      </AccessibilityProvider>
    ),
  ],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A versatile button component with multiple variants, sizes, and states.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'ghost', 'danger'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    loading: {
      control: 'boolean',
    },
    disabled: {
      control: 'boolean',
    },
    fullWidth: {
      control: 'boolean',
    },
    rounded: {
      control: 'boolean',
    },
    iconPosition: {
      control: 'select',
      options: ['left', 'right'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// Basic variants
export const Primary: Story = {
  args: {
    children: 'Primary Button',
    variant: 'primary',
  },
};

export const Secondary: Story = {
  args: {
    children: 'Secondary Button',
    variant: 'secondary',
  },
};

export const Ghost: Story = {
  args: {
    children: 'Ghost Button',
    variant: 'ghost',
  },
};

export const Danger: Story = {
  args: {
    children: 'Danger Button',
    variant: 'danger',
  },
};

// Sizes
export const Small: Story = {
  args: {
    children: 'Small Button',
    size: 'sm',
  },
};

export const Medium: Story = {
  args: {
    children: 'Medium Button',
    size: 'md',
  },
};

export const Large: Story = {
  args: {
    children: 'Large Button',
    size: 'lg',
  },
};

// States
export const Loading: Story = {
  args: {
    children: 'Loading Button',
    loading: true,
  },
};

export const Disabled: Story = {
  args: {
    children: 'Disabled Button',
    disabled: true,
  },
};

// With icons
export const WithLeftIcon: Story = {
  args: {
    children: 'Like',
    icon: <Heart className="w-4 h-4" />,
    iconPosition: 'left',
  },
};

export const WithRightIcon: Story = {
  args: {
    children: 'Download',
    icon: <Download className="w-4 h-4" />,
    iconPosition: 'right',
  },
};

export const IconOnly: Story = {
  args: {
    icon: <Heart className="w-4 h-4" />,
    'aria-label': 'Like',
  },
};

// Layout variants
export const FullWidth: Story = {
  args: {
    children: 'Full Width Button',
    fullWidth: true,
  },
  parameters: {
    layout: 'padded',
  },
};

export const Rounded: Story = {
  args: {
    children: 'Rounded Button',
    rounded: true,
  },
};

// All variants showcase
export const AllVariants: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="flex gap-4">
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="danger">Danger</Button>
      </div>
      <div className="flex gap-4">
        <Button size="sm">Small</Button>
        <Button size="md">Medium</Button>
        <Button size="lg">Large</Button>
      </div>
      <div className="flex gap-4">
        <Button loading>Loading</Button>
        <Button disabled>Disabled</Button>
        <Button icon={<Heart className="w-4 h-4" />}>With Icon</Button>
      </div>
    </div>
  ),
  parameters: {
    layout: 'padded',
  },
};

// Dark mode variants
export const DarkMode: Story = {
  render: () => (
    <div className="dark bg-gray-900 p-8 space-y-4">
      <div className="flex gap-4">
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="danger">Danger</Button>
      </div>
      <div className="flex gap-4">
        <Button loading>Loading</Button>
        <Button disabled>Disabled</Button>
        <Button icon={<Heart className="w-4 h-4" />}>With Icon</Button>
      </div>
    </div>
  ),
  parameters: {
    backgrounds: { default: 'dark' },
    layout: 'padded',
  },
};

// Interactive states for visual testing
export const InteractiveStates: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm font-medium">Hover States:</p>
        <div className="flex gap-4">
          <Button variant="primary" className="hover:bg-primary-700">Primary Hover</Button>
          <Button variant="secondary" className="hover:bg-gray-200">Secondary Hover</Button>
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium">Focus States:</p>
        <div className="flex gap-4">
          <Button variant="primary" className="focus:ring-2 focus:ring-primary-500">Primary Focus</Button>
          <Button variant="secondary" className="focus:ring-2 focus:ring-gray-500">Secondary Focus</Button>
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium">Active States:</p>
        <div className="flex gap-4">
          <Button variant="primary" className="active:bg-primary-800">Primary Active</Button>
          <Button variant="secondary" className="active:bg-gray-300">Secondary Active</Button>
        </div>
      </div>
    </div>
  ),
  parameters: {
    layout: 'padded',
  },
};