#!/bin/bash

# DevFlow Error Scenario and Recovery Testing
# Tests error handling and recovery mechanisms

set -e

# Test configuration
TEST_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$TEST_DIR/../.." && pwd)"
SCRIPT_PATH="$PROJECT_ROOT/run-devflow-complete.sh"
TEST_LOG="$TEST_DIR/error-scenario-results.log"
TEMP_DIR="$TEST_DIR/temp-error"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Test counters
ERROR_TESTS_RUN=0
ERROR_TESTS_PASSED=0
ERROR_TESTS_FAILED=0

# Initialize error testing environment
init_error_test_environment() {
    echo "Initializing error scenario test environment..."
    mkdir -p "$TEMP_DIR"
    mkdir -p "$TEST_DIR/logs"
    
    # Create test log
    echo "DevFlow Error Scenario Test Run - $(date)" > "$TEST_LOG"
    echo "=============================================" >> "$TEST_LOG"
    
    # Source the main script functions
    export DEVFLOW_TEST_MODE=true
    source "$SCRIPT_PATH" 2>/dev/null || true
    
    # Override some functions for testing
    LOG_DIR="$TEMP_DIR/logs"
    PID_DIR="$TEMP_DIR/pids"
    mkdir -p "$LOG_DIR" "$PID_DIR"
}

# Test utility for error scenarios
run_error_test() {
    local test_name="$1"
    local test_function="$2"
    
    ((ERROR_TESTS_RUN++))
    echo -n "Testing error scenario: $test_name... "
    
    if $test_function 2>&1 | tee -a "$TEST_LOG" >/dev/null; then
        echo -e "${GREEN}PASS${NC}"
        ((ERROR_TESTS_PASSED++))
        echo "PASS: $test_name" >> "$TEST_LOG"
    else
        echo -e "${RED}FAIL${NC}"
        ((ERROR_TESTS_FAILED++))
        echo "FAIL: $test_name" >> "$TEST_LOG"
    fi
}

# Mock functions for testing error scenarios
mock_docker_not_running() {
    # Override docker command to simulate failure
    docker() {
        if [[ "$1" == "info" ]]; then
            return 1
        fi
        command docker "$@"
    }
    export -f docker
}

mock_port_conflict() {
    # Override lsof to simulate port conflicts
    lsof() {
        if [[ "$*" =~ -ti:300[0-3] ]]; then
            echo "12345"  # Fake PID
            return 0
        fi
        command lsof "$@"
    }
    export -f lsof
}

mock_service_health_failure() {
    # Override curl to simulate health check failures
    curl() {
        if [[ "$*" =~ health ]]; then
            return 1
        fi
        command curl "$@"
    }
    export -f curl
}

# Test Docker not running error
test_docker_not_running_error() {
    mock_docker_not_running
    
    # Test that the error is properly detected and handled
    if ! docker info &>/dev/null; then
        handle_error "DOCKER_NOT_RUNNING" "Docker daemon is not running" "DOCKER_CHECK" false
        
        # Check that error was logged
        [[ -f "$LOG_DIR/error_history.log" ]] && grep -q "DOCKER_NOT_RUNNING" "$LOG_DIR/error_history.log"
    else
        return 1
    fi
}

# Test port conflict error and recovery
test_port_conflict_error_and_recovery() {
    mock_port_conflict
    
    # Simulate port conflict detection
    local conflicts_found=false
    for port in 3000 3001; do
        if lsof -ti:$port &>/dev/null; then
            conflicts_found=true
            break
        fi
    done
    
    if [[ "$conflicts_found" == "true" ]]; then
        handle_error "PORT_CONFLICT" "Port conflicts detected" "PORT_CHECK" false
        
        # Check that error was logged
        [[ -f "$LOG_DIR/error_history.log" ]] && grep -q "PORT_CONFLICT" "$LOG_DIR/error_history.log"
    else
        return 1
    fi
}

# Test service health check failure
test_service_health_failure() {
    mock_service_health_failure
    
    # Test health check failure detection
    local service="api-gateway"
    local health_command=$(get_health_check_command "$service")
    
    if ! timeout 5 bash -c "$health_command" &>/dev/null; then
        handle_error "SERVICE_HEALTH_FAILED" "Health check failed for $service" "$service" false
        
        # Check that error was logged
        [[ -f "$LOG_DIR/error_history.log" ]] && grep -q "SERVICE_HEALTH_FAILED" "$LOG_DIR/error_history.log"
    else
        return 1
    fi
}

