#!/bin/bash

# DevFlow Intelligence Platform - Enhanced Complete Run Script
# Version: 2.0
# Usage: ./run-devflow-complete.sh [start|stop|status|help|diagnostic] [--verbose] [--diagnostic]

set -e

# =============================================================================
# CONFIGURATION AND CONSTANTS
# =============================================================================

# Script metadata
SCRIPT_VERSION="2.0"
SCRIPT_NAME="DevFlow Complete Runner"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"

# Logging configuration
LOG_DIR="$PROJECT_ROOT/logs"
SCRIPT_LOG="$LOG_DIR/devflow-complete.log"
PID_DIR="$PROJECT_ROOT/pids"

# Color definitions for enhanced output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'  # No Color

# Progress indicators
SPINNER_CHARS="⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏"
PROGRESS_BAR_WIDTH=50

# Environment requirements
REQUIRED_COMMANDS=("docker" "docker-compose" "node" "npm" "curl" "lsof")
REQUIRED_PORTS=(3000 3001 3002 3003 3010 27017 6379 9092 2181 8086)

# =============================================================================
# SERVICE CONFIGURATION
# =============================================================================

# Service definitions using arrays (compatible with older bash)
INFRASTRUCTURE_SERVICES="zookeeper kafka mongodb influxdb redis"
APPLICATION_SERVICES="api-gateway data-ingestion stream-processing ml-pipeline"
FRONTEND_SERVICES="dashboard"

# Service information lookup functions
get_service_port() {
    case "$1" in
        "zookeeper") echo "2181" ;;
        "kafka") echo "9092" ;;
        "mongodb") echo "27017" ;;
        "influxdb") echo "8086" ;;
        "redis") echo "6379" ;;
        "api-gateway") echo "3000" ;;
        "data-ingestion") echo "3001" ;;
        "stream-processing") echo "3002" ;;
        "ml-pipeline") echo "3003" ;;
        "dashboard") echo "3010" ;;
        *) echo "unknown" ;;
    esac
}

get_service_description() {
    case "$1" in
        "zookeeper") echo "Apache Zookeeper" ;;
        "kafka") echo "Apache Kafka" ;;
        "mongodb") echo "MongoDB Database" ;;
        "influxdb") echo "InfluxDB Time Series" ;;
        "redis") echo "Redis Cache" ;;
        "api-gateway") echo "API Gateway" ;;
        "data-ingestion") echo "Data Ingestion Service" ;;
        "stream-processing") echo "Stream Processing Service" ;;
        "ml-pipeline") echo "ML Pipeline Service" ;;
        "dashboard") echo "DevFlow Dashboard" ;;
        *) echo "Unknown Service" ;;
    esac
}

get_service_dependencies() {
    case "$1" in
        "kafka") echo "zookeeper" ;;
        "api-gateway") echo "mongodb redis kafka" ;;
        "data-ingestion") echo "kafka mongodb" ;;
        "stream-processing") echo "kafka influxdb mongodb redis" ;;
        "ml-pipeline") echo "mongodb redis kafka" ;;
        "dashboard") echo "api-gateway" ;;
        *) echo "" ;;
    esac
}

get_health_check_command() {
    case "$1" in
        "zookeeper") echo "docker exec \$(docker ps -q -f name=zookeeper) echo ruok | nc localhost 2181 2>/dev/null" ;;
        "kafka") echo "docker exec \$(docker ps -q -f name=kafka) kafka-topics --bootstrap-server localhost:9092 --list 2>/dev/null" ;;
        "mongodb") echo "docker exec \$(docker ps -q -f name=mongodb) mongosh --host localhost:27017 --eval 'db.runCommand({ping: 1})' --quiet 2>/dev/null" ;;
        "influxdb") echo "curl -s -f http://localhost:8086/health 2>/dev/null" ;;
        "redis") echo "docker exec \$(docker ps -q -f name=redis) redis-cli ping 2>/dev/null" ;;
        "api-gateway") echo "curl -s -f http://localhost:3000/health 2>/dev/null || curl -s -f http://localhost:3000/ 2>/dev/null" ;;
        "data-ingestion") echo "curl -s -f http://localhost:3001/health 2>/dev/null || curl -s -f http://localhost:3001/ 2>/dev/null" ;;
        "stream-processing") echo "curl -s -f http://localhost:3002/health 2>/dev/null || curl -s -f http://localhost:3002/ 2>/dev/null" ;;
        "ml-pipeline") echo "curl -s -f http://localhost:3003/health 2>/dev/null || curl -s -f http://localhost:3003/ 2>/dev/null" ;;
        "dashboard") echo "curl -s -f http://localhost:3010/health 2>/dev/null || curl -s -f http://localhost:3010/ 2>/dev/null" ;;
        *) echo "" ;;
    esac
}

# Service status tracking using files (compatible approach)
SERVICE_STATUS_DIR="$PID_DIR/status"
SERVICE_PIDS_FILE="$PID_DIR/service_pids"
SERVICE_START_TIME_FILE="$PID_DIR/start_times"

# Performance monitoring configuration
PERFORMANCE_METRICS_FILE="$PID_DIR/performance_metrics"
STARTUP_METRICS_FILE="$PID_DIR/startup_metrics"
RESOURCE_METRICS_FILE="$PID_DIR/resource_metrics"
PERFORMANCE_LOG="$LOG_DIR/performance.log"

# Initialize status tracking
init_service_tracking() {
    mkdir -p "$SERVICE_STATUS_DIR"
    > "$SERVICE_PIDS_FILE"
    > "$SERVICE_START_TIME_FILE"
}

# Service status functions
set_service_status() {
    local service="$1"
    local status="$2"
    echo "$status" > "$SERVICE_STATUS_DIR/$service"
}

get_service_status() {
    local service="$1"
    if [[ -f "$SERVICE_STATUS_DIR/$service" ]]; then
        cat "$SERVICE_STATUS_DIR/$service"
    else
        echo "unknown"
    fi
}

set_service_start_time() {
    local service="$1"
    local start_time="$2"
    echo "$service:$start_time" >> "$SERVICE_START_TIME_FILE"
}

get_service_start_time() {
    local service="$1"
    grep "^$service:" "$SERVICE_START_TIME_FILE" 2>/dev/null | cut -d':' -f2 | tail -1
}

# Health check configuration
HEALTH_CHECK_TIMEOUT=30
HEALTH_CHECK_INTERVAL=2
MAX_STARTUP_TIME=300

# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

# Initialize enhanced logging system with diagnostic support
init_logging() {
    mkdir -p "$LOG_DIR" "$PID_DIR"
    
    # Create or rotate log files
    for log_file in "$SCRIPT_LOG" "$LOG_DIR/error_history.log" "$LOG_DIR/diagnostic.log"; do
        if [[ -f "$log_file" ]] && [[ $(stat -f%z "$log_file" 2>/dev/null || stat -c%s "$log_file" 2>/dev/null) -gt 10485760 ]]; then
            mv "$log_file" "${log_file}.old"
        fi
    done
    
    # Initialize log files
    echo "$(timestamp) [INFO] DevFlow Complete Runner v$SCRIPT_VERSION started" >> "$SCRIPT_LOG"
    echo "$(timestamp) [INFO] Error tracking initialized" >> "$LOG_DIR/error_history.log"
    
    if [[ "${DIAGNOSTIC_MODE:-false}" == "true" ]]; then
        echo "$(timestamp) [INFO] Diagnostic mode enabled" >> "$LOG_DIR/diagnostic.log"
        print_info "Diagnostic mode enabled - verbose logging active"
    fi
}

# Enhanced diagnostic mode toggle
enable_diagnostic_mode() {
    export DIAGNOSTIC_MODE="true"
    export VERBOSE="true"
    
    print_header "🔬 Diagnostic Mode Enabled"
    print_info "Verbose logging and diagnostic information will be displayed"
    print_info "Diagnostic logs will be saved to: $LOG_DIR/diagnostic.log"
    
    log_diagnostic "SYSTEM" "Diagnostic mode enabled by user"
}

# Generate comprehensive error report
generate_error_report() {
    local report_file="$LOG_DIR/error-report-$(date +%Y%m%d-%H%M%S).txt"
    
    print_status "Generating comprehensive error report..."
    
    {
        echo "DevFlow Intelligence Platform - Error Report"
        echo "Generated: $(date)"
        echo "Script Version: $SCRIPT_VERSION"
        echo "Diagnostic Mode: ${DIAGNOSTIC_MODE:-false}"
        echo "=================================================="
        echo ""
        
        echo "RECENT ERRORS"
        echo "-------------"
        if [[ -f "$LOG_DIR/error_history.log" ]]; then
            tail -20 "$LOG_DIR/error_history.log" | while IFS='|' read -r timestamp error_code message recovery context; do
                echo "[$timestamp] $error_code: $message"
                if [[ -n "$recovery" ]]; then
                    echo "  Recovery: $recovery"
                fi
                if [[ -n "$context" ]]; then
                    echo "  Context: $context"
                fi
                echo ""
            done
        else
            echo "No error history available"
        fi
        
        echo ""
        echo "SYSTEM STATE"
        echo "------------"
        echo "OS: $(uname -a)"
        echo "Docker Status: $(docker info &>/dev/null && echo "Running" || echo "Not Running")"
        echo "Available Disk Space: $(df -h . | tail -1 | awk '{print $4}')"
        echo "Memory Usage: $(free -h 2>/dev/null | grep Mem || vm_stat 2>/dev/null | head -5)"
        echo ""
        
        echo "SERVICE STATUS"
        echo "--------------"
        for service in $INFRASTRUCTURE_SERVICES $APPLICATION_SERVICES $FRONTEND_SERVICES; do
            local status=$(get_service_status "$service")
            local port=$(get_service_port "$service")
            echo "$service: $status (port $port)"
        done
        echo ""
        
        echo "PORT CONFLICTS"
        echo "--------------"
        for port in "${REQUIRED_PORTS[@]}"; do
            local process_info=$(lsof -ti:$port 2>/dev/null)
            if [[ -n "$process_info" ]]; then
                local process_name=$(ps -p $process_info -o comm= 2>/dev/null || echo "unknown")
                echo "Port $port: OCCUPIED by $process_name (PID: $process_info)"
            fi
        done
        echo ""
        
        echo "DOCKER INFORMATION"
        echo "------------------"
        docker --version 2>/dev/null || echo "Docker not available"
        docker-compose --version 2>/dev/null || echo "Docker Compose not available"
        echo ""
        docker ps -a 2>/dev/null || echo "Cannot access Docker containers"
        echo ""
        
        echo "RECENT LOG ENTRIES"
        echo "------------------"
        tail -50 "$SCRIPT_LOG" 2>/dev/null || echo "No main log file found"
        
        if [[ -f "$LOG_DIR/diagnostic.log" ]]; then
            echo ""
            echo "DIAGNOSTIC LOG ENTRIES"
            echo "----------------------"
            tail -30 "$LOG_DIR/diagnostic.log"
        fi
        
    } > "$report_file"
    
    print_success "Error report generated: $report_file"
    
    # Offer to view the report
    echo ""
    echo -n -e "${CYAN}Would you like to view the error report now? [y/N]: ${NC}"
    read -r view_report
    
    if [[ "$view_report" =~ ^[Yy] ]]; then
        less "$report_file"
    fi
    
    return "$report_file"
}

# Enhanced service health check with detailed error reporting
check_service_health_detailed() {
    local service="$1"
    local health_command=$(get_health_check_command "$service")
    
    log_diagnostic "HEALTH_CHECK" "Checking health for service $service" "command=$health_command"
    
    if [[ -z "$health_command" ]]; then
        handle_error "CONFIG_INVALID" "No health check defined for service: $service" "$service" false
        return 1
    fi
    
    # First check if container is running
    if ! is_container_running "$service"; then
        set_service_status "$service" "stopped"
        handle_error "SERVICE_START_FAILED" "Service $service container is not running" "$service" false
        return 1
    fi
    
    # Execute health check command with timeout
    local start_time=$(date +%s%N)
    local health_result
    
    if timeout 10 bash -c "$health_command" &>/dev/null; then
        local end_time=$(date +%s%N)
        local response_time=$(( (end_time - start_time) / 1000000 ))
        
        set_service_status "$service" "healthy"
        log_diagnostic "HEALTH_CHECK" "Service $service health check passed" "response_time=${response_time}ms"
        return 0
    else
        local exit_code=$?
        set_service_status "$service" "unhealthy"
        
        # Provide specific error information based on exit code
        case $exit_code in
            124)
                handle_error "TIMEOUT" "Health check for service $service timed out" "$service" false
                ;;
            *)
                handle_error "SERVICE_HEALTH_FAILED" "Health check for service $service failed with exit code $exit_code" "$service" false
                ;;
        esac
        
        return 1
    fi
}

# Get current timestamp
timestamp() {
    date '+%Y-%m-%d %H:%M:%S'
}

# Enhanced logging function with diagnostic support
log_message() {
    local level="$1"
    local message="$2"
    local context="${3:-}"
    local timestamp=$(timestamp)
    
    # Enhanced log entry with context
    local log_entry="[$timestamp] [$level] $message"
    if [[ -n "$context" ]]; then
        log_entry="$log_entry [Context: $context]"
    fi
    
    echo "$log_entry" >> "$SCRIPT_LOG"
    
    # Also log to console if verbose mode is enabled
    if [[ "${VERBOSE:-false}" == "true" ]]; then
        echo -e "${DIM}[$timestamp] [$level]${NC} $message"
        if [[ -n "$context" ]]; then
            echo -e "${DIM}  Context: $context${NC}"
        fi
    fi
}

# Enhanced error logging with automatic recovery suggestions
log_error_with_recovery() {
    local error_message="$1"
    local error_code="${2:-UNKNOWN}"
    local recovery_suggestion="${3:-}"
    local context="${4:-}"
    
    local timestamp=$(timestamp)
    
    # Log detailed error information
    log_message "ERROR" "$error_message" "$context"
    log_message "ERROR" "Error Code: $error_code" "$context"
    
    if [[ -n "$recovery_suggestion" ]]; then
        log_message "RECOVERY" "$recovery_suggestion" "$context"
    fi
    
    # Store error for diagnostic reporting
    echo "$timestamp|$error_code|$error_message|$recovery_suggestion|$context" >> "$LOG_DIR/error_history.log"
}

# Diagnostic mode logging
log_diagnostic() {
    local component="$1"
    local message="$2"
    local data="${3:-}"
    
    if [[ "${DIAGNOSTIC_MODE:-false}" == "true" ]]; then
        local timestamp=$(timestamp)
        echo "[$timestamp] [DIAGNOSTIC] [$component] $message" >> "$LOG_DIR/diagnostic.log"
        
        if [[ -n "$data" ]]; then
            echo "[$timestamp] [DIAGNOSTIC] [$component] Data: $data" >> "$LOG_DIR/diagnostic.log"
        fi
        
        # Also output to console in diagnostic mode
        echo -e "${PURPLE}[DIAGNOSTIC]${NC} ${CYAN}[$component]${NC} $message"
        if [[ -n "$data" ]]; then
            echo -e "${DIM}  Data: $data${NC}"
        fi
    fi
}

# =============================================================================
# COMPREHENSIVE ERROR HANDLING SYSTEM
# =============================================================================

# Error code mapping function (compatible with older bash)
get_error_code() {
    case "$1" in
        "DOCKER_NOT_RUNNING") echo "E001" ;;
        "DOCKER_NOT_INSTALLED") echo "E002" ;;
        "PORT_CONFLICT") echo "E003" ;;
        "SERVICE_START_FAILED") echo "E004" ;;
        "SERVICE_HEALTH_FAILED") echo "E005" ;;
        "DEPENDENCY_MISSING") echo "E006" ;;
        "DISK_SPACE_LOW") echo "E007" ;;
        "NETWORK_UNREACHABLE") echo "E008" ;;
        "CONFIG_INVALID") echo "E009" ;;
        "PERMISSION_DENIED") echo "E010" ;;
        "RESOURCE_EXHAUSTED") echo "E011" ;;
        "TIMEOUT") echo "E012" ;;
        "CONTAINER_NOT_FOUND") echo "E013" ;;
        "IMAGE_PULL_FAILED") echo "E014" ;;
        "COMPOSE_FILE_INVALID") echo "E015" ;;
        "ENV_VAR_MISSING") echo "E016" ;;
        "DATABASE_CONNECTION_FAILED") echo "E017" ;;
        "SERVICE_DEPENDENCY_FAILED") echo "E018" ;;
        "HEALTH_CHECK_TIMEOUT") echo "E019" ;;
        "STARTUP_SEQUENCE_FAILED") echo "E020" ;;
        *) echo "E999" ;;
    esac
}

