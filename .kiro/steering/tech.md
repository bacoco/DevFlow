# Technology Stack & Build System

## Build System

**Turborepo** - Monorepo build system with caching and parallel execution
- `turbo run dev` - Start all services in development mode
- `turbo run build` - Build all packages and applications
- `turbo run test` - Run all tests across the monorepo
- `turbo run lint` - Lint all code

## Frontend Stack

**Next.js 14** - React framework with App Router and SSR
- TypeScript with strict configuration
- Tailwind CSS for styling with custom design system
- React Three Fiber for 3D visualizations
- Framer Motion for animations
- React Query (TanStack Query) for server state management
- Zustand for client state management

**Key Libraries:**
- Radix UI for accessible components
- TipTap for rich text editing
- D3.js for data visualizations
- DND Kit for drag & drop functionality

## Backend Stack

**Node.js + Express** - Core API services
- TypeScript throughout
- GraphQL with Apollo Server
- WebSocket support via Socket.io
- JWT authentication with refresh tokens
- Express middleware for security (helmet, cors, rate limiting)

**Microservices Architecture:**
- API Gateway (port 3000) - GraphQL/REST endpoints
- Data Ingestion (port 3001) - Multi-source data collection
- Stream Processing (port 3002) - Real-time analytics
- ML Pipeline (port 3003) - Machine learning processing

## Data Layer

**Multi-database architecture:**
- **MongoDB** (port 27017) - Document storage, credentials: devflow/devflow123
- **InfluxDB** (port 8086) - Time-series metrics, credentials: admin/admin123
- **Redis** (port 6379) - Caching and sessions
- **Apache Kafka** (port 9092) - Event streaming and message queuing

## Infrastructure

**Docker + Docker Compose** - Containerization
- `docker-compose up -d` - Start infrastructure services
- `docker-compose logs -f` - View service logs
- `docker-compose down` - Stop all services

**Kubernetes** - Production orchestration
- `kubectl apply -f k8s/` - Deploy to Kubernetes
- Auto-scaling and service mesh ready

## Common Commands

```bash
# Quick start (one command)
./devflow.sh

# Development
npm run dev              # Start all services in dev mode
npm run build            # Build all packages
npm run test             # Run all tests
npm run lint             # Lint all code

# Docker operations
npm run docker:up        # Start Docker services
npm run docker:logs      # View Docker logs
npm run docker:down      # Stop Docker services

# Testing
npm run test:unit        # Unit tests only
npm run test:integration # Integration tests
npm run test:e2e         # End-to-end tests
npm run test:coverage    # Coverage report

# Specific service commands
./devflow.sh start       # Start full platform
./devflow.sh status      # Check service status
./devflow.sh stop        # Stop all services
./devflow.sh dashboard-only # Quick dashboard preview
```

## Development Requirements

- **Node.js 18+** with npm 8+
- **Docker Desktop** with 8GB+ memory allocation
- **8GB RAM** minimum (16GB recommended)
- **20GB disk space** available

## Code Quality

- **ESLint** with Airbnb TypeScript config
- **Prettier** for code formatting
- **Husky** for git hooks
- **Jest** for testing with 90%+ coverage requirement
- **TypeScript** strict mode enabled