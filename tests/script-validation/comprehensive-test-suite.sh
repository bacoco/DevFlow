#!/bin/bash

# DevFlow Comprehensive Test Suite
# Runs all validation tests for the DevFlow platform

set -e

# Test configuration
TEST_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$TEST_DIR/../.." && pwd)"
RESULTS_DIR="$TEST_DIR/results"
COMPREHENSIVE_LOG="$RESULTS_DIR/comprehensive-test-results.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
BOLD='\033[1m'
NC='\033[0m'

# Test suite counters
TOTAL_SUITES=0
PASSED_SUITES=0
FAILED_SUITES=0

# Initialize comprehensive test environment
init_comprehensive_test_environment() {
    echo -e "${BOLD}${BLUE}DevFlow Comprehensive Test Suite${NC}"
    echo -e "${BLUE}=================================${NC}"
    echo ""
    
    # Create results directory
    mkdir -p "$RESULTS_DIR"
    
    # Initialize comprehensive log
    {
        echo "DevFlow Comprehensive Test Suite Results"
        echo "========================================"
        echo "Started: $(date)"
        echo "Test Directory: $TEST_DIR"
        echo "Project Root: $PROJECT_ROOT"
        echo ""
    } > "$COMPREHENSIVE_LOG"
    
    # Make test scripts executable
    chmod +x "$TEST_DIR"/*.sh
    
    echo -e "${CYAN}Test environment initialized${NC}"
    echo -e "${CYAN}Results will be saved to: $RESULTS_DIR${NC}"
    echo ""
}

# Run a test suite and track results
run_test_suite() {
    local suite_name="$1"
    local script_path="$2"
    local description="$3"
    
    ((TOTAL_SUITES++))
    
    echo -e "${BOLD}${WHITE}Running Test Suite: $suite_name${NC}"
    echo -e "${CYAN}Description: $description${NC}"
    echo -e "${DIM}Script: $script_path${NC}"
    echo ""
    
    # Log suite start
    {
        echo "========================================="
        echo "Test Suite: $suite_name"
        echo "Started: $(date)"
        echo "Script: $script_path"
        echo "Description: $description"
        echo ""
    } >> "$COMPREHENSIVE_LOG"
    
    # Run the test suite
    local start_time=$(date +%s)
    local suite_result=0
    
    if [[ -f "$script_path" ]]; then
        if bash "$script_path" 2>&1 | tee -a "$COMPREHENSIVE_LOG"; then
            suite_result=0
            ((PASSED_SUITES++))
            echo -e "${GREEN}✓ Test Suite '$suite_name' PASSED${NC}"
        else
            suite_result=1
            ((FAILED_SUITES++))
            echo -e "${RED}✗ Test Suite '$suite_name' FAILED${NC}"
        fi
    else
        suite_result=1
        ((FAILED_SUITES++))
        echo -e "${RED}✗ Test Suite '$suite_name' FAILED - Script not found${NC}"
    fi
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    # Log suite completion
    {
        echo ""
        echo "Completed: $(date)"
        echo "Duration: ${duration}s"
        echo "Result: $([ $suite_result -eq 0 ] && echo "PASSED" || echo "FAILED")"
        echo "========================================="
        echo ""
    } >> "$COMPREHENSIVE_LOG"
    
    echo -e "${DIM}Duration: ${duration}s${NC}"
    echo ""
    
    return $suite_result
}

# Run script function tests
run_script_function_tests() {
    run_test_suite \
        "Script Function Tests" \
        "$TEST_DIR/test-runner.sh" \
        "Tests all utility functions, health checks, and core script functionality"
}

# Run error scenario tests
run_error_scenario_tests() {
    run_test_suite \
        "Error Scenario Tests" \
        "$TEST_DIR/error-scenario-tests.sh" \
        "Tests error handling, recovery mechanisms, and failure scenarios"
}

# Run documentation validation tests
run_documentation_validation_tests() {
    run_test_suite \
        "Documentation Validation" \
        "$TEST_DIR/documentation-validator.sh" \
        "Validates accuracy, completeness, and quality of documentation"
}

# Run integration tests if available
run_integration_tests() {
    local integration_test_script="$PROJECT_ROOT/tests/final-application-test.js"
    
    if [[ -f "$integration_test_script" ]]; then
        echo -e "${BOLD}${WHITE}Running Integration Tests${NC}"
        echo -e "${CYAN}Description: End-to-end platform functionality tests${NC}"
        echo ""
        
        ((TOTAL_SUITES++))
        
        local start_time=$(date +%s)
        
        if node "$integration_test_script" --quiet 2>&1 | tee -a "$COMPREHENSIVE_LOG"; then
            ((PASSED_SUITES++))
            echo -e "${GREEN}✓ Integration Tests PASSED${NC}"
        else
            ((FAILED_SUITES++))
            echo -e "${RED}✗ Integration Tests FAILED${NC}"
        fi
        
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        echo -e "${DIM}Duration: ${duration}s${NC}"
        echo ""
    else
        echo -e "${YELLOW}⚠ Integration tests not found, skipping${NC}"
        echo ""
    fi
}

# Run performance validation if available
run_performance_validation() {
    local perf_test_script="$PROJECT_ROOT/tests/integration/performance/performance-test-suite.js"
    
    if [[ -f "$perf_test_script" ]]; then
        echo -e "${BOLD}${WHITE}Running Performance Validation${NC}"
        echo -e "${CYAN}Description: Performance benchmarks and optimization tests${NC}"
        echo ""
        
        ((TOTAL_SUITES++))
        
        local start_time=$(date +%s)
        
        if node "$perf_test_script" 2>&1 | tee -a "$COMPREHENSIVE_LOG"; then
            ((PASSED_SUITES++))
            echo -e "${GREEN}✓ Performance Validation PASSED${NC}"
        else
            ((FAILED_SUITES++))
            echo -e "${RED}✗ Performance Validation FAILED${NC}"
        fi
        
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        echo -e "${DIM}Duration: ${duration}s${NC}"
        echo ""
    else
        echo -e "${YELLOW}⚠ Performance tests not found, skipping${NC}"
        echo ""
    fi
}

# Generate comprehensive test report
generate_comprehensive_report() {
    local report_file="$RESULTS_DIR/comprehensive-test-report.md"
    local summary_file="$RESULTS_DIR/test-summary.json"
    
    echo -e "${BOLD}${CYAN}Generating Comprehensive Test Report${NC}"
    
    # Calculate success rate
    local success_rate=0
    if [[ $TOTAL_SUITES -gt 0 ]]; then
        success_rate=$(( PASSED_SUITES * 100 / TOTAL_SUITES ))
    fi
    
    # Generate markdown report
    {
        echo "# DevFlow Comprehensive Test Report"
        echo ""
        echo "**Generated:** $(date)"
        echo "**Test Suite Version:** 1.0"
        echo "**Platform:** $(uname -s) $(uname -m)"
        echo ""
        
        echo "## Executive Summary"
        echo ""
        echo "| Metric | Value |"
        echo "|--------|-------|"
        echo "| Total Test Suites | $TOTAL_SUITES |"
        echo "| Passed Suites | $PASSED_SUITES |"
        echo "| Failed Suites | $FAILED_SUITES |"
        echo "| Success Rate | ${success_rate}% |"
        echo "| Overall Status | $([ $FAILED_SUITES -eq 0 ] && echo "✅ PASSED" || echo "❌ FAILED") |"
        echo ""
        
        echo "## Test Suite Results"
        echo ""
        
        # Extract individual test results from logs
        if [[ -f "$TEST_DIR/test-results.log" ]]; then
            echo "### Script Function Tests"
            echo ""
            local script_tests_passed=$(grep -c "PASS:" "$TEST_DIR/test-results.log" 2>/dev/null || echo "0")
            local script_tests_failed=$(grep -c "FAIL:" "$TEST_DIR/test-results.log" 2>/dev/null || echo "0")
            echo "- Tests Passed: $script_tests_passed"
            echo "- Tests Failed: $script_tests_failed"
            echo ""
        fi
        
        if [[ -f "$TEST_DIR/error-scenario-results.log" ]]; then
            echo "### Error Scenario Tests"
            echo ""
            local error_tests_passed=$(grep -c "PASS:" "$TEST_DIR/error-scenario-results.log" 2>/dev/null || echo "0")
            local error_tests_failed=$(grep -c "FAIL:" "$TEST_DIR/error-scenario-results.log" 2>/dev/null || echo "0")
            echo "- Tests Passed: $error_tests_passed"
            echo "- Tests Failed: $error_tests_failed"
            echo ""
        fi
        
        if [[ -f "$TEST_DIR/documentation-validation.log" ]]; then
            echo "### Documentation Validation"
            echo ""
            local doc_tests_passed=$(grep -c "PASS:" "$TEST_DIR/documentation-validation.log" 2>/dev/null || echo "0")
            local doc_tests_failed=$(grep -c "FAIL:" "$TEST_DIR/documentation-validation.log" 2>/dev/null || echo "0")
            echo "- Tests Passed: $doc_tests_passed"
            echo "- Tests Failed: $doc_tests_failed"
            echo ""
        fi
        
        echo "## Quality Assessment"
        echo ""
        if [[ $success_rate -ge 95 ]]; then
            echo "🟢 **Excellent** - Platform quality exceeds expectations"
        elif [[ $success_rate -ge 85 ]]; then
            echo "🟡 **Good** - Platform quality meets standards with minor issues"
        elif [[ $success_rate -ge 70 ]]; then
            echo "🟠 **Fair** - Platform quality needs improvement"
        else
            echo "🔴 **Poor** - Platform quality requires significant attention"
        fi
        echo ""
        
        echo "## Recommendations"
        echo ""
        if [[ $FAILED_SUITES -eq 0 ]]; then
            echo "- ✅ All test suites passed successfully"
            echo "- ✅ Platform is ready for production deployment"
            echo "- ✅ Documentation is comprehensive and accurate"
            echo "- 🔄 Consider implementing continuous testing pipeline"
        else
            echo "- ❌ Address failed test suites before deployment"
            echo "- 🔍 Review error logs for specific failure details"
            echo "- 📝 Update documentation based on validation results"
            echo "- 🧪 Re-run tests after fixes are implemented"
        fi
        echo ""
        
        echo "## Detailed Logs"
        echo ""
        echo "Full test execution logs are available in:"
        echo "- \`$COMPREHENSIVE_LOG\`"
        echo "- Individual test suite logs in \`$TEST_DIR/\`"
        echo ""
        
        echo "## Test Environment"
        echo ""
        echo "- **OS:** $(uname -s) $(uname -r)"
        echo "- **Architecture:** $(uname -m)"
        echo "- **Shell:** $SHELL"
        echo "- **Node.js:** $(node --version 2>/dev/null || echo "Not available")"
        echo "- **Docker:** $(docker --version 2>/dev/null || echo "Not available")"
        echo ""
        
    } > "$report_file"
    
    # Generate JSON summary for automation
    {
        echo "{"
        echo "  \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\","
        echo "  \"totalSuites\": $TOTAL_SUITES,"
        echo "  \"passedSuites\": $PASSED_SUITES,"
        echo "  \"failedSuites\": $FAILED_SUITES,"
        echo "  \"successRate\": $success_rate,"
        echo "  \"overallStatus\": \"$([ $FAILED_SUITES -eq 0 ] && echo "PASSED" || echo "FAILED")\","
        echo "  \"platform\": \"$(uname -s)\","
        echo "  \"architecture\": \"$(uname -m)\","
        echo "  \"reportFile\": \"$report_file\","
        echo "  \"logFile\": \"$COMPREHENSIVE_LOG\""
        echo "}"
    } > "$summary_file"
    
    echo -e "${GREEN}✓ Comprehensive test report generated: $report_file${NC}"
    echo -e "${GREEN}✓ Test summary JSON generated: $summary_file${NC}"
}

# Display final results
display_final_results() {
    echo ""
    echo -e "${BOLD}${BLUE}=========================================${NC}"
    echo -e "${BOLD}${BLUE}    COMPREHENSIVE TEST RESULTS${NC}"
    echo -e "${BOLD}${BLUE}=========================================${NC}"
    echo ""
    
    echo -e "${BOLD}Test Suites Summary:${NC}"
    echo -e "  Total Suites: ${BLUE}$TOTAL_SUITES${NC}"
    echo -e "  Passed: ${GREEN}$PASSED_SUITES${NC}"
    echo -e "  Failed: ${RED}$FAILED_SUITES${NC}"
    
    if [[ $TOTAL_SUITES -gt 0 ]]; then
        local success_rate=$(( PASSED_SUITES * 100 / TOTAL_SUITES ))
        echo -e "  Success Rate: ${CYAN}${success_rate}%${NC}"
    fi
    
    echo ""
    
    if [[ $FAILED_SUITES -eq 0 ]]; then
        echo -e "${BOLD}${GREEN}🎉 ALL TESTS PASSED! 🎉${NC}"
        echo -e "${GREEN}The DevFlow platform has passed comprehensive validation.${NC}"
        echo -e "${GREEN}Platform is ready for production deployment.${NC}"
    else
        echo -e "${BOLD}${RED}❌ SOME TESTS FAILED${NC}"
        echo -e "${RED}Please review the failed test suites and address issues.${NC}"
        echo -e "${YELLOW}Check individual test logs for detailed failure information.${NC}"
    fi
    
    echo ""
    echo -e "${CYAN}Results saved to: $RESULTS_DIR${NC}"
    echo -e "${BLUE}=========================================${NC}"
    echo ""
}

# Cleanup function
cleanup_comprehensive_test_environment() {
    # Clean up any temporary files created during testing
    find "$TEST_DIR" -name "temp*" -type d -exec rm -rf {} + 2>/dev/null || true
    
    # Final log entry
    {
        echo ""
        echo "Comprehensive test suite completed: $(date)"
        echo "Final Results: $PASSED_SUITES/$TOTAL_SUITES suites passed"
    } >> "$COMPREHENSIVE_LOG"
}

# Main execution function
main() {
    local run_integration="${1:-true}"
    local run_performance="${2:-false}"
    
    # Initialize test environment
    init_comprehensive_test_environment
    
    # Trap cleanup on exit
    trap cleanup_comprehensive_test_environment EXIT
    
    # Run all test suites
    echo -e "${BOLD}${PURPLE}Phase 1: Script Function Validation${NC}"
    run_script_function_tests
    
    echo -e "${BOLD}${PURPLE}Phase 2: Error Scenario Testing${NC}"
    run_error_scenario_tests
    
    echo -e "${BOLD}${PURPLE}Phase 3: Documentation Validation${NC}"
    run_documentation_validation_tests
    
    if [[ "$run_integration" == "true" ]]; then
        echo -e "${BOLD}${PURPLE}Phase 4: Integration Testing${NC}"
        run_integration_tests
    fi
    
    if [[ "$run_performance" == "true" ]]; then
        echo -e "${BOLD}${PURPLE}Phase 5: Performance Validation${NC}"
        run_performance_validation
    fi
    
    # Generate comprehensive report
    generate_comprehensive_report
    
    # Display final results
    display_final_results
    
    # Return appropriate exit code
    return $FAILED_SUITES
}

# Handle command line arguments
case "${1:-}" in
    --help|-h)
        echo "DevFlow Comprehensive Test Suite"
        echo ""
        echo "Usage: $0 [options]"
        echo ""
        echo "Options:"
        echo "  --help, -h          Show this help message"
        echo "  --no-integration    Skip integration tests"
        echo "  --with-performance  Include performance tests"
        echo "  --quick             Run only core validation tests"
        echo ""
        echo "Examples:"
        echo "  $0                      # Run all tests except performance"
        echo "  $0 --no-integration     # Skip integration tests"
        echo "  $0 --with-performance   # Include performance tests"
        echo "  $0 --quick              # Run only core tests"
        exit 0
        ;;
    --no-integration)
        main false false
        ;;
    --with-performance)
        main true true
        ;;
    --quick)
        echo -e "${YELLOW}Running quick validation (core tests only)${NC}"
        init_comprehensive_test_environment
        trap cleanup_comprehensive_test_environment EXIT
        run_script_function_tests
        run_documentation_validation_tests
        generate_comprehensive_report
        display_final_results
        exit $FAILED_SUITES
        ;;
    *)
        main true false
        ;;
esac