# Recovery strategy mapping function (compatible with older bash)
get_recovery_strategy() {
    case "$1" in
        "E001") echo "Start Docker Desktop application and wait for it to initialize" ;;
        "E002") echo "Install Docker Desktop from https://docker.com/products/docker-desktop" ;;
        "E003") echo "Stop conflicting processes or use automatic port resolution" ;;
        "E004") echo "Check service logs and dependencies, then retry startup" ;;
        "E005") echo "Restart the service or check service configuration" ;;
        "E006") echo "Install missing dependencies using package manager" ;;
        "E007") echo "Free up disk space or clean Docker images/containers" ;;
        "E008") echo "Check network connectivity and firewall settings" ;;
        "E009") echo "Validate and fix configuration files" ;;
        "E010") echo "Run with appropriate permissions or fix file ownership" ;;
        "E011") echo "Free up system resources or increase resource limits" ;;
        "E012") echo "Increase timeout values or check system performance" ;;
        "E013") echo "Rebuild Docker containers or check image availability" ;;
        "E014") echo "Check internet connection and Docker registry access" ;;
        "E015") echo "Validate docker-compose.yml syntax and structure" ;;
        "E016") echo "Set required environment variables or create .env file" ;;
        "E017") echo "Check database service status and connection parameters" ;;
        "E018") echo "Ensure all service dependencies are healthy before starting" ;;
        "E019") echo "Increase health check timeout or fix service startup issues" ;;
        "E020") echo "Review service startup order and dependency configuration" ;;
        "E999") echo "Run diagnostic mode for detailed error analysis" ;;
        *) echo "Contact support for assistance with error details" ;;
    esac
}

# Enhanced error handling with automatic recovery and detailed diagnostics
handle_error() {
    local error_type="$1"
    local error_message="$2"
    local context="${3:-}"
    local auto_recover="${4:-false}"
    
    local error_code=$(get_error_code "$error_type")
    local recovery_strategy=$(get_recovery_strategy "$error_code")
    
    # Log the error with full context
    log_error_with_recovery "$error_message" "$error_code" "$recovery_strategy" "$context"
    
    # Display detailed error information to user
    echo ""
    print_error "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    print_error "ERROR DETECTED: $error_message"
    print_error "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${RED}Error Code:${NC} $error_code"
    echo -e "${RED}Context:${NC} ${context:-'General system error'}"
    echo -e "${RED}Timestamp:${NC} $(timestamp)"
    echo ""
    
    # Show detailed recovery information
    echo -e "${CYAN}💡 RECOVERY SUGGESTION:${NC}"
    echo -e "   $recovery_strategy"
    echo ""
    
    # Show additional context-specific information
    show_error_context_info "$error_type" "$context"
    
    # Attempt automatic recovery if enabled
    if [[ "$auto_recover" == "true" ]]; then
        echo -e "${YELLOW}🔧 ATTEMPTING AUTOMATIC RECOVERY...${NC}"
        echo ""
        
        case "$error_type" in
            "DOCKER_NOT_RUNNING")
                if attempt_docker_recovery; then
                    print_success "✅ Automatic recovery successful!"
                    return 0
                fi
                ;;
            "PORT_CONFLICT")
                if attempt_port_conflict_recovery; then
                    print_success "✅ Automatic recovery successful!"
                    return 0
                fi
                ;;
            "SERVICE_START_FAILED")
                if attempt_service_recovery "$context"; then
                    print_success "✅ Automatic recovery successful!"
                    return 0
                fi
                ;;
            "DISK_SPACE_LOW")
                if attempt_disk_cleanup_recovery; then
                    print_success "✅ Automatic recovery successful!"
                    return 0
                fi
                ;;
            "NETWORK_UNREACHABLE")
                if attempt_network_recovery; then
                    print_success "✅ Automatic recovery successful!"
                    return 0
                fi
                ;;
            "CONFIG_INVALID")
                if attempt_config_recovery "$context"; then
                    print_success "✅ Automatic recovery successful!"
                    return 0
                fi
                ;;
            *)
                print_warning "❌ No automatic recovery available for error type: $error_type"
                ;;
        esac
        
        print_error "❌ Automatic recovery failed"
        echo ""
    fi
    
    # Offer manual recovery options
    offer_manual_recovery_options "$error_type" "$context"
    
    return 1
}

# Automatic Docker recovery
attempt_docker_recovery() {
    print_status "Attempting to start Docker..."
    
    # Try to start Docker Desktop on macOS
    if [[ "$(uname -s)" == "Darwin" ]]; then
        if open -a Docker 2>/dev/null; then
            print_info "Docker Desktop launch initiated"
            print_status "Waiting for Docker to start..."
            
            local timeout=60
            local elapsed=0
            
            while [[ $elapsed -lt $timeout ]]; do
                if docker info &>/dev/null; then
                    print_success "Docker started successfully"
                    log_message "RECOVERY" "Docker auto-recovery successful"
                    return 0
                fi
                
                sleep 2
                ((elapsed += 2))
                echo -n "."
            done
            
            print_error "Docker failed to start within ${timeout}s"
            return 1
        else
            print_error "Failed to launch Docker Desktop"
            return 1
        fi
    else
        print_warning "Automatic Docker recovery not supported on this platform"
        return 1
    fi
}

# Automatic port conflict recovery
attempt_port_conflict_recovery() {
    print_status "Attempting to resolve port conflicts..."
    
    local conflicts_resolved=0
    
    for port in "${REQUIRED_PORTS[@]}"; do
        local process_info=$(lsof -ti:$port 2>/dev/null)
        if [[ -n "$process_info" ]]; then
            local process_name=$(ps -p $process_info -o comm= 2>/dev/null || echo "unknown")
            
            # Only kill processes that look like they might be old DevFlow instances
            if [[ "$process_name" =~ (node|docker|devflow) ]]; then
                print_info "Killing conflicting process on port $port (PID: $process_info)"
                
                if kill "$process_info" 2>/dev/null; then
                    ((conflicts_resolved++))
                    log_message "RECOVERY" "Killed conflicting process on port $port"
                    sleep 1
                else
                    print_warning "Failed to kill process on port $port"
                fi
            else
                print_warning "Skipping non-DevFlow process on port $port: $process_name"
            fi
        fi
    done
    
    if [[ $conflicts_resolved -gt 0 ]]; then
        print_success "Resolved $conflicts_resolved port conflicts"
        return 0
    else
        print_warning "No port conflicts could be automatically resolved"
        return 1
    fi
}

# Automatic service recovery
attempt_service_recovery() {
    local service="$1"
    
    print_status "Attempting to recover service: $service"
    
    # Stop the service first
    print_info "Stopping $service..."
    docker-compose stop "$service" 2>/dev/null
    sleep 2
    
    # Remove the container to force recreation
    print_info "Removing $service container..."
    docker-compose rm -f "$service" 2>/dev/null
    
    # Restart the service
    print_info "Starting $service..."
    if docker-compose up -d "$service" 2>/dev/null; then
        print_info "Waiting for $service to become healthy..."
        
        if wait_for_service_health "$service" 60; then
            print_success "Service $service recovered successfully"
            log_message "RECOVERY" "Service auto-recovery successful for $service"
            return 0
        else
            print_error "Service $service failed to recover"
            return 1
        fi
    else
        print_error "Failed to restart service $service"
        return 1
    fi
}

# Automatic disk cleanup recovery
attempt_disk_cleanup_recovery() {
    print_status "Attempting to free up disk space..."
    
    local space_freed=false
    local initial_usage=$(df . | tail -1 | awk '{print $5}' | sed 's/%//')
    
    # Clean Docker resources
    print_info "Cleaning unused Docker resources..."
    if docker system prune -f 2>/dev/null; then
        space_freed=true
        print_success "Cleaned unused Docker resources"
    fi
    
    # Clean old log files
    print_info "Cleaning old log files..."
    find "$LOG_DIR" -name "*.log" -mtime +7 -delete 2>/dev/null && space_freed=true
    
    # Clean temporary files
    print_info "Cleaning temporary files..."
    find /tmp -name "devflow-*" -mtime +1 -delete 2>/dev/null && space_freed=true
    
    # Clean Docker build cache
    print_info "Cleaning Docker build cache..."
    if docker builder prune -f 2>/dev/null; then
        space_freed=true
        print_success "Cleaned Docker build cache"
    fi
    
    local final_usage=$(df . | tail -1 | awk '{print $5}' | sed 's/%//')
    local space_recovered=$((initial_usage - final_usage))
    
    if [[ "$space_freed" == "true" ]]; then
        print_success "Disk cleanup completed - recovered ${space_recovered}% disk space"
        log_message "RECOVERY" "Automatic disk cleanup successful - recovered ${space_recovered}%"
        return 0
    else
        print_warning "Unable to free significant disk space automatically"
        return 1
    fi
}

# Automatic network recovery
attempt_network_recovery() {
    print_status "Attempting to recover network connectivity..."
    
    # Test different connectivity methods
    local recovery_successful=false
    
    # Try DNS resolution
    print_info "Testing DNS resolution..."
    if nslookup google.com >/dev/null 2>&1; then
        print_success "DNS resolution working"
        recovery_successful=true
    fi
    
    # Try different connectivity endpoints
    local test_endpoints=("google.com:80" "github.com:443" "docker.io:443")
    
    for endpoint in "${test_endpoints[@]}"; do
        local host=$(echo "$endpoint" | cut -d':' -f1)
        local port=$(echo "$endpoint" | cut -d':' -f2)
        
        print_info "Testing connectivity to $host:$port..."
        if timeout 5 bash -c "</dev/tcp/$host/$port" 2>/dev/null; then
            print_success "Connection to $host:$port successful"
            recovery_successful=true
            break
        fi
    done
    
    if [[ "$recovery_successful" == "true" ]]; then
        print_success "Network connectivity recovered"
        log_message "RECOVERY" "Network connectivity recovery successful"
        return 0
    else
        print_warning "Network connectivity could not be automatically recovered"
        return 1
    fi
}

# Automatic configuration recovery
attempt_config_recovery() {
    local context="$1"
    print_status "Attempting to recover configuration for: $context"
    
    case "$context" in
        "docker-compose")
            if [[ -f "docker-compose.yml.backup" ]]; then
                print_info "Restoring docker-compose.yml from backup..."
                cp "docker-compose.yml.backup" "docker-compose.yml"
                print_success "Configuration restored from backup"
                return 0
            fi
            ;;
        "env")
            if [[ -f ".env.example" ]] && [[ ! -f ".env" ]]; then
                print_info "Creating .env from .env.example..."
                cp ".env.example" ".env"
                print_success "Environment configuration created"
                return 0
            fi
            ;;
    esac
    
    print_warning "No automatic configuration recovery available for: $context"
    return 1
}

# Show detailed error context information
show_error_context_info() {
    local error_type="$1"
    local context="$2"
    
    echo -e "${CYAN}📋 ADDITIONAL INFORMATION:${NC}"
    
    case "$error_type" in
        "DOCKER_NOT_RUNNING")
            echo "   • Docker Desktop may not be started"
            echo "   • Check if Docker Desktop is installed and running"
            echo "   • On macOS: Look for Docker whale icon in menu bar"
            echo "   • On Linux: Check 'systemctl status docker'"
            ;;
        "PORT_CONFLICT")
            echo "   • Another application is using required ports"
            echo "   • Common conflicting applications: other web servers, databases"
            echo "   • Use 'lsof -i :PORT' to identify conflicting processes"
            if [[ -n "$context" ]]; then
                echo "   • Affected service: $context"
            fi
            ;;
        "SERVICE_START_FAILED")
            echo "   • Service dependencies may not be ready"
            echo "   • Check service logs for detailed error information"
            echo "   • Verify Docker container resources are sufficient"
            if [[ -n "$context" ]]; then
                echo "   • Failed service: $context"
                echo "   • Log location: $LOG_DIR/${context}.log"
            fi
            ;;
        "DISK_SPACE_LOW")
            local current_usage=$(df . | tail -1 | awk '{print $5}')
            echo "   • Current disk usage: $current_usage"
            echo "   • Docker images and containers consume significant space"
            echo "   • Consider cleaning unused Docker resources"
            echo "   • Minimum recommended free space: 5GB"
            ;;
        "NETWORK_UNREACHABLE")
            echo "   • Internet connectivity is required for Docker image downloads"
            echo "   • Check firewall and proxy settings"
            echo "   • Verify DNS resolution is working"
            echo "   • Corporate networks may block Docker registry access"
            ;;
        "CONFIG_INVALID")
            echo "   • Configuration files may be corrupted or missing"
            echo "   • Check docker-compose.yml syntax"
            echo "   • Verify environment variables are set correctly"
            if [[ -n "$context" ]]; then
                echo "   • Problematic configuration: $context"
            fi
            ;;
        *)
            echo "   • Check system logs for additional details"
            echo "   • Ensure all system requirements are met"
            echo "   • Consider running in diagnostic mode for verbose output"
            ;;
    esac
    echo ""
}

# Offer manual recovery options to the user
offer_manual_recovery_options() {
    local error_type="$1"
    local context="$2"
    
    echo -e "${YELLOW}🛠️  MANUAL RECOVERY OPTIONS:${NC}"
    echo ""
    
    case "$error_type" in
        "DOCKER_NOT_RUNNING")
            echo "1. Start Docker Desktop manually"
            echo "2. Restart Docker service: 'sudo systemctl restart docker' (Linux)"
            echo "3. Reinstall Docker Desktop if corrupted"
            ;;
        "PORT_CONFLICT")
            echo "1. Stop conflicting applications manually"
            echo "2. Change DevFlow service ports in docker-compose.yml"
            echo "3. Use 'sudo lsof -i :PORT' to identify and kill processes"
            ;;
        "SERVICE_START_FAILED")
            echo "1. Check service logs: 'docker-compose logs $context'"
            echo "2. Restart individual service: 'docker-compose restart $context'"
            echo "3. Rebuild service: 'docker-compose build $context'"
            ;;
        "DISK_SPACE_LOW")
            echo "1. Free up disk space manually"
            echo "2. Clean Docker: 'docker system prune -a'"
            echo "3. Remove unused files and applications"
            ;;
        "NETWORK_UNREACHABLE")
            echo "1. Check internet connection"
            echo "2. Configure proxy settings if behind corporate firewall"
            echo "3. Try using mobile hotspot temporarily"
            ;;
        *)
            echo "1. Run with diagnostic mode: '$0 start --diagnostic'"
            echo "2. Check system logs and error reports"
            echo "3. Contact support with error details"
            ;;
    esac
    
    echo ""
    echo -n -e "${CYAN}Would you like to try a manual recovery option? [y/N]: ${NC}"
    read -r manual_recovery
    
    if [[ "$manual_recovery" =~ ^[Yy] ]]; then
        echo -n -e "${CYAN}Enter option number (or 'skip' to continue): ${NC}"
        read -r option_choice
        
        if [[ "$option_choice" != "skip" ]]; then
            print_info "Please follow the manual recovery steps above and then retry the operation"
            echo ""
            echo -n -e "${CYAN}Press Enter when ready to continue...${NC}"
            read -r
        fi
    fi
}

