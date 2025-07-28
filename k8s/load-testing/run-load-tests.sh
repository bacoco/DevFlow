#!/bin/bash

# DevFlow Intelligence Load Testing Script
# This script runs comprehensive load tests and monitors Kubernetes scaling

set -e

# Configuration
NAMESPACE="devflow"
BASE_URL="${BASE_URL:-http://api.devflow.local}"
WS_URL="${WS_URL:-ws://api.devflow.local}"
TEST_DURATION="${TEST_DURATION:-30m}"
MAX_USERS="${MAX_USERS:-10000}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if k6 is installed
    if ! command -v k6 &> /dev/null; then
        error "k6 is not installed. Please install k6 from https://k6.io/docs/getting-started/installation/"
        exit 1
    fi
    
    # Check if kubectl is installed and configured
    if ! command -v kubectl &> /dev/null; then
        error "kubectl is not installed. Please install kubectl."
        exit 1
    fi
    
    # Check if cluster is accessible
    if ! kubectl cluster-info &> /dev/null; then
        error "Cannot access Kubernetes cluster. Please check your kubeconfig."
        exit 1
    fi
    
    # Check if namespace exists
    if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
        error "Namespace '$NAMESPACE' does not exist. Please create it first."
        exit 1
    fi
    
    success "Prerequisites check passed"
}

# Monitor cluster resources
monitor_cluster() {
    log "Starting cluster monitoring..."
    
    # Create monitoring directory
    mkdir -p ./monitoring-results
    
    # Monitor HPA status
    kubectl get hpa -n "$NAMESPACE" -w > ./monitoring-results/hpa-status.log &
    HPA_PID=$!
    
    # Monitor pod status
    kubectl get pods -n "$NAMESPACE" -w > ./monitoring-results/pod-status.log &
    POD_PID=$!
    
    # Monitor resource usage
    while true; do
        echo "$(date): $(kubectl top nodes)" >> ./monitoring-results/node-resources.log
        echo "$(date): $(kubectl top pods -n $NAMESPACE)" >> ./monitoring-results/pod-resources.log
        sleep 30
    done &
    RESOURCE_PID=$!
    
    # Store PIDs for cleanup
    echo "$HPA_PID $POD_PID $RESOURCE_PID" > ./monitoring-results/monitor-pids.txt
}

# Stop monitoring
stop_monitoring() {
    log "Stopping cluster monitoring..."
    
    if [ -f ./monitoring-results/monitor-pids.txt ]; then
        PIDS=$(cat ./monitoring-results/monitor-pids.txt)
        for PID in $PIDS; do
            if kill -0 "$PID" 2>/dev/null; then
                kill "$PID" 2>/dev/null || true
            fi
        done
        rm -f ./monitoring-results/monitor-pids.txt
    fi
}

# Validate cluster state before testing
validate_cluster_state() {
    log "Validating cluster state..."
    
    # Check if all deployments are ready
    local deployments=("api-gateway" "data-ingestion" "stream-processing" "ml-pipeline")
    
    for deployment in "${deployments[@]}"; do
        local ready=$(kubectl get deployment "$deployment" -n "$NAMESPACE" -o jsonpath='{.status.readyReplicas}')
        local desired=$(kubectl get deployment "$deployment" -n "$NAMESPACE" -o jsonpath='{.spec.replicas}')
        
        if [ "$ready" != "$desired" ]; then
            error "Deployment $deployment is not ready ($ready/$desired)"
            return 1
        fi
    done
    
    # Check if HPA is configured
    local hpa_count=$(kubectl get hpa -n "$NAMESPACE" --no-headers | wc -l)
    if [ "$hpa_count" -eq 0 ]; then
        warning "No HPA configurations found. Auto-scaling may not work."
    fi
    
    # Check if services are accessible
    log "Checking service accessibility..."
    if ! curl -f -s "$BASE_URL/health" > /dev/null; then
        error "API Gateway health check failed. Service may not be accessible."
        return 1
    fi
    
    success "Cluster state validation passed"
}

# Run basic load test
run_basic_load_test() {
    log "Running basic load test..."
    
    k6 run \
        --env BASE_URL="$BASE_URL" \
        --env WS_URL="$WS_URL" \
        --out json=./monitoring-results/basic-load-test-results.json \
        ./k6-load-test.js
    
    local exit_code=$?
    if [ $exit_code -eq 0 ]; then
        success "Basic load test completed successfully"
    else
        error "Basic load test failed with exit code $exit_code"
        return $exit_code
    fi
}

# Run scalability test
run_scalability_test() {
    log "Running scalability test (up to $MAX_USERS concurrent users)..."
    
    k6 run \
        --env BASE_URL="$BASE_URL" \
        --env WS_URL="$WS_URL" \
        --env MAX_USERS="$MAX_USERS" \
        --out json=./monitoring-results/scalability-test-results.json \
        ./k6-scalability-test.js
    
    local exit_code=$?
    if [ $exit_code -eq 0 ]; then
        success "Scalability test completed successfully"
    else
        error "Scalability test failed with exit code $exit_code"
        return $exit_code
    fi
}

