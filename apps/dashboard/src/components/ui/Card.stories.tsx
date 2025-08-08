import type { Meta, StoryObj } from '@storybook/react';
import { Card } from './Card';

const meta: Meta<typeof Card> = {
  title: 'UI/Card',
  component: Card,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A flexible card component with multiple variants and interactive states.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'elevated', 'outlined', 'glass'],
    },
    padding: {
      control: 'select',
      options: ['none', 'sm', 'md', 'lg', 'xl'],
    },
    hover: {
      control: 'boolean',
    },
    interactive: {
      control: 'boolean',
    },
    rounded: {
      control: 'boolean',
    },
    shadow: {
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// Basic variants
export const Default: Story = {
  args: {
    variant: 'default',
    children: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Default Card</h3>
        <p className="text-gray-600 dark:text-gray-400">
          This is a default card with standard styling and border.
        </p>
      </div>
    ),
  },
};

export const Elevated: Story = {
  args: {
    variant: 'elevated',
    children: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Elevated Card</h3>
        <p className="text-gray-600 dark:text-gray-400">
          This card has a shadow to create an elevated appearance.
        </p>
      </div>
    ),
  },
};

export const Outlined: Story = {
  args: {
    variant: 'outlined',
    children: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Outlined Card</h3>
        <p className="text-gray-600 dark:text-gray-400">
          This card has a prominent border with transparent background.
        </p>
      </div>
    ),
  },
};

export const Glass: Story = {
  args: {
    variant: 'glass',
    children: (
      <div>
        <h3 className="text-lg font-semibold mb-2 text-white">Glass Card</h3>
        <p className="text-gray-200">
          This card has a glass morphism effect with backdrop blur.
        </p>
      </div>
    ),
  },
  parameters: {
    backgrounds: { 
      default: 'dark',
      values: [
        {
          name: 'dark',
          value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        },
      ],
    },
  },
};

// Padding variants
export const NoPadding: Story = {
  args: {
    padding: 'none',
    children: (
      <div className="p-4 bg-gray-100 dark:bg-gray-700">
        <h3 className="text-lg font-semibold mb-2">No Padding Card</h3>
        <p className="text-gray-600 dark:text-gray-400">
          This card has no internal padding. Content manages its own spacing.
        </p>
      </div>
    ),
  },
};

export const SmallPadding: Story = {
  args: {
    padding: 'sm',
    children: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Small Padding</h3>
        <p className="text-gray-600 dark:text-gray-400">Compact spacing.</p>
      </div>
    ),
  },
};

export const LargePadding: Story = {
  args: {
    padding: 'lg',
    children: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Large Padding</h3>
        <p className="text-gray-600 dark:text-gray-400">
          This card has generous padding for a more spacious feel.
        </p>
      </div>
    ),
  },
};

// Interactive states
export const Interactive: Story = {
  args: {
    interactive: true,
    hover: true,
    onClick: () => alert('Card clicked!'),
    children: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Interactive Card</h3>
        <p className="text-gray-600 dark:text-gray-400">
          Click me! This card responds to user interactions.
        </p>
      </div>
    ),
  },
};

export const HoverEffect: Story = {
  args: {
    hover: true,
    children: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Hover Effect</h3>
        <p className="text-gray-600 dark:text-gray-400">
          Hover over this card to see the effect.
        </p>
      </div>
    ),
  },
};

// Complex content examples
export const WithImage: Story = {
  args: {
    variant: 'elevated',
    padding: 'none',
    children: (
      <div>
        <div className="h-48 bg-gradient-to-r from-blue-500 to-purple-600 rounded-t-xl"></div>
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-2">Card with Image</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            This card includes an image header with content below.
          </p>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Learn More
          </button>
        </div>
      </div>
    ),
  },
};

export const ProductCard: Story = {
  args: {
    variant: 'elevated',
    hover: true,
    interactive: true,
    children: (
      <div className="w-64">
        <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded-t-xl flex items-center justify-center">
          <span className="text-gray-500 dark:text-gray-400">Product Image</span>
        </div>
        <div className="p-4">
          <h3 className="font-semibold mb-1">Product Name</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Brief product description
          </p>
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-green-600">$29.99</span>
            <button className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors">
              Add to Cart
            </button>
          </div>
        </div>
      </div>
    ),
  },
};

// All variants showcase
export const AllVariants: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-6 p-6">
      <Card variant="default">
        <h3 className="font-semibold mb-2">Default</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">Standard card styling</p>
      </Card>
      <Card variant="elevated">
        <h3 className="font-semibold mb-2">Elevated</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">Card with shadow</p>
      </Card>
      <Card variant="outlined">
        <h3 className="font-semibold mb-2">Outlined</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">Card with border</p>
      </Card>
      <Card variant="glass" className="bg-gradient-to-br from-blue-500/20 to-purple-600/20">
        <h3 className="font-semibold mb-2">Glass</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">Glass morphism effect</p>
      </Card>
    </div>
  ),
  parameters: {
    layout: 'fullscreen',
  },
};

// Dark mode
export const DarkMode: Story = {
  render: () => (
    <div className="dark bg-gray-900 p-8">
      <div className="grid grid-cols-2 gap-6">
        <Card variant="default">
          <h3 className="font-semibold mb-2 text-white">Default Dark</h3>
          <p className="text-sm text-gray-400">Dark mode styling</p>
        </Card>
        <Card variant="elevated">
          <h3 className="font-semibold mb-2 text-white">Elevated Dark</h3>
          <p className="text-sm text-gray-400">Dark mode with shadow</p>
        </Card>
        <Card variant="outlined">
          <h3 className="font-semibold mb-2 text-white">Outlined Dark</h3>
          <p className="text-sm text-gray-400">Dark mode with border</p>
        </Card>
        <Card variant="glass">
          <h3 className="font-semibold mb-2 text-white">Glass Dark</h3>
          <p className="text-sm text-gray-300">Glass effect in dark mode</p>
        </Card>
      </div>
    </div>
  ),
  parameters: {
    backgrounds: { default: 'dark' },
    layout: 'fullscreen',
  },
};