# Enhanced diagnostic mode with comprehensive system analysis
run_comprehensive_diagnostics() {
    print_header "🔬 Comprehensive System Diagnostics"
    
    local diagnostic_report="$LOG_DIR/diagnostic-report-$(date +%Y%m%d-%H%M%S).txt"
    
    {
        echo "DevFlow Intelligence Platform - Comprehensive Diagnostic Report"
        echo "=============================================================="
        echo "Generated: $(date)"
        echo "Script Version: $SCRIPT_VERSION"
        echo "Diagnostic Mode: ${DIAGNOSTIC_MODE:-false}"
        echo ""
        
        echo "SYSTEM INFORMATION"
        echo "=================="
        echo "Operating System: $(uname -a)"
        echo "Shell: $SHELL"
        echo "User: $(whoami)"
        echo "Working Directory: $(pwd)"
        echo "Script Location: $SCRIPT_DIR"
        echo ""
        
        echo "RESOURCE USAGE"
        echo "=============="
        echo "Disk Usage:"
        df -h .
        echo ""
        echo "Memory Usage:"
        if command -v free >/dev/null 2>&1; then
            free -h
        else
            vm_stat 2>/dev/null | head -10
        fi
        echo ""
        echo "CPU Information:"
        if command -v lscpu >/dev/null 2>&1; then
            lscpu | head -10
        else
            sysctl -n machdep.cpu.brand_string 2>/dev/null || echo "CPU info not available"
        fi
        echo ""
        
        echo "DOCKER ENVIRONMENT"
        echo "=================="
        echo "Docker Version:"
        docker --version 2>/dev/null || echo "Docker not available"
        echo ""
        echo "Docker Info:"
        docker info 2>/dev/null || echo "Docker daemon not running"
        echo ""
        echo "Docker Compose Version:"
        docker-compose --version 2>/dev/null || echo "Docker Compose not available"
        echo ""
        echo "Running Containers:"
        docker ps -a 2>/dev/null || echo "Cannot access Docker containers"
        echo ""
        echo "Docker Images:"
        docker images 2>/dev/null | head -10 || echo "Cannot access Docker images"
        echo ""
        
        echo "NETWORK DIAGNOSTICS"
        echo "==================="
        echo "Network Interfaces:"
        if command -v ip >/dev/null 2>&1; then
            ip addr show | grep -E "^[0-9]+:|inet "
        else
            ifconfig 2>/dev/null | grep -E "^[a-z]|inet " | head -20
        fi
        echo ""
        echo "DNS Resolution Test:"
        nslookup google.com 2>/dev/null || echo "DNS resolution failed"
        echo ""
        echo "Connectivity Tests:"
        for endpoint in "google.com:80" "github.com:443" "docker.io:443"; do
            local host=$(echo "$endpoint" | cut -d':' -f1)
            local port=$(echo "$endpoint" | cut -d':' -f2)
            if timeout 5 bash -c "</dev/tcp/$host/$port" 2>/dev/null; then
                echo "$endpoint: CONNECTED"
            else
                echo "$endpoint: FAILED"
            fi
        done
        echo ""
        
        echo "PORT ANALYSIS"
        echo "============="
        echo "Required Ports Status:"
        for port in "${REQUIRED_PORTS[@]}"; do
            local process_info=$(lsof -ti:$port 2>/dev/null)
            if [[ -n "$process_info" ]]; then
                local process_name=$(ps -p $process_info -o comm= 2>/dev/null || echo "unknown")
                echo "Port $port: OCCUPIED by $process_name (PID: $process_info)"
            else
                echo "Port $port: AVAILABLE"
            fi
        done
        echo ""
        
        echo "SERVICE STATUS ANALYSIS"
        echo "======================="
        for service in $INFRASTRUCTURE_SERVICES $APPLICATION_SERVICES $FRONTEND_SERVICES; do
            local status=$(get_service_status "$service")
            local port=$(get_service_port "$service")
            local health_cmd=$(get_health_check_command "$service")
            
            echo "Service: $service"
            echo "  Status: $status"
            echo "  Port: $port"
            echo "  Health Check: $health_cmd"
            
            # Test health check
            if [[ -n "$health_cmd" ]]; then
                if eval "$health_cmd" &>/dev/null; then
                    echo "  Health Test: PASSED"
                else
                    echo "  Health Test: FAILED"
                fi
            fi
            echo ""
        done
        
        echo "LOG FILE ANALYSIS"
        echo "================="
        echo "Recent Error Entries:"
        if [[ -f "$LOG_DIR/error_history.log" ]]; then
            tail -10 "$LOG_DIR/error_history.log"
        else
            echo "No error history found"
        fi
        echo ""
        
        echo "Recent Script Log Entries:"
        if [[ -f "$SCRIPT_LOG" ]]; then
            tail -20 "$SCRIPT_LOG"
        else
            echo "No script log found"
        fi
        echo ""
        
        echo "CONFIGURATION VALIDATION"
        echo "========================"
        echo "Docker Compose File:"
        if [[ -f "docker-compose.yml" ]]; then
            echo "  Status: EXISTS"
            echo "  Size: $(stat -f%z docker-compose.yml 2>/dev/null || stat -c%s docker-compose.yml 2>/dev/null) bytes"
            echo "  Syntax Check:"
            if docker-compose config >/dev/null 2>&1; then
                echo "    VALID"
            else
                echo "    INVALID"
            fi
        else
            echo "  Status: MISSING"
        fi
        echo ""
        
        echo "Environment File:"
        if [[ -f ".env" ]]; then
            echo "  Status: EXISTS"
            echo "  Variables: $(grep -c "=" .env 2>/dev/null || echo "0")"
        else
            echo "  Status: MISSING"
        fi
        echo ""
        
        echo "RECOMMENDATIONS"
        echo "==============="
        
        # Analyze and provide recommendations
        local recommendations=()
        
        # Check disk space
        local disk_usage=$(df . | tail -1 | awk '{print $5}' | sed 's/%//')
        if [[ $disk_usage -gt 85 ]]; then
            recommendations+=("Free up disk space - current usage: ${disk_usage}%")
        fi
        
        # Check Docker
        if ! docker info &>/dev/null; then
            recommendations+=("Start Docker Desktop or Docker daemon")
        fi
        
        # Check ports
        local occupied_count=0
        for port in "${REQUIRED_PORTS[@]}"; do
            if lsof -ti:$port &>/dev/null; then
                ((occupied_count++))
            fi
        done
        if [[ $occupied_count -gt 0 ]]; then
            recommendations+=("Resolve $occupied_count port conflicts")
        fi
        
        # Check network
        if ! timeout 5 bash -c "</dev/tcp/google.com/80" 2>/dev/null; then
            recommendations+=("Check network connectivity and DNS resolution")
        fi
        
        if [[ ${#recommendations[@]} -eq 0 ]]; then
            echo "✅ No critical issues detected"
        else
            for i in "${!recommendations[@]}"; do
                echo "$((i+1)). ${recommendations[$i]}"
            done
        fi
        
    } | tee "$diagnostic_report"
    
    echo ""
    print_success "Comprehensive diagnostic report saved to: $diagnostic_report"
    
    # Offer to view the report
    echo ""
    echo -n -e "${CYAN}Would you like to view the full diagnostic report? [y/N]: ${NC}"
    read -r view_report
    
    if [[ "$view_report" =~ ^[Yy] ]]; then
        less "$diagnostic_report"
    fi
    
    return 0
}

# Enhanced service startup with error handling
start_service_with_error_handling() {
    local service="$1"
    local max_retries="${2:-3}"
    local retry_delay="${3:-5}"
    
    log_diagnostic "SERVICE_START" "Starting service $service with error handling" "max_retries=$max_retries, retry_delay=$retry_delay"
    
    for ((attempt=1; attempt<=max_retries; attempt++)); do
        print_status "Starting $service (attempt $attempt/$max_retries)..."
        
        # Check dependencies first
        local dependencies=$(get_service_dependencies "$service")
        if [[ -n "$dependencies" ]]; then
            for dep in $dependencies; do
                if ! check_service_health "$dep"; then
                    handle_error "SERVICE_START_FAILED" "Dependency $dep is not healthy for service $service" "$service" true
                    
                    # Try to start the dependency
                    if ! start_service_with_error_handling "$dep" 2 3; then
                        return 1
                    fi
                fi
            done
        fi
        
        # Start the service
        if docker-compose up -d "$service" 2>/dev/null; then
            set_service_start_time "$service" "$(date +%s)"
            
            # Wait for health check
            if wait_for_service_health "$service" 90; then
                print_success "Service $service started successfully"
                log_message "SUCCESS" "Service $service started on attempt $attempt"
                return 0
            else
                handle_error "SERVICE_HEALTH_FAILED" "Service $service failed health check on attempt $attempt" "$service" false
                
                if [[ $attempt -lt $max_retries ]]; then
                    print_info "Retrying in ${retry_delay}s..."
                    sleep $retry_delay
                fi
            fi
        else
            handle_error "SERVICE_START_FAILED" "Failed to start service $service on attempt $attempt" "$service" false
            
            if [[ $attempt -lt $max_retries ]]; then
                print_info "Retrying in ${retry_delay}s..."
                sleep $retry_delay
            fi
        fi
    done
    
    # All attempts failed
    handle_error "SERVICE_START_FAILED" "Service $service failed to start after $max_retries attempts" "$service" true
    return 1
}

# Enhanced environment validation with error handling
validate_environment_with_error_handling() {
    print_header "🔍 Environment Validation with Error Handling"
    
    local validation_errors=0
    
    # Check OS compatibility
    print_status "Checking operating system compatibility..."
    if ! check_os_compatibility; then
        handle_error "DEPENDENCY_MISSING" "Unsupported operating system detected" "OS_CHECK" false
        ((validation_errors++))
    fi
    
    # Check Docker installation
    print_status "Checking Docker installation..."
    if ! command -v docker &>/dev/null; then
        handle_error "DOCKER_NOT_INSTALLED" "Docker is not installed" "DOCKER_CHECK" false
        ((validation_errors++))
    elif ! docker info &>/dev/null; then
        handle_error "DOCKER_NOT_RUNNING" "Docker daemon is not running" "DOCKER_CHECK" true
        
        # If auto-recovery failed, count as error
        if ! docker info &>/dev/null; then
            ((validation_errors++))
        fi
    fi
    
    # Check disk space
    print_status "Checking disk space..."
    local disk_usage=$(df . | tail -1 | awk '{print $5}' | sed 's/%//')
    if [[ $disk_usage -gt 90 ]]; then
        handle_error "DISK_SPACE_LOW" "Disk space is critically low: ${disk_usage}% used" "DISK_CHECK" true
        
        # Check if recovery was successful
        local new_disk_usage=$(df . | tail -1 | awk '{print $5}' | sed 's/%//')
        if [[ $new_disk_usage -gt 85 ]]; then
            ((validation_errors++))
        fi
    fi
    
    # Check port availability
    print_status "Checking port availability..."
    local occupied_ports=()
    for port in "${REQUIRED_PORTS[@]}"; do
        if lsof -ti:$port &>/dev/null; then
            occupied_ports+=("$port")
        fi
    done
    
    if [[ ${#occupied_ports[@]} -gt 0 ]]; then
        handle_error "PORT_CONFLICT" "Port conflicts detected on ports: ${occupied_ports[*]}" "PORT_CHECK" true
        
        # Recheck ports after recovery attempt
        local remaining_conflicts=()
        for port in "${occupied_ports[@]}"; do
            if lsof -ti:$port &>/dev/null; then
                remaining_conflicts+=("$port")
            fi
        done
        
        if [[ ${#remaining_conflicts[@]} -gt 0 ]]; then
            ((validation_errors++))
        fi
    fi
    
    # Check network connectivity
    print_status "Checking network connectivity..."
    if ! timeout 5 bash -c "</dev/tcp/google.com/80" 2>/dev/null; then
        handle_error "NETWORK_UNREACHABLE" "Network connectivity test failed" "NETWORK_CHECK" false
        ((validation_errors++))
    fi
    
    # Summary
    if [[ $validation_errors -eq 0 ]]; then
        print_success "Environment validation completed successfully"
        log_message "SUCCESS" "Environment validation passed with error handling"
        return 0
    else
        print_error "Environment validation failed with $validation_errors errors"
        print_info "Please resolve the errors above before continuing"
        log_message "ERROR" "Environment validation failed with $validation_errors errors"
        return 1
    fi
}

# =============================================================================
# COLORED OUTPUT FUNCTIONS
# =============================================================================

# Print colored header with enhanced formatting
print_header() {
    local title="$1"
    local width=80
    local padding=$(( (width - ${#title} - 4) / 2 ))
    
    echo ""
    echo -e "${CYAN}$(printf '═%.0s' $(seq 1 $width))${NC}"
    echo -e "${CYAN}$(printf '═%.0s' $(seq 1 $padding)) ${WHITE}${BOLD}$title${NC}${CYAN} $(printf '═%.0s' $(seq 1 $padding))${NC}"
    echo -e "${CYAN}$(printf '═%.0s' $(seq 1 $width))${NC}"
    echo ""
    
    log_message "INFO" "Header: $title"
}

# Print status message with timestamp
print_status() {
    local message="$1"
    local timestamp=$(date '+%H:%M:%S')
    echo -e "${BLUE}[${timestamp}]${NC} ${WHITE}$message${NC}"
    log_message "INFO" "$message"
}

# Print success message
print_success() {
    local message="$1"
    echo -e "${GREEN}[SUCCESS]${NC} $message"
    log_message "SUCCESS" "$message"
}

# Print warning message
print_warning() {
    local message="$1"
    echo -e "${YELLOW}[WARNING]${NC} $message"
    log_message "WARNING" "$message"
}

# Print error message
print_error() {
    local message="$1"
    echo -e "${RED}[ERROR]${NC} $message" >&2
    log_message "ERROR" "$message"
}

# Print info message
print_info() {
    local message="$1"
    echo -e "${CYAN}[INFO]${NC} $message"
    log_message "INFO" "$message"
}

# =============================================================================
# PROGRESS INDICATOR FUNCTIONS
# =============================================================================

# Show spinner with message
show_spinner() {
    local message="$1"
    local duration="${2:-5}"
    local pid="$3"
    
    local i=0
    local spin_chars="⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏"
    
    echo -n -e "${BLUE}$message${NC} "
    
    while [[ $i -lt $duration ]]; do
        for (( j=0; j<${#spin_chars}; j++ )); do
            echo -n -e "\r${BLUE}$message${NC} ${YELLOW}${spin_chars:$j:1}${NC}"
            sleep 0.1
            
            # Check if process is still running (if PID provided)
            if [[ -n "$pid" ]] && ! kill -0 "$pid" 2>/dev/null; then
                break 2
            fi
        done
        ((i++))
    done
    
    echo -e "\r${BLUE}$message${NC} ${GREEN}✓${NC}"
}

# Show progress bar
show_progress_bar() {
    local current="$1"
    local total="$2"
    local message="$3"
    
    local percentage=$((current * 100 / total))
    local filled=$((current * PROGRESS_BAR_WIDTH / total))
    local empty=$((PROGRESS_BAR_WIDTH - filled))
    
    printf "\r${BLUE}$message${NC} ["
    printf "${GREEN}%*s" $filled | tr ' ' '█'
    printf "${DIM}%*s" $empty | tr ' ' '░'
    printf "${NC}] %d%%" $percentage
    
    if [[ $current -eq $total ]]; then
        echo ""
    fi
}

# =============================================================================
# ENVIRONMENT VALIDATION FUNCTIONS
# =============================================================================

# Check if running on supported OS
check_os_compatibility() {
    print_status "Checking operating system compatibility..."
    
    local os_type=$(uname -s)
    case "$os_type" in
        Darwin*)
            print_success "macOS detected - fully supported"
            log_message "INFO" "OS: macOS (Darwin)"
            ;;
        Linux*)
            print_success "Linux detected - fully supported"
            log_message "INFO" "OS: Linux"
            ;;
        CYGWIN*|MINGW*|MSYS*)
            print_warning "Windows detected - limited support"
            log_message "WARNING" "OS: Windows (limited support)"
            ;;
        *)
            print_error "Unsupported operating system: $os_type"
            log_message "ERROR" "Unsupported OS: $os_type"
            return 1
            ;;
    esac
}

# Validate required commands are available
check_required_commands() {
    print_status "Validating required system commands..."
    
    local missing_commands=()
    local total_commands=${#REQUIRED_COMMANDS[@]}
    local current=0
    
    for cmd in "${REQUIRED_COMMANDS[@]}"; do
        ((current++))
        show_progress_bar $current $total_commands "Checking commands"
        
        if ! command -v "$cmd" &> /dev/null; then
            missing_commands+=("$cmd")
            log_message "ERROR" "Missing command: $cmd"
        else
            log_message "INFO" "Command available: $cmd"
        fi
        sleep 0.1
    done
    
    if [[ ${#missing_commands[@]} -gt 0 ]]; then
        print_error "Missing required commands: ${missing_commands[*]}"
        print_info "Please install the missing commands and try again"
        return 1
    fi
    
    print_success "All required commands are available"
}

# Check Docker installation and status
check_docker_environment() {
    print_status "Validating Docker environment..."
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed"
        print_info "Please install Docker Desktop and try again"
        return 1
    fi
    
    # Check if Docker daemon is running
    if ! docker info &> /dev/null; then
        print_error "Docker daemon is not running"
        print_info "Please start Docker Desktop and try again"
        return 1
    fi
    
    # Check Docker Compose
    if ! docker-compose --version &> /dev/null; then
        print_error "Docker Compose is not available"
        print_info "Please install Docker Compose and try again"
        return 1
    fi
    
    # Get Docker version info
    local docker_version=$(docker --version | cut -d' ' -f3 | cut -d',' -f1)
    local compose_version=$(docker-compose --version | cut -d' ' -f3 | cut -d',' -f1)
    
    print_success "Docker environment validated"
    print_info "Docker version: $docker_version"
    print_info "Docker Compose version: $compose_version"
    
    log_message "INFO" "Docker version: $docker_version"
    log_message "INFO" "Docker Compose version: $compose_version"
}

# Check port availability
check_port_availability() {
    print_status "Checking port availability..."
    
    local occupied_ports=()
    local total_ports=${#REQUIRED_PORTS[@]}
    local current=0
    
    for port in "${REQUIRED_PORTS[@]}"; do
        ((current++))
        show_progress_bar $current $total_ports "Checking ports"
        
        if lsof -ti:$port &> /dev/null; then
            occupied_ports+=("$port")
            log_message "WARNING" "Port $port is occupied"
        else
            log_message "INFO" "Port $port is available"
        fi
        sleep 0.1
    done
    
    if [[ ${#occupied_ports[@]} -gt 0 ]]; then
        print_warning "Some ports are occupied: ${occupied_ports[*]}"
        print_info "These ports will be cleared during startup"
        log_message "WARNING" "Occupied ports: ${occupied_ports[*]}"
    else
        print_success "All required ports are available"
    fi
}

# Validate project structure
check_project_structure() {
    print_status "Validating project structure..."
    
    # Change to project directory
    cd "$PROJECT_ROOT"
    
    # Check essential files
    local required_files=("docker-compose.yml" "package.json")
    local required_dirs=("services" "apps" "logs")
    
    for file in "${required_files[@]}"; do
        if [[ ! -f "$file" ]]; then
            print_error "Required file not found: $file"
            print_info "Please run this script from the DevFlow project root directory"
            return 1
        fi
    done
    
    # Create required directories if they don't exist
    for dir in "${required_dirs[@]}"; do
        if [[ ! -d "$dir" ]]; then
            mkdir -p "$dir"
            print_info "Created directory: $dir"
        fi
    done
    
    print_success "Project structure validated"
    log_message "INFO" "Project structure validation completed"
}

# =============================================================================
# MAIN ENVIRONMENT CHECK FUNCTION
# =============================================================================

# Comprehensive environment validation (legacy function - kept for compatibility)
validate_environment() {
    # Use the enhanced validation function
    validate_environment_with_error_handling
}

# =============================================================================
# SERVICE MANAGEMENT FUNCTIONS
# =============================================================================

# Get all services in dependency order
get_service_startup_order() {
    local ordered_services=()
    local processed_services=()
    
    # Add infrastructure services first
    for service in $INFRASTRUCTURE_SERVICES; do
        ordered_services+=("$service")
        processed_services+=("$service")
    done
    
    # Add application services with dependency resolution
    local remaining_services=()
    for service in $APPLICATION_SERVICES; do
        remaining_services+=("$service")
    done
    
    # Resolve dependencies
    while [[ ${#remaining_services[@]} -gt 0 ]]; do
        local added_this_round=()
        
        for service in "${remaining_services[@]}"; do
            local dependencies=$(get_service_dependencies "$service")
            local can_start=true
            
            # Check if all dependencies are already processed
            if [[ -n "$dependencies" ]]; then
                for dep in $dependencies; do
                    if [[ ! " ${processed_services[*]} " =~ " $dep " ]]; then
                        can_start=false
                        break
                    fi
                done
            fi
            
            if [[ "$can_start" == "true" ]]; then
                ordered_services+=("$service")
                processed_services+=("$service")
                added_this_round+=("$service")
            fi
        done
        
        # Remove processed services from remaining
        for service in "${added_this_round[@]}"; do
            remaining_services=("${remaining_services[@]/$service}")
        done
        
        # Prevent infinite loop
        if [[ ${#added_this_round[@]} -eq 0 ]] && [[ ${#remaining_services[@]} -gt 0 ]]; then
            print_error "Circular dependency detected in services: ${remaining_services[*]}"
            return 1
        fi
    done
    
    # Add frontend services last
    for service in $FRONTEND_SERVICES; do
        ordered_services+=("$service")
    done
    
    echo "${ordered_services[@]}"
}

# Check if Docker container is running
is_container_running() {
    local service="$1"
    local container_name="devflow-${service}-1"
    
    if docker ps --format "table {{.Names}}" | grep -q "$container_name\|$service"; then
        return 0
    else
        return 1
    fi
}

# Check if a service is healthy (enhanced version)
check_service_health() {
    local service="$1"
    
    # Use detailed health check if diagnostic mode is enabled
    if [[ "${DIAGNOSTIC_MODE:-false}" == "true" ]]; then
        check_service_health_detailed "$service"
        return $?
    fi
    
    # Standard health check
    local health_command=$(get_health_check_command "$service")
    
    if [[ -z "$health_command" ]]; then
        log_message "WARNING" "No health check defined for service: $service"
        return 1
    fi
    
    # First check if container is running
    if ! is_container_running "$service"; then
        set_service_status "$service" "stopped"
        log_message "WARNING" "Service $service container is not running"
        return 1
    fi
    
    # Execute health check command
    if eval "$health_command" &>/dev/null; then
        set_service_status "$service" "healthy"
        log_message "INFO" "Service $service is healthy"
        return 0
    else
        set_service_status "$service" "unhealthy"
        log_message "WARNING" "Service $service health check failed"
        return 1
    fi
}

# Wait for service to become healthy
wait_for_service_health() {
    local service="$1"
    local timeout="${2:-$HEALTH_CHECK_TIMEOUT}"
    local start_time=$(date +%s)
    
    print_status "Waiting for $service to become healthy..."
    
    while true; do
        local current_time=$(date +%s)
        local elapsed=$((current_time - start_time))
        
        if [[ $elapsed -gt $timeout ]]; then
            print_error "Service $service failed to become healthy within ${timeout}s"
            SERVICE_STATUS["$service"]="timeout"
            return 1
        fi
        
        if check_service_health "$service"; then
            local health_time=$((current_time - start_time))
            print_success "Service $service is healthy (${health_time}s)"
            return 0
        fi
        
        # Show progress
        local remaining=$((timeout - elapsed))
        echo -n -e "\r${BLUE}Waiting for $service${NC} (${remaining}s remaining) ${YELLOW}⏳${NC}"
        
        sleep $HEALTH_CHECK_INTERVAL
    done
}

# Start infrastructure services with enhanced error handling
start_infrastructure_services() {
    print_status "Starting infrastructure services with error handling..."
    
    # Convert to array
    local infra_services=($INFRASTRUCTURE_SERVICES)
    local failed_services=()
    
    log_diagnostic "INFRASTRUCTURE" "Starting infrastructure services" "services=${infra_services[*]}"
    
    # Start each infrastructure service individually with error handling
    local total_services=${#infra_services[@]}
    local current_service=0
    
    for service in "${infra_services[@]}"; do
        ((current_service++))
        echo ""
        print_info "[$current_service/$total_services] Starting $service..."
        
        if start_service_with_error_handling "$service" 3 5; then
            print_success "✓ $service is ready"
            log_diagnostic "INFRASTRUCTURE" "Service $service started successfully"
        else
            print_error "✗ $service failed to start"
            failed_services+=("$service")
            
            # Ask user if they want to continue with remaining services
            echo ""
            echo -n -e "${CYAN}Continue starting remaining services? [Y/n]: ${NC}"
            read -r continue_startup
            
            if [[ "$continue_startup" =~ ^[Nn] ]]; then
                print_warning "Infrastructure startup cancelled by user"
                return 1
            fi
        fi
    done
    
    if [[ ${#failed_services[@]} -eq 0 ]]; then
        print_success "All infrastructure services are healthy"
        log_message "SUCCESS" "Infrastructure services startup completed successfully"
        return 0
    else
        print_error "Some infrastructure services failed to start: ${failed_services[*]}"
        print_info "You can try to start failed services individually using the management interface"
        
        # Generate error report for failed services
        echo ""
        echo -n -e "${CYAN}Generate error report for failed services? [y/N]: ${NC}"
        read -r generate_report
        
        if [[ "$generate_report" =~ ^[Yy] ]]; then
            generate_error_report
        fi
        
        return 1
    fi
}

# Start application services with enhanced error handling
start_application_services() {
    print_status "Starting application services with error handling..."
    
    # Convert to array
    local app_services=($APPLICATION_SERVICES)
    local failed_services=()
    
    log_diagnostic "APPLICATION" "Starting application services" "services=${app_services[*]}"
    
    # Start each application service individually with error handling
    local total_services=${#app_services[@]}
    local current_service=0
    
    for service in "${app_services[@]}"; do
        ((current_service++))
        echo ""
        print_info "[$current_service/$total_services] Starting $service..."
        
        if start_service_with_error_handling "$service" 3 5; then
            print_success "✓ $service is ready"
            log_diagnostic "APPLICATION" "Service $service started successfully"
        else
            print_error "✗ $service failed to start"
            failed_services+=("$service")
            
            # Ask user if they want to continue with remaining services
            echo ""
            echo -n -e "${CYAN}Continue starting remaining services? [Y/n]: ${NC}"
            read -r continue_startup
            
            if [[ "$continue_startup" =~ ^[Nn] ]]; then
                print_warning "Application startup cancelled by user"
                return 1
            fi
        fi
    done
    
    if [[ ${#failed_services[@]} -eq 0 ]]; then
        print_success "All application services are healthy"
        log_message "SUCCESS" "Application services startup completed successfully"
        return 0
    else
        print_error "Some application services failed to start: ${failed_services[*]}"
        print_info "You can try to start failed services individually using the management interface"
        
        # Generate error report for failed services
        echo ""
        echo -n -e "${CYAN}Generate error report for failed services? [y/N]: ${NC}"
        read -r generate_report
        
        if [[ "$generate_report" =~ ^[Yy] ]]; then
            generate_error_report
        fi
        
        return 1
    fi
}

# Start frontend services with enhanced error handling
start_frontend_services() {
    print_status "Starting frontend services with error handling..."
    
    # Convert to array
    local frontend_services=($FRONTEND_SERVICES)
    local failed_services=()
    
    log_diagnostic "FRONTEND" "Starting frontend services" "services=${frontend_services[*]}"
    
    # Start each frontend service individually with error handling
    local total_services=${#frontend_services[@]}
    local current_service=0
    
    for service in "${frontend_services[@]}"; do
        ((current_service++))
        echo ""
        print_info "[$current_service/$total_services] Starting $service..."
        
        if start_service_with_error_handling "$service" 3 5; then
            print_success "✓ $service is ready"
            log_diagnostic "FRONTEND" "Service $service started successfully"
        else
            print_error "✗ $service failed to start"
            failed_services+=("$service")
            
            # Ask user if they want to continue with remaining services
            echo ""
            echo -n -e "${CYAN}Continue starting remaining services? [Y/n]: ${NC}"
            read -r continue_startup
            
            if [[ "$continue_startup" =~ ^[Nn] ]]; then
                print_warning "Frontend startup cancelled by user"
                return 1
            fi
        fi
    done
    
    if [[ ${#failed_services[@]} -eq 0 ]]; then
        print_success "All frontend services are healthy"
        log_message "SUCCESS" "Frontend services startup completed successfully"
        return 0
    else
        print_error "Some frontend services failed to start: ${failed_services[*]}"
        print_info "You can try to start failed services individually using the management interface"
        
        # Generate error report for failed services
        echo ""
        echo -n -e "${CYAN}Generate error report for failed services? [y/N]: ${NC}"
        read -r generate_report
        
        if [[ "$generate_report" =~ ^[Yy] ]]; then
            generate_error_report
        fi
        
        return 1
    fi
}

# Orchestrate complete service startup
start_all_services() {
    print_header "🚀 Starting DevFlow Services"
    
    local start_time=$(date +%s)
    
    # Start services in order: infrastructure -> application -> frontend
    if start_infrastructure_services && start_application_services && start_frontend_services; then
        local end_time=$(date +%s)
        local total_time=$((end_time - start_time))
        
        echo ""
        print_success "🎉 All DevFlow services started successfully!"
        print_info "Total startup time: ${total_time}s"
        
        # Show service summary
        show_service_summary
        
        echo ""
        print_info "Starting real-time dashboard in 3 seconds..."
        print_info "Press Ctrl+C to exit dashboard and return to terminal"
        sleep 3
        
        # Launch real-time dashboard
        show_realtime_dashboard
        return 0
    else
        print_error "Failed to start all services"
        print_info "Run '$0 status' to check service health"
        return 1
    fi
}

# Stop all services
stop_all_services() {
    print_header "🛑 Stopping DevFlow Services"
    
    print_status "Stopping all Docker Compose services..."
    
    if docker-compose down --remove-orphans 2>/dev/null; then
        print_success "All services stopped successfully"
        
        # Clear service status
        rm -rf "$SERVICE_STATUS_DIR"
        > "$SERVICE_PIDS_FILE"
        > "$SERVICE_START_TIME_FILE"
        
        return 0
    else
        print_error "Failed to stop some services"
        return 1
    fi
}

# Show service summary
show_service_summary() {
    echo ""
    print_header "📊 Service Summary"
    
    # Count services by status
    local healthy_count=0
    local total_count=0
    
    # Infrastructure services
    echo -e "${BOLD}Infrastructure Services:${NC}"
    for service in $INFRASTRUCTURE_SERVICES; do
        local port=$(get_service_port "$service")
        local description=$(get_service_description "$service")
        local status=$(get_service_status "$service")
        
        ((total_count++))
        if [[ "$status" == "healthy" ]]; then
            ((healthy_count++))
            echo -e "  ${GREEN}✓${NC} $service ($description) - Port $port"
        else
            echo -e "  ${RED}✗${NC} $service ($description) - Port $port [$status]"
        fi
    done
    
    echo ""
    echo -e "${BOLD}Application Services:${NC}"
    for service in $APPLICATION_SERVICES; do
        local port=$(get_service_port "$service")
        local description=$(get_service_description "$service")
        local status=$(get_service_status "$service")
        
        ((total_count++))
        if [[ "$status" == "healthy" ]]; then
            ((healthy_count++))
            echo -e "  ${GREEN}✓${NC} $service ($description) - Port $port"
        else
            echo -e "  ${RED}✗${NC} $service ($description) - Port $port [$status]"
        fi
    done
    
    echo ""
    echo -e "${BOLD}Frontend Services:${NC}"
    for service in $FRONTEND_SERVICES; do
        local port=$(get_service_port "$service")
        local description=$(get_service_description "$service")
        local status=$(get_service_status "$service")
        
        ((total_count++))
        if [[ "$status" == "healthy" ]]; then
            ((healthy_count++))
            echo -e "  ${GREEN}✓${NC} $service ($description) - Port $port"
        else
            echo -e "  ${RED}✗${NC} $service ($description) - Port $port [$status]"
        fi
    done
    
    echo ""
    print_info "Services: $healthy_count/$total_count healthy"
    
    if [[ $healthy_count -eq $total_count ]]; then
        echo ""
        print_header "🌐 Access Points"
        echo -e "${BOLD}Web Applications:${NC}"
        echo -e "  ${CYAN}DevFlow Dashboard:${NC} http://localhost:3010"
        echo ""
        echo -e "${BOLD}API Endpoints:${NC}"
        echo -e "  ${CYAN}API Gateway:${NC} http://localhost:3000"
        echo -e "  ${CYAN}Data Ingestion:${NC} http://localhost:3001"
        echo -e "  ${CYAN}Stream Processing:${NC} http://localhost:3002"
        echo -e "  ${CYAN}ML Pipeline:${NC} http://localhost:3003"
        echo ""
        echo -e "${BOLD}Infrastructure:${NC}"
        echo -e "  ${CYAN}MongoDB:${NC} mongodb://localhost:27017"
        echo -e "  ${CYAN}Redis:${NC} redis://localhost:6379"
        echo -e "  ${CYAN}InfluxDB:${NC} http://localhost:8086"
        echo -e "  ${CYAN}Kafka:${NC} localhost:9092"
    fi
}

# Get detailed service information
get_service_info() {
    local service="$1"
    local container_name="devflow-${service}-1"
    
    # Try different container name patterns
    local actual_container=$(docker ps --format "{{.Names}}" | grep -E "${service}|${container_name}" | head -1)
    
    if [[ -n "$actual_container" ]]; then
        local status=$(docker inspect --format='{{.State.Status}}' "$actual_container" 2>/dev/null)
        local uptime=$(docker inspect --format='{{.State.StartedAt}}' "$actual_container" 2>/dev/null)
        echo "Container: $actual_container, Status: $status, Started: $uptime"
    else
        echo "Container not found"
    fi
}

# Check current service status
check_service_status() {
    print_header "📊 DevFlow Service Status"
    
    # Initialize service tracking
    init_service_tracking
    
    # Check Docker Compose status first
    print_status "Checking Docker Compose status..."
    if ! docker-compose ps &>/dev/null; then
        print_warning "Docker Compose services may not be running"
    fi
    
    # Check all services
    local all_services=()
    for service in $INFRASTRUCTURE_SERVICES; do
        all_services+=("$service")
    done
    for service in $APPLICATION_SERVICES; do
        all_services+=("$service")
    done
    for service in $FRONTEND_SERVICES; do
        all_services+=("$service")
    done
    
    print_status "Checking health of ${#all_services[@]} services..."
    
    local total_services=${#all_services[@]}
    local current_service=0
    
    for service in "${all_services[@]}"; do
        ((current_service++))
        show_progress_bar $current_service $total_services "Health checks"
        check_service_health "$service" || true  # Don't fail on individual service health checks
        sleep 0.1
    done
    
    echo ""
    show_service_summary
    
    # Show detailed information if verbose mode is enabled
    if [[ "${VERBOSE:-false}" == "true" ]]; then
        echo ""
        print_header "🔍 Detailed Service Information"
        for service in "${all_services[@]}"; do
            echo -e "${BOLD}$service:${NC}"
            get_service_info "$service"
            echo ""
        done
    fi
}

# =============================================================================
# REAL-TIME STATUS DASHBOARD FUNCTIONS
# =============================================================================

# Clear screen and move cursor to top
clear_screen() {
    printf '\033[2J\033[H'
}

# Move cursor to specific position
move_cursor() {
    local row="$1"
    local col="$2"
    printf '\033[%d;%dH' "$row" "$col"
}

# Hide cursor
hide_cursor() {
    printf '\033[?25l'
}

# Show cursor
show_cursor() {
    printf '\033[?25h'
}

# Get terminal dimensions
get_terminal_size() {
    local size=$(stty size 2>/dev/null || echo "24 80")
    TERMINAL_ROWS=$(echo $size | cut -d' ' -f1)
    TERMINAL_COLS=$(echo $size | cut -d' ' -f2)
}

# Format service status with color and icon
format_service_status() {
    local service="$1"
    local status=$(get_service_status "$service")
    local port=$(get_service_port "$service")
    local description=$(get_service_description "$service")
    
    case "$status" in
        "healthy")
            echo -e "${GREEN}●${NC} ${BOLD}$service${NC} ${DIM}($description)${NC} ${CYAN}:$port${NC}"
            ;;
        "unhealthy")
            echo -e "${RED}●${NC} ${BOLD}$service${NC} ${DIM}($description)${NC} ${CYAN}:$port${NC} ${RED}[UNHEALTHY]${NC}"
            ;;
        "starting")
            echo -e "${YELLOW}●${NC} ${BOLD}$service${NC} ${DIM}($description)${NC} ${CYAN}:$port${NC} ${YELLOW}[STARTING]${NC}"
            ;;
        "stopped")
            echo -e "${DIM}●${NC} ${BOLD}$service${NC} ${DIM}($description)${NC} ${CYAN}:$port${NC} ${DIM}[STOPPED]${NC}"
            ;;
        *)
            echo -e "${DIM}●${NC} ${BOLD}$service${NC} ${DIM}($description)${NC} ${CYAN}:$port${NC} ${DIM}[UNKNOWN]${NC}"
            ;;
    esac
}

# Get service uptime
get_service_uptime() {
    local service="$1"
    local start_time=$(get_service_start_time "$service")
    
    if [[ -n "$start_time" ]]; then
        local current_time=$(date +%s)
        local uptime=$((current_time - start_time))
        
        if [[ $uptime -lt 60 ]]; then
            echo "${uptime}s"
        elif [[ $uptime -lt 3600 ]]; then
            echo "$((uptime / 60))m $((uptime % 60))s"
        else
            echo "$((uptime / 3600))h $((uptime % 3600 / 60))m"
        fi
    else
        echo "N/A"
    fi
}

# Draw service grid
draw_service_grid() {
    local start_row="$1"
    local current_row=$start_row
    
    # Infrastructure Services Section
    move_cursor $current_row 1
    echo -e "${BOLD}${BLUE}Infrastructure Services${NC}"
    ((current_row++))
    
    for service in $INFRASTRUCTURE_SERVICES; do
        move_cursor $current_row 3
        format_service_status "$service"
        
        # Add uptime information
        local uptime=$(get_service_uptime "$service")
        local uptime_col=$((TERMINAL_COLS - 20))
        if [[ $uptime_col -lt 60 ]]; then
            uptime_col=60
        fi
        move_cursor $current_row $uptime_col
        echo -e "${DIM}Uptime: $uptime${NC}"
        
        ((current_row++))
    done
    
    ((current_row++))
    
    # Application Services Section
    move_cursor $current_row 1
    echo -e "${BOLD}${PURPLE}Application Services${NC}"
    ((current_row++))
    
    for service in $APPLICATION_SERVICES; do
        move_cursor $current_row 3
        format_service_status "$service"
        
        # Add uptime information
        local uptime=$(get_service_uptime "$service")
        local uptime_col=$((TERMINAL_COLS - 20))
        if [[ $uptime_col -lt 60 ]]; then
            uptime_col=60
        fi
        move_cursor $current_row $uptime_col
        echo -e "${DIM}Uptime: $uptime${NC}"
        
        ((current_row++))
    done
    
    ((current_row++))
    
    # Frontend Services Section
    move_cursor $current_row 1
    echo -e "${BOLD}${CYAN}Frontend Services${NC}"
    ((current_row++))
    
    for service in $FRONTEND_SERVICES; do
        move_cursor $current_row 3
        format_service_status "$service"
        
        # Add uptime information
        local uptime=$(get_service_uptime "$service")
        local uptime_col=$((TERMINAL_COLS - 20))
        if [[ $uptime_col -lt 60 ]]; then
            uptime_col=60
        fi
        move_cursor $current_row $uptime_col
        echo -e "${DIM}Uptime: $uptime${NC}"
        
        ((current_row++))
    done
    
    return $current_row
}

# Draw access points directory
draw_access_points() {
    local start_row="$1"
    local current_row=$start_row
    
    move_cursor $current_row 1
    echo -e "${BOLD}${GREEN}🌐 Access Points Directory${NC}"
    ((current_row += 2))
    
    # Web Applications
    move_cursor $current_row 3
    echo -e "${BOLD}Web Applications:${NC}"
    ((current_row++))
    
    move_cursor $current_row 5
    echo -e "${CYAN}DevFlow Dashboard:${NC} ${WHITE}http://localhost:3010${NC}"
    ((current_row++))
    
    ((current_row++))
    
    # API Endpoints
    move_cursor $current_row 3
    echo -e "${BOLD}API Endpoints:${NC}"
    ((current_row++))
    
    local api_services=("api-gateway:3000" "data-ingestion:3001" "stream-processing:3002" "ml-pipeline:3003")
    for service_port in "${api_services[@]}"; do
        local service=$(echo "$service_port" | cut -d':' -f1)
        local port=$(echo "$service_port" | cut -d':' -f2)
        local description=$(get_service_description "$service")
        
        move_cursor $current_row 5
        echo -e "${CYAN}$description:${NC} ${WHITE}http://localhost:$port${NC}"
        ((current_row++))
    done
    
    ((current_row++))
    
    # Infrastructure Endpoints
    move_cursor $current_row 3
    echo -e "${BOLD}Infrastructure:${NC}"
    ((current_row++))
    
    local infra_endpoints=(
        "MongoDB:mongodb://localhost:27017"
        "Redis:redis://localhost:6379"
        "InfluxDB:http://localhost:8086"
        "Kafka:localhost:9092"
    )
    
    for endpoint in "${infra_endpoints[@]}"; do
        local name=$(echo "$endpoint" | cut -d':' -f1)
        local url=$(echo "$endpoint" | cut -d':' -f2-)
        
        move_cursor $current_row 5
        echo -e "${CYAN}$name:${NC} ${WHITE}$url${NC}"
        ((current_row++))
    done
    
    return $current_row
}

# Draw system metrics
draw_system_metrics() {
    local start_row="$1"
    local current_row=$start_row
    
    move_cursor $current_row 1
    echo -e "${BOLD}${YELLOW}📊 System Metrics${NC}"
    ((current_row += 2))
    
    # Count services by status
    local healthy_count=0
    local unhealthy_count=0
    local starting_count=0
    local stopped_count=0
    local total_count=0
    
    local all_services=()
    for service in $INFRASTRUCTURE_SERVICES $APPLICATION_SERVICES $FRONTEND_SERVICES; do
        all_services+=("$service")
        local status=$(get_service_status "$service")
        ((total_count++))
        
        case "$status" in
            "healthy") ((healthy_count++)) ;;
            "unhealthy") ((unhealthy_count++)) ;;
            "starting") ((starting_count++)) ;;
            "stopped") ((stopped_count++)) ;;
        esac
    done
    
    # Overall health status
    local overall_status="HEALTHY"
    local overall_color="$GREEN"
    
    if [[ $unhealthy_count -gt 0 ]]; then
        overall_status="DEGRADED"
        overall_color="$YELLOW"
    fi
    
    if [[ $healthy_count -eq 0 ]]; then
        overall_status="UNHEALTHY"
        overall_color="$RED"
    fi
    
    move_cursor $current_row 3
    echo -e "${BOLD}Overall Status:${NC} ${overall_color}$overall_status${NC}"
    ((current_row++))
    
    move_cursor $current_row 3
    echo -e "${BOLD}Services:${NC} ${GREEN}$healthy_count healthy${NC}, ${RED}$unhealthy_count unhealthy${NC}, ${YELLOW}$starting_count starting${NC}, ${DIM}$stopped_count stopped${NC}"
    ((current_row++))
    
    move_cursor $current_row 3
    echo -e "${BOLD}Total Services:${NC} $total_count"
    ((current_row++))
    
    # Platform uptime (time since script started)
    local platform_start_time=$(head -1 "$SERVICE_START_TIME_FILE" 2>/dev/null | cut -d':' -f2)
    if [[ -n "$platform_start_time" ]]; then
        local current_time=$(date +%s)
        local platform_uptime=$((current_time - platform_start_time))
        
        local uptime_str=""
        if [[ $platform_uptime -lt 60 ]]; then
            uptime_str="${platform_uptime}s"
        elif [[ $platform_uptime -lt 3600 ]]; then
            uptime_str="$((platform_uptime / 60))m $((platform_uptime % 60))s"
        else
            uptime_str="$((platform_uptime / 3600))h $((platform_uptime % 3600 / 60))m"
        fi
        
        move_cursor $current_row 3
        echo -e "${BOLD}Platform Uptime:${NC} $uptime_str"
        ((current_row++))
    fi
    
    return $current_row
}

# Draw dashboard header
draw_dashboard_header() {
    local current_time=$(date '+%Y-%m-%d %H:%M:%S')
    
    local header_width=80
    if [[ $TERMINAL_COLS -lt 80 ]]; then
        header_width=$TERMINAL_COLS
    fi
    
    move_cursor 1 1
    printf "${BOLD}${CYAN}╔"
    printf "═%.0s" $(seq 1 $((header_width - 2)))
    printf "╗${NC}\n"
    
    move_cursor 2 1
    printf "${BOLD}${CYAN}║${NC} ${BOLD}${WHITE}DevFlow Intelligence Platform - Real-Time Status Dashboard${NC}"
    local padding=$((header_width - 60))
    printf "%*s" $padding ""
    printf "${BOLD}${CYAN}║${NC}\n"
    
    move_cursor 3 1
    printf "${BOLD}${CYAN}║${NC} ${DIM}Last Updated: $current_time${NC}"
    local time_padding=$((header_width - 25 - ${#current_time}))
    printf "%*s" $time_padding ""
    printf "${BOLD}${CYAN}║${NC}\n"
    
    move_cursor 4 1
    printf "${BOLD}${CYAN}╚"
    printf "═%.0s" $(seq 1 $((header_width - 2)))
    printf "╝${NC}\n"
    
    return 5
}

# Draw dashboard footer
draw_dashboard_footer() {
    local footer_row=$((TERMINAL_ROWS - 3))
    
    local footer_width=80
    if [[ $TERMINAL_COLS -lt 80 ]]; then
        footer_width=$TERMINAL_COLS
    fi
    
    move_cursor $footer_row 1
    printf "${BOLD}${CYAN}╔"
    printf "═%.0s" $(seq 1 $((footer_width - 2)))
    printf "╗${NC}\n"
    
    move_cursor $((footer_row + 1)) 1
    printf "${BOLD}${CYAN}║${NC} ${WHITE}Press ${BOLD}Ctrl+C${NC}${WHITE} to exit dashboard${NC}"
    local exit_padding=$((footer_width - 35))
    printf "%*s" $exit_padding ""
    printf "${BOLD}${CYAN}║${NC}\n"
    
    move_cursor $((footer_row + 2)) 1
    printf "${BOLD}${CYAN}╚"
    printf "═%.0s" $(seq 1 $((footer_width - 2)))
    printf "╝${NC}\n"
}

# Update service health in real-time
update_service_health() {
    local all_services=()
    for service in $INFRASTRUCTURE_SERVICES $APPLICATION_SERVICES $FRONTEND_SERVICES; do
        all_services+=("$service")
    done
    
    # Check health of all services in parallel (background processes)
    for service in "${all_services[@]}"; do
        (
            check_service_health "$service" &>/dev/null
        ) &
    done
    
    # Wait for all health checks to complete
    wait
}

# Main real-time dashboard function
show_realtime_dashboard() {
    print_header "🖥️  Starting Real-Time Status Dashboard"
    
    # Initialize service tracking
    init_service_tracking
    
    # Get terminal size
    get_terminal_size
    
    # Hide cursor for cleaner display
    hide_cursor
    
    # Set up signal handling for dashboard
    trap 'show_cursor; clear_screen; exit 0' INT TERM
    
    print_info "Dashboard starting... Press Ctrl+C to exit"
    sleep 2
    
    # Main dashboard loop
    while true; do
        # Clear screen
        clear_screen
        
        # Update service health
        update_service_health
        
        # Draw dashboard components
        local current_row=$(draw_dashboard_header)
        ((current_row += 2))
        
        current_row=$(draw_service_grid $current_row)
        ((current_row += 2))
        
        current_row=$(draw_system_metrics $current_row)
        ((current_row += 2))
        
        current_row=$(draw_access_points $current_row)
        
        # Draw footer
        draw_dashboard_footer
        
        # Wait before next update
        sleep 3
    done
}

# =============================================================================
# INTERACTIVE MANAGEMENT INTERFACE
# =============================================================================

# Show interactive management menu
show_management_menu() {
    print_header "🎛️  DevFlow Interactive Management"
    
    echo -e "${WHITE}Available Management Options:${NC}"
    echo ""
    echo -e "  ${GREEN}1.${NC} Service Management"
    echo -e "  ${GREEN}2.${NC} System Diagnostics"
    echo -e "  ${GREEN}3.${NC} Log Management"
    echo -e "  ${GREEN}4.${NC} Troubleshooting Tools"
    echo -e "  ${GREEN}5.${NC} Configuration Management"
    echo -e "  ${GREEN}6.${NC} Graceful Shutdown"
    echo -e "  ${GREEN}0.${NC} Exit Management Interface"
    echo ""
    echo -n -e "${CYAN}Select an option [0-6]: ${NC}"
}

# Interactive management main loop
interactive_management() {
    print_header "🎛️  DevFlow Interactive Management Interface"
    print_info "Welcome to the DevFlow management interface"
    print_info "This interface provides comprehensive platform management capabilities"
    
    while true; do
        echo ""
        show_management_menu
        
        read -r choice
        echo ""
        
        case "$choice" in
            1)
                service_management_menu
                ;;
            2)
                system_diagnostics_menu
                ;;
            3)
                log_management_menu
                ;;
            4)
                troubleshooting_menu
                ;;
            5)
                configuration_management_menu
                ;;
            6)
                graceful_shutdown_menu
                ;;
            0)
                print_info "Exiting management interface..."
                break
                ;;
            *)
                print_error "Invalid option: $choice"
                print_info "Please select a number between 0-6"
                ;;
        esac
        
        # Pause before showing menu again
        if [[ "$choice" != "0" ]]; then
            echo ""
            echo -n -e "${DIM}Press Enter to continue...${NC}"
            read -r
        fi
    done
}

# Service Management Menu
service_management_menu() {
    print_header "🔧 Service Management"
    
    echo -e "${WHITE}Service Management Options:${NC}"
    echo ""
    echo -e "  ${GREEN}1.${NC} View Service Status"
    echo -e "  ${GREEN}2.${NC} Start Individual Service"
    echo -e "  ${GREEN}3.${NC} Stop Individual Service"
    echo -e "  ${GREEN}4.${NC} Restart Individual Service"
    echo -e "  ${GREEN}5.${NC} Start All Services"
    echo -e "  ${GREEN}6.${NC} Stop All Services"
    echo -e "  ${GREEN}7.${NC} View Service Logs"
    echo -e "  ${GREEN}8.${NC} Service Health Check"
    echo -e "  ${GREEN}0.${NC} Back to Main Menu"
    echo ""
    echo -n -e "${CYAN}Select an option [0-8]: ${NC}"
    
    read -r choice
    echo ""
    
    case "$choice" in
        1)
            check_service_status
            ;;
        2)
            start_individual_service_menu
            ;;
        3)
            stop_individual_service_menu
            ;;
        4)
            restart_individual_service_menu
            ;;
        5)
            confirm_action "start all services" && start_all_services
            ;;
        6)
            confirm_action "stop all services" && stop_all_services
            ;;
        7)
            view_service_logs_menu
            ;;
        8)
            service_health_check_menu
            ;;
        0)
            return
            ;;
        *)
            print_error "Invalid option: $choice"
            ;;
    esac
}

# System Diagnostics Menu
system_diagnostics_menu() {
    print_header "🔍 System Diagnostics"
    
    echo -e "${WHITE}Diagnostic Options:${NC}"
    echo ""
    echo -e "  ${GREEN}1.${NC} Environment Validation"
    echo -e "  ${GREEN}2.${NC} Docker System Info"
    echo -e "  ${GREEN}3.${NC} Port Usage Analysis"
    echo -e "  ${GREEN}4.${NC} Resource Usage Report"
    echo -e "  ${GREEN}5.${NC} Network Connectivity Test"
    echo -e "  ${GREEN}6.${NC} Service Dependencies Check"
    echo -e "  ${GREEN}7.${NC} Generate Diagnostic Report"
    echo -e "  ${GREEN}0.${NC} Back to Main Menu"
    echo ""
    echo -n -e "${CYAN}Select an option [0-7]: ${NC}"
    
    read -r choice
    echo ""
    
    case "$choice" in
        1)
            validate_environment
            ;;
        2)
            show_docker_system_info
            ;;
        3)
            analyze_port_usage
            ;;
        4)
            show_resource_usage_report
            ;;
        5)
            test_network_connectivity
            ;;
        6)
            check_service_dependencies
            ;;
        7)
            generate_diagnostic_report
            ;;
        0)
            return
            ;;
        *)
            print_error "Invalid option: $choice"
            ;;
    esac
}

# Log Management Menu
log_management_menu() {
    print_header "📋 Log Management"
    
    echo -e "${WHITE}Log Management Options:${NC}"
    echo ""
    echo -e "  ${GREEN}1.${NC} View Script Logs"
    echo -e "  ${GREEN}2.${NC} View Service Logs"
    echo -e "  ${GREEN}3.${NC} Tail Live Logs"
    echo -e "  ${GREEN}4.${NC} Search Logs"
    echo -e "  ${GREEN}5.${NC} Clear Old Logs"
    echo -e "  ${GREEN}6.${NC} Export Logs"
    echo -e "  ${GREEN}0.${NC} Back to Main Menu"
    echo ""
    echo -n -e "${CYAN}Select an option [0-6]: ${NC}"
    
    read -r choice
    echo ""
    
    case "$choice" in
        1)
            view_script_logs
            ;;
        2)
            view_service_logs_menu
            ;;
        3)
            tail_live_logs_menu
            ;;
        4)
            search_logs_menu
            ;;
        5)
            clear_old_logs_menu
            ;;
        6)
            export_logs_menu
            ;;
        0)
            return
            ;;
        *)
            print_error "Invalid option: $choice"
            ;;
    esac
}

