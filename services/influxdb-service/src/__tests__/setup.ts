import { GenericContainer, StartedTestContainer } from 'testcontainers';

let influxContainer: StartedTestContainer;

export const setupInfluxDB = async (): Promise<void> => {
  influxContainer = await new GenericContainer('influxdb:2.7')
    .withEnvironment({
      DOCKER_INFLUXDB_INIT_MODE: 'setup',
      DOCKER_INFLUXDB_INIT_USERNAME: 'admin',
      DOCKER_INFLUXDB_INIT_PASSWORD: 'password123',
      DOCKER_INFLUXDB_INIT_ORG: 'devflow',
      DOCKER_INFLUXDB_INIT_BUCKET: 'test_bucket',
      DOCKER_INFLUXDB_INIT_ADMIN_TOKEN: 'test-token-123'
    })
    .withExposedPorts(8086)
    .start();

  const host = influxContainer.getHost();
  const port = influxContainer.getMappedPort(8086);
  
  process.env.INFLUXDB_URL = `http://${host}:${port}`;
  process.env.INFLUXDB_TOKEN = 'test-token-123';
  process.env.INFLUXDB_ORG = 'devflow';
  process.env.INFLUXDB_BUCKET = 'test_bucket';

  // Wait for InfluxDB to be ready
  await new Promise(resolve => setTimeout(resolve, 5000));
};

export const teardownInfluxDB = async (): Promise<void> => {
  if (influxContainer) {
    await influxContainer.stop();
  }
};

beforeAll(async () => {
  await setupInfluxDB();
}, 30000);

afterAll(async () => {
  await teardownInfluxDB();
});