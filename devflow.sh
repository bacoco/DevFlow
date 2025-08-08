#!/bin/bash

# DevFlow Intelligence Platform - Unified Control Script
# Usage: ./devflow.sh [start|stop|status|dashboard-only]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Project detection
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"

# Change to project directory
cd "$PROJECT_ROOT"

# Verify we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}[ERROR]${NC} docker-compose.yml not found. Please run this script from the project root."
    exit 1
fi

# Functions
print_header() {
    echo ""
    echo -e "${CYAN}================================${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}================================${NC}"
}

print_status() {
    echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Kill process on port
kill_port() {
    local port=$1
    local service_name=${2:-"Service"}
    
    local pid=$(lsof -ti:$port 2>/dev/null || true)
    if [ ! -z "$pid" ]; then
        print_status "Stopping $service_name on port $port (PID: $pid)"
        kill -9 $pid 2>/dev/null || true
        sleep 1
    fi
}

# Check if service is running
check_service() {
    local port=$1
    local name=$2
    local url=$3
    
    if curl -s "$url" > /dev/null 2>&1; then
        echo -e "  ${GREEN}✅ $name${NC} - http://localhost:$port"
        return 0
    else
        echo -e "  ${RED}❌ $name${NC} - http://localhost:$port"
        return 1
    fi
}

# Wait for service to be ready
wait_for_service() {
    local url=$1
    local service_name=$2
    local max_attempts=30
    local attempt=1
    
    print_status "Waiting for $service_name to be ready..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url" > /dev/null 2>&1; then
            print_success "$service_name is ready!"
            return 0
        fi
        
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    print_error "$service_name failed to start after $((max_attempts * 2)) seconds"
    return 1
}

# Start infrastructure
start_infrastructure() {
    print_header "🏗️ Starting Infrastructure Services"
    
    # Clean up any existing containers
    print_status "Cleaning up existing containers..."
    docker-compose down --remove-orphans > /dev/null 2>&1 || true
    
    # Start infrastructure services
    print_status "Starting infrastructure services..."
    docker-compose up -d mongodb redis influxdb kafka zookeeper
    
    # Wait for infrastructure to be ready
    print_status "Waiting for infrastructure to be ready..."
    sleep 15
}

# Start application services
start_services() {
    print_header "🚀 Starting Application Services"
    
    # Clean up ports
    kill_port 3000 "API Gateway"
    kill_port 3001 "Data Ingestion"
    kill_port 3002 "Stream Processing"
    kill_port 3003 "ML Pipeline"
    kill_port 3010 "Dashboard"
    
    # Create logs directory
    mkdir -p logs
    
    # Start API Gateway
    print_status "Starting API Gateway..."
    cd services/api-gateway
    npm install > /dev/null 2>&1
    npm start > ../../logs/api-gateway.log 2>&1 &
    echo $! > ../../pids/api-gateway.pid
    cd - > /dev/null
    
    # Start Data Ingestion
    print_status "Starting Data Ingestion..."
    cd services/data-ingestion
    npm install > /dev/null 2>&1
    npm start > ../../logs/data-ingestion.log 2>&1 &
    echo $! > ../../pids/data-ingestion.pid
    cd - > /dev/null
    
    # Start Stream Processing
    print_status "Starting Stream Processing..."
    cd services/stream-processing
    npm install > /dev/null 2>&1
    npm start > ../../logs/stream-processing.log 2>&1 &
    echo $! > ../../pids/stream-processing.pid
    cd - > /dev/null
    
    # Start ML Pipeline
    print_status "Starting ML Pipeline..."
    cd services/ml-pipeline
    npm install > /dev/null 2>&1
    npm start > ../../logs/ml-pipeline.log 2>&1 &
    echo $! > ../../pids/ml-pipeline.pid
    cd - > /dev/null
    
    # Wait for backend services
    sleep 5
    wait_for_service "http://localhost:3000/health" "API Gateway"
}

# Start dashboard
start_dashboard() {
    print_header "🎨 Starting Dashboard"
    
    print_status "Starting Next.js Dashboard on port 3010..."
    cd apps/dashboard
    
    # Install dependencies
    npm install > /dev/null 2>&1
    
    # Set environment variables
    export NEXT_PUBLIC_API_URL=http://localhost:3000
    export NEXT_PUBLIC_WS_URL=ws://localhost:3000
    export NODE_ENV=development
    
    # Start dashboard
    PORT=3010 npm run dev > ../../logs/dashboard.log 2>&1 &
    DASHBOARD_PID=$!
    echo $DASHBOARD_PID > ../../pids/dashboard.pid
    cd - > /dev/null
    
    # Wait for dashboard
    wait_for_service "http://localhost:3010" "Dashboard UI"
}

# Show status
show_status() {
    print_header "📊 DevFlow Platform Status"
    
    echo ""
    echo -e "${CYAN}🎨 Frontend Applications:${NC}"
    check_service 3010 "Modern Dashboard UI" "http://localhost:3010"
    
    echo ""
    echo -e "${CYAN}🔧 Backend Services:${NC}"
    check_service 3000 "API Gateway" "http://localhost:3000/health"
    check_service 3001 "Data Ingestion" "http://localhost:3001/health"
    check_service 3002 "Stream Processing" "http://localhost:3002/health"
    check_service 3003 "ML Pipeline" "http://localhost:3003/health"
    
    echo ""
    echo -e "${CYAN}🏗️ Infrastructure Services:${NC}"
    if docker ps --format "table {{.Names}}" | grep -q mongodb; then
        echo -e "  ${GREEN}✅ MongoDB${NC} - localhost:27017"
    else
        echo -e "  ${RED}❌ MongoDB${NC} - localhost:27017"
    fi
    
    if docker ps --format "table {{.Names}}" | grep -q redis; then
        echo -e "  ${GREEN}✅ Redis${NC} - localhost:6379"
    else
        echo -e "  ${RED}❌ Redis${NC} - localhost:6379"
    fi
    
    echo ""
    echo -e "${CYAN}🌐 Access URLs:${NC}"
    echo -e "  ${PURPLE}📖 App Overview:${NC}       http://localhost:3010/overview ${YELLOW}← START HERE${NC}"
    echo -e "  ${GREEN}📊 Dashboard:${NC}           http://localhost:3010"
    echo -e "  ${GREEN}✅ Task Manager:${NC}        http://localhost:3010/tasks"
    echo -e "  ${GREEN}🔍 Code Archaeology:${NC}    http://localhost:3010/code-archaeology"
    echo -e "  ${GREEN}🔧 API Gateway:${NC}         http://localhost:3000"
    echo -e "  ${GREEN}🎮 GraphQL:${NC}             http://localhost:3000/graphql"
    
    echo ""
    echo -e "${CYAN}🛠️ Management:${NC}"
    echo -e "  ${YELLOW}./devflow.sh stop${NC}      - Stop all services"
    echo -e "  ${YELLOW}./devflow.sh status${NC}    - Show this status"
    echo -e "  ${YELLOW}open http://localhost:3010/overview${NC} - Open app overview"
}

# Stop all services
stop_services() {
    print_header "🛑 Stopping DevFlow Platform"
    
    # Stop application services
    print_status "Stopping application services..."
    kill_port 3010 "Dashboard"
    kill_port 3003 "ML Pipeline"
    kill_port 3002 "Stream Processing"
    kill_port 3001 "Data Ingestion"
    kill_port 3000 "API Gateway"
    
    # Stop infrastructure
    print_status "Stopping infrastructure services..."
    docker-compose down > /dev/null 2>&1 || true
    
    # Clean up PID files
    rm -rf pids/*.pid 2>/dev/null || true
    
    print_success "All services stopped"
}

# Start full platform
start_full() {
    print_header "🚀 DevFlow Intelligence Platform Startup"
    
    # Create directories
    mkdir -p logs pids
    
    # Start infrastructure
    start_infrastructure
    
    # Start services
    start_services
    
    # Start dashboard
    start_dashboard
    
    # Show final status
    echo ""
    echo -e "${CYAN}🌐 Access Points:${NC}"
    echo -e "  ${PURPLE}📖 App Overview (START HERE):${NC} http://localhost:3010/overview"
    echo -e "  ${GREEN}📊 Main Dashboard:${NC}            http://localhost:3010"
    echo -e "  ${GREEN}✅ Task Management:${NC}            http://localhost:3010/tasks"
    echo -e "  ${GREEN}🔍 Code Archaeology:${NC}           http://localhost:3010/code-archaeology"
    echo -e "  ${GREEN}📚 Documentation:${NC}              http://localhost:3010/documentation-demo"
    echo -e "  ${GREEN}🔧 API Gateway:${NC}                http://localhost:3000"
    echo -e "  ${GREEN}🎮 GraphQL Playground:${NC}         http://localhost:3000/graphql"
    
    echo ""
    echo -e "${CYAN}🔧 Logs:${NC}"
    echo -e "  ${YELLOW}tail -f logs/dashboard.log${NC}     - Dashboard logs"
    echo -e "  ${YELLOW}tail -f logs/api-gateway.log${NC}   - API Gateway logs"
    echo -e "  ${YELLOW}docker-compose logs -f${NC}         - Infrastructure logs"
    echo ""
    echo -e "${CYAN}🛑 To Stop:${NC}"
    echo -e "  ${YELLOW}./devflow.sh stop${NC}              - Stop all services"
    echo ""
    echo -e "${GREEN}🎉 Ready to use!${NC}"
    echo ""
    echo -e "${PURPLE}📖 MAIN OVERVIEW PAGE: ${YELLOW}http://localhost:3010/overview${NC}"
    echo -e "${BLUE}   ↳ Complete app explanation and feature tour${NC}"
    echo ""
    echo -e "${GREEN}🔐 Demo Login: ${YELLOW}loic@loic.fr${NC} / ${YELLOW}loic${NC}"
    
    # Try to open the overview page automatically
    if command -v open &> /dev/null; then
        echo ""
        echo -e "${BLUE}🌐 Opening overview page automatically...${NC}"
        sleep 3
        open "http://localhost:3010/overview"
    elif command -v xdg-open &> /dev/null; then
        echo ""
        echo -e "${BLUE}🌐 Opening overview page automatically...${NC}"
        sleep 3
        xdg-open "http://localhost:3010/overview"
    fi
}

# Start dashboard only
start_dashboard_only() {
    print_header "🎨 Starting Dashboard Only"
    
    # Clean up dashboard port
    kill_port 3010 "Dashboard"
    
    # Create logs directory
    mkdir -p logs pids
    
    # Start dashboard
    print_status "Starting Next.js dashboard on port 3010..."
    cd apps/dashboard
    
    # Install dependencies
    npm install > /dev/null 2>&1
    
    # Set environment variables
    export NEXT_PUBLIC_API_URL=http://localhost:3000
    export NEXT_PUBLIC_WS_URL=ws://localhost:3000
    export NODE_ENV=development
    
    print_success "🎉 Dashboard starting at http://localhost:3010"
    print_warning "⚠️  Backend services not running - some features may not work"
    print_status "For full functionality, use: ./devflow.sh start"
    
    echo ""
    echo -e "${BLUE}📖 App Overview: ${YELLOW}http://localhost:3010/overview${NC}"
    echo -e "${GREEN}🔐 Demo Login: ${YELLOW}loic@loic.fr${NC} / ${YELLOW}loic${NC}"
    echo ""
    
    PORT=3010 npm run dev
}

# Main script logic
case "${1:-start}" in
    "start")
        start_full
        ;;
    "stop")
        stop_services
        ;;
    "status")
        show_status
        ;;
    "dashboard-only")
        start_dashboard_only
        ;;
    *)
        echo "Usage: $0 [start|stop|status|dashboard-only]"
        echo ""
        echo "Commands:"
        echo "  start          - Start full platform (default)"
        echo "  stop           - Stop all services"
        echo "  status         - Show service status"
        echo "  dashboard-only - Start only the dashboard (for quick testing)"
        echo ""
        echo "Examples:"
        echo "  ./devflow.sh           # Start everything"
        echo "  ./devflow.sh start     # Start everything"
        echo "  ./devflow.sh stop      # Stop everything"
        echo "  ./devflow.sh status    # Check status"
        echo "  ./devflow.sh dashboard-only  # Quick dashboard start"
        exit 1
        ;;
esac