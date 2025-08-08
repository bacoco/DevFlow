import type { Meta, StoryObj } from '@storybook/react';
import { Input } from './input';
import { SearchIcon, EyeIcon, EyeOffIcon, MailIcon } from 'lucide-react';
import { useState } from 'react';

const meta: Meta<typeof Input> = {
  title: 'Design System/Input',
  component: Input,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A flexible input component with design system integration. Supports labels, error states, helper text, and icons.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['default', 'error', 'success'],
      description: 'The visual style variant of the input',
    },
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg'],
      description: 'The size of the input',
    },
    type: {
      control: { type: 'select' },
      options: ['text', 'email', 'password', 'number', 'tel', 'url', 'search'],
      description: 'The input type',
    },
    disabled: {
      control: { type: 'boolean' },
      description: 'Whether the input is disabled',
    },
    required: {
      control: { type: 'boolean' },
      description: 'Whether the input is required',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    placeholder: 'Enter text...',
  },
};

export const WithLabel: Story = {
  args: {
    label: 'Email Address',
    placeholder: 'Enter your email',
    type: 'email',
  },
};

export const Required: Story = {
  args: {
    label: 'Full Name',
    placeholder: 'Enter your full name',
    required: true,
  },
};

export const WithHelperText: Story = {
  args: {
    label: 'Username',
    placeholder: 'Choose a username',
    helperText: 'Username must be at least 3 characters long',
  },
};

export const WithError: Story = {
  args: {
    label: 'Email Address',
    placeholder: 'Enter your email',
    type: 'email',
    error: 'Please enter a valid email address',
    defaultValue: 'invalid-email',
  },
};

export const Success: Story = {
  args: {
    label: 'Email Address',
    placeholder: 'Enter your email',
    type: 'email',
    variant: 'success',
    defaultValue: 'user@example.com',
  },
};

export const WithLeftIcon: Story = {
  args: {
    label: 'Search',
    placeholder: 'Search...',
    leftIcon: <SearchIcon size={16} />,
  },
};

export const WithRightIcon: Story = {
  args: {
    label: 'Email',
    placeholder: 'Enter your email',
    type: 'email',
    rightIcon: <MailIcon size={16} />,
  },
};

export const PasswordWithToggle: Story = {
  render: () => {
    const [showPassword, setShowPassword] = useState(false);
    
    return (
      <Input
        label="Password"
        type={showPassword ? 'text' : 'password'}
        placeholder="Enter your password"
        rightIcon={
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="text-text-tertiary hover:text-text-secondary transition-colors"
          >
            {showPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
          </button>
        }
      />
    );
  },
};

export const Sizes: Story = {
  render: () => (
    <div className="space-y-4 w-80">
      <Input size="sm" placeholder="Small input" label="Small" />
      <Input size="md" placeholder="Medium input" label="Medium" />
      <Input size="lg" placeholder="Large input" label="Large" />
    </div>
  ),
  parameters: {
    layout: 'padded',
  },
};

export const Disabled: Story = {
  args: {
    label: 'Disabled Input',
    placeholder: 'This input is disabled',
    disabled: true,
    defaultValue: 'Disabled value',
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="space-y-4 w-80">
      <Input
        variant="default"
        label="Default"
        placeholder="Default input"
      />
      <Input
        variant="error"
        label="Error"
        placeholder="Error input"
        error="This field has an error"
      />
      <Input
        variant="success"
        label="Success"
        placeholder="Success input"
        defaultValue="Valid input"
      />
    </div>
  ),
  parameters: {
    layout: 'padded',
  },
};

export const FormExample: Story = {
  render: () => (
    <form className="space-y-4 w-80">
      <Input
        label="First Name"
        placeholder="Enter your first name"
        required
      />
      <Input
        label="Last Name"
        placeholder="Enter your last name"
        required
      />
      <Input
        label="Email Address"
        type="email"
        placeholder="Enter your email"
        leftIcon={<MailIcon size={16} />}
        required
      />
      <Input
        label="Phone Number"
        type="tel"
        placeholder="Enter your phone number"
        helperText="Include country code if international"
      />
      <Input
        label="Company (Optional)"
        placeholder="Enter your company name"
      />
    </form>
  ),
  parameters: {
    layout: 'padded',
  },
};

export const SearchInput: Story = {
  args: {
    type: 'search',
    placeholder: 'Search products...',
    leftIcon: <SearchIcon size={16} />,
    size: 'lg',
  },
};

export const NumberInput: Story = {
  args: {
    label: 'Quantity',
    type: 'number',
    placeholder: '0',
    min: 1,
    max: 100,
    helperText: 'Enter a number between 1 and 100',
  },
};

export const InteractiveStates: Story = {
  render: () => (
    <div className="space-y-4 w-80">
      <div>
        <h3 className="text-sm font-medium mb-2">Focus State</h3>
        <Input placeholder="Click to focus" autoFocus />
      </div>
      <div>
        <h3 className="text-sm font-medium mb-2">Hover State</h3>
        <Input placeholder="Hover over this input" />
      </div>
      <div>
        <h3 className="text-sm font-medium mb-2">Filled State</h3>
        <Input placeholder="Filled input" defaultValue="This input has content" />
      </div>
    </div>
  ),
  parameters: {
    layout: 'padded',
  },
};