# Troubleshooting Menu
troubleshooting_menu() {
    print_header "🛠️  Troubleshooting Tools"
    
    echo -e "${WHITE}Troubleshooting Options:${NC}"
    echo ""
    echo -e "  ${GREEN}1.${NC} Common Issues Checker"
    echo -e "  ${GREEN}2.${NC} Port Conflict Resolution"
    echo -e "  ${GREEN}3.${NC} Docker Issues Diagnosis"
    echo -e "  ${GREEN}4.${NC} Service Recovery Tools"
    echo -e "  ${GREEN}5.${NC} Performance Analysis"
    echo -e "  ${GREEN}6.${NC} Configuration Validation"
    echo -e "  ${GREEN}7.${NC} Reset Platform State"
    echo -e "  ${GREEN}0.${NC} Back to Main Menu"
    echo ""
    echo -n -e "${CYAN}Select an option [0-7]: ${NC}"
    
    read -r choice
    echo ""
    
    case "$choice" in
        1)
            check_common_issues
            ;;
        2)
            resolve_port_conflicts
            ;;
        3)
            diagnose_docker_issues
            ;;
        4)
            service_recovery_tools
            ;;
        5)
            performance_analysis
            ;;
        6)
            validate_configuration
            ;;
        7)
            reset_platform_state
            ;;
        0)
            return
            ;;
        *)
            print_error "Invalid option: $choice"
            ;;
    esac
}

