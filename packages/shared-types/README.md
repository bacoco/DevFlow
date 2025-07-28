# DevFlow Shared Types

This package contains shared TypeScript types, validation schemas, and database migrations for the DevFlow Intelligence platform.

## Features

- **TypeScript Interfaces**: Comprehensive type definitions for all data models
- **Zod Validation**: Runtime validation schemas with detailed error messages
- **Database Migrations**: Scripts for MongoDB and InfluxDB schema setup
- **Helper Functions**: Utilities for creating default configurations

## Installation

```bash
npm install @devflow/shared-types
```

## Usage

### Basic Types

```typescript
import { User, Team, GitEvent, IDETelemetry } from '@devflow/shared-types';

// Use types for function parameters and return values
function createUser(userData: User): User {
  return userData;
}
```

### Validation

```typescript
import { 
  validateUser, 
  safeValidateUser, 
  UserSchema 
} from '@devflow/shared-types';

// Strict validation (throws on error)
try {
  const user = validateUser(userData);
  console.log('Valid user:', user);
} catch (error) {
  console.error('Validation failed:', error);
}

// Safe validation (returns result object)
const result = safeValidateUser(userData);
if (result.success) {
  console.log('Valid user:', result.data);
} else {
  console.error('Validation errors:', result.error.issues);
}

// Direct schema usage
const parseResult = UserSchema.safeParse(userData);
```

### Helper Functions

```typescript
import { 
  createDefaultPrivacySettings, 
  createDefaultUserPreferences 
} from '@devflow/shared-types';

const userId = '123e4567-e89b-12d3-a456-426614174000';
const privacySettings = createDefaultPrivacySettings(userId);
const preferences = createDefaultUserPreferences();
```

## Data Models

### Core Entities

- **User**: Developer/team member information with privacy settings
- **Team**: Team configuration and settings
- **GitEvent**: Version control events (commits, PRs, merges)
- **IDETelemetry**: IDE usage data with privacy controls
- **ProductivityMetric**: Calculated productivity measurements
- **FlowState**: Developer focus and flow state tracking

### Supporting Types

- **PrivacySettings**: Granular privacy controls
- **UserPreferences**: User interface and notification preferences
- **TeamSettings**: Team-level configuration
- **MetricContext**: Context information for metrics

## Validation Schemas

All data models include comprehensive Zod validation schemas that enforce:

- **Type Safety**: Ensures correct data types
- **Format Validation**: Email formats, UUIDs, time formats
- **Range Validation**: Numeric ranges, string lengths
- **Business Rules**: Domain-specific validation logic

## Database Migrations

### MongoDB Migrations

Located in `src/migrations/mongodb/`, these scripts set up:

- Collections with validation schemas
- Indexes for performance
- TTL indexes for data retention
- Proper constraints and relationships

### InfluxDB Migrations

Located in `src/migrations/influxdb/`, these scripts create:

- Time series buckets with retention policies
- Measurement schemas
- Tag and field definitions
- Performance optimizations

### Running Migrations

```typescript
import { runMigrations } from '@devflow/shared-types/dist/migrations/runner';

const config = {
  mongodb: {
    url: 'mongodb://localhost:27017',
    database: 'devflow'
  },
  influxdb: {
    url: 'http://localhost:8086',
    token: 'your-token',
    org: 'devflow'
  }
};

await runMigrations(config);
```

Or use the CLI:

```bash
# Set environment variables
export MONGODB_URL=mongodb://localhost:27017
export MONGODB_DATABASE=devflow
export INFLUXDB_URL=http://localhost:8086
export INFLUXDB_TOKEN=your-token
export INFLUXDB_ORG=devflow

# Run migrations
node dist/migrations/runner.js up

# Rollback migrations
node dist/migrations/runner.js down
```

## Privacy and Security

The data models include comprehensive privacy controls:

- **Granular Permissions**: Control data collection at field level
- **Anonymization Levels**: None, partial, or full anonymization
- **Data Retention**: Configurable retention periods
- **Access Controls**: Role-based access to sensitive data

## Testing

The package includes comprehensive unit tests:

```bash
npm test
```

Tests cover:
- Valid data validation
- Invalid data rejection
- Edge cases and error handling
- Helper function behavior
- Schema compliance

## Development

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run tests
npm test

# Watch mode for development
npm run dev

# Lint code
npm run lint

# Clean build artifacts
npm run clean
```

## Requirements Compliance

This implementation satisfies the following requirements:

- **RF-001**: Comprehensive data ingestion capabilities with validation
- **RF-003**: Strict privacy controls and data protection

The data models support:
- Git event capture and validation
- IDE telemetry collection with privacy controls
- User and team management
- Productivity metrics tracking
- Privacy-aware data handling
- Secure data storage patterns

## Dependencies

- **zod**: Runtime validation and type inference
- **@influxdata/influxdb-client**: InfluxDB client (optional)
- **mongodb**: MongoDB client (optional, for migrations)

## License

MIT