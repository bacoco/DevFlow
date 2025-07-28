#!/bin/bash

# DevFlow Intelligence Integration Test Runner
# Comprehensive test execution with reporting and CI/CD integration

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TEST_RESULTS_DIR="$SCRIPT_DIR/results"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Test configuration
TEST_TYPES="${TEST_TYPES:-all}" # all, unit, integration, e2e, performance
ENVIRONMENT="${ENVIRONMENT:-test}"
PARALLEL_TESTS="${PARALLEL_TESTS:-false}"
GENERATE_REPORT="${GENERATE_REPORT:-true}"
UPLOAD_RESULTS="${UPLOAD_RESULTS:-false}"

# Service URLs
API_BASE_URL="${API_BASE_URL:-http://localhost:3001}"
WS_URL="${WS_URL:-ws://localhost:3001}"

# Logging functions
log() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

info() {
    echo -e "${PURPLE}[INFO]${NC} $1"
}

# Setup test environment
setup_test_environment() {
    log "Setting up test environment..."
    
    # Create results directory
    mkdir -p "$TEST_RESULTS_DIR"
    
    # Setup test environment
    if [ -f "$SCRIPT_DIR/scripts/setup-test-env.js" ]; then
        node "$SCRIPT_DIR/scripts/setup-test-env.js"
    fi
    
    # Wait for services to be ready
    wait_for_services
    
    success "Test environment setup complete"
}

# Wait for services to be ready
wait_for_services() {
    log "Waiting for services to be ready..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "$API_BASE_URL/health" > /dev/null 2>&1; then
            success "Services are ready"
            return 0
        fi
        
        log "Attempt $attempt/$max_attempts: Services not ready, waiting..."
        sleep 10
        ((attempt++))
    done
    
    error "Services failed to become ready after $max_attempts attempts"
    return 1
}

# Run unit tests
run_unit_tests() {
    log "Running unit tests..."
    
    local test_results_file="$TEST_RESULTS_DIR/unit-test-results-$TIMESTAMP.json"
    
    cd "$PROJECT_ROOT"
    
    if [ "$PARALLEL_TESTS" = "true" ]; then
        npm run test -- --coverage --outputFile="$test_results_file" --maxWorkers=4
    else
        npm run test -- --coverage --outputFile="$test_results_file" --runInBand
    fi
    
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        success "Unit tests passed"
    else
        error "Unit tests failed with exit code $exit_code"
    fi
    
    return $exit_code
}

# Run integration tests
run_integration_tests() {
    log "Running integration tests..."
    
    local test_results_file="$TEST_RESULTS_DIR/integration-test-results-$TIMESTAMP.json"
    
    cd "$SCRIPT_DIR"
    
    # Set environment variables
    export API_BASE_URL="$API_BASE_URL"
    export WS_URL="$WS_URL"
    export NODE_ENV="test"
    
    if [ "$PARALLEL_TESTS" = "true" ]; then
        npm test -- --outputFile="$test_results_file"
    else
        npm test -- --outputFile="$test_results_file" --runInBand
    fi
    
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        success "Integration tests passed"
    else
        error "Integration tests failed with exit code $exit_code"
    fi
    
    return $exit_code
}

# Run end-to-end tests
run_e2e_tests() {
    log "Running end-to-end tests..."
    
    local test_results_file="$TEST_RESULTS_DIR/e2e-test-results-$TIMESTAMP.json"
    
    cd "$SCRIPT_DIR"
    
    # Run specific e2e test patterns
    npm test -- --testPathPattern=e2e --outputFile="$test_results_file" --runInBand
    
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        success "End-to-end tests passed"
    else
        error "End-to-end tests failed with exit code $exit_code"
    fi
    
    return $exit_code
}

# Run performance tests
run_performance_tests() {
    log "Running performance tests..."
    
    local performance_results_dir="$TEST_RESULTS_DIR/performance-$TIMESTAMP"
    mkdir -p "$performance_results_dir"
    
    # Check if K6 is available
    if command -v k6 &> /dev/null; then
        log "Running K6 performance tests..."
        
        # Run CI performance tests
        k6 run \
            --env BASE_URL="$API_BASE_URL" \
            --env WS_URL="$WS_URL" \
            --out json="$performance_results_dir/k6-ci-results.json" \
            "$SCRIPT_DIR/performance/ci-performance-tests.js"
        
        local k6_exit_code=$?
        
        if [ $k6_exit_code -eq 0 ]; then
            success "K6 performance tests passed"
        else
            error "K6 performance tests failed with exit code $k6_exit_code"
        fi
    else
        warning "K6 not found, skipping K6 performance tests"
        local k6_exit_code=0
    fi
    
    # Run Jest performance validation tests
    log "Running Jest performance validation tests..."
    
    cd "$SCRIPT_DIR"
    npm test -- --testPathPattern=performance --outputFile="$performance_results_dir/jest-performance-results.json" --runInBand
    
    local jest_exit_code=$?
    
    if [ $jest_exit_code -eq 0 ]; then
        success "Jest performance tests passed"
    else
        error "Jest performance tests failed with exit code $jest_exit_code"
    fi
    
    # Return the worst exit code
    if [ $k6_exit_code -ne 0 ]; then
        return $k6_exit_code
    else
        return $jest_exit_code
    fi
}