# Configuration Management Menu
configuration_management_menu() {
    print_header "⚙️  Configuration Management"
    
    echo -e "${WHITE}Configuration Options:${NC}"
    echo ""
    echo -e "  ${GREEN}1.${NC} View Current Configuration"
    echo -e "  ${GREEN}2.${NC} Environment Variables"
    echo -e "  ${GREEN}3.${NC} Docker Compose Settings"
    echo -e "  ${GREEN}4.${NC} Service Configuration"
    echo -e "  ${GREEN}5.${NC} Backup Configuration"
    echo -e "  ${GREEN}6.${NC} Restore Configuration"
    echo -e "  ${GREEN}0.${NC} Back to Main Menu"
    echo ""
    echo -n -e "${CYAN}Select an option [0-6]: ${NC}"
    
    read -r choice
    echo ""
    
    case "$choice" in
        1)
            view_current_configuration
            ;;
        2)
            manage_environment_variables
            ;;
        3)
            manage_docker_compose_settings
            ;;
        4)
            manage_service_configuration
            ;;
        5)
            backup_configuration
            ;;
        6)
            restore_configuration
            ;;
        0)
            return
            ;;
        *)
            print_error "Invalid option: $choice"
            ;;
    esac
}

# Graceful Shutdown Menu
graceful_shutdown_menu() {
    print_header "🛑 Graceful Shutdown"
    
    echo -e "${WHITE}Shutdown Options:${NC}"
    echo ""
    echo -e "  ${GREEN}1.${NC} Stop All Services (Graceful)"
    echo -e "  ${GREEN}2.${NC} Stop Individual Services"
    echo -e "  ${GREEN}3.${NC} Emergency Stop (Force)"
    echo -e "  ${GREEN}4.${NC} Shutdown with Cleanup"
    echo -e "  ${GREEN}5.${NC} Schedule Shutdown"
    echo -e "  ${GREEN}0.${NC} Back to Main Menu"
    echo ""
    echo -n -e "${CYAN}Select an option [0-5]: ${NC}"
    
    read -r choice
    echo ""
    
    case "$choice" in
        1)
            graceful_stop_all_services
            ;;
        2)
            graceful_stop_individual_services
            ;;
        3)
            emergency_stop_services
            ;;
        4)
            shutdown_with_cleanup
            ;;
        5)
            schedule_shutdown
            ;;
        0)
            return
            ;;
        *)
            print_error "Invalid option: $choice"
            ;;
    esac
}

