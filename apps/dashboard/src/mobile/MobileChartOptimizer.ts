/**
 * Mobile Chart Optimizer
 * Optimizes charts for mobile devices with simplified representations and touch interactions
 */

import { MobileChartConfig } from './types'
import { mobileOptimizer } from './MobileOptimizer'
import { touchGestureManager } from './TouchGestureManager'

export class MobileChartOptimizer {
  private defaultConfig: MobileChartConfig = {
    simplifiedView: true,
    touchInteractions: true,
    gestureZoom: true,
    swipeNavigation: true,
    compactLegend: true
  }

  optimizeChart(chartElement: HTMLElement, chartData: any, config?: Partial<MobileChartConfig>): any {
    const mobileConfig = { ...this.defaultConfig, ...config }
    
    // Always apply some optimizations, but more aggressive on mobile
    const optimizedData = this.simplifyChartData(chartData, mobileConfig)
    const optimizedLayout = this.optimizeChartLayout(chartElement, optimizedData, mobileConfig)
    
    // Setup touch interactions if mobile
    if (mobileOptimizer.isMobile() && mobileConfig.touchInteractions) {
      this.setupTouchInteractions(chartElement, mobileConfig)
    }

    return {
      ...optimizedData,
      layout: optimizedLayout,
      config: mobileConfig
    }
  }

  private simplifyChartData(chartData: any, config: MobileChartConfig): any {
    if (!config.simplifiedView) return chartData

    const simplified = { ...chartData }

    // Reduce data points for performance
    if (simplified.data && Array.isArray(simplified.data)) {
      simplified.data = this.sampleDataPoints(simplified.data, 50)
    }

    // Simplify multi-series data
    if (simplified.series && Array.isArray(simplified.series)) {
      simplified.series = simplified.series.slice(0, 3) // Limit to 3 series on mobile
      simplified.series = simplified.series.map((series: any) => ({
        ...series,
        data: this.sampleDataPoints(series.data, 50)
      }))
    }

    // Simplify color palette
    if (simplified.colors && simplified.colors.length > 5) {
      simplified.colors = simplified.colors.slice(0, 5)
    }

    return simplified
  }

