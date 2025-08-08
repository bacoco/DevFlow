import type { Meta, StoryObj } from '@storybook/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './card';
import { Button } from './button';
import { SettingsIcon, TrendingUpIcon } from 'lucide-react';

const meta: Meta<typeof Card> = {
  title: 'Design System/Card',
  component: Card,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A flexible card component for content containers with multiple variants and composition patterns.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['default', 'outline', 'elevated', 'ghost'],
      description: 'The visual style variant of the card',
    },
    padding: {
      control: { type: 'select' },
      options: ['none', 'sm', 'md', 'lg'],
      description: 'The padding size of the card',
    },
    interactive: {
      control: { type: 'boolean' },
      description: 'Whether the card is interactive (clickable)',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: (
      <>
        <CardHeader>
          <CardTitle>Card Title</CardTitle>
          <CardDescription>
            This is a description of the card content.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>This is the main content of the card.</p>
        </CardContent>
      </>
    ),
  },
};

export const Outline: Story = {
  args: {
    variant: 'outline',
    children: (
      <>
        <CardHeader>
          <CardTitle>Outline Card</CardTitle>
          <CardDescription>
            This card has an outline variant.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>Content with outline styling.</p>
        </CardContent>
      </>
    ),
  },
};

export const Elevated: Story = {
  args: {
    variant: 'elevated',
    children: (
      <>
        <CardHeader>
          <CardTitle>Elevated Card</CardTitle>
          <CardDescription>
            This card has elevation with shadow.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>Content with elevated styling.</p>
        </CardContent>
      </>
    ),
  },
};

export const Ghost: Story = {
  args: {
    variant: 'ghost',
    children: (
      <>
        <CardHeader>
          <CardTitle>Ghost Card</CardTitle>
          <CardDescription>
            This card has no background or border.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>Content with ghost styling.</p>
        </CardContent>
      </>
    ),
  },
};

export const Interactive: Story = {
  args: {
    interactive: true,
    children: (
      <>
        <CardHeader>
          <CardTitle>Interactive Card</CardTitle>
          <CardDescription>
            This card is clickable and has hover effects.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>Click anywhere on this card to interact with it.</p>
        </CardContent>
      </>
    ),
  },
};

export const WithFooter: Story = {
  args: {
    children: (
      <>
        <CardHeader>
          <CardTitle>Card with Footer</CardTitle>
          <CardDescription>
            This card includes a footer with actions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>This card demonstrates the use of a footer section with action buttons.</p>
        </CardContent>
        <CardFooter className="justify-between">
          <Button variant="outline">Cancel</Button>
          <Button>Save Changes</Button>
        </CardFooter>
      </>
    ),
  },
};

export const WithIcon: Story = {
  args: {
    children: (
      <>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUpIcon className="h-5 w-5 text-status-success" />
            <CardTitle>Performance Metrics</CardTitle>
          </div>
          <CardDescription>
            View your application performance data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Response Time</span>
              <span className="font-medium">245ms</span>
            </div>
            <div className="flex justify-between">
              <span>Uptime</span>
              <span className="font-medium text-status-success">99.9%</span>
            </div>
            <div className="flex justify-between">
              <span>Error Rate</span>
              <span className="font-medium text-status-error">0.1%</span>
            </div>
          </div>
        </CardContent>
      </>
    ),
  },
};

export const PaddingVariants: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-4 max-w-2xl">
      <Card padding="none">
        <div className="p-2 bg-interactive-secondary rounded">
          <CardTitle className="text-sm">No Padding</CardTitle>
          <p className="text-xs text-text-secondary mt-1">Custom padding applied</p>
        </div>
      </Card>
      <Card padding="sm">
        <CardTitle className="text-sm">Small Padding</CardTitle>
        <p className="text-xs text-text-secondary mt-1">16px padding</p>
      </Card>
      <Card padding="md">
        <CardTitle className="text-sm">Medium Padding</CardTitle>
        <p className="text-xs text-text-secondary mt-1">24px padding (default)</p>
      </Card>
      <Card padding="lg">
        <CardTitle className="text-sm">Large Padding</CardTitle>
        <p className="text-xs text-text-secondary mt-1">32px padding</p>
      </Card>
    </div>
  ),
  parameters: {
    layout: 'padded',
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-4 max-w-2xl">
      <Card variant="default">
        <CardHeader>
          <CardTitle>Default</CardTitle>
          <CardDescription>Standard card styling</CardDescription>
        </CardHeader>
      </Card>
      <Card variant="outline">
        <CardHeader>
          <CardTitle>Outline</CardTitle>
          <CardDescription>Outlined card styling</CardDescription>
        </CardHeader>
      </Card>
      <Card variant="elevated">
        <CardHeader>
          <CardTitle>Elevated</CardTitle>
          <CardDescription>Card with shadow</CardDescription>
        </CardHeader>
      </Card>
      <Card variant="ghost">
        <CardHeader>
          <CardTitle>Ghost</CardTitle>
          <CardDescription>Transparent card</CardDescription>
        </CardHeader>
      </Card>
    </div>
  ),
  parameters: {
    layout: 'padded',
  },
};

export const ComplexCard: Story = {
  args: {
    variant: 'elevated',
    children: (
      <>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Settings</CardTitle>
              <CardDescription>
                Manage your account settings and preferences.
              </CardDescription>
            </div>
            <SettingsIcon className="h-5 w-5 text-text-tertiary" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Notifications</h4>
            <div className="space-y-1">
              <label className="flex items-center space-x-2 text-sm">
                <input type="checkbox" defaultChecked />
                <span>Email notifications</span>
              </label>
              <label className="flex items-center space-x-2 text-sm">
                <input type="checkbox" />
                <span>Push notifications</span>
              </label>
            </div>
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Privacy</h4>
            <div className="space-y-1">
              <label className="flex items-center space-x-2 text-sm">
                <input type="checkbox" defaultChecked />
                <span>Make profile public</span>
              </label>
              <label className="flex items-center space-x-2 text-sm">
                <input type="checkbox" defaultChecked />
                <span>Allow data collection</span>
              </label>
            </div>
          </div>
        </CardContent>
        <CardFooter className="justify-end space-x-2">
          <Button variant="outline">Reset</Button>
          <Button>Save Changes</Button>
        </CardFooter>
      </>
    ),
  },
  parameters: {
    layout: 'centered',
  },
};