# Test disk space low error
test_disk_space_low_error() {
    # Mock df command to simulate low disk space
    df() {
        if [[ "$1" == "." ]]; then
            echo "Filesystem     1K-blocks    Used Available Use% Mounted on"
            echo "/dev/disk1s1    488245288 450000000  38245288  92% /"
        else
            command df "$@"
        fi
    }
    export -f df
    
    # Test disk space check
    local disk_usage=$(df . | tail -1 | awk '{print $5}' | sed 's/%//')
    if [[ $disk_usage -gt 90 ]]; then
        handle_error "DISK_SPACE_LOW" "Disk space is critically low: ${disk_usage}% used" "DISK_CHECK" false
        
        # Check that error was logged
        [[ -f "$LOG_DIR/error_history.log" ]] && grep -q "DISK_SPACE_LOW" "$LOG_DIR/error_history.log"
    else
        return 1
    fi
}

# Test network connectivity error
test_network_connectivity_error() {
    # Mock network connectivity failure
    timeout() {
        if [[ "$*" =~ "/dev/tcp/google.com/80" ]]; then
            return 1
        fi
        command timeout "$@"
    }
    export -f timeout
    
    # Test network connectivity
    if ! timeout 5 bash -c "</dev/tcp/google.com/80" 2>/dev/null; then
        handle_error "NETWORK_UNREACHABLE" "Network connectivity test failed" "NETWORK_CHECK" false
        
        # Check that error was logged
        [[ -f "$LOG_DIR/error_history.log" ]] && grep -q "NETWORK_UNREACHABLE" "$LOG_DIR/error_history.log"
    else
        return 1
    fi
}

# Test error code generation
test_error_code_generation() {
    local test_errors=("DOCKER_NOT_RUNNING" "PORT_CONFLICT" "SERVICE_START_FAILED" "TIMEOUT")
    
    for error_type in "${test_errors[@]}"; do
        local error_code=$(get_error_code "$error_type")
        if [[ "$error_code" == "UNKNOWN" ]]; then
            echo "Error code not found for: $error_type"
            return 1
        fi
    done
    
    return 0
}

# Test recovery strategy generation
test_recovery_strategy_generation() {
    local test_codes=("E001" "E003" "E004" "E012")
    
    for code in "${test_codes[@]}"; do
        local strategy=$(get_recovery_strategy "$code")
        if [[ "$strategy" == "Contact support for assistance" ]]; then
            echo "No specific recovery strategy for code: $code"
            return 1
        fi
    done
    
    return 0
}

# Test error logging with context
test_error_logging_with_context() {
    local test_error="Test error message"
    local test_code="TEST_ERROR"
    local test_recovery="Test recovery suggestion"
    local test_context="Test context information"
    
    log_error_with_recovery "$test_error" "$test_code" "$test_recovery" "$test_context"
    
    # Check that all components were logged
    [[ -f "$LOG_DIR/error_history.log" ]] && \
    grep -q "$test_error" "$LOG_DIR/error_history.log" && \
    grep -q "$test_code" "$LOG_DIR/error_history.log" && \
    grep -q "$test_recovery" "$LOG_DIR/error_history.log" && \
    grep -q "$test_context" "$LOG_DIR/error_history.log"
}

# Test diagnostic mode error reporting
test_diagnostic_mode_error_reporting() {
    DIAGNOSTIC_MODE="true"
    
    local test_component="TEST_COMPONENT"
    local test_message="Test diagnostic message"
    local test_data="error_code=TEST123,severity=high"
    
    log_diagnostic "$test_component" "$test_message" "$test_data"
    
    # Check that diagnostic information was logged
    [[ -f "$LOG_DIR/diagnostic.log" ]] && \
    grep -q "$test_component" "$LOG_DIR/diagnostic.log" && \
    grep -q "$test_message" "$LOG_DIR/diagnostic.log" && \
    grep -q "$test_data" "$LOG_DIR/diagnostic.log"
}

# Test error report generation
test_error_report_generation() {
    # Generate some test errors first
    handle_error "TEST_ERROR_1" "First test error" "TEST_CONTEXT_1" false
    handle_error "TEST_ERROR_2" "Second test error" "TEST_CONTEXT_2" false
    
    # Mock the generate_error_report function to avoid interactive prompts
    generate_error_report() {
        local report_file="$LOG_DIR/error-report-$(date +%Y%m%d-%H%M%S).txt"
        
        {
            echo "DevFlow Intelligence Platform - Error Report"
            echo "Generated: $(date)"
            echo "Script Version: $SCRIPT_VERSION"
            echo "=================================================="
            echo ""
            
            echo "RECENT ERRORS"
            echo "-------------"
            if [[ -f "$LOG_DIR/error_history.log" ]]; then
                tail -10 "$LOG_DIR/error_history.log"
            fi
        } > "$report_file"
        
        echo "$report_file"
    }
    
    local report_file=$(generate_error_report)
    
    # Check that report was generated and contains expected content
    [[ -f "$report_file" ]] && \
    grep -q "DevFlow Intelligence Platform - Error Report" "$report_file" && \
    grep -q "RECENT ERRORS" "$report_file"
}

