describe('Dashboard Setup', () => {
  it('should have basic TypeScript types working', () => {
    const testObject: { name: string; value: number } = {
      name: 'test',
      value: 42,
    };
    
    expect(testObject.name).toBe('test');
    expect(testObject.value).toBe(42);
  });

  it('should import dashboard types correctly', () => {
    const { MetricType } = require('../types/dashboard');
    // This test just verifies the types can be imported without errors
    expect(typeof MetricType).toBeDefined();
  });
});