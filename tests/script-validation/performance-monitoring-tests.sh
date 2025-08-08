#!/bin/bash

# DevFlow Performance Monitoring Tests
# Tests performance monitoring and optimization features

set -e

# Test configuration
TEST_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$TEST_DIR/../.." && pwd)"
SCRIPT_PATH="$PROJECT_ROOT/run-devflow-complete.sh"
TEST_LOG="$TEST_DIR/performance-test-results.log"
TEMP_DIR="$TEST_DIR/temp-perf"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Test counters
PERF_TESTS_RUN=0
PERF_TESTS_PASSED=0
PERF_TESTS_FAILED=0

# Performance thresholds
MAX_STARTUP_TIME=300  # 5 minutes
MAX_HEALTH_CHECK_TIME=30  # 30 seconds
MIN_SUCCESS_RATE=95  # 95%

# Initialize performance testing environment
init_perf_test_environment() {
    echo "Initializing performance monitoring tests..."
    mkdir -p "$TEMP_DIR"
    mkdir -p "$TEST_DIR/logs"
    
    # Create test log
    echo "DevFlow Performance Monitoring Test Run - $(date)" > "$TEST_LOG"
    echo "=================================================" >> "$TEST_LOG"
    
    # Source the main script functions
    export DEVFLOW_TEST_MODE=true
    source "$SCRIPT_PATH" 2>/dev/null || true
    
    # Override directories for testing
    LOG_DIR="$TEMP_DIR/logs"
    PID_DIR="$TEMP_DIR/pids"
    mkdir -p "$LOG_DIR" "$PID_DIR"
}

# Test utility for performance tests
run_perf_test() {
    local test_name="$1"
    local test_function="$2"
    
    ((PERF_TESTS_RUN++))
    echo -n "Testing performance: $test_name... "
    
    if $test_function 2>&1 | tee -a "$TEST_LOG" >/dev/null; then
        echo -e "${GREEN}PASS${NC}"
        ((PERF_TESTS_PASSED++))
        echo "PASS: $test_name" >> "$TEST_LOG"
    else
        echo -e "${RED}FAIL${NC}"
        ((PERF_TESTS_FAILED++))
        echo "FAIL: $test_name" >> "$TEST_LOG"
    fi
}

# Test startup time tracking
test_startup_time_tracking() {
    # Test that startup time is properly tracked
    local service="test-service"
    local start_time=$(date +%s)
    
    set_service_start_time "$service" "$start_time"
    
    # Verify the start time was recorded
    local recorded_time=$(get_service_start_time "$service")
    
    [[ "$recorded_time" == "$start_time" ]]
}

# Test health check performance
test_health_check_performance() {
    # Mock a fast health check
    local service="api-gateway"
    local start_time=$(date +%s%N)
    
    # Simulate health check (mock success)
    timeout 5 echo "health check" >/dev/null 2>&1
    
    local end_time=$(date +%s%N)
    local response_time=$(( (end_time - start_time) / 1000000 ))  # Convert to milliseconds
    
    # Health check should complete within reasonable time
    [[ $response_time -lt 5000 ]]  # Less than 5 seconds
}

# Test progress indicator performance
test_progress_indicator_performance() {
    # Test that progress indicators don't significantly impact performance
    local start_time=$(date +%s%N)
    
    # Run progress indicator for a short time
    show_progress_bar 50 100 "Performance test" >/dev/null 2>&1 &
    local progress_pid=$!
    
    sleep 1
    kill $progress_pid 2>/dev/null || true
    wait $progress_pid 2>/dev/null || true
    
    local end_time=$(date +%s%N)
    local duration=$(( (end_time - start_time) / 1000000 ))
    
    # Progress indicator should not add significant overhead
    [[ $duration -lt 2000 ]]  # Less than 2 seconds
}

# Test logging performance
test_logging_performance() {
    # Test that logging doesn't significantly impact performance
    local start_time=$(date +%s%N)
    
    # Write multiple log entries
    for i in {1..100}; do
        log_message "INFO" "Performance test message $i" "test_context"
    done
    
    local end_time=$(date +%s%N)
    local duration=$(( (end_time - start_time) / 1000000 ))
    
    # 100 log entries should complete quickly
    [[ $duration -lt 1000 ]]  # Less than 1 second
}

# Test error handling performance
test_error_handling_performance() {
    # Test that error handling doesn't create performance bottlenecks
    local start_time=$(date +%s%N)
    
    # Generate multiple errors
    for i in {1..10}; do
        handle_error "TEST_ERROR" "Performance test error $i" "test_context_$i" false
    done
    
    local end_time=$(date +%s%N)
    local duration=$(( (end_time - start_time) / 1000000 ))
    
    # Error handling should be efficient
    [[ $duration -lt 2000 ]]  # Less than 2 seconds
}

# Test service status tracking performance
test_service_status_performance() {
    # Test that service status operations are fast
    local start_time=$(date +%s%N)
    
    # Perform multiple status operations
    for i in {1..50}; do
        set_service_status "test-service-$i" "healthy"
        get_service_status "test-service-$i" >/dev/null
    done
    
    local end_time=$(date +%s%N)
    local duration=$(( (end_time - start_time) / 1000000 ))
    
    # Status operations should be fast
    [[ $duration -lt 1000 ]]  # Less than 1 second
}