# Run API contract tests
run_contract_tests() {
    log "Running API contract tests..."
    
    local test_results_file="$TEST_RESULTS_DIR/contract-test-results-$TIMESTAMP.json"
    
    cd "$SCRIPT_DIR"
    
    npm test -- --testPathPattern=api/contract-testing --outputFile="$test_results_file" --runInBand
    
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        success "API contract tests passed"
    else
        error "API contract tests failed with exit code $exit_code"
    fi
    
    return $exit_code
}

# Run data consistency tests
run_data_consistency_tests() {
    log "Running data consistency tests..."
    
    local test_results_file="$TEST_RESULTS_DIR/data-consistency-test-results-$TIMESTAMP.json"
    
    cd "$SCRIPT_DIR"
    
    npm test -- --testPathPattern=data/consistency-validation --outputFile="$test_results_file" --runInBand
    
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        success "Data consistency tests passed"
    else
        error "Data consistency tests failed with exit code $exit_code"
    fi
    
    return $exit_code
}

# Run external integration tests
run_external_integration_tests() {
    log "Running external integration tests..."
    
    local test_results_file="$TEST_RESULTS_DIR/external-integration-test-results-$TIMESTAMP.json"
    
    cd "$SCRIPT_DIR"
    
    npm test -- --testPathPattern=external/system-integrations --outputFile="$test_results_file" --runInBand
    
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        success "External integration tests passed"
    else
        error "External integration tests failed with exit code $exit_code"
    fi
    
    return $exit_code
}

# Generate comprehensive test report
generate_test_report() {
    if [ "$GENERATE_REPORT" != "true" ]; then
        return 0
    fi
    
    log "Generating comprehensive test report..."
    
    local report_file="$TEST_RESULTS_DIR/test-report-$TIMESTAMP.html"
    local summary_file="$TEST_RESULTS_DIR/test-summary-$TIMESTAMP.json"
    
    # Create test summary
    cat > "$summary_file" << EOF
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "environment": "$ENVIRONMENT",
  "test_types": "$TEST_TYPES",
  "parallel_execution": $PARALLEL_TESTS,
  "services": {
    "api_base_url": "$API_BASE_URL",
    "websocket_url": "$WS_URL"
  },
  "results": {
    "unit_tests": $([ -f "$TEST_RESULTS_DIR/unit-test-results-$TIMESTAMP.json" ] && echo "true" || echo "false"),
    "integration_tests": $([ -f "$TEST_RESULTS_DIR/integration-test-results-$TIMESTAMP.json" ] && echo "true" || echo "false"),
    "e2e_tests": $([ -f "$TEST_RESULTS_DIR/e2e-test-results-$TIMESTAMP.json" ] && echo "true" || echo "false"),
    "performance_tests": $([ -d "$TEST_RESULTS_DIR/performance-$TIMESTAMP" ] && echo "true" || echo "false"),
    "contract_tests": $([ -f "$TEST_RESULTS_DIR/contract-test-results-$TIMESTAMP.json" ] && echo "true" || echo "false"),
    "data_consistency_tests": $([ -f "$TEST_RESULTS_DIR/data-consistency-test-results-$TIMESTAMP.json" ] && echo "true" || echo "false"),
    "external_integration_tests": $([ -f "$TEST_RESULTS_DIR/external-integration-test-results-$TIMESTAMP.json" ] && echo "true" || echo "false")
  }
}
EOF

    # Generate HTML report
    cat > "$report_file" << EOF