# =============================================================================
# INTERACTIVE MANAGEMENT IMPLEMENTATION FUNCTIONS
# =============================================================================

# Confirmation prompt for critical actions
confirm_action() {
    local action="$1"
    local default="${2:-n}"
    
    echo -e "${YELLOW}⚠️  You are about to $action${NC}"
    echo -n -e "${CYAN}Are you sure? [y/N]: ${NC}"
    
    read -r confirmation
    
    case "${confirmation:-$default}" in
        [Yy]|[Yy][Ee][Ss])
            print_info "Action confirmed: $action"
            return 0
            ;;
        *)
            print_info "Action cancelled: $action"
            return 1
            ;;
    esac
}

# Start individual service
start_individual_service_menu() {
    print_header "🚀 Start Individual Service"
    
    # Show available services
    echo -e "${WHITE}Available Services:${NC}"
    echo ""
    
    local all_services=()
    local service_index=1
    
    echo -e "${BOLD}Infrastructure Services:${NC}"
    for service in $INFRASTRUCTURE_SERVICES; do
        echo -e "  ${GREEN}$service_index.${NC} $service ($(get_service_description "$service"))"
        all_services+=("$service")
        ((service_index++))
    done
    
    echo ""
    echo -e "${BOLD}Application Services:${NC}"
    for service in $APPLICATION_SERVICES; do
        echo -e "  ${GREEN}$service_index.${NC} $service ($(get_service_description "$service"))"
        all_services+=("$service")
        ((service_index++))
    done
    
    echo ""
    echo -e "${BOLD}Frontend Services:${NC}"
    for service in $FRONTEND_SERVICES; do
        echo -e "  ${GREEN}$service_index.${NC} $service ($(get_service_description "$service"))"
        all_services+=("$service")
        ((service_index++))
    done
    
    echo ""
    echo -n -e "${CYAN}Select service to start [1-${#all_services[@]}]: ${NC}"
    
    read -r choice
    
    if [[ "$choice" =~ ^[0-9]+$ ]] && [[ $choice -ge 1 ]] && [[ $choice -le ${#all_services[@]} ]]; then
        local selected_service="${all_services[$((choice-1))]}"
        
        if confirm_action "start service: $selected_service"; then
            start_individual_service "$selected_service"
        fi
    else
        print_error "Invalid selection: $choice"
    fi
}

# Stop individual service
stop_individual_service_menu() {
    print_header "🛑 Stop Individual Service"
    
    # Show running services
    echo -e "${WHITE}Running Services:${NC}"
    echo ""
    
    local running_services=()
    local service_index=1
    
    # Check which services are running
    for service in $INFRASTRUCTURE_SERVICES $APPLICATION_SERVICES $FRONTEND_SERVICES; do
        if is_container_running "$service"; then
            echo -e "  ${GREEN}$service_index.${NC} $service ($(get_service_description "$service"))"
            running_services+=("$service")
            ((service_index++))
        fi
    done
    
    if [[ ${#running_services[@]} -eq 0 ]]; then
        print_warning "No services are currently running"
        return
    fi
    
    echo ""
    echo -n -e "${CYAN}Select service to stop [1-${#running_services[@]}]: ${NC}"
    
    read -r choice
    
    if [[ "$choice" =~ ^[0-9]+$ ]] && [[ $choice -ge 1 ]] && [[ $choice -le ${#running_services[@]} ]]; then
        local selected_service="${running_services[$((choice-1))]}"
        
        if confirm_action "stop service: $selected_service"; then
            stop_individual_service "$selected_service"
        fi
    else
        print_error "Invalid selection: $choice"
    fi
}

# Restart individual service
restart_individual_service_menu() {
    print_header "🔄 Restart Individual Service"
    
    # Show available services
    echo -e "${WHITE}Available Services:${NC}"
    echo ""
    
    local all_services=()
    local service_index=1
    
    for service in $INFRASTRUCTURE_SERVICES $APPLICATION_SERVICES $FRONTEND_SERVICES; do
        local status_indicator=""
        if is_container_running "$service"; then
            status_indicator="${GREEN}[RUNNING]${NC}"
        else
            status_indicator="${RED}[STOPPED]${NC}"
        fi
        
        echo -e "  ${GREEN}$service_index.${NC} $service ($(get_service_description "$service")) $status_indicator"
        all_services+=("$service")
        ((service_index++))
    done
    
    echo ""
    echo -n -e "${CYAN}Select service to restart [1-${#all_services[@]}]: ${NC}"
    
    read -r choice
    
    if [[ "$choice" =~ ^[0-9]+$ ]] && [[ $choice -ge 1 ]] && [[ $choice -le ${#all_services[@]} ]]; then
        local selected_service="${all_services[$((choice-1))]}"
        
        if confirm_action "restart service: $selected_service"; then
            restart_individual_service "$selected_service"
        fi
    else
        print_error "Invalid selection: $choice"
    fi
}

# Start individual service implementation
start_individual_service() {
    local service="$1"
    
    print_status "Starting service: $service"
    
    if is_container_running "$service"; then
        print_warning "Service $service is already running"
        return 0
    fi
    
    # Start the service using docker-compose
    if docker-compose up -d "$service" 2>/dev/null; then
        print_info "Service $service started, waiting for health check..."
        
        if wait_for_service_health "$service" 60; then
            print_success "Service $service started successfully"
        else
            print_error "Service $service failed health check"
        fi
    else
        print_error "Failed to start service: $service"
    fi
}

# Stop individual service implementation
stop_individual_service() {
    local service="$1"
    
    print_status "Stopping service: $service"
    
    if ! is_container_running "$service"; then
        print_warning "Service $service is not running"
        return 0
    fi
    
    # Stop the service using docker-compose
    if docker-compose stop "$service" 2>/dev/null; then
        print_success "Service $service stopped successfully"
        set_service_status "$service" "stopped"
    else
        print_error "Failed to stop service: $service"
    fi
}

# Restart individual service implementation
restart_individual_service() {
    local service="$1"
    
    print_status "Restarting service: $service"
    
    # Stop the service first
    if is_container_running "$service"; then
        print_info "Stopping $service..."
        docker-compose stop "$service" 2>/dev/null
        sleep 2
    fi
    
    # Start the service
    if docker-compose up -d "$service" 2>/dev/null; then
        print_info "Service $service restarted, waiting for health check..."
        
        if wait_for_service_health "$service" 60; then
            print_success "Service $service restarted successfully"
        else
            print_error "Service $service failed health check after restart"
        fi
    else
        print_error "Failed to restart service: $service"
    fi
}

# Graceful stop all services with confirmation
graceful_stop_all_services() {
    print_header "🛑 Graceful Shutdown - All Services"
    
    # Show current service status
    print_status "Current service status:"
    check_service_status
    
    echo ""
    if confirm_action "gracefully stop ALL DevFlow services"; then
        print_info "Initiating graceful shutdown sequence..."
        
        # Stop services in reverse dependency order
        print_status "Stopping frontend services..."
        for service in $FRONTEND_SERVICES; do
            if is_container_running "$service"; then
                print_info "Stopping $service..."
                docker-compose stop "$service" 2>/dev/null
                sleep 1
            fi
        done
        
        print_status "Stopping application services..."
        for service in $APPLICATION_SERVICES; do
            if is_container_running "$service"; then
                print_info "Stopping $service..."
                docker-compose stop "$service" 2>/dev/null
                sleep 1
            fi
        done
        
        print_status "Stopping infrastructure services..."
        for service in $INFRASTRUCTURE_SERVICES; do
            if is_container_running "$service"; then
                print_info "Stopping $service..."
                docker-compose stop "$service" 2>/dev/null
                sleep 1
            fi
        done
        
        # Clean up
        print_status "Cleaning up containers and networks..."
        docker-compose down --remove-orphans 2>/dev/null
        
        # Clear service status
        rm -rf "$SERVICE_STATUS_DIR"
        > "$SERVICE_PIDS_FILE"
        > "$SERVICE_START_TIME_FILE"
        
        print_success "All services stopped gracefully"
    fi
}

# Emergency stop services
emergency_stop_services() {
    print_header "🚨 Emergency Stop - Force Shutdown"
    
    echo -e "${RED}⚠️  WARNING: This will forcefully stop all services${NC}"
    echo -e "${RED}⚠️  This may cause data loss or corruption${NC}"
    echo ""
    
    if confirm_action "FORCE STOP all services (emergency)"; then
        print_warning "Initiating emergency shutdown..."
        
        # Force stop all containers
        print_status "Force stopping all containers..."
        docker-compose kill 2>/dev/null
        docker-compose down --remove-orphans --volumes 2>/dev/null
        
        # Kill any remaining processes
        print_status "Cleaning up remaining processes..."
        pkill -f "devflow" 2>/dev/null || true
        
        # Clear all status
        rm -rf "$SERVICE_STATUS_DIR"
        > "$SERVICE_PIDS_FILE"
        > "$SERVICE_START_TIME_FILE"
        
        print_success "Emergency shutdown completed"
        print_warning "Please check service logs for any issues"
    fi
}

# =============================================================================
# DIAGNOSTIC AND TROUBLESHOOTING FUNCTIONS
# =============================================================================

# Show Docker system information
show_docker_system_info() {
    print_header "🐳 Docker System Information"
    
    print_status "Gathering Docker system information..."
    
    echo -e "${BOLD}Docker Version:${NC}"
    docker --version
    echo ""
    
    echo -e "${BOLD}Docker Compose Version:${NC}"
    docker-compose --version
    echo ""
    
    echo -e "${BOLD}Docker System Info:${NC}"
    docker system info 2>/dev/null | head -20
    echo ""
    
    echo -e "${BOLD}Docker Disk Usage:${NC}"
    docker system df
    echo ""
    
    echo -e "${BOLD}Running Containers:${NC}"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo ""
    
    echo -e "${BOLD}Docker Networks:${NC}"
    docker network ls
}

# Analyze port usage
analyze_port_usage() {
    print_header "🔌 Port Usage Analysis"
    
    print_status "Analyzing port usage for DevFlow services..."
    
    echo -e "${BOLD}Required Ports Status:${NC}"
    echo ""
    
    for port in "${REQUIRED_PORTS[@]}"; do
        local process_info=$(lsof -ti:$port 2>/dev/null)
        if [[ -n "$process_info" ]]; then
            local process_name=$(ps -p $process_info -o comm= 2>/dev/null)
            echo -e "  Port ${YELLOW}$port${NC}: ${RED}OCCUPIED${NC} by $process_name (PID: $process_info)"
        else
            echo -e "  Port ${YELLOW}$port${NC}: ${GREEN}AVAILABLE${NC}"
        fi
    done
    
    echo ""
    echo -e "${BOLD}All Port Usage (1000-9999):${NC}"
    netstat -tulpn 2>/dev/null | grep -E ":(1[0-9]{3}|[2-9][0-9]{3})" | head -20
}

# Show resource usage report
show_resource_usage_report() {
    print_header "📊 Resource Usage Report"
    
    print_status "Generating resource usage report..."
    
    echo -e "${BOLD}System Resources:${NC}"
    echo ""
    
    # CPU usage
    echo -e "${CYAN}CPU Usage:${NC}"
    if command -v top &> /dev/null; then
        top -l 1 -n 0 | grep "CPU usage" 2>/dev/null || echo "CPU info not available"
    fi
    echo ""
    
    # Memory usage
    echo -e "${CYAN}Memory Usage:${NC}"
    if command -v free &> /dev/null; then
        free -h
    elif command -v vm_stat &> /dev/null; then
        vm_stat | head -10
    fi
    echo ""
    
    # Disk usage
    echo -e "${CYAN}Disk Usage:${NC}"
    df -h | head -10
    echo ""
    
    # Docker resource usage
    echo -e "${CYAN}Docker Container Resources:${NC}"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" 2>/dev/null || echo "No running containers"
}

# Test network connectivity
test_network_connectivity() {
    print_header "🌐 Network Connectivity Test"
    
    print_status "Testing network connectivity..."
    
    local test_urls=(
        "google.com:80"
        "github.com:443"
        "docker.io:443"
        "localhost:3000"
        "localhost:27017"
        "localhost:6379"
    )
    
    echo -e "${BOLD}Connectivity Tests:${NC}"
    echo ""
    
    for url in "${test_urls[@]}"; do
        local host=$(echo "$url" | cut -d':' -f1)
        local port=$(echo "$url" | cut -d':' -f2)
        
        if timeout 5 bash -c "</dev/tcp/$host/$port" 2>/dev/null; then
            echo -e "  ${GREEN}✓${NC} $url - ${GREEN}REACHABLE${NC}"
        else
            echo -e "  ${RED}✗${NC} $url - ${RED}UNREACHABLE${NC}"
        fi
    done
}

# Check service dependencies
check_service_dependencies() {
    print_header "🔗 Service Dependencies Check"
    
    print_status "Checking service dependencies..."
    
    echo -e "${BOLD}Service Dependency Map:${NC}"
    echo ""
    
    for service in $INFRASTRUCTURE_SERVICES $APPLICATION_SERVICES $FRONTEND_SERVICES; do
        local dependencies=$(get_service_dependencies "$service")
        local status=$(get_service_status "$service")
        local status_color="${RED}"
        
        if [[ "$status" == "healthy" ]]; then
            status_color="${GREEN}"
        elif [[ "$status" == "starting" ]]; then
            status_color="${YELLOW}"
        fi
        
        echo -e "  ${CYAN}$service${NC} [${status_color}$status${NC}]"
        
        if [[ -n "$dependencies" ]]; then
            for dep in $dependencies; do
                local dep_status=$(get_service_status "$dep")
                local dep_color="${RED}"
                
                if [[ "$dep_status" == "healthy" ]]; then
                    dep_color="${GREEN}"
                elif [[ "$dep_status" == "starting" ]]; then
                    dep_color="${YELLOW}"
                fi
                
                echo -e "    └── ${DIM}depends on${NC} ${CYAN}$dep${NC} [${dep_color}$dep_status${NC}]"
            done
        else
            echo -e "    └── ${DIM}no dependencies${NC}"
        fi
        echo ""
    done
}

# Generate comprehensive diagnostic report
generate_diagnostic_report() {
    print_header "📋 Generating Diagnostic Report"
    
    local report_file="$LOG_DIR/diagnostic-report-$(date +%Y%m%d-%H%M%S).txt"
    
    print_status "Generating comprehensive diagnostic report..."
    print_info "Report will be saved to: $report_file"
    
    {
        echo "DevFlow Intelligence Platform - Diagnostic Report"
        echo "Generated: $(date)"
        echo "Script Version: $SCRIPT_VERSION"
        echo "=================================================="
        echo ""
        
        echo "ENVIRONMENT INFORMATION"
        echo "----------------------"
        echo "OS: $(uname -a)"
        echo "Shell: $SHELL"
        echo "User: $(whoami)"
        echo "Working Directory: $(pwd)"
        echo ""
        
        echo "DOCKER INFORMATION"
        echo "------------------"
        docker --version 2>/dev/null || echo "Docker not available"
        docker-compose --version 2>/dev/null || echo "Docker Compose not available"
        echo ""
        
        echo "SERVICE STATUS"
        echo "--------------"
        for service in $INFRASTRUCTURE_SERVICES $APPLICATION_SERVICES $FRONTEND_SERVICES; do
            local status=$(get_service_status "$service")
            local port=$(get_service_port "$service")
            echo "$service: $status (port $port)"
        done
        echo ""
        
        echo "PORT USAGE"
        echo "----------"
        for port in "${REQUIRED_PORTS[@]}"; do
            local process_info=$(lsof -ti:$port 2>/dev/null)
            if [[ -n "$process_info" ]]; then
                echo "Port $port: OCCUPIED (PID: $process_info)"
            else
                echo "Port $port: AVAILABLE"
            fi
        done
        echo ""
        
        echo "DOCKER CONTAINERS"
        echo "-----------------"
        docker ps -a 2>/dev/null || echo "Cannot access Docker"
        echo ""
        
        echo "RECENT LOG ENTRIES"
        echo "------------------"
        tail -50 "$SCRIPT_LOG" 2>/dev/null || echo "No log file found"
        
    } > "$report_file"
    
    print_success "Diagnostic report generated: $report_file"
    
    echo ""
    echo -n -e "${CYAN}Would you like to view the report now? [y/N]: ${NC}"
    read -r view_report
    
    if [[ "$view_report" =~ ^[Yy] ]]; then
        less "$report_file"
    fi
}

# Check common issues
check_common_issues() {
    print_header "🔍 Common Issues Checker"
    
    print_status "Checking for common DevFlow issues..."
    
    local issues_found=0
    
    echo -e "${BOLD}Issue Check Results:${NC}"
    echo ""
    
    # Check Docker daemon
    if ! docker info &>/dev/null; then
        echo -e "  ${RED}✗${NC} Docker daemon is not running"
        echo -e "    ${DIM}Solution: Start Docker Desktop${NC}"
        ((issues_found++))
    else
        echo -e "  ${GREEN}✓${NC} Docker daemon is running"
    fi
    
    # Check port conflicts
    local occupied_ports=()
    for port in "${REQUIRED_PORTS[@]}"; do
        if lsof -ti:$port &>/dev/null; then
            occupied_ports+=("$port")
        fi
    done
    
    if [[ ${#occupied_ports[@]} -gt 0 ]]; then
        echo -e "  ${RED}✗${NC} Port conflicts detected: ${occupied_ports[*]}"
        echo -e "    ${DIM}Solution: Stop conflicting services or use port resolution tool${NC}"
        ((issues_found++))
    else
        echo -e "  ${GREEN}✓${NC} No port conflicts detected"
    fi
    
    # Check disk space
    local disk_usage=$(df . | tail -1 | awk '{print $5}' | sed 's/%//')
    if [[ $disk_usage -gt 90 ]]; then
        echo -e "  ${RED}✗${NC} Low disk space: ${disk_usage}% used"
        echo -e "    ${DIM}Solution: Free up disk space or clean Docker images${NC}"
        ((issues_found++))
    else
        echo -e "  ${GREEN}✓${NC} Sufficient disk space available"
    fi
    
    # Check project structure
    if [[ ! -f "docker-compose.yml" ]]; then
        echo -e "  ${RED}✗${NC} docker-compose.yml not found"
        echo -e "    ${DIM}Solution: Run script from DevFlow project root directory${NC}"
        ((issues_found++))
    else
        echo -e "  ${GREEN}✓${NC} Project structure is valid"
    fi
    
    echo ""
    if [[ $issues_found -eq 0 ]]; then
        print_success "No common issues detected"
    else
        print_warning "Found $issues_found potential issues"
        print_info "Review the solutions above to resolve these issues"
    fi
}

# Resolve port conflicts
resolve_port_conflicts() {
    print_header "🔧 Port Conflict Resolution"
    
    print_status "Scanning for port conflicts..."
    
    local conflicts=()
    for port in "${REQUIRED_PORTS[@]}"; do
        local process_info=$(lsof -ti:$port 2>/dev/null)
        if [[ -n "$process_info" ]]; then
            conflicts+=("$port:$process_info")
        fi
    done
    
    if [[ ${#conflicts[@]} -eq 0 ]]; then
        print_success "No port conflicts detected"
        return 0
    fi
    
    echo -e "${BOLD}Port Conflicts Detected:${NC}"
    echo ""
    
    for conflict in "${conflicts[@]}"; do
        local port=$(echo "$conflict" | cut -d':' -f1)
        local pid=$(echo "$conflict" | cut -d':' -f2)
        local process_name=$(ps -p $pid -o comm= 2>/dev/null || echo "unknown")
        
        echo -e "  Port ${YELLOW}$port${NC}: occupied by ${CYAN}$process_name${NC} (PID: $pid)"
    done
    
    echo ""
    echo -e "${CYAN}Resolution Options:${NC}"
    echo -e "  ${GREEN}1.${NC} Kill conflicting processes"
    echo -e "  ${GREEN}2.${NC} Show detailed process information"
    echo -e "  ${GREEN}3.${NC} Skip resolution"
    echo ""
    echo -n -e "${CYAN}Select option [1-3]: ${NC}"
    
    read -r choice
    
    case "$choice" in
        1)
            if confirm_action "kill conflicting processes"; then
                for conflict in "${conflicts[@]}"; do
                    local pid=$(echo "$conflict" | cut -d':' -f2)
                    local port=$(echo "$conflict" | cut -d':' -f1)
                    
                    if kill "$pid" 2>/dev/null; then
                        print_success "Killed process on port $port (PID: $pid)"
                    else
                        print_error "Failed to kill process on port $port (PID: $pid)"
                    fi
                done
            fi
            ;;
        2)
            for conflict in "${conflicts[@]}"; do
                local pid=$(echo "$conflict" | cut -d':' -f2)
                local port=$(echo "$conflict" | cut -d':' -f1)
                
                echo ""
                echo -e "${BOLD}Process Details for Port $port:${NC}"
                ps -p $pid -f 2>/dev/null || echo "Process information not available"
            done
            ;;
        3)
            print_info "Port conflict resolution skipped"
            ;;
        *)
            print_error "Invalid option: $choice"
            ;;
    esac
}

# View service logs menu
view_service_logs_menu() {
    print_header "📋 View Service Logs"
    
    echo -e "${WHITE}Available Service Logs:${NC}"
    echo ""
    
    local all_services=()
    local service_index=1
    
    for service in $INFRASTRUCTURE_SERVICES $APPLICATION_SERVICES $FRONTEND_SERVICES; do
        echo -e "  ${GREEN}$service_index.${NC} $service"
        all_services+=("$service")
        ((service_index++))
    done
    
    echo ""
    echo -n -e "${CYAN}Select service to view logs [1-${#all_services[@]}]: ${NC}"
    
    read -r choice
    
    if [[ "$choice" =~ ^[0-9]+$ ]] && [[ $choice -ge 1 ]] && [[ $choice -le ${#all_services[@]} ]]; then
        local selected_service="${all_services[$((choice-1))]}"
        view_service_logs "$selected_service"
    else
        print_error "Invalid selection: $choice"
    fi
}

# View service logs implementation
view_service_logs() {
    local service="$1"
    
    print_header "📋 Service Logs: $service"
    
    echo -e "${CYAN}Showing last 50 lines of logs for $service${NC}"
    echo -e "${DIM}Press 'q' to exit log view${NC}"
    echo ""
    
    sleep 2
    
    if docker-compose logs --tail=50 "$service" 2>/dev/null; then
        echo ""
        print_info "End of logs for $service"
    else
        print_error "Could not retrieve logs for $service"
        print_info "Service may not be running or logs may not be available"
    fi
}

# View script logs
view_script_logs() {
    print_header "📋 Script Logs"
    
    if [[ -f "$SCRIPT_LOG" ]]; then
        echo -e "${CYAN}Showing script logs from: $SCRIPT_LOG${NC}"
        echo -e "${DIM}Press 'q' to exit log view${NC}"
        echo ""
        
        sleep 2
        less "$SCRIPT_LOG"
    else
        print_warning "Script log file not found: $SCRIPT_LOG"
    fi
}

# Service health check menu
service_health_check_menu() {
    print_header "🏥 Service Health Check"
    
    echo -e "${WHITE}Health Check Options:${NC}"
    echo ""
    echo -e "  ${GREEN}1.${NC} Check All Services"
    echo -e "  ${GREEN}2.${NC} Check Individual Service"
    echo -e "  ${GREEN}3.${NC} Continuous Health Monitoring"
    echo -e "  ${GREEN}0.${NC} Back to Service Management"
    echo ""
    echo -n -e "${CYAN}Select option [0-3]: ${NC}"
    
    read -r choice
    
    case "$choice" in
        1)
            check_all_services_health
            ;;
        2)
            check_individual_service_health
            ;;
        3)
            continuous_health_monitoring
            ;;
        0)
            return
            ;;
        *)
            print_error "Invalid option: $choice"
            ;;
    esac
}

# Check all services health
check_all_services_health() {
    print_header "🏥 All Services Health Check"
    
    print_status "Performing comprehensive health check..."
    
    local healthy_count=0
    local total_count=0
    
    for service in $INFRASTRUCTURE_SERVICES $APPLICATION_SERVICES $FRONTEND_SERVICES; do
        ((total_count++))
        print_info "Checking $service..."
        
        if check_service_health "$service"; then
            ((healthy_count++))
            echo -e "  ${GREEN}✓${NC} $service is healthy"
        else
            echo -e "  ${RED}✗${NC} $service is unhealthy"
        fi
    done
    
    echo ""
    print_info "Health Check Summary: $healthy_count/$total_count services healthy"
    
    if [[ $healthy_count -eq $total_count ]]; then
        print_success "All services are healthy!"
    else
        print_warning "Some services need attention"
    fi
}

# Continuous health monitoring
continuous_health_monitoring() {
    print_header "🔄 Continuous Health Monitoring"
    
    print_info "Starting continuous health monitoring..."
    print_info "Press Ctrl+C to stop monitoring"
    
    # Set up signal handling for monitoring
    trap 'print_info "Stopping health monitoring..."; return' INT
    
    local check_count=0
    
    while true; do
        ((check_count++))
        
        clear
        print_header "🔄 Health Monitor - Check #$check_count"
        echo -e "${DIM}$(date)${NC}"
        echo ""
        
        local healthy_count=0
        local total_count=0
        
        for service in $INFRASTRUCTURE_SERVICES $APPLICATION_SERVICES $FRONTEND_SERVICES; do
            ((total_count++))
            
            if check_service_health "$service"; then
                ((healthy_count++))
                echo -e "  ${GREEN}✓${NC} $service"
            else
                echo -e "  ${RED}✗${NC} $service"
            fi
        done
        
        echo ""
        echo -e "${BOLD}Status: $healthy_count/$total_count healthy${NC}"
        
        if [[ $healthy_count -eq $total_count ]]; then
            echo -e "${GREEN}All systems operational${NC}"
        else
            echo -e "${YELLOW}Some services need attention${NC}"
        fi
        
        echo ""
        echo -e "${DIM}Next check in 10 seconds... (Ctrl+C to stop)${NC}"
        
        sleep 10
    done
    
    # Reset trap
    trap 'handle_signal INT' INT
}

# =============================================================================
# ADDITIONAL MANAGEMENT FUNCTIONS
# =============================================================================

# Diagnose Docker issues
diagnose_docker_issues() {
    print_header "🐳 Docker Issues Diagnosis"
    
    print_status "Diagnosing Docker-related issues..."
    
    echo -e "${BOLD}Docker Status Checks:${NC}"
    echo ""
    
    # Check if Docker is installed
    if ! command -v docker &>/dev/null; then
        echo -e "  ${RED}✗${NC} Docker is not installed"
        echo -e "    ${DIM}Solution: Install Docker Desktop${NC}"
        return 1
    else
        echo -e "  ${GREEN}✓${NC} Docker is installed"
    fi
    
    # Check if Docker daemon is running
    if ! docker info &>/dev/null; then
        echo -e "  ${RED}✗${NC} Docker daemon is not running"
        echo -e "    ${DIM}Solution: Start Docker Desktop${NC}"
        
        echo ""
        echo -n -e "${CYAN}Would you like to try starting Docker? [y/N]: ${NC}"
        read -r start_docker
        
        if [[ "$start_docker" =~ ^[Yy] ]]; then
            print_info "Attempting to start Docker..."
            open -a Docker 2>/dev/null || print_error "Could not start Docker automatically"
        fi
        return 1
    else
        echo -e "  ${GREEN}✓${NC} Docker daemon is running"
    fi
    
    # Check Docker Compose
    if ! docker-compose --version &>/dev/null; then
        echo -e "  ${RED}✗${NC} Docker Compose is not available"
        echo -e "    ${DIM}Solution: Install Docker Compose${NC}"
        return 1
    else
        echo -e "  ${GREEN}✓${NC} Docker Compose is available"
    fi
    
    # Check Docker resources
    echo ""
    echo -e "${BOLD}Docker Resource Usage:${NC}"
    docker system df 2>/dev/null || echo "Could not get Docker disk usage"
    
    echo ""
    echo -e "${BOLD}Docker Networks:${NC}"
    docker network ls 2>/dev/null || echo "Could not list Docker networks"
    
    print_success "Docker diagnosis completed"
}

# Service recovery tools
service_recovery_tools() {
    print_header "🔧 Service Recovery Tools"
    
    echo -e "${WHITE}Recovery Options:${NC}"
    echo ""
    echo -e "  ${GREEN}1.${NC} Restart Failed Services"
    echo -e "  ${GREEN}2.${NC} Rebuild Service Containers"
    echo -e "  ${GREEN}3.${NC} Reset Service Data"
    echo -e "  ${GREEN}4.${NC} Clean Docker Resources"
    echo -e "  ${GREEN}0.${NC} Back to Troubleshooting Menu"
    echo ""
    echo -n -e "${CYAN}Select recovery option [0-4]: ${NC}"
    
    read -r choice
    
    case "$choice" in
        1)
            restart_failed_services
            ;;
        2)
            rebuild_service_containers
            ;;
        3)
            reset_service_data
            ;;
        4)
            clean_docker_resources
            ;;
        0)
            return
            ;;
        *)
            print_error "Invalid option: $choice"
            ;;
    esac
}

# Restart failed services
restart_failed_services() {
    print_header "🔄 Restart Failed Services"
    
    print_status "Identifying failed services..."
    
    local failed_services=()
    
    for service in $INFRASTRUCTURE_SERVICES $APPLICATION_SERVICES $FRONTEND_SERVICES; do
        if ! check_service_health "$service"; then
            failed_services+=("$service")
        fi
    done
    
    if [[ ${#failed_services[@]} -eq 0 ]]; then
        print_success "No failed services detected"
        return 0
    fi
    
    echo -e "${BOLD}Failed Services:${NC}"
    for service in "${failed_services[@]}"; do
        echo -e "  ${RED}✗${NC} $service"
    done
    
    echo ""
    if confirm_action "restart ${#failed_services[@]} failed services"; then
        for service in "${failed_services[@]}"; do
            print_info "Restarting $service..."
            restart_individual_service "$service"
        done
        
        print_success "Service restart completed"
    fi
}

# Performance analysis
performance_analysis() {
    print_header "📊 Performance Analysis"
    
    print_status "Analyzing system and service performance..."
    
    echo -e "${BOLD}System Performance:${NC}"
    echo ""
    
    # CPU and memory usage
    echo -e "${CYAN}System Resources:${NC}"
    if command -v top &>/dev/null; then
        top -l 1 -n 0 | head -10
    fi
    echo ""
    
    # Docker container performance
    echo -e "${CYAN}Container Performance:${NC}"
    docker stats --no-stream 2>/dev/null || echo "No running containers"
    echo ""
    
    # Service response times
    echo -e "${CYAN}Service Response Times:${NC}"
    for service in $APPLICATION_SERVICES $FRONTEND_SERVICES; do
        local port=$(get_service_port "$service")
        local start_time=$(date +%s%N)
        
        if curl -s -f "http://localhost:$port/health" &>/dev/null || curl -s -f "http://localhost:$port/" &>/dev/null; then
            local end_time=$(date +%s%N)
            local response_time=$(( (end_time - start_time) / 1000000 ))
            echo -e "  $service: ${GREEN}${response_time}ms${NC}"
        else
            echo -e "  $service: ${RED}No response${NC}"
        fi
    done
}

# Validate configuration
validate_configuration() {
    print_header "⚙️  Configuration Validation"
    
    print_status "Validating DevFlow configuration..."
    
    echo -e "${BOLD}Configuration Checks:${NC}"
    echo ""
    
    # Check docker-compose.yml
    if [[ -f "docker-compose.yml" ]]; then
        echo -e "  ${GREEN}✓${NC} docker-compose.yml exists"
        
        if docker-compose config &>/dev/null; then
            echo -e "  ${GREEN}✓${NC} docker-compose.yml is valid"
        else
            echo -e "  ${RED}✗${NC} docker-compose.yml has syntax errors"
        fi
    else
        echo -e "  ${RED}✗${NC} docker-compose.yml not found"
    fi
    
    # Check environment files
    if [[ -f ".env" ]]; then
        echo -e "  ${GREEN}✓${NC} .env file exists"
    else
        echo -e "  ${YELLOW}!${NC} .env file not found (optional)"
    fi
    
    # Check service directories
    local missing_dirs=()
    for dir in "services" "apps" "logs"; do
        if [[ -d "$dir" ]]; then
            echo -e "  ${GREEN}✓${NC} $dir directory exists"
        else
            echo -e "  ${RED}✗${NC} $dir directory missing"
            missing_dirs+=("$dir")
        fi
    done
    
    if [[ ${#missing_dirs[@]} -gt 0 ]]; then
        echo ""
        echo -n -e "${CYAN}Create missing directories? [y/N]: ${NC}"
        read -r create_dirs
        
        if [[ "$create_dirs" =~ ^[Yy] ]]; then
            for dir in "${missing_dirs[@]}"; do
                mkdir -p "$dir"
                print_success "Created directory: $dir"
            done
        fi
    fi
}

# Reset platform state
reset_platform_state() {
    print_header "🔄 Reset Platform State"
    
    echo -e "${RED}⚠️  WARNING: This will reset the entire platform state${NC}"
    echo -e "${RED}⚠️  All running services will be stopped${NC}"
    echo -e "${RED}⚠️  All data and logs may be lost${NC}"
    echo ""
    
    if confirm_action "RESET the entire platform state"; then
        print_warning "Resetting platform state..."
        
        # Stop all services
        print_status "Stopping all services..."
        docker-compose down --remove-orphans --volumes 2>/dev/null
        
        # Clean Docker resources
        print_status "Cleaning Docker resources..."
        docker system prune -f 2>/dev/null
        
        # Clear service status
        print_status "Clearing service status..."
        rm -rf "$SERVICE_STATUS_DIR"
        > "$SERVICE_PIDS_FILE"
        > "$SERVICE_START_TIME_FILE"
        
        # Clear logs (optional)
        echo ""
        echo -n -e "${CYAN}Clear all log files? [y/N]: ${NC}"
        read -r clear_logs
        
        if [[ "$clear_logs" =~ ^[Yy] ]]; then
            print_status "Clearing log files..."
            find "$LOG_DIR" -name "*.log" -delete 2>/dev/null || true
        fi
        
        print_success "Platform state reset completed"
        print_info "You can now start the platform fresh with: $0 start"
    fi
}

# View current configuration
view_current_configuration() {
    print_header "⚙️  Current Configuration"
    
    print_status "Displaying current configuration..."
    
    echo -e "${BOLD}Environment:${NC}"
    echo "  Project Root: $PROJECT_ROOT"
    echo "  Script Version: $SCRIPT_VERSION"
    echo "  Log Directory: $LOG_DIR"
    echo "  PID Directory: $PID_DIR"
    echo ""
    
    echo -e "${BOLD}Service Configuration:${NC}"
    echo "  Infrastructure Services: $INFRASTRUCTURE_SERVICES"
    echo "  Application Services: $APPLICATION_SERVICES"
    echo "  Frontend Services: $FRONTEND_SERVICES"
    echo ""
    
    echo -e "${BOLD}Required Ports:${NC}"
    echo "  ${REQUIRED_PORTS[*]}"
    echo ""
    
    if [[ -f "docker-compose.yml" ]]; then
        echo -e "${BOLD}Docker Compose Services:${NC}"
        docker-compose config --services 2>/dev/null || echo "Could not read docker-compose.yml"
    fi
}

# Manage environment variables
manage_environment_variables() {
    print_header "🌍 Environment Variables"
    
    echo -e "${WHITE}Environment Management:${NC}"
    echo ""
    echo -e "  ${GREEN}1.${NC} View Current Environment"
    echo -e "  ${GREEN}2.${NC} View .env File"
    echo -e "  ${GREEN}3.${NC} Create .env from Template"
    echo -e "  ${GREEN}0.${NC} Back to Configuration Menu"
    echo ""
    echo -n -e "${CYAN}Select option [0-3]: ${NC}"
    
    read -r choice
    
    case "$choice" in
        1)
            echo ""
            echo -e "${BOLD}Current Environment Variables:${NC}"
            env | grep -E "^(DEVFLOW|DOCKER|NODE)" | sort || echo "No relevant environment variables found"
            ;;
        2)
            if [[ -f ".env" ]]; then
                echo ""
                echo -e "${BOLD}.env File Contents:${NC}"
                cat .env
            else
                print_warning ".env file not found"
            fi
            ;;
        3)
            if [[ -f ".env.example" ]]; then
                if confirm_action "create .env from .env.example"; then
                    cp .env.example .env
                    print_success ".env file created from template"
                    print_info "Please edit .env file with your specific values"
                fi
            else
                print_warning ".env.example template not found"
            fi
            ;;
        0)
            return
            ;;
        *)
            print_error "Invalid option: $choice"
            ;;
    esac
}

# Clean Docker resources
clean_docker_resources() {
    print_header "🧹 Clean Docker Resources"
    
    echo -e "${YELLOW}⚠️  This will clean unused Docker resources${NC}"
    echo ""
    
    if confirm_action "clean unused Docker resources"; then
        print_status "Cleaning Docker resources..."
        
        # Remove unused containers
        print_info "Removing unused containers..."
        docker container prune -f 2>/dev/null
        
        # Remove unused images
        print_info "Removing unused images..."
        docker image prune -f 2>/dev/null
        
        # Remove unused networks
        print_info "Removing unused networks..."
        docker network prune -f 2>/dev/null
        
        # Remove unused volumes (optional)
        echo ""
        echo -n -e "${CYAN}Remove unused volumes? (may cause data loss) [y/N]: ${NC}"
        read -r remove_volumes
        
        if [[ "$remove_volumes" =~ ^[Yy] ]]; then
            print_info "Removing unused volumes..."
            docker volume prune -f 2>/dev/null
        fi
        
        print_success "Docker cleanup completed"
        
        # Show space saved
        echo ""
        echo -e "${BOLD}Docker Disk Usage After Cleanup:${NC}"
        docker system df
    fi
}

# =============================================================================
# HELP AND USAGE FUNCTIONS
# =============================================================================

# Show script usage
show_usage() {
    echo -e "${BOLD}$SCRIPT_NAME v$SCRIPT_VERSION${NC}"
    echo ""
    echo -e "${WHITE}USAGE:${NC}"
    echo "  $0 [COMMAND] [OPTIONS]"
    echo ""
    echo -e "${WHITE}COMMANDS:${NC}"
    echo -e "  ${GREEN}start${NC}        Start the complete DevFlow platform (default)"
    echo -e "  ${GREEN}stop${NC}         Stop all DevFlow services"
    echo -e "  ${GREEN}status${NC}       Show current platform status"
    echo -e "  ${GREEN}dashboard${NC}    Show real-time status dashboard"
    echo -e "  ${GREEN}manage${NC}       Interactive management interface"
    echo -e "  ${GREEN}validate${NC}     Run environment validation only"
    echo -e "  ${GREEN}diagnostic${NC}   Run comprehensive diagnostic analysis"
    echo -e "  ${GREEN}troubleshoot${NC} Get troubleshooting help and guidance"
    echo -e "  ${GREEN}error-report${NC} Generate detailed error report"
    echo -e "  ${GREEN}help${NC}         Show this help message"
    echo ""
    echo -e "${WHITE}OPTIONS:${NC}"
    echo -e "  ${YELLOW}--verbose${NC}      Enable verbose logging output"
    echo -e "  ${YELLOW}--diagnostic${NC}   Enable diagnostic mode with detailed logging"
    echo -e "  ${YELLOW}--no-color${NC}     Disable colored output"
    echo -e "  ${YELLOW}--log-file${NC}     Specify custom log file location"
    echo ""
    echo -e "${WHITE}ERROR HANDLING FEATURES:${NC}"
    echo -e "  ${CYAN}•${NC} Automatic recovery for common issues"
    echo -e "  ${CYAN}•${NC} Detailed error messages with recovery suggestions"
    echo -e "  ${CYAN}•${NC} Comprehensive diagnostic mode with verbose logging"
    echo -e "  ${CYAN}•${NC} Error history tracking and reporting"
    echo -e "  ${CYAN}•${NC} Service dependency validation and recovery"
    echo ""
    echo -e "${WHITE}EXAMPLES:${NC}"
    echo "  $0                        # Start platform with default settings"
    echo "  $0 start --verbose        # Start with verbose logging"
    echo "  $0 start --diagnostic     # Start with full diagnostic mode"
    echo "  $0 validate               # Check environment only"
    echo "  $0 diagnostic             # Run comprehensive diagnostics"
    echo "  $0 error-report           # Generate error report"
    echo "  $0 status                 # Show current status"
    echo "  $0 dashboard              # Show real-time status dashboard"
    echo "  $0 stop                   # Stop all services"
    echo ""
    echo -e "${WHITE}LOG FILES:${NC}"
    echo "  Script logs: $SCRIPT_LOG"
    echo "  Error history: $LOG_DIR/error_history.log"
    echo "  Diagnostic logs: $LOG_DIR/diagnostic.log"
    echo "  Service logs: $LOG_DIR/"
    echo ""
}

# =============================================================================
# INITIALIZATION AND MAIN LOGIC
# =============================================================================

# Initialize the script
initialize_script() {
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --verbose)
                export VERBOSE=true
                shift
                ;;
            --diagnostic)
                export DIAGNOSTIC_MODE=true
                export VERBOSE=true
                shift
                ;;
            --no-color)
                # Disable colors by clearing all color variables
                RED="" GREEN="" YELLOW="" BLUE="" PURPLE="" CYAN="" WHITE="" BOLD="" DIM="" NC=""
                shift
                ;;
            --log-file)
                SCRIPT_LOG="$2"
                shift 2
                ;;
            *)
                break
                ;;
        esac
    done
    
    # Initialize logging
    init_logging
    
    # Initialize service tracking
    init_service_tracking
    
    # Enable diagnostic mode if requested
    if [[ "${DIAGNOSTIC_MODE:-false}" == "true" ]]; then
        enable_diagnostic_mode
    fi
    
    # Log script start
    log_message "INFO" "Script initialized with arguments: $*"
    log_message "INFO" "Project root: $PROJECT_ROOT"
    log_message "INFO" "Verbose mode: ${VERBOSE:-false}"
    log_message "INFO" "Diagnostic mode: ${DIAGNOSTIC_MODE:-false}"
}

# Main script entry point
main() {
    # Initialize script
    initialize_script "$@"
    
    # Get command (default to 'start')
    local command="${1:-start}"
    
    case "$command" in
        "start")
            print_header "🚀 DevFlow Intelligence Platform - Complete Startup"
            
            # Enhanced startup with comprehensive error handling
            if validate_environment_with_error_handling; then
                print_success "✅ Environment validation passed"
                
                if start_all_services; then
                    print_success "🎉 DevFlow platform started successfully!"
                    log_message "SUCCESS" "DevFlow platform startup completed successfully"
                else
                    print_error "❌ Failed to start DevFlow platform"
                    echo ""
                    echo -e "${YELLOW}🔧 RECOVERY OPTIONS:${NC}"
                    echo "1. Run diagnostic mode: '$0 diagnostic'"
                    echo "2. Check service status: '$0 status'"
                    echo "3. Generate error report: '$0 error-report'"
                    echo "4. Try starting individual services manually"
                    echo ""
                    
                    # Offer immediate recovery options
                    echo -n -e "${CYAN}Would you like to run diagnostics now? [y/N]: ${NC}"
                    read -r run_diagnostics
                    
                    if [[ "$run_diagnostics" =~ ^[Yy] ]]; then
                        echo ""
                        enable_diagnostic_mode
                        run_comprehensive_diagnostics
                    fi
                    
                    exit 1
                fi
            else
                print_error "❌ Environment validation failed - cannot start services"
                echo ""
                echo -e "${YELLOW}🔧 COMMON SOLUTIONS:${NC}"
                echo "• Ensure Docker Desktop is running"
                echo "• Check available disk space (need >5GB free)"
                echo "• Verify no port conflicts exist"
                echo "• Check network connectivity"
                echo ""
                echo -e "${CYAN}For detailed analysis, run: '$0 diagnostic'${NC}"
                
                # Offer to run diagnostics immediately
                echo ""
                echo -n -e "${CYAN}Run diagnostic analysis now? [Y/n]: ${NC}"
                read -r run_diagnostics
                
                if [[ ! "$run_diagnostics" =~ ^[Nn] ]]; then
                    echo ""
                    enable_diagnostic_mode
                    run_comprehensive_diagnostics
                fi
                
                exit 1
            fi
            ;;
        "stop")
            stop_all_services
            ;;
        "status")
            check_service_status
            ;;
        "dashboard")
            show_realtime_dashboard
            ;;
        "manage")
            interactive_management
            ;;
        "validate")
            validate_environment_with_error_handling
            ;;
        "diagnostic")
            enable_diagnostic_mode
            run_comprehensive_diagnostics
            ;;
        "error-report")
            print_header "📋 Error Report Generation"
            generate_error_report
            ;;
        "troubleshoot")
            print_header "🔧 DevFlow Troubleshooting Assistant"
            
            echo -e "${WHITE}Common Issues and Solutions:${NC}"
            echo ""
            echo -e "${CYAN}1. Docker Issues${NC}"
            echo "   • Docker not running: Start Docker Desktop"
            echo "   • Permission denied: Add user to docker group (Linux)"
            echo "   • Out of disk space: Run 'docker system prune -a'"
            echo ""
            echo -e "${CYAN}2. Port Conflicts${NC}"
            echo "   • Check what's using ports: 'lsof -i :PORT'"
            echo "   • Kill conflicting processes: 'kill PID'"
            echo "   • Change ports in docker-compose.yml"
            echo ""
            echo -e "${CYAN}3. Service Startup Failures${NC}"
            echo "   • Check logs: 'docker-compose logs SERVICE'"
            echo "   • Restart service: 'docker-compose restart SERVICE'"
            echo "   • Rebuild service: 'docker-compose build SERVICE'"
            echo ""
            echo -e "${CYAN}4. Network Issues${NC}"
            echo "   • Test connectivity: 'ping google.com'"
            echo "   • Check DNS: 'nslookup google.com'"
            echo "   • Configure proxy if behind corporate firewall"
            echo ""
            
            echo -n -e "${CYAN}Run automated troubleshooting? [y/N]: ${NC}"
            read -r auto_troubleshoot
            
            if [[ "$auto_troubleshoot" =~ ^[Yy] ]]; then
                enable_diagnostic_mode
                run_comprehensive_diagnostics
            fi
            ;;
        "help"|"--help"|"-h")
            show_usage
            ;;
        *)
            print_error "❌ Unknown command: $command"
            echo ""
            echo -e "${YELLOW}💡 Did you mean one of these?${NC}"
            echo "   • start      - Start all DevFlow services"
            echo "   • stop       - Stop all services"
            echo "   • status     - Check service status"
            echo "   • diagnostic - Run comprehensive diagnostics"
            echo "   • troubleshoot - Get troubleshooting help"
            echo ""
            show_usage
            exit 1
            ;;
    esac
}