  private optimizeChartLayout(element: HTMLElement, chartData: any, config: MobileChartConfig): any {
    const containerWidth = element.clientWidth || window.innerWidth - 32
    const containerHeight = Math.min(element.clientHeight || 300, window.innerHeight * 0.4)

    const layout = {
      width: containerWidth,
      height: containerHeight,
      margin: {
        top: 20,
        right: config.compactLegend ? 10 : 20,
        bottom: 40,
        left: 40
      },
      responsive: true,
      maintainAspectRatio: false
    }

    // Optimize legend for mobile
    if (config.compactLegend) {
      layout.legend = {
        display: true,
        position: 'bottom',
        labels: {
          boxWidth: 12,
          fontSize: 12,
          padding: 8,
          usePointStyle: true
        }
      }
    }

    // Optimize axes for mobile
    layout.scales = {
      x: {
        ticks: {
          maxTicksLimit: 5,
          fontSize: 11
        },
        grid: {
          display: false
        }
      },
      y: {
        ticks: {
          maxTicksLimit: 5,
          fontSize: 11
        },
        grid: {
          color: 'rgba(0,0,0,0.1)'
        }
      }
    }

    // Optimize tooltips for touch
    layout.plugins = {
      tooltip: {
        enabled: true,
        mode: 'nearest',
        intersect: false,
        backgroundColor: 'rgba(0,0,0,0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255,255,255,0.2)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          title: (context: any) => {
            return context[0]?.label || ''
          },
          label: (context: any) => {
            return `${context.dataset.label}: ${context.parsed.y}`
          }
        }
      }
    }

    return layout
  }

  private setupTouchInteractions(element: HTMLElement, config: MobileChartConfig): void {
    // Enable gesture zoom
    if (config.gestureZoom) {
      touchGestureManager.enablePinchZoom(element, {
        minScale: 0.5,
        maxScale: 3.0,
        onPinch: (scale, center) => {
          this.handleChartZoom(element, scale, center)
        }
      })
    }

    // Enable swipe navigation for multi-chart views
    if (config.swipeNavigation) {
      touchGestureManager.registerSwipeHandler(element, {
        onSwipe: (direction, distance, velocity) => {
          this.handleChartSwipe(element, direction, distance, velocity)
        }
      })
    }

    // Add tap interactions
    touchGestureManager.addTapGesture(element, {
      onTap: (position) => {
        this.handleChartTap(element, position)
      },
      onDoubleTap: (position) => {
        this.handleChartDoubleTap(element, position)
      }
    })

    // Prevent scroll bounce on chart container
    touchGestureManager.preventScrollBounce(element)
  }

  private handleChartZoom(element: HTMLElement, scale: number, center: { x: number; y: number }): void {
    // Implement chart zoom logic
    const chart = (element as any).__chart
    if (chart && chart.zoom) {
      chart.zoom(scale, center)
    }

    // Dispatch custom event
    element.dispatchEvent(new CustomEvent('chartZoom', {
      detail: { scale, center }
    }))
  }

  private handleChartSwipe(element: HTMLElement, direction: string, distance: number, velocity: number): void {
    // Implement chart navigation logic
    if (direction === 'left' || direction === 'right') {
      const chart = (element as any).__chart
      if (chart && chart.navigate) {
        chart.navigate(direction === 'left' ? 'next' : 'previous')
      }

      // Dispatch custom event
      element.dispatchEvent(new CustomEvent('chartSwipe', {
        detail: { direction, distance, velocity }
      }))
    }
  }

  private handleChartTap(element: HTMLElement, position: { x: number; y: number }): void {
    // Implement chart tap interaction
    const chart = (element as any).__chart
    if (chart && chart.getElementsAtEventForMode) {
      const elements = chart.getElementsAtEventForMode(
        { x: position.x, y: position.y },
        'nearest',
        { intersect: true },
        false
      )

      if (elements.length > 0) {
        // Highlight tapped element
        chart.setActiveElements(elements)
        chart.update('none')

        // Dispatch custom event
        element.dispatchEvent(new CustomEvent('chartTap', {
          detail: { position, elements }
        }))
      }
    }
  }

  private handleChartDoubleTap(element: HTMLElement, position: { x: number; y: number }): void {
    // Implement chart double tap (e.g., reset zoom)
    const chart = (element as any).__chart
    if (chart && chart.resetZoom) {
      chart.resetZoom()
    }

    // Dispatch custom event
    element.dispatchEvent(new CustomEvent('chartDoubleTap', {
      detail: { position }
    }))
  }

  private sampleDataPoints(data: any[], maxPoints: number): any[] {
    if (!Array.isArray(data) || data.length <= maxPoints) {
      return data
    }

    const step = Math.ceil(data.length / maxPoints)
    const sampled = []

    // Always include first and last points
    sampled.push(data[0])

    // Sample intermediate points
    for (let i = step; i < data.length - step; i += step) {
      sampled.push(data[i])
    }

    // Always include last point
    if (data.length > 1) {
      sampled.push(data[data.length - 1])
    }

    return sampled
  }

  createMobileChartWrapper(chartElement: HTMLElement): HTMLElement {
    const wrapper = document.createElement('div')
    wrapper.className = 'mobile-chart-wrapper'
    wrapper.style.cssText = `
      position: relative;
      width: 100%;
      height: 100%;
      overflow: hidden;
      touch-action: none;
      user-select: none;
    `

    // Add loading indicator
    const loadingIndicator = document.createElement('div')
    loadingIndicator.className = 'chart-loading'
    loadingIndicator.innerHTML = `
      <div class="loading-spinner"></div>
      <div class="loading-text">Loading chart...</div>
    `
    loadingIndicator.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
      color: #666;
    `

    wrapper.appendChild(loadingIndicator)
    wrapper.appendChild(chartElement)

    // Hide loading indicator when chart is ready
    const observer = new MutationObserver(() => {
      if (chartElement.querySelector('canvas') || chartElement.querySelector('svg')) {
        loadingIndicator.style.display = 'none'
        observer.disconnect()
      }
    })

    observer.observe(chartElement, { childList: true, subtree: true })

    return wrapper
  }

  addMobileChartControls(chartElement: HTMLElement): HTMLElement {
    const controls = document.createElement('div')
    controls.className = 'mobile-chart-controls'
    controls.style.cssText = `
      position: absolute;
      top: 8px;
      right: 8px;
      display: flex;
      gap: 8px;
      z-index: 10;
    `

    // Reset zoom button
    const resetButton = document.createElement('button')
    resetButton.innerHTML = '🔍'
    resetButton.title = 'Reset zoom'
    resetButton.style.cssText = `
      width: 32px;
      height: 32px;
      border: none;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.9);
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    `
    resetButton.addEventListener('click', () => {
      this.handleChartDoubleTap(chartElement, { x: 0, y: 0 })
    })

    // Fullscreen button
    const fullscreenButton = document.createElement('button')
    fullscreenButton.innerHTML = '⛶'
    fullscreenButton.title = 'Toggle fullscreen'
    fullscreenButton.style.cssText = resetButton.style.cssText
    fullscreenButton.addEventListener('click', () => {
      this.toggleChartFullscreen(chartElement)
    })

    controls.appendChild(resetButton)
    controls.appendChild(fullscreenButton)

    return controls
  }

  private toggleChartFullscreen(chartElement: HTMLElement): void {
    const wrapper = chartElement.closest('.mobile-chart-wrapper') as HTMLElement
    if (!wrapper) return

    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      wrapper.requestFullscreen().catch(err => {
        console.warn('Could not enter fullscreen:', err)
      })
    }
  }
}

// Singleton instance
export const mobileChartOptimizer = new MobileChartOptimizer()