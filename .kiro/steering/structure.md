# Project Structure & Organization

## Monorepo Architecture

DevFlow uses a **Turborepo monorepo** structure with workspaces for apps, services, packages, and extensions.

## Top-Level Structure

```
DevFlow/
├── apps/                    # Frontend applications
├── services/                # Backend microservices
├── packages/                # Shared packages
├── extensions/              # IDE extensions
├── deployment/              # Deployment automation
├── k8s/                     # Kubernetes manifests
├── docs/                    # Documentation
├── tests/                   # Integration tests
├── logs/                    # Application logs
└── pids/                    # Process management
```

## Applications (`apps/`)

**`apps/dashboard/`** - Next.js dashboard (port 3010)
- Main user interface for the platform
- React components in `src/components/`
- Pages using App Router in `src/pages/`
- Shared utilities in `src/utils/`
- Test coverage: 92%

**`apps/mobile/`** - React Native mobile app
- Cross-platform mobile application
- Shared components and navigation

## Services (`services/`)

**Microservices architecture with individual TypeScript services:**

- **`api-gateway/`** (port 3000) - GraphQL/REST API gateway
- **`data-ingestion/`** (port 3001) - Multi-source data collection
- **`stream-processing/`** (port 3002) - Real-time analytics
- **`ml-pipeline/`** (port 3003) - Machine learning processing
- **`alert-service/`** - Notification system
- **`privacy-service/`** - Data privacy compliance
- **`monitoring-service/`** - System monitoring
- **`code-archaeology/`** - Code analysis and visualization

**Service Structure Pattern:**
```
service-name/
├── src/
│   ├── __tests__/          # Unit tests
│   ├── types/              # TypeScript definitions
│   ├── services/           # Business logic
│   └── index.ts            # Entry point
├── dist/                   # Compiled output
├── package.json
├── tsconfig.json
└── Dockerfile
```

## Shared Packages (`packages/`)

**`packages/shared-types/`** - Common TypeScript definitions
- Shared interfaces and types across services
- Built first in the dependency chain
- Exported as `@devflow/shared-types`

## Extensions (`extensions/`)

**`extensions/vscode-devflow/`** - VS Code extension
- Real-time metrics collection
- IDE integration for productivity tracking

## Infrastructure & Deployment

**`deployment/`** - Deployment automation
- **`disaster-recovery/`** - DR system with 30min RTO, 5min RPO
- **`backup/`** - Backup management
- **`blue-green/`** - Zero-downtime deployment
- **`monitoring/`** - Production monitoring setup

**`k8s/`** - Kubernetes manifests
- Production-ready Kubernetes deployments
- Auto-scaling and service mesh configurations
- Load balancing and ingress controllers

## Testing Structure

**`tests/`** - Integration and E2E tests
- **`integration/`** - Cross-service integration tests
- **`script-validation/`** - Deployment script validation
- Global test configuration and utilities

## Configuration Files

**Root level configuration:**
- `package.json` - Main package with workspaces
- `turbo.json` - Turborepo pipeline configuration
- `tsconfig.json` - Base TypeScript configuration
- `docker-compose.yml` - Local development infrastructure
- `.eslintrc.js` - ESLint configuration
- `devflow.sh` - Main startup script

## Naming Conventions

**Files & Directories:**
- Use kebab-case for directories: `code-archaeology/`
- Use PascalCase for React components: `TaskManager.tsx`
- Use camelCase for utilities and services: `dataProcessor.ts`
- Use UPPER_CASE for constants: `API_ENDPOINTS.ts`

**Services:**
- Service names use kebab-case: `api-gateway`, `stream-processing`
- Package names use scoped format: `@devflow/shared-types`

**Ports:**
- Frontend apps: 3010+
- Backend services: 3000-3003
- Infrastructure: Standard ports (27017, 6379, 8086, 9092)

## Import Patterns

**Absolute imports from workspace root:**
```typescript
import { UserType } from '@devflow/shared-types';
import { apiClient } from '../services/apiClient';
```

**Relative imports within services:**
```typescript
import { validateInput } from './validation';
import { DatabaseService } from '../services/database';
```

## Development Workflow

1. **Start infrastructure**: `docker-compose up -d`
2. **Install dependencies**: `npm install`
3. **Start development**: `npm run dev` or `./devflow.sh`
4. **Run tests**: `npm test`
5. **Build for production**: `npm run build`