# =============================================================================
# CLEANUP AND SIGNAL HANDLING
# =============================================================================

# Cleanup function
cleanup() {
    local exit_code=$?
    
    log_message "INFO" "Script cleanup initiated"
    
    # Kill any background processes
    if [[ -f "$SERVICE_PIDS_FILE" ]]; then
        while IFS= read -r pid; do
            if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
                kill "$pid" 2>/dev/null
                log_message "INFO" "Killed background process: $pid"
            fi
        done < "$SERVICE_PIDS_FILE"
    fi
    
    # Clear progress indicators
    echo -e "\r\033[K"  # Clear current line
    
    if [[ $exit_code -ne 0 ]]; then
        print_error "Script exited with error code: $exit_code"
        print_info "Check logs at: $SCRIPT_LOG"
    fi
    
    log_message "INFO" "Script cleanup completed"
    exit $exit_code
}

# Signal handler for graceful shutdown
handle_signal() {
    local signal="$1"
    
    echo ""
    print_warning "Received signal: $signal"
    print_info "Initiating graceful shutdown..."
    
    log_message "WARNING" "Script interrupted by signal: $signal"
    
    # Stop services if they were started
    if [[ ${#SERVICE_STATUS[@]} -gt 0 ]]; then
        print_info "Stopping services..."
        stop_all_services
    fi
    
    cleanup
}

# =============================================================================
# SCRIPT EXECUTION
# =============================================================================

# Trap signals for cleanup
trap 'handle_signal INT' INT
trap 'handle_signal TERM' TERM
trap 'cleanup' EXIT

# Run main function with all arguments
main "$@"