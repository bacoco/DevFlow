/**
 * InfluxDB Migration: Initial Schema Setup
 * Creates buckets and retention policies for time series data
 * 
 * Note: This migration requires @influxdata/influxdb-client and @influxdata/influxdb-client-apis
 * Install with: npm install @influxdata/influxdb-client @influxdata/influxdb-client-apis
 */

const migration = {
  version: '001',
  description: 'Initial InfluxDB schema setup for time series metrics',
  
  async up(influxConfig) {
    console.log('Running InfluxDB migration 001: Initial schema setup');
    
    // Dynamic import to handle optional dependency
    let InfluxDB, BucketsAPI, OrgsAPI;
    try {
      ({ InfluxDB } = require('@influxdata/influxdb-client'));
      ({ BucketsAPI, OrgsAPI } = require('@influxdata/influxdb-client-apis'));
    } catch (error) {
      throw new Error('InfluxDB client libraries not installed. Run: npm install @influxdata/influxdb-client @influxdata/influxdb-client-apis');
    }
    
    const { url, token, org } = influxConfig;
    const influxDB = new InfluxDB({ url, token });
    
    const bucketsAPI = new BucketsAPI(influxDB);
    const orgsAPI = new OrgsAPI(influxDB);
    
    // Get organization
    const organizations = await orgsAPI.getOrgs({ org });
    if (!organizations.orgs || organizations.orgs.length === 0) {
      throw new Error(`Organization '${org}' not found`);
    }
    const orgId = organizations.orgs[0].id;
    
    // Create buckets for different data types with appropriate retention policies
    
    // 1. Productivity Metrics Bucket (1 year retention)
    try {
      await bucketsAPI.postBuckets({
        body: {
          name: 'productivity_metrics',
          orgID: orgId,
          description: 'Time series data for productivity metrics',
          retentionRules: [
            {
              type: 'expire',
              everySeconds: 31536000 // 1 year
            }
          ]
        }
      });
      console.log('Created productivity_metrics bucket');
    } catch (error) {
      if (!error.message.includes('already exists')) {
        throw error;
      }
      console.log('productivity_metrics bucket already exists');
    }
    
    // 2. Real-time Events Bucket (30 days retention for high-frequency data)
    try {
      await bucketsAPI.postBuckets({
        body: {
          name: 'realtime_events',
          orgID: orgId,
          description: 'High-frequency real-time development events',
          retentionRules: [
            {
              type: 'expire',
              everySeconds: 2592000 // 30 days
            }
          ]
        }
      });
      console.log('Created realtime_events bucket');
    } catch (error) {
      if (!error.message.includes('already exists')) {
        throw error;
      }
      console.log('realtime_events bucket already exists');
    }
    
    // 3. Aggregated Metrics Bucket (2 years retention)
    try {
      await bucketsAPI.postBuckets({
        body: {
          name: 'aggregated_metrics',
          orgID: orgId,
          description: 'Pre-aggregated metrics for dashboard performance',
          retentionRules: [
            {
              type: 'expire',
              everySeconds: 63072000 // 2 years
            }
          ]
        }
      });
      console.log('Created aggregated_metrics bucket');
    } catch (error) {
      if (!error.message.includes('already exists')) {
        throw error;
      }
      console.log('aggregated_metrics bucket already exists');
    }
    
    // 4. System Metrics Bucket (90 days retention)
    try {
      await bucketsAPI.postBuckets({
        body: {
          name: 'system_metrics',
          orgID: orgId,
          description: 'System performance and health metrics',
          retentionRules: [
            {
              type: 'expire',
              everySeconds: 7776000 // 90 days
            }
          ]
        }
      });
      console.log('Created system_metrics bucket');
    } catch (error) {
      if (!error.message.includes('already exists')) {
        throw error;
      }
      console.log('system_metrics bucket already exists');
    }
    
    console.log('InfluxDB migration 001 completed successfully');
    
    // Return bucket configuration for reference
    return {
      buckets: {
        productivity_metrics: {
          name: 'productivity_metrics',
          retention: '1y',
          description: 'Core productivity metrics like time-in-flow, code churn, etc.'
        },
        realtime_events: {
          name: 'realtime_events',
          retention: '30d',
          description: 'High-frequency events from IDE telemetry and Git'
        },
        aggregated_metrics: {
          name: 'aggregated_metrics',
          retention: '2y',
          description: 'Pre-computed aggregations for dashboard performance'
        },
        system_metrics: {
          name: 'system_metrics',
          retention: '90d',
          description: 'System health and performance monitoring'
        }
      },
      measurements: {
        productivity_metrics: [
          'time_in_flow',
          'code_churn',
          'review_lag',
          'focus_time',
          'complexity_trend',
          'collaboration_score'
        ],
        realtime_events: [
          'git_event',
          'ide_telemetry',
          'build_event',
          'test_event'
        ],
        aggregated_metrics: [
          'daily_productivity',
          'weekly_trends',
          'team_performance',
          'project_health'
        ],
        system_metrics: [
          'api_response_time',
          'data_ingestion_rate',
          'processing_latency',
          'error_rate'
        ]
      },
      tags: {
        common: ['user_id', 'team_id', 'project_id', 'environment'],
        productivity_metrics: ['metric_type', 'aggregation_period'],
        realtime_events: ['event_type', 'source', 'privacy_level'],
        aggregated_metrics: ['aggregation_type', 'time_window'],
        system_metrics: ['service', 'endpoint', 'status']
      }
    };
  },
  
  async down(influxConfig) {
    console.log('Rolling back InfluxDB migration 001');
    
    // Dynamic import to handle optional dependency
    let InfluxDB, BucketsAPI;
    try {
      ({ InfluxDB } = require('@influxdata/influxdb-client'));
      ({ BucketsAPI } = require('@influxdata/influxdb-client-apis'));
    } catch (error) {
      throw new Error('InfluxDB client libraries not installed. Run: npm install @influxdata/influxdb-client @influxdata/influxdb-client-apis');
    }
    
    const { url, token, org } = influxConfig;
    const influxDB = new InfluxDB({ url, token });
    const bucketsAPI = new BucketsAPI(influxDB);
    
    const bucketNames = [
      'productivity_metrics',
      'realtime_events', 
      'aggregated_metrics',
      'system_metrics'
    ];
    
    for (const bucketName of bucketNames) {
      try {
        const buckets = await bucketsAPI.getBuckets({ name: bucketName });
        if (buckets.buckets && buckets.buckets.length > 0) {
          await bucketsAPI.deleteBucketsID({ bucketID: buckets.buckets[0].id });
          console.log(`Deleted bucket: ${bucketName}`);
        }
      } catch (error) {
        console.warn(`Failed to delete bucket ${bucketName}:`, error.message);
      }
    }
    
    console.log('InfluxDB migration 001 rollback completed');
  }
};

module.exports = migration;