<!DOCTYPE html>
<html>
<head>
    <title>DevFlow Intelligence Test Report - $TIMESTAMP</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f0f0f0; padding: 20px; border-radius: 5px; }
        .section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .success { background: #d4edda; border-color: #c3e6cb; }
        .error { background: #f8d7da; border-color: #f5c6cb; }
        .warning { background: #fff3cd; border-color: #ffeaa7; }
        .metric { display: inline-block; margin: 10px; padding: 10px; background: #e9ecef; border-radius: 3px; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background: #f2f2f2; }
    </style>
</head>
<body>
    <div class="header">
        <h1>DevFlow Intelligence Test Report</h1>
        <p><strong>Timestamp:</strong> $(date)</p>
        <p><strong>Environment:</strong> $ENVIRONMENT</p>
        <p><strong>Test Types:</strong> $TEST_TYPES</p>
    </div>
    
    <div class="section">
        <h2>Test Execution Summary</h2>
        <div class="metric">Total Test Suites: $(find "$TEST_RESULTS_DIR" -name "*test-results-$TIMESTAMP.json" | wc -l)</div>
        <div class="metric">Execution Time: $(date)</div>
        <div class="metric">Parallel Execution: $PARALLEL_TESTS</div>
    </div>
    
    <div class="section">
        <h2>Service Configuration</h2>
        <table>
            <tr><th>Service</th><th>URL</th><th>Status</th></tr>
            <tr><td>API Gateway</td><td>$API_BASE_URL</td><td>$(curl -f -s "$API_BASE_URL/health" > /dev/null && echo "✅ Online" || echo "❌ Offline")</td></tr>
            <tr><td>WebSocket</td><td>$WS_URL</td><td>$(echo "⚠️ Not tested")</td></tr>
        </table>
    </div>
    
    <div class="section">
        <h2>Test Results</h2>
        <p>Detailed results are available in the individual test result files.</p>
        <ul>
EOF

    # Add links to result files
    for result_file in "$TEST_RESULTS_DIR"/*test-results-$TIMESTAMP.json; do
        if [ -f "$result_file" ]; then
            local filename=$(basename "$result_file")
            echo "            <li><a href=\"$filename\">$filename</a></li>" >> "$report_file"
        fi
    done

    cat >> "$report_file" << EOF
        </ul>
    </div>
    
    <div class="section">
        <h2>Performance Metrics</h2>
        <p>Performance test results are available in the performance directory.</p>
    </div>
</body>
</html>
EOF

    success "Test report generated: $report_file"
}

# Cleanup test environment
cleanup_test_environment() {
    log "Cleaning up test environment..."
    
    if [ -f "$SCRIPT_DIR/scripts/teardown-test-env.js" ]; then
        node "$SCRIPT_DIR/scripts/teardown-test-env.js"
    fi
    
    success "Test environment cleanup complete"
}

# Upload results (if configured)
upload_results() {
    if [ "$UPLOAD_RESULTS" != "true" ]; then
        return 0
    fi
    
    log "Uploading test results..."
    
    # This would typically upload to a test results dashboard or CI/CD system
    # For now, just log the action
    info "Results would be uploaded to test dashboard"
    
    success "Results upload complete"
}

# Main execution function
main() {
    local overall_exit_code=0
    
    log "Starting DevFlow Intelligence Integration Test Suite"
    info "Test Types: $TEST_TYPES"
    info "Environment: $ENVIRONMENT"
    info "Parallel Tests: $PARALLEL_TESTS"
    
    # Setup
    setup_test_environment || exit 1
    
    # Run tests based on configuration
    case "$TEST_TYPES" in
        "unit")
            run_unit_tests || overall_exit_code=1
            ;;
        "integration")
            run_integration_tests || overall_exit_code=1
            ;;
        "e2e")
            run_e2e_tests || overall_exit_code=1
            ;;
        "performance")
            run_performance_tests || overall_exit_code=1
            ;;
        "contract")
            run_contract_tests || overall_exit_code=1
            ;;
        "data")
            run_data_consistency_tests || overall_exit_code=1
            ;;
        "external")
            run_external_integration_tests || overall_exit_code=1
            ;;
        "all"|*)
            # Run all test types
            run_unit_tests || overall_exit_code=1
            run_integration_tests || overall_exit_code=1
            run_e2e_tests || overall_exit_code=1
            run_contract_tests || overall_exit_code=1
            run_data_consistency_tests || overall_exit_code=1
            run_external_integration_tests || overall_exit_code=1
            run_performance_tests || overall_exit_code=1
            ;;
    esac
    
    # Generate report
    generate_test_report
    
    # Upload results
    upload_results
    
    # Cleanup
    cleanup_test_environment
    
    # Final status
    if [ $overall_exit_code -eq 0 ]; then
        success "All tests completed successfully! ✅"
    else
        error "Some tests failed! ❌"
    fi
    
    return $overall_exit_code
}

# Script usage
usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Options:
    -t, --type TYPE         Test type: all, unit, integration, e2e, performance, contract, data, external (default: all)
    -e, --env ENV          Environment: test, staging, production (default: test)
    -p, --parallel         Run tests in parallel (default: false)
    -r, --report           Generate HTML report (default: true)
    -u, --upload           Upload results to dashboard (default: false)
    -h, --help             Show this help message

Environment Variables:
    API_BASE_URL           Base URL for API testing (default: http://localhost:3001)
    WS_URL                 WebSocket URL for testing (default: ws://localhost:3001)
    TEST_TYPES             Test types to run (default: all)
    ENVIRONMENT            Test environment (default: test)
    PARALLEL_TESTS         Run tests in parallel (default: false)
    GENERATE_REPORT        Generate test report (default: true)
    UPLOAD_RESULTS         Upload results (default: false)

Examples:
    $0                                    # Run all tests
    $0 --type performance                 # Run only performance tests
    $0 --type integration --parallel      # Run integration tests in parallel
    $0 --env staging --report             # Run tests in staging with report

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -t|--type)
            TEST_TYPES="$2"
            shift 2
            ;;
        -e|--env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -p|--parallel)
            PARALLEL_TESTS="true"
            shift
            ;;
        -r|--report)
            GENERATE_REPORT="true"
            shift
            ;;
        -u|--upload)
            UPLOAD_RESULTS="true"
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Set trap for cleanup on exit
trap cleanup_test_environment EXIT INT TERM

# Run main function
main "$@"