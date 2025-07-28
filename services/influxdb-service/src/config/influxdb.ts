import { InfluxDB, WriteApi, QueryApi } from '@influxdata/influxdb-client';
import { BucketsAPI, OrgsAPI } from '@influxdata/influxdb-client-apis';
import { BucketConfig, RetentionPolicy } from '../types';

export class InfluxDBConfig {
  private client: InfluxDB;
  private writeApi: WriteApi;
  private queryApi: QueryApi;
  private bucketsAPI: BucketsAPI;
  private orgsAPI: OrgsAPI;

  constructor(
    private url: string = process.env.INFLUXDB_URL || 'http://localhost:8086',
    private token: string = process.env.INFLUXDB_TOKEN || '',
    private org: string = process.env.INFLUXDB_ORG || 'devflow',
    private bucket: string = process.env.INFLUXDB_BUCKET || 'productivity_metrics'
  ) {
    this.client = new InfluxDB({ url: this.url, token: this.token });
    this.writeApi = this.client.getWriteApi(this.org, this.bucket);
    this.queryApi = this.client.getQueryApi(this.org);
    this.bucketsAPI = new BucketsAPI(this.client);
    this.orgsAPI = new OrgsAPI(this.client);

    // Configure write API for batch optimization
    this.writeApi.useDefaultTags({
      service: 'devflow-intelligence',
      version: '1.0.0'
    });
  }

  getWriteApi(): WriteApi {
    return this.writeApi;
  }

  getQueryApi(): QueryApi {
    return this.queryApi;
  }

  getBucketsAPI(): BucketsAPI {
    return this.bucketsAPI;
  }

  getOrgsAPI(): OrgsAPI {
    return this.orgsAPI;
  }

  async createBucket(config: BucketConfig): Promise<void> {
    try {
      const org = await this.orgsAPI.getOrgs({ org: this.org });
      if (!org.orgs || org.orgs.length === 0) {
        throw new Error(`Organization ${this.org} not found`);
      }

      const orgID = org.orgs[0].id!;
      
      await this.bucketsAPI.postBuckets({
        body: {
          name: config.name,
          orgID,
          retentionRules: config.retentionRules,
          description: config.description
        }
      });
    } catch (error) {
      if (error instanceof Error && !error.message.includes('already exists')) {
        throw error;
      }
    }
  }

  async setupRetentionPolicies(): Promise<void> {
    const buckets = [
      {
        name: 'productivity_metrics',
        orgID: this.org,
        retentionRules: [{ type: 'expire' as const, everySeconds: 63072000 }], // 2 years
        description: 'Main productivity metrics storage'
      },
      {
        name: 'raw_telemetry',
        orgID: this.org,
        retentionRules: [{ type: 'expire' as const, everySeconds: 2592000 }], // 30 days
        description: 'Raw IDE telemetry data'
      },
      {
        name: 'aggregated_metrics',
        orgID: this.org,
        retentionRules: [{ type: 'expire' as const, everySeconds: 157680000 }], // 5 years
        description: 'Pre-aggregated metrics for dashboard performance'
      }
    ];

    for (const bucket of buckets) {
      await this.createBucket(bucket);
    }
  }

  async close(): Promise<void> {
    await this.writeApi.close();
  }

  getClient(): InfluxDB {
    return this.client;
  }
}