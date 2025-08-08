/**
 * Mobile Navigation Tests
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MobileNavigation, useMobileNavigation } from '../MobileNavigation'
import { TabConfig, MenuConfig, ActionConfig } from '../types'

// Mock the mobile optimizer and gesture manager
jest.mock('../MobileOptimizer', () => ({
  mobileOptimizer: {
    isMobile: jest.fn(() => true),
    isTablet: jest.fn(() => false),
    isTouchDevice: jest.fn(() => true)
  }
}))

jest.mock('../TouchGestureManager', () => ({
  touchGestureManager: {
    registerSwipeHandler: jest.fn()
  }
}))

describe('MobileNavigation', () => {
  const mockTabs: TabConfig[] = [
    {
      id: 'home',
      label: 'Home',
      icon: '🏠',
      route: '/home'
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: '📊',
      route: '/analytics',
      badge: 3
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: '⚙️',
      route: '/settings',
      disabled: true
    }
  ]

  const mockMenu: MenuConfig = {
    items: [
      {
        id: 'profile',
        label: 'Profile',
        icon: '👤',
        route: '/profile'
      },
      {
        id: 'logout',
        label: 'Logout',
        icon: '🚪',
        action: jest.fn()
      }
    ],
    position: 'left',
    overlay: true,
    swipeToClose: true
  }

  const mockFloatingAction: ActionConfig = {
    icon: '➕',
    label: 'Add Item',
    action: jest.fn(),
    position: 'bottom-right'
  }

  beforeEach(() => {
    // Mock window.history
    Object.defineProperty(window, 'history', {
      value: {
        pushState: jest.fn()
      },
      writable: true
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Bottom Tabs Navigation', () => {
    it('should render bottom tabs correctly', () => {
      render(<MobileNavigation tabs={mockTabs} />)

      expect(screen.getByRole('tablist')).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /home/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /analytics/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /settings/i })).toBeInTheDocument()
    })

    it('should display badge on tab with notifications', () => {
      render(<MobileNavigation tabs={mockTabs} />)

      const analyticsTab = screen.getByRole('tab', { name: /analytics/i })
      expect(analyticsTab).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument()
    })

    it('should handle tab click and navigation', () => {
      const pushStateSpy = jest.spyOn(window.history, 'pushState')
      
      render(<MobileNavigation tabs={mockTabs} />)

      const homeTab = screen.getByRole('tab', { name: /home/i })
      fireEvent.click(homeTab)

      expect(pushStateSpy).toHaveBeenCalledWith(null, '', '/home')
    })

    it('should not allow clicking disabled tabs', () => {
      const pushStateSpy = jest.spyOn(window.history, 'pushState')
      
      render(<MobileNavigation tabs={mockTabs} />)

      const settingsTab = screen.getByRole('tab', { name: /settings/i })
      expect(settingsTab).toBeDisabled()
      
      fireEvent.click(settingsTab)
      expect(pushStateSpy).not.toHaveBeenCalled()
    })

    it('should show active tab state correctly', () => {
      render(<MobileNavigation tabs={mockTabs} />)

      const homeTab = screen.getByRole('tab', { name: /home/i })
      expect(homeTab).toHaveAttribute('aria-selected', 'true')
    })
  })

  describe('Hamburger Menu', () => {
    it('should render hamburger menu button', () => {
      render(<MobileNavigation menu={mockMenu} />)

      const menuButton = screen.getByLabelText(/toggle menu/i)
      expect(menuButton).toBeInTheDocument()
    })

    it('should toggle menu visibility on button click', async () => {
      render(<MobileNavigation menu={mockMenu} />)

      const menuButton = screen.getByLabelText(/toggle menu/i)
      
      // Menu should be closed initially (check for transform class)
      const menu = screen.getByRole('navigation', { name: /main menu/i })
      expect(menu).toHaveClass('-translate-x-full')

      // Click to open menu
      fireEvent.click(menuButton)
      
      await waitFor(() => {
        const menu = screen.getByRole('navigation', { name: /main menu/i })
        expect(menu).toHaveClass('translate-x-0')
      })

      // Click to close menu
      fireEvent.click(menuButton)
      
      await waitFor(() => {
        const menu = screen.getByRole('navigation', { name: /main menu/i })
        expect(menu).toHaveClass('-translate-x-full')
      })
    })

    it('should render menu items correctly', () => {
      render(<MobileNavigation menu={mockMenu} />)

      const menuButton = screen.getByLabelText(/toggle menu/i)
      fireEvent.click(menuButton)

      expect(screen.getByText('Profile')).toBeInTheDocument()
      expect(screen.getByText('Logout')).toBeInTheDocument()
    })

    it('should handle menu item clicks with routes', () => {
      const pushStateSpy = jest.spyOn(window.history, 'pushState')
      
      render(<MobileNavigation menu={mockMenu} />)

      const menuButton = screen.getByLabelText(/toggle menu/i)
      fireEvent.click(menuButton)

      const profileItem = screen.getByText('Profile')
      fireEvent.click(profileItem)

      expect(pushStateSpy).toHaveBeenCalledWith(null, '', '/profile')
    })

    it('should handle menu item clicks with actions', () => {
      render(<MobileNavigation menu={mockMenu} />)

      const menuButton = screen.getByLabelText(/toggle menu/i)
      fireEvent.click(menuButton)

      const logoutItem = screen.getByText('Logout')
      fireEvent.click(logoutItem)

      expect(mockMenu.items[1].action).toHaveBeenCalled()
    })

    it('should close menu when overlay is clicked', async () => {
      render(<MobileNavigation menu={mockMenu} />)

      const menuButton = screen.getByLabelText(/toggle menu/i)
      fireEvent.click(menuButton)

      // Wait for menu to open
      await waitFor(() => {
        const menu = screen.getByRole('navigation', { name: /main menu/i })
        expect(menu).toHaveClass('translate-x-0')
      })

      // Click overlay to close
      const overlay = document.querySelector('.bg-black.bg-opacity-50')
      if (overlay) {
        fireEvent.click(overlay)
      }

      await waitFor(() => {
        const menu = screen.getByRole('navigation', { name: /main menu/i })
        expect(menu).toHaveClass('-translate-x-full')
      })
    })
  })

  describe('Floating Action Button', () => {
    it('should render floating action button', () => {
      render(<MobileNavigation floatingAction={mockFloatingAction} />)

      const fab = screen.getByLabelText(/add item/i)
      expect(fab).toBeInTheDocument()
      expect(fab).toHaveTextContent('➕')
    })

    it('should handle floating action button click', () => {
      render(<MobileNavigation floatingAction={mockFloatingAction} />)

      const fab = screen.getByLabelText(/add item/i)
      fireEvent.click(fab)

      expect(mockFloatingAction.action).toHaveBeenCalled()
    })

    it('should position floating action button correctly', () => {
      render(<MobileNavigation floatingAction={mockFloatingAction} />)

      const fab = screen.getByLabelText(/add item/i)
      expect(fab).toHaveClass('bottom-20', 'right-6')
    })
  })

  describe('Back Button Handling', () => {
    it('should register back button handler', () => {
      const backHandler = jest.fn(() => true)
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener')

      render(<MobileNavigation onBackButton={backHandler} />)

      expect(addEventListenerSpy).toHaveBeenCalledWith('popstate', expect.any(Function))
    })

    it('should call back button handler on popstate event', () => {
      const backHandler = jest.fn(() => true)
      
      render(<MobileNavigation onBackButton={backHandler} />)

      // Simulate back button press
      const popstateEvent = new PopStateEvent('popstate')
      window.dispatchEvent(popstateEvent)

      expect(backHandler).toHaveBeenCalledWith(popstateEvent)
    })
  })

  describe('Auto-hide Navigation', () => {
    it('should hide navigation on scroll down', async () => {
      // Mock mobile device
      const { mobileOptimizer } = require('../MobileOptimizer')
      mobileOptimizer.isMobile.mockReturnValue(true)

      render(<MobileNavigation tabs={mockTabs} />)

      const navigation = screen.getByRole('tablist')
      expect(navigation).toHaveClass('translate-y-0')

      // Simulate scroll down
      Object.defineProperty(window, 'scrollY', { value: 100, writable: true })
      fireEvent.scroll(window)

      // Note: In a real test, you'd need to mock the scroll behavior more thoroughly
      // This is a simplified version for demonstration
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(<MobileNavigation tabs={mockTabs} menu={mockMenu} />)

      expect(screen.getByRole('tablist')).toHaveAttribute('aria-label', 'Main navigation')
      expect(screen.getByLabelText(/toggle menu/i)).toHaveAttribute('aria-expanded', 'false')
    })

    it('should update aria-selected for active tab', () => {
      render(<MobileNavigation tabs={mockTabs} />)

      const homeTab = screen.getByRole('tab', { name: /home/i })
      const analyticsTab = screen.getByRole('tab', { name: /analytics/i })

      expect(homeTab).toHaveAttribute('aria-selected', 'true')
      expect(analyticsTab).toHaveAttribute('aria-selected', 'false')

      fireEvent.click(analyticsTab)

      expect(homeTab).toHaveAttribute('aria-selected', 'false')
      expect(analyticsTab).toHaveAttribute('aria-selected', 'true')
    })
  })
})

describe('useMobileNavigation Hook', () => {
  const TestComponent: React.FC = () => {
    const {
      isMenuOpen,
      setIsMenuOpen,
      activeTab,
      setActiveTab
    } = useMobileNavigation()

    return (
      <div>
        <div data-testid="menu-open">{isMenuOpen.toString()}</div>
        <div data-testid="active-tab">{activeTab}</div>
        <button onClick={() => setIsMenuOpen(!isMenuOpen)}>
          Toggle Menu
        </button>
        <button onClick={() => setActiveTab('test-tab')}>
          Set Active Tab
        </button>
      </div>
    )
  }

  it('should provide navigation state management', () => {
    render(<TestComponent />)

    expect(screen.getByTestId('menu-open')).toHaveTextContent('false')
    expect(screen.getByTestId('active-tab')).toHaveTextContent('')
  })

  it('should allow toggling menu state', () => {
    render(<TestComponent />)

    const toggleButton = screen.getByText('Toggle Menu')
    fireEvent.click(toggleButton)

    expect(screen.getByTestId('menu-open')).toHaveTextContent('true')
  })

  it('should allow setting active tab', () => {
    render(<TestComponent />)

    const setTabButton = screen.getByText('Set Active Tab')
    fireEvent.click(setTabButton)

    expect(screen.getByTestId('active-tab')).toHaveTextContent('test-tab')
  })
})