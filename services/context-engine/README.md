# Context Engine Service

The Context Engine Service is a core component of the DevFlow Intelligence Platform that provides context-aware intelligence by understanding user work patterns, activities, and environment to enable intelligent automation and predictive features.

## Features

- **Activity Classification**: ML-powered classification of user activities (coding, reviewing, planning, debugging, meeting)
- **Context Aggregation**: Combines multiple data sources into unified work context
- **State Prediction**: Predicts next likely actions based on current context and historical patterns
- **Real-time Updates**: WebSocket-based real-time context updates
- **Historical Analysis**: Context history storage and pattern analysis
- **Multi-source Integration**: Integrates IDE activity, Git events, calendar data, and biometric data

## Architecture

### Core Components

1. **ContextEngineService**: Main service orchestrating context intelligence
2. **ActivityClassifier**: ML-based activity classification
3. **ContextAggregator**: Combines multiple data sources into unified context
4. **StatePredictorService**: Predicts next actions based on context
5. **WebSocket Handler**: Real-time context updates
6. **REST API**: HTTP endpoints for context operations

### Data Sources

- **IDE Activity**: File editing, viewing, debugging activities
- **Git Events**: Commits, pushes, pull requests, merges
- **Calendar Data**: Meeting status, availability
- **Biometric Data**: Heart rate, stress levels, focus indicators
- **Environment Data**: Time, location, device type, network quality

## API Endpoints

### REST API

- `GET /api/context/:userId` - Get current context for user
- `PUT /api/context/:userId` - Update context for user
- `GET /api/context/:userId/history` - Get context history
- `POST /api/context/:userId/predictions` - Get predicted next actions
- `POST /api/context/:userId/activity` - Report IDE activity
- `GET /api/context/:userId/insights` - Get context insights

### WebSocket API

Connect to WebSocket at `/` and send messages:

```json
// Authenticate
{
  "type": "authenticate",
  "payload": { "userId": "user123", "token": "jwt-token" }
}

// Subscribe to context changes
{
  "type": "subscribe_context",
  "payload": { "userId": "user123" }
}

// Get current context
{
  "type": "get_context",
  "payload": { "userId": "user123" }
}

// Update context
{
  "type": "update_context",
  "payload": { 
    "userId": "user123",
    "contextUpdate": { "focusLevel": 85 }
  }
}
```

## Data Models

### WorkContext

```typescript
interface WorkContext {
  activityType: 'coding' | 'reviewing' | 'planning' | 'debugging' | 'meeting';
  projectContext: ProjectInfo;
  focusLevel: number; // 0-100
  collaborationState: CollaborationInfo;
  environmentFactors: EnvironmentData;
  timestamp: Date;
  confidence: number;
}
```

### PredictedAction

```typescript
interface PredictedAction {
  actionType: string;
  description: string;
  confidence: number;
  suggestedTiming: Date;
  context: WorkContext;
}
```

## Kafka Topics

The service consumes from and produces to several Kafka topics:

### Input Topics
- `ide-activity`: IDE activity data from VS Code extension
- `git-events`: Git repository events
- `calendar-events`: Calendar and meeting data
- `biometric-data`: Biometric sensor data

### Output Topics
- `context-changes`: Context change events
- `context-predictions`: Predicted action events

## Database Schema

### Collections

1. **context_events**: Historical context change events
2. **user_contexts**: Current user context cache
3. **context_patterns**: Learned user behavior patterns

### Indexes

- `{ userId: 1, timestamp: -1 }` - User context history queries
- `{ eventType: 1 }` - Event type filtering
- `{ 'context.activityType': 1 }` - Activity-based queries
- TTL indexes for automatic data cleanup

## Configuration

### Environment Variables

```bash
PORT=3004
MONGODB_URI=mongodb://localhost:27017
KAFKA_BROKERS=localhost:9092
LOG_LEVEL=info
NODE_ENV=development
```

### Docker Configuration

```bash
# Build image
docker build -t devflow/context-engine .

# Run container
docker run -p 3004:3004 \
  -e MONGODB_URI=mongodb://mongo:27017 \
  -e KAFKA_BROKERS=kafka:9092 \
  devflow/context-engine
```

## Development

### Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

### Testing

```bash
# Unit tests
npm test

# Test coverage
npm run test:coverage

# Integration tests
npm run test:integration
```

## Machine Learning

### Activity Classification

The service uses a hybrid approach for activity classification:

1. **Rule-based Classification**: Initial implementation using heuristics
2. **ML Classification**: Future enhancement with TensorFlow.js models

### Training Data

Activity classification models can be trained using historical context data:

```typescript
// Example training data structure
{
  features: {
    fileType: 'typescript',
    editsPerMinute: 15,
    keywordDensity: 0.3,
    timeOfDay: 10,
    dayOfWeek: 1
  },
  label: 'coding'
}
```

## Monitoring

### Health Checks

- HTTP health endpoint: `GET /health`
- Docker health check included
- Service status monitoring via logs

### Metrics

- Context update frequency
- Prediction accuracy
- WebSocket connection count
- Kafka message processing rate

## Security

### Data Privacy

- Biometric data processed locally when possible
- Configurable data retention policies
- User consent management for sensitive data
- Differential privacy for aggregated insights

### Authentication

- JWT token validation for WebSocket connections
- API rate limiting
- Input validation and sanitization

## Deployment

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: context-engine
spec:
  replicas: 2
  selector:
    matchLabels:
      app: context-engine
  template:
    metadata:
      labels:
        app: context-engine
    spec:
      containers:
      - name: context-engine
        image: devflow/context-engine:latest
        ports:
        - containerPort: 3004
        env:
        - name: MONGODB_URI
          value: "mongodb://mongodb:27017"
        - name: KAFKA_BROKERS
          value: "kafka:9092"
```

### Scaling Considerations

- Stateless service design for horizontal scaling
- Kafka partitioning for parallel processing
- MongoDB sharding for large datasets
- WebSocket connection load balancing

## Future Enhancements

1. **Advanced ML Models**: Deep learning models for better activity classification
2. **Federated Learning**: Privacy-preserving model training across users
3. **Real-time Recommendations**: Instant productivity suggestions
4. **Cross-platform Integration**: Support for more IDEs and tools
5. **Behavioral Analytics**: Advanced pattern recognition and insights