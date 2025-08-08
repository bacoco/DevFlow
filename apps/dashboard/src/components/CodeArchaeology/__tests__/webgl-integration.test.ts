import { WebGLCompatibility } from '../performance/WebGLCompatibility';
import { FallbackRenderer, DEFAULT_FALLBACK_CONFIG } from '../performance/FallbackRenderer';

describe('WebGL Integration Tests', () => {
  beforeEach(() => {
    // Mock basic browser environment
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      configurable: true,
    });

    Object.defineProperty(navigator, 'platform', {
      value: 'MacIntel',
      configurable: true,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should create WebGL compatibility instance', () => {
    const compatibility = new WebGLCompatibility();
    expect(compatibility).toBeDefined();
    
    const browserInfo = compatibility.getBrowserInfo();
    expect(browserInfo.name).toBe('Chrome');
    expect(browserInfo.engine).toBe('Blink');
  });

  it('should create fallback renderer', () => {
    const fallbackRenderer = new FallbackRenderer(DEFAULT_FALLBACK_CONFIG);
    expect(fallbackRenderer).toBeDefined();
    
    const config = fallbackRenderer.getConfig();
    expect(config.mode).toBe('canvas2d');
    expect(config.maxArtifacts).toBe(500);
    
    fallbackRenderer.dispose();
  });

  it('should generate compatibility report', () => {
    const compatibility = new WebGLCompatibility();
    const report = compatibility.generateReport();
    
    expect(report).toBeDefined();
    expect(report.browserInfo).toBeDefined();
    expect(report.webglSupport).toBeDefined();
    expect(report.performanceScore).toBeGreaterThanOrEqual(0);
    expect(report.performanceScore).toBeLessThanOrEqual(1);
    expect(report.recommendedSettings).toBeDefined();
    expect(Array.isArray(report.knownIssues)).toBe(true);
    expect(Array.isArray(report.workarounds)).toBe(true);
  });

  it('should provide fallback mode', () => {
    const compatibility = new WebGLCompatibility();
    const fallbackMode = compatibility.getFallbackMode();
    
    expect(['canvas2d', 'svg', 'disabled']).toContain(fallbackMode);
  });

  it('should handle WebGL disable check', () => {
    const compatibility = new WebGLCompatibility();
    const shouldDisable = compatibility.shouldDisableWebGL();
    
    expect(typeof shouldDisable).toBe('boolean');
  });

  it('should create optimal context attributes', () => {
    const compatibility = new WebGLCompatibility();
    const attributes = compatibility.getOptimalContextAttributes();
    
    expect(attributes).toBeDefined();
    expect(typeof attributes.alpha).toBe('boolean');
    expect(typeof attributes.antialias).toBe('boolean');
    expect(typeof attributes.depth).toBe('boolean');
    expect(typeof attributes.stencil).toBe('boolean');
    expect(['default', 'high-performance', 'low-power']).toContain(attributes.powerPreference);
  });

  it('should render fallback content', () => {
    const fallbackRenderer = new FallbackRenderer(DEFAULT_FALLBACK_CONFIG);
    const container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '600px';
    document.body.appendChild(container);

    const mockArtifacts = [
      {
        id: 'test1',
        name: 'TestFile.ts',
        type: 'file' as const,
        position3D: { x: 0, y: 0, z: 0 },
        complexity: 5,
        changeFrequency: 2,
        authors: ['developer1'],
        dependencies: [],
        filePath: '/test/TestFile.ts',
        lastModified: new Date(),
      },
    ];

    // This should not throw an error
    expect(() => {
      fallbackRenderer.render(container, mockArtifacts, {
        width: 800,
        height: 600,
        backgroundColor: '#f5f5f5',
        gridEnabled: true,
        labelsEnabled: true,
        connectionLinesEnabled: false,
      });
    }).not.toThrow();

    document.body.removeChild(container);
    fallbackRenderer.dispose();
  });
});