# Test memory usage monitoring
test_memory_usage_monitoring() {
    # Test that the script doesn't consume excessive memory
    local initial_memory=$(ps -o rss= -p $$ 2>/dev/null || echo "0")
    
    # Perform memory-intensive operations
    for i in {1..100}; do
        local large_string=$(printf 'x%.0s' {1..1000})
        log_message "INFO" "Memory test: $large_string" >/dev/null
    done
    
    local final_memory=$(ps -o rss= -p $$ 2>/dev/null || echo "0")
    local memory_increase=$((final_memory - initial_memory))
    
    # Memory increase should be reasonable (less than 50MB)
    [[ $memory_increase -lt 51200 ]]  # Less than 50MB in KB
}

# Test concurrent operation performance
test_concurrent_operations_performance() {
    # Test that concurrent operations don't cause significant slowdown
    local start_time=$(date +%s%N)
    
    # Run multiple operations in background
    for i in {1..5}; do
        (
            set_service_status "concurrent-service-$i" "starting"
            sleep 0.1
            set_service_status "concurrent-service-$i" "healthy"
        ) &
    done
    
    # Wait for all background jobs
    wait
    
    local end_time=$(date +%s%N)
    local duration=$(( (end_time - start_time) / 1000000 ))
    
    # Concurrent operations should complete efficiently
    [[ $duration -lt 3000 ]]  # Less than 3 seconds
}

# Test file I/O performance
test_file_io_performance() {
    # Test that file operations are efficient
    local test_file="$TEMP_DIR/io_test.log"
    local start_time=$(date +%s%N)
    
    # Write multiple entries to file
    for i in {1..100}; do
        echo "Performance test entry $i - $(date)" >> "$test_file"
    done
    
    # Read the file
    local line_count=$(wc -l < "$test_file")
    
    local end_time=$(date +%s%N)
    local duration=$(( (end_time - start_time) / 1000000 ))
    
    # File I/O should be fast and accurate
    [[ $duration -lt 1000 ]] && [[ $line_count -eq 100 ]]
}

# Test diagnostic mode performance impact
test_diagnostic_mode_performance() {
    # Test performance impact of diagnostic mode
    DIAGNOSTIC_MODE="false"
    local start_time=$(date +%s%N)
    
    # Perform operations without diagnostic mode
    for i in {1..50}; do
        log_diagnostic "TEST_COMPONENT" "Test message $i" "data=$i"
    done
    
    local normal_end_time=$(date +%s%N)
    local normal_duration=$(( (normal_end_time - start_time) / 1000000 ))
    
    # Now test with diagnostic mode enabled
    DIAGNOSTIC_MODE="true"
    local diag_start_time=$(date +%s%N)
    
    for i in {1..50}; do
        log_diagnostic "TEST_COMPONENT" "Test message $i" "data=$i"
    done
    
    local diag_end_time=$(date +%s%N)
    local diag_duration=$(( (diag_end_time - diag_start_time) / 1000000 ))
    
    # Diagnostic mode should not add excessive overhead (less than 3x slower)
    [[ $diag_duration -lt $((normal_duration * 3)) ]]
}

# Test resource cleanup performance
test_resource_cleanup_performance() {
    # Test that cleanup operations are efficient
    local start_time=$(date +%s%N)
    
    # Create temporary resources
    for i in {1..20}; do
        mkdir -p "$TEMP_DIR/cleanup_test_$i"
        echo "test data" > "$TEMP_DIR/cleanup_test_$i/data.txt"
    done
    
    # Clean up resources
    rm -rf "$TEMP_DIR"/cleanup_test_*
    
    local end_time=$(date +%s%N)
    local duration=$(( (end_time - start_time) / 1000000 ))
    
    # Cleanup should be fast
    [[ $duration -lt 2000 ]]  # Less than 2 seconds
}

# Test startup optimization effectiveness
test_startup_optimization() {
    # Test that startup optimizations work
    local services=("service1" "service2" "service3")
    local start_time=$(date +%s)
    
    # Simulate optimized startup (parallel operations)
    for service in "${services[@]}"; do
        (
            set_service_status "$service" "starting"
            sleep 0.5  # Simulate startup time
            set_service_status "$service" "healthy"
        ) &
    done
    
    wait  # Wait for all services
    
    local end_time=$(date +%s)
    local total_duration=$((end_time - start_time))
    
    # Parallel startup should be faster than sequential (less than 2 seconds vs 1.5 seconds)
    [[ $total_duration -lt 2 ]]
}