# Analyze HPA behavior
analyze_hpa_behavior() {
    log "Analyzing HPA behavior..."
    
    local hpa_analysis_file="./monitoring-results/hpa-analysis.txt"
    
    echo "HPA Scaling Analysis" > "$hpa_analysis_file"
    echo "===================" >> "$hpa_analysis_file"
    echo "" >> "$hpa_analysis_file"
    
    # Get final HPA status
    echo "Final HPA Status:" >> "$hpa_analysis_file"
    kubectl get hpa -n "$NAMESPACE" >> "$hpa_analysis_file"
    echo "" >> "$hpa_analysis_file"
    
    # Analyze scaling events
    echo "Scaling Events:" >> "$hpa_analysis_file"
    kubectl get events -n "$NAMESPACE" --field-selector reason=SuccessfulRescale >> "$hpa_analysis_file"
    echo "" >> "$hpa_analysis_file"
    
    # Check if scaling occurred
    local scaling_events=$(kubectl get events -n "$NAMESPACE" --field-selector reason=SuccessfulRescale --no-headers | wc -l)
    
    if [ "$scaling_events" -gt 0 ]; then
        success "HPA scaling detected: $scaling_events scaling events"
    else
        warning "No HPA scaling events detected during test"
    fi
}

# Generate test report
generate_test_report() {
    log "Generating test report..."
    
    local report_file="./monitoring-results/load-test-report.md"
    
    cat > "$report_file" << EOF
# DevFlow Intelligence Load Test Report

**Test Date:** $(date)
**Base URL:** $BASE_URL
**Max Concurrent Users:** $MAX_USERS
**Test Duration:** $TEST_DURATION

## Test Summary

### Basic Load Test
$(if [ -f ./monitoring-results/basic-load-test-results.json ]; then echo "✅ Completed"; else echo "❌ Failed"; fi)

### Scalability Test
$(if [ -f ./monitoring-results/scalability-test-results.json ]; then echo "✅ Completed"; else echo "❌ Failed"; fi)

## Cluster Scaling Behavior

### HPA Status
\`\`\`
$(kubectl get hpa -n "$NAMESPACE" 2>/dev/null || echo "No HPA data available")
\`\`\`

### Pod Scaling
\`\`\`
$(kubectl get pods -n "$NAMESPACE" 2>/dev/null || echo "No pod data available")
\`\`\`

### Resource Utilization
\`\`\`
$(kubectl top nodes 2>/dev/null || echo "No node metrics available")
\`\`\`

## Recommendations

EOF

    # Add recommendations based on test results
    if [ -f ./monitoring-results/scalability-test-results.json ]; then
        local error_rate=$(jq -r '.metrics.http_req_failed.rate // 0' ./monitoring-results/scalability-test-results.json)
        local avg_response_time=$(jq -r '.metrics.http_req_duration.avg // 0' ./monitoring-results/scalability-test-results.json)
        
        if (( $(echo "$error_rate > 0.05" | bc -l) )); then
            echo "- ⚠️ Error rate ($error_rate) exceeds 5% threshold. Consider optimizing error handling." >> "$report_file"
        fi
        
        if (( $(echo "$avg_response_time > 500" | bc -l) )); then
            echo "- ⚠️ Average response time (${avg_response_time}ms) exceeds 500ms threshold. Consider performance optimization." >> "$report_file"
        fi
    fi
    
    local scaling_events=$(kubectl get events -n "$NAMESPACE" --field-selector reason=SuccessfulRescale --no-headers 2>/dev/null | wc -l)
    if [ "$scaling_events" -eq 0 ]; then
        echo "- 📈 No auto-scaling detected. Review HPA configuration and resource requests/limits." >> "$report_file"
    fi
    
    success "Test report generated: $report_file"
}

# Cleanup function
cleanup() {
    log "Cleaning up..."
    stop_monitoring
    
    # Kill any remaining k6 processes
    pkill -f k6 2>/dev/null || true
    
    log "Cleanup completed"
}

# Main execution
main() {
    log "Starting DevFlow Intelligence Load Testing"
    
    # Set up cleanup trap
    trap cleanup EXIT INT TERM
    
    # Run checks and tests
    check_prerequisites
    validate_cluster_state
    
    # Start monitoring
    monitor_cluster
    
    # Run tests
    if [ "${1:-all}" = "basic" ]; then
        run_basic_load_test
    elif [ "${1:-all}" = "scalability" ]; then
        run_scalability_test
    else
        run_basic_load_test
        sleep 60  # Brief pause between tests
        run_scalability_test
    fi
    
    # Analyze results
    sleep 30  # Allow time for final metrics collection
    analyze_hpa_behavior
    generate_test_report
    
    success "Load testing completed successfully!"
    log "Results available in ./monitoring-results/"
}

# Script usage
usage() {
    echo "Usage: $0 [basic|scalability|all]"
    echo ""
    echo "Options:"
    echo "  basic       Run only basic load test"
    echo "  scalability Run only scalability test"
    echo "  all         Run both tests (default)"
    echo ""
    echo "Environment variables:"
    echo "  BASE_URL    Base URL for API testing (default: http://api.devflow.local)"
    echo "  WS_URL      WebSocket URL for testing (default: ws://api.devflow.local)"
    echo "  MAX_USERS   Maximum concurrent users for scalability test (default: 10000)"
    echo "  TEST_DURATION Test duration (default: 30m)"
}

# Handle command line arguments
case "${1:-}" in
    -h|--help)
        usage
        exit 0
        ;;
    basic|scalability|all|"")
        main "$1"
        ;;
    *)
        error "Invalid argument: $1"
        usage
        exit 1
        ;;
esac