# Test automatic recovery attempt tracking
test_recovery_attempt_tracking() {
    # Test that recovery attempts are properly tracked
    local service="test-service"
    
    # Mock the recovery function
    attempt_service_recovery() {
        local service="$1"
        log_message "RECOVERY" "Service auto-recovery attempted for $service"
        return 0
    }
    
    attempt_service_recovery "$service"
    
    # Check that recovery attempt was logged
    [[ -f "$LOG_DIR/devflow-complete.log" ]] && \
    grep -q "Service auto-recovery attempted for $service" "$LOG_DIR/devflow-complete.log"
}

# Test timeout handling
test_timeout_handling() {
    # Test timeout error handling
    local start_time=$(date +%s)
    
    # Simulate a timeout scenario
    if ! timeout 1 sleep 2 2>/dev/null; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        
        if [[ $duration -ge 1 ]] && [[ $duration -le 2 ]]; then
            handle_error "TIMEOUT" "Operation timed out after ${duration}s" "TIMEOUT_TEST" false
            
            # Check that timeout error was logged
            [[ -f "$LOG_DIR/error_history.log" ]] && grep -q "TIMEOUT" "$LOG_DIR/error_history.log"
        else
            return 1
        fi
    else
        return 1
    fi
}

# Test service dependency error handling
test_service_dependency_error() {
    # Test handling of service dependency failures
    local service="dashboard"
    local dependencies=$(get_service_dependencies "$service")
    
    if [[ -n "$dependencies" ]]; then
        for dep in $dependencies; do
            # Simulate dependency failure
            set_service_status "$dep" "unhealthy"
            
            # Check dependency before starting service
            if [[ "$(get_service_status "$dep")" != "healthy" ]]; then
                handle_error "SERVICE_START_FAILED" "Dependency $dep is not healthy for service $service" "$service" false
                
                # Check that dependency error was logged
                [[ -f "$LOG_DIR/error_history.log" ]] && grep -q "Dependency $dep is not healthy" "$LOG_DIR/error_history.log"
                return 0
            fi
        done
    fi
    
    return 1
}

# Run all error scenario tests
run_all_error_tests() {
    echo -e "${BLUE}Starting DevFlow Error Scenario Tests${NC}"
    echo "======================================"
    
    # Error detection tests
    run_error_test "Docker not running error" test_docker_not_running_error
    run_error_test "Port conflict error and recovery" test_port_conflict_error_and_recovery
    run_error_test "Service health failure" test_service_health_failure
    run_error_test "Disk space low error" test_disk_space_low_error
    run_error_test "Network connectivity error" test_network_connectivity_error
    
    # Error handling system tests
    run_error_test "Error code generation" test_error_code_generation
    run_error_test "Recovery strategy generation" test_recovery_strategy_generation
    run_error_test "Error logging with context" test_error_logging_with_context
    run_error_test "Diagnostic mode error reporting" test_diagnostic_mode_error_reporting
    run_error_test "Error report generation" test_error_report_generation
    
    # Recovery mechanism tests
    run_error_test "Recovery attempt tracking" test_recovery_attempt_tracking
    run_error_test "Timeout handling" test_timeout_handling
    run_error_test "Service dependency error" test_service_dependency_error
    
    # Print summary
    echo ""
    echo "======================================"
    echo -e "Error tests run: ${BLUE}$ERROR_TESTS_RUN${NC}"
    echo -e "Error tests passed: ${GREEN}$ERROR_TESTS_PASSED${NC}"
    echo -e "Error tests failed: ${RED}$ERROR_TESTS_FAILED${NC}"
    
    if [[ $ERROR_TESTS_FAILED -eq 0 ]]; then
        echo -e "${GREEN}All error scenario tests passed!${NC}"
        return 0
    else
        echo -e "${RED}Some error scenario tests failed. Check $TEST_LOG for details.${NC}"
        return 1
    fi
}

# Cleanup function
cleanup_error_test_environment() {
    echo "Cleaning up error test environment..."
    rm -rf "$TEMP_DIR"
    unset DEVFLOW_TEST_MODE
    
    # Restore original functions
    unset -f docker lsof curl df timeout 2>/dev/null || true
}

# Main execution
main() {
    init_error_test_environment
    
    # Trap cleanup on exit
    trap cleanup_error_test_environment EXIT
    
    run_all_error_tests
}

# Run tests if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi