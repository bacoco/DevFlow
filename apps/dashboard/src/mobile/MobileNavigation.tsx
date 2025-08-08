/**
 * Mobile Navigation Component
 * Provides bottom tabs, hamburger menu, and mobile-optimized navigation patterns
 */

import React, { useState, useEffect, useRef } from 'react'
import { TabConfig, MenuConfig, MenuItem, ActionConfig, BackButtonHandler } from './types'
import { touchGestureManager } from './TouchGestureManager'
import { mobileOptimizer } from './MobileOptimizer'

interface MobileNavigationProps {
  tabs?: TabConfig[]
  menu?: MenuConfig
  floatingAction?: ActionConfig
  onBackButton?: BackButtonHandler
  className?: string
}

export const MobileNavigation: React.FC<MobileNavigationProps> = ({
  tabs = [],
  menu,
  floatingAction,
  onBackButton,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState(tabs[0]?.id || '')
  const [menuOpen, setMenuOpen] = useState(false)
  const [isVisible, setIsVisible] = useState(true)
  const lastScrollY = useRef(0)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Handle back button
    if (onBackButton) {
      const handlePopState = (event: PopStateEvent) => {
        const shouldPreventDefault = onBackButton(event)
        if (shouldPreventDefault) {
          event.preventDefault()
          history.pushState(null, '', window.location.href)
        }
      }

      window.addEventListener('popstate', handlePopState)
      return () => window.removeEventListener('popstate', handlePopState)
    }
  }, [onBackButton])

  useEffect(() => {
    // Auto-hide navigation on scroll (mobile only)
    if (!mobileOptimizer.isMobile()) return

    const handleScroll = () => {
      const currentScrollY = window.scrollY
      const scrollingDown = currentScrollY > lastScrollY.current
      const scrollThreshold = 10

      if (Math.abs(currentScrollY - lastScrollY.current) > scrollThreshold) {
        setIsVisible(!scrollingDown || currentScrollY < 100)
        lastScrollY.current = currentScrollY
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    // Setup swipe gestures for menu
    if (menu && menuRef.current) {
      touchGestureManager.registerSwipeHandler(
        menuRef.current,
        {
          onSwipe: (direction) => {
            if (direction === 'left' && menu.position === 'left') {
              setMenuOpen(false)
            } else if (direction === 'right' && menu.position === 'right') {
              setMenuOpen(false)
            }
          }
        },
        { minDistance: 50 }
      )
    }
  }, [menu, menuOpen])

  const handleTabClick = (tab: TabConfig) => {
    if (tab.disabled) return
    setActiveTab(tab.id)
    if (tab.route) {
      window.history.pushState(null, '', tab.route)
    }
  }

  const handleMenuToggle = () => {
    setMenuOpen(!menuOpen)
  }

  const handleMenuItemClick = (item: MenuItem) => {
    if (item.action) {
      item.action()
    } else if (item.route) {
      window.history.pushState(null, '', item.route)
    }
    setMenuOpen(false)
  }

  const renderBottomTabs = () => {
    if (!tabs.length) return null

    return (
      <nav 
        className={`
          fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 
          border-t border-gray-200 dark:border-gray-700 
          transition-transform duration-300 z-50
          ${isVisible ? 'translate-y-0' : 'translate-y-full'}
          ${className}
        `}
        role="tablist"
        aria-label="Main navigation"
      >
        <div className="flex justify-around items-center h-16 px-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab)}
              disabled={tab.disabled}
              className={`
                flex flex-col items-center justify-center 
                min-w-[44px] min-h-[44px] px-2 py-1 rounded-lg
                transition-colors duration-200
                ${activeTab === tab.id 
                  ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20' 
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }
                ${tab.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-label={tab.label}
            >
              <span className="text-xl mb-1" aria-hidden="true">
                {tab.icon}
              </span>
              <span className="text-xs font-medium truncate max-w-[60px]">
                {tab.label}
              </span>
              {tab.badge && tab.badge > 0 && (
                <span 
                  className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center"
                  aria-label={`${tab.badge} notifications`}
                >
                  {tab.badge > 99 ? '99+' : tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>
    )
  }

  const renderHamburgerMenu = () => {
    if (!menu) return null

    return (
      <>
        {/* Menu Button */}
        <button
          onClick={handleMenuToggle}
          className={`
            fixed top-4 ${menu.position === 'left' ? 'left-4' : 'right-4'} 
            z-50 p-3 bg-white dark:bg-gray-800 rounded-full shadow-lg
            border border-gray-200 dark:border-gray-700
            transition-transform duration-200
            ${menuOpen ? 'scale-110' : 'scale-100'}
          `}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
        >
          <div className="w-6 h-6 flex flex-col justify-center items-center">
            <span 
              className={`
                block w-5 h-0.5 bg-gray-600 dark:bg-gray-300 transition-all duration-300
                ${menuOpen ? 'rotate-45 translate-y-1' : ''}
              `}
            />
            <span 
              className={`
                block w-5 h-0.5 bg-gray-600 dark:bg-gray-300 transition-all duration-300 mt-1
                ${menuOpen ? 'opacity-0' : ''}
              `}
            />
            <span 
              className={`
                block w-5 h-0.5 bg-gray-600 dark:bg-gray-300 transition-all duration-300 mt-1
                ${menuOpen ? '-rotate-45 -translate-y-1' : ''}
              `}
            />
          </div>
        </button>

        {/* Menu Overlay */}
        {menuOpen && menu.overlay && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Menu Panel */}
        <nav
          ref={menuRef}
          className={`
            fixed top-0 ${menu.position === 'left' ? 'left-0' : 'right-0'} 
            h-full w-80 max-w-[80vw] bg-white dark:bg-gray-900 
            shadow-xl z-40 transform transition-transform duration-300
            ${menuOpen 
              ? 'translate-x-0' 
              : menu.position === 'left' ? '-translate-x-full' : 'translate-x-full'
            }
          `}
          role="navigation"
          aria-label="Main menu"
        >
          <div className="p-6 pt-20">
            <ul className="space-y-2">
              {menu.items.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => handleMenuItemClick(item)}
                    className="
                      w-full text-left p-3 rounded-lg 
                      hover:bg-gray-100 dark:hover:bg-gray-800
                      transition-colors duration-200
                      flex items-center space-x-3
                    "
                  >
                    {item.icon && (
                      <span className="text-xl" aria-hidden="true">
                        {item.icon}
                      </span>
                    )}
                    <span className="font-medium">{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      </>
    )
  }

  const renderFloatingActionButton = () => {
    if (!floatingAction) return null

    return (
      <button
        onClick={floatingAction.action}
        className={`
          fixed ${floatingAction.position.includes('bottom') ? 'bottom-20' : 'top-20'}
          ${floatingAction.position.includes('right') ? 'right-6' : 'left-6'}
          w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full
          shadow-lg hover:shadow-xl transition-all duration-200
          flex items-center justify-center z-40
        `}
        aria-label={floatingAction.label}
      >
        <span className="text-xl" aria-hidden="true">
          {floatingAction.icon}
        </span>
      </button>
    )
  }

  return (
    <>
      {renderBottomTabs()}
      {renderHamburgerMenu()}
      {renderFloatingActionButton()}
    </>
  )
}

// Hook for managing mobile navigation state
export const useMobileNavigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('')

  const showBottomTabs = (tabs: TabConfig[]) => {
    // Implementation for showing bottom tabs
  }

  const enableHamburgerMenu = (menu: MenuConfig) => {
    // Implementation for enabling hamburger menu
  }

  const addFloatingActionButton = (action: ActionConfig) => {
    // Implementation for adding floating action button
  }

  const handleBackButton = (handler: BackButtonHandler) => {
    // Implementation for handling back button
  }

  return {
    isMenuOpen,
    setIsMenuOpen,
    activeTab,
    setActiveTab,
    showBottomTabs,
    enableHamburgerMenu,
    addFloatingActionButton,
    handleBackButton
  }
}

export default MobileNavigation