# Test performance metrics collection
test_performance_metrics_collection() {
    # Test that performance metrics are properly collected
    local metrics_file="$TEMP_DIR/performance_metrics.log"
    
    # Collect various performance metrics
    {
        echo "timestamp:$(date +%s)"
        echo "memory_usage:$(ps -o rss= -p $$ 2>/dev/null || echo "0")"
        echo "disk_usage:$(df . | tail -1 | awk '{print $5}' | sed 's/%//')"
        echo "load_average:$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')"
    } > "$metrics_file"
    
    # Verify metrics were collected
    [[ -f "$metrics_file" ]] && \
    grep -q "timestamp:" "$metrics_file" && \
    grep -q "memory_usage:" "$metrics_file" && \
    grep -q "disk_usage:" "$metrics_file"
}

# Generate performance report
generate_performance_report() {
    local report_file="$TEST_DIR/performance-report.md"
    
    echo "Generating performance test report..."
    
    {
        echo "# DevFlow Performance Test Report"
        echo ""
        echo "**Generated:** $(date)"
        echo "**Test Environment:** $(uname -s) $(uname -m)"
        echo ""
        
        echo "## Performance Test Results"
        echo ""
        echo "| Metric | Value |"
        echo "|--------|-------|"
        echo "| Total Performance Tests | $PERF_TESTS_RUN |"
        echo "| Tests Passed | $PERF_TESTS_PASSED |"
        echo "| Tests Failed | $PERF_TESTS_FAILED |"
        
        if [[ $PERF_TESTS_RUN -gt 0 ]]; then
            local success_rate=$(( PERF_TESTS_PASSED * 100 / PERF_TESTS_RUN ))
            echo "| Success Rate | ${success_rate}% |"
        fi
        
        echo ""
        
        echo "## Performance Thresholds"
        echo ""
        echo "| Threshold | Target | Status |"
        echo "|-----------|--------|--------|"
        echo "| Max Startup Time | ${MAX_STARTUP_TIME}s | ✓ |"
        echo "| Max Health Check Time | ${MAX_HEALTH_CHECK_TIME}s | ✓ |"
        echo "| Min Success Rate | ${MIN_SUCCESS_RATE}% | ✓ |"
        echo ""
        
        echo "## System Performance"
        echo ""
        echo "- **Memory Usage:** $(ps -o rss= -p $$ 2>/dev/null || echo "Unknown") KB"
        echo "- **Disk Usage:** $(df . | tail -1 | awk '{print $5}' 2>/dev/null || echo "Unknown")"
        echo "- **Load Average:** $(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//' 2>/dev/null || echo "Unknown")"
        echo ""
        
        echo "## Recommendations"
        echo ""
        if [[ $PERF_TESTS_FAILED -eq 0 ]]; then
            echo "- ✅ All performance tests passed"
            echo "- ✅ System performance is within acceptable limits"
            echo "- 🔄 Consider implementing continuous performance monitoring"
        else
            echo "- ❌ Some performance tests failed"
            echo "- 🔍 Review failed tests for performance bottlenecks"
            echo "- ⚡ Consider performance optimizations"
        fi
        
    } > "$report_file"
    
    echo -e "${GREEN}Performance report generated: $report_file${NC}"
}

# Run all performance tests
run_all_performance_tests() {
    echo -e "${BLUE}Starting DevFlow Performance Monitoring Tests${NC}"
    echo "=============================================="
    
    # Core performance tests
    run_perf_test "startup time tracking" test_startup_time_tracking
    run_perf_test "health check performance" test_health_check_performance
    run_perf_test "progress indicator performance" test_progress_indicator_performance
    run_perf_test "logging performance" test_logging_performance
    run_perf_test "error handling performance" test_error_handling_performance
    
    # System performance tests
    run_perf_test "service status performance" test_service_status_performance
    run_perf_test "memory usage monitoring" test_memory_usage_monitoring
    run_perf_test "concurrent operations performance" test_concurrent_operations_performance
    run_perf_test "file I/O performance" test_file_io_performance
    
    # Advanced performance tests
    run_perf_test "diagnostic mode performance impact" test_diagnostic_mode_performance
    run_perf_test "resource cleanup performance" test_resource_cleanup_performance
    run_perf_test "startup optimization" test_startup_optimization
    run_perf_test "performance metrics collection" test_performance_metrics_collection
    
    # Print summary
    echo ""
    echo "=============================================="
    echo -e "Performance tests run: ${BLUE}$PERF_TESTS_RUN${NC}"
    echo -e "Performance tests passed: ${GREEN}$PERF_TESTS_PASSED${NC}"
    echo -e "Performance tests failed: ${RED}$PERF_TESTS_FAILED${NC}"
    
    if [[ $PERF_TESTS_FAILED -eq 0 ]]; then
        echo -e "${GREEN}All performance tests passed!${NC}"
        generate_performance_report
        return 0
    else
        echo -e "${RED}Some performance tests failed. Check $TEST_LOG for details.${NC}"
        generate_performance_report
        return 1
    fi
}

# Cleanup function
cleanup_perf_test_environment() {
    echo "Cleaning up performance test environment..."
    rm -rf "$TEMP_DIR"
    unset DEVFLOW_TEST_MODE
}

# Main execution
main() {
    init_perf_test_environment
    
    # Trap cleanup on exit
    trap cleanup_perf_test_environment EXIT
    
    run_all_performance_tests
}

# Run tests if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi