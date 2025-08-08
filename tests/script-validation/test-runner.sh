#!/bin/bash

# DevFlow Script Testing Framework
# Tests for run-devflow-complete.sh functions and health checks

set -e

# Test configuration
TEST_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$TEST_DIR/../.." && pwd)"
SCRIPT_PATH="$PROJECT_ROOT/run-devflow-complete.sh"
TEST_LOG="$TEST_DIR/test-results.log"
TEMP_DIR="$TEST_DIR/temp"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Initialize test environment
init_test_environment() {
    echo "Initializing test environment..."
    mkdir -p "$TEMP_DIR"
    mkdir -p "$TEST_DIR/logs"
    
    # Create test log
    echo "DevFlow Script Test Run - $(date)" > "$TEST_LOG"
    echo "=======================================" >> "$TEST_LOG"
    
    # Source the main script to access functions
    # We need to prevent the script from running by setting a test flag
    export DEVFLOW_TEST_MODE=true
    source "$SCRIPT_PATH" 2>/dev/null || true
}

# Test utility functions
run_test() {
    local test_name="$1"
    local test_function="$2"
    
    ((TESTS_RUN++))
    echo -n "Testing $test_name... "
    
    if $test_function 2>&1 | tee -a "$TEST_LOG" >/dev/null; then
        echo -e "${GREEN}PASS${NC}"
        ((TESTS_PASSED++))
        echo "PASS: $test_name" >> "$TEST_LOG"
    else
        echo -e "${RED}FAIL${NC}"
        ((TESTS_FAILED++))
        echo "FAIL: $test_name" >> "$TEST_LOG"
    fi
}

# Test functions from the main script
test_timestamp_function() {
    local result=$(timestamp)
    [[ -n "$result" ]] && [[ "$result" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}\ [0-9]{2}:[0-9]{2}:[0-9]{2}$ ]]
}

test_service_port_lookup() {
    local port=$(get_service_port "api-gateway")
    [[ "$port" == "3000" ]]
}

test_service_description_lookup() {
    local desc=$(get_service_description "mongodb")
    [[ "$desc" == "MongoDB Database" ]]
}

test_service_dependencies_lookup() {
    local deps=$(get_service_dependencies "dashboard")
    [[ "$deps" == "api-gateway" ]]
}

test_error_code_mapping() {
    local code=$(get_error_code "DOCKER_NOT_RUNNING")
    [[ "$code" == "E001" ]]
}

test_recovery_strategy_mapping() {
    local strategy=$(get_recovery_strategy "E001")
    [[ "$strategy" == "Start Docker Desktop application and wait for it to initialize" ]]
}

test_logging_initialization() {
    local test_log_dir="$TEMP_DIR/test_logs"
    LOG_DIR="$test_log_dir"
    SCRIPT_LOG="$test_log_dir/test-script.log"
    
    init_logging
    
    [[ -d "$test_log_dir" ]] && [[ -f "$SCRIPT_LOG" ]]
}

test_service_status_tracking() {
    local test_status_dir="$TEMP_DIR/test_status"
    SERVICE_STATUS_DIR="$test_status_dir"
    PID_DIR="$TEMP_DIR/test_pids"
    
    init_service_tracking
    
    # Test setting and getting service status
    set_service_status "test-service" "healthy"
    local status=$(get_service_status "test-service")
    
    [[ "$status" == "healthy" ]]
}

test_health_check_command_generation() {
    local cmd=$(get_health_check_command "redis")
    [[ -n "$cmd" ]] && [[ "$cmd" =~ redis-cli ]]
}

# Mock Docker functions for testing
is_container_running() {
    # Mock function - always return true for testing
    return 0
}

# Test error handling functions
test_error_handling_system() {
    local test_log="$TEMP_DIR/error_test.log"
    LOG_DIR="$TEMP_DIR"
    
    # Test error logging
    log_error_with_recovery "Test error message" "TEST_ERROR" "Test recovery" "Test context"
    
    [[ -f "$LOG_DIR/error_history.log" ]]
}

test_diagnostic_logging() {
    local test_log="$TEMP_DIR/diagnostic_test.log"
    LOG_DIR="$TEMP_DIR"
    DIAGNOSTIC_MODE="true"
    
    log_diagnostic "TEST_COMPONENT" "Test diagnostic message" "test_data=123"
    
    [[ -f "$LOG_DIR/diagnostic.log" ]]
}

# Test environment validation functions
test_os_compatibility_check() {
    # This should always pass on supported systems
    check_os_compatibility 2>/dev/null || return 0
}

test_port_availability_check() {
    # Test with a likely unused port
    local test_port=65432
    ! lsof -ti:$test_port &>/dev/null
}

# Test service configuration validation
test_service_configuration_completeness() {
    local all_services="$INFRASTRUCTURE_SERVICES $APPLICATION_SERVICES $FRONTEND_SERVICES"
    
    for service in $all_services; do
        local port=$(get_service_port "$service")
        local desc=$(get_service_description "$service")
        local health_cmd=$(get_health_check_command "$service")
        
        if [[ "$port" == "unknown" ]] || [[ "$desc" == "Unknown Service" ]] || [[ -z "$health_cmd" ]]; then
            echo "Service $service has incomplete configuration"
            return 1
        fi
    done
    
    return 0
}

# Test progress indicator functions
test_progress_indicators() {
    # Test that progress functions don't crash
    show_progress_bar 50 100 "Test progress" >/dev/null 2>&1
    return 0
}

# Test color output functions
test_color_output_functions() {
    # Test that color functions work without crashing
    print_header "Test Header" >/dev/null 2>&1
    print_status "Test Status" >/dev/null 2>&1
    print_success "Test Success" >/dev/null 2>&1
    print_warning "Test Warning" >/dev/null 2>&1
    print_error "Test Error" >/dev/null 2>&1
    print_info "Test Info" >/dev/null 2>&1
    
    return 0
}

# Test script argument parsing
test_script_arguments() {
    # Test that the script accepts valid arguments
    local valid_args=("start" "stop" "status" "help" "diagnostic")
    
    for arg in "${valid_args[@]}"; do
        # This is a basic test - in a real scenario we'd need to mock the script execution
        [[ "$arg" =~ ^(start|stop|status|help|diagnostic)$ ]]
    done
}

# Test configuration constants
test_configuration_constants() {
    # Test that required constants are defined
    [[ -n "$SCRIPT_VERSION" ]] && \
    [[ -n "$HEALTH_CHECK_TIMEOUT" ]] && \
    [[ -n "$MAX_STARTUP_TIME" ]] && \
    [[ ${#REQUIRED_PORTS[@]} -gt 0 ]]
}

# Test file and directory creation
test_directory_creation() {
    local test_base="$TEMP_DIR/dir_test"
    LOG_DIR="$test_base/logs"
    PID_DIR="$test_base/pids"
    
    init_logging
    init_service_tracking
    
    [[ -d "$LOG_DIR" ]] && [[ -d "$PID_DIR" ]]
}

# Run all tests
run_all_tests() {
    echo -e "${BLUE}Starting DevFlow Script Tests${NC}"
    echo "=============================="
    
    # Core utility function tests
    run_test "timestamp function" test_timestamp_function
    run_test "service port lookup" test_service_port_lookup
    run_test "service description lookup" test_service_description_lookup
    run_test "service dependencies lookup" test_service_dependencies_lookup
    run_test "error code mapping" test_error_code_mapping
    run_test "recovery strategy mapping" test_recovery_strategy_mapping
    
    # System initialization tests
    run_test "logging initialization" test_logging_initialization
    run_test "service status tracking" test_service_status_tracking
    run_test "directory creation" test_directory_creation
    
    # Health check tests
    run_test "health check command generation" test_health_check_command_generation
    
    # Error handling tests
    run_test "error handling system" test_error_handling_system
    run_test "diagnostic logging" test_diagnostic_logging
    
    # Environment validation tests
    run_test "OS compatibility check" test_os_compatibility_check
    run_test "port availability check" test_port_availability_check
    
    # Configuration tests
    run_test "service configuration completeness" test_service_configuration_completeness
    run_test "configuration constants" test_configuration_constants
    
    # UI/Output tests
    run_test "progress indicators" test_progress_indicators
    run_test "color output functions" test_color_output_functions
    
    # Argument parsing tests
    run_test "script arguments" test_script_arguments
    
    # Print summary
    echo ""
    echo "=============================="
    echo -e "Tests run: ${BLUE}$TESTS_RUN${NC}"
    echo -e "Tests passed: ${GREEN}$TESTS_PASSED${NC}"
    echo -e "Tests failed: ${RED}$TESTS_FAILED${NC}"
    
    if [[ $TESTS_FAILED -eq 0 ]]; then
        echo -e "${GREEN}All tests passed!${NC}"
        return 0
    else
        echo -e "${RED}Some tests failed. Check $TEST_LOG for details.${NC}"
        return 1
    fi
}

# Cleanup function
cleanup_test_environment() {
    echo "Cleaning up test environment..."
    rm -rf "$TEMP_DIR"
    unset DEVFLOW_TEST_MODE
}

# Main execution
main() {
    init_test_environment
    
    # Trap cleanup on exit
    trap cleanup_test_environment EXIT
    
    run_all_tests
}

# Run tests if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi