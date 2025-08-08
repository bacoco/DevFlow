#!/bin/bash

# DevFlow Documentation Validation Script
# Validates accuracy and completeness of FINAL_DOCUMENTATION.md

set -e

# Test configuration
TEST_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$TEST_DIR/../.." && pwd)"
DOCS_FILE="$PROJECT_ROOT/FINAL_DOCUMENTATION.md"
TEST_LOG="$TEST_DIR/documentation-validation.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Test counters
DOC_TESTS_RUN=0
DOC_TESTS_PASSED=0
DOC_TESTS_FAILED=0

# Initialize documentation testing
init_doc_test_environment() {
    echo "Initializing documentation validation..."
    
    # Create test log
    echo "DevFlow Documentation Validation - $(date)" > "$TEST_LOG"
    echo "===========================================" >> "$TEST_LOG"
    
    # Check if documentation file exists
    if [[ ! -f "$DOCS_FILE" ]]; then
        echo -e "${RED}ERROR: FINAL_DOCUMENTATION.md not found at $DOCS_FILE${NC}"
        exit 1
    fi
}

# Test utility for documentation validation
run_doc_test() {
    local test_name="$1"
    local test_function="$2"
    
    ((DOC_TESTS_RUN++))
    echo -n "Validating $test_name... "
    
    if $test_function 2>&1 | tee -a "$TEST_LOG" >/dev/null; then
        echo -e "${GREEN}PASS${NC}"
        ((DOC_TESTS_PASSED++))
        echo "PASS: $test_name" >> "$TEST_LOG"
    else
        echo -e "${RED}FAIL${NC}"
        ((DOC_TESTS_FAILED++))
        echo "FAIL: $test_name" >> "$TEST_LOG"
    fi
}

# Test that all required sections exist
test_required_sections() {
    local required_sections=(
        "Executive Summary"
        "Platform Overview & Features"
        "Quick Start Guide"
        "Architecture & Technical Details"
        "Service Descriptions"
        "Access Points & URLs"
        "Quality Metrics & Achievements"
        "Production Deployment"
        "Troubleshooting & Support"
        "Development & Contributing"
    )
    
    for section in "${required_sections[@]}"; do
        if ! grep -q "## .*$section" "$DOCS_FILE"; then
            echo "Missing required section: $section"
            return 1
        fi
    done
    
    return 0
}

# Test that all service URLs are documented
test_service_urls_documented() {
    local expected_urls=(
        "http://localhost:3010"
        "http://localhost:3000"
        "http://localhost:3001"
        "http://localhost:3002"
        "http://localhost:3003"
        "mongodb://localhost:27017"
        "redis://localhost:6379"
        "http://localhost:8086"
        "localhost:9092"
    )
    
    for url in "${expected_urls[@]}"; do
        if ! grep -q "$url" "$DOCS_FILE"; then
            echo "Missing URL in documentation: $url"
            return 1
        fi
    done
    
    return 0
}

# Test that all services are described
test_all_services_described() {
    local services=(
        "api-gateway"
        "data-ingestion"
        "stream-processing"
        "ml-pipeline"
        "dashboard"
        "mongodb"
        "redis"
        "influxdb"
        "kafka"
    )
    
    for service in "${services[@]}"; do
        if ! grep -qi "$service" "$DOCS_FILE"; then
            echo "Service not described in documentation: $service"
            return 1
        fi
    done
    
    return 0
}

# Test that technology stack is documented
test_technology_stack_documented() {
    local technologies=(
        "Next.js"
        "TypeScript"
        "Node.js"
        "MongoDB"
        "Redis"
        "InfluxDB"
        "Kafka"
        "Docker"
        "GraphQL"
        "React"
    )
    
    for tech in "${technologies[@]}"; do
        if ! grep -q "$tech" "$DOCS_FILE"; then
            echo "Technology not documented: $tech"
            return 1
        fi
    done
    
    return 0
}

# Test that installation instructions are present
test_installation_instructions() {
    local required_instructions=(
        "git clone"
        "./devflow.sh"
        "Docker Desktop"
        "Node.js"
    )
    
    for instruction in "${required_instructions[@]}"; do
        if ! grep -q "$instruction" "$DOCS_FILE"; then
            echo "Missing installation instruction: $instruction"
            return 1
        fi
    done
    
    return 0
}

# Test that troubleshooting section has common issues
test_troubleshooting_completeness() {
    local troubleshooting_topics=(
        "Service startup issues"
        "Port conflicts"
        "Docker issues"
        "Database connection"
    )
    
    for topic in "${troubleshooting_topics[@]}"; do
        if ! grep -qi "$topic" "$DOCS_FILE"; then
            echo "Missing troubleshooting topic: $topic"
            return 1
        fi
    done
    
    return 0
}

# Test that performance metrics are documented
test_performance_metrics_documented() {
    local metrics=(
        "response time"
        "test coverage"
        "bundle size"
        "performance"
    )
    
    for metric in "${metrics[@]}"; do
        if ! grep -qi "$metric" "$DOCS_FILE"; then
            echo "Missing performance metric: $metric"
            return 1
        fi
    done
    
    return 0
}

# Test that security information is included
test_security_documentation() {
    local security_topics=(
        "authentication"
        "encryption"
        "security"
        "JWT"
    )
    
    for topic in "${security_topics[@]}"; do
        if ! grep -qi "$topic" "$DOCS_FILE"; then
            echo "Missing security topic: $topic"
            return 1
        fi
    done
    
    return 0
}

# Test that deployment options are documented
test_deployment_documentation() {
    local deployment_topics=(
        "Kubernetes"
        "Docker"
        "production"
        "environment"
    )
    
    for topic in "${deployment_topics[@]}"; do
        if ! grep -qi "$topic" "$DOCS_FILE"; then
            echo "Missing deployment topic: $topic"
            return 1
        fi
    done
    
    return 0
}

# Test that code examples are present
test_code_examples_present() {
    # Check for code blocks
    local code_block_count=$(grep -c '```' "$DOCS_FILE")
    
    if [[ $code_block_count -lt 10 ]]; then
        echo "Insufficient code examples found: $code_block_count code blocks"
        return 1
    fi
    
    return 0
}

# Test that table of contents matches sections
test_table_of_contents_accuracy() {
    # Extract TOC entries
    local toc_start=$(grep -n "Table of Contents" "$DOCS_FILE" | head -1 | cut -d: -f1)
    local toc_end=$(grep -n "^---$" "$DOCS_FILE" | head -2 | tail -1 | cut -d: -f1)
    
    if [[ -z "$toc_start" ]] || [[ -z "$toc_end" ]]; then
        echo "Could not find table of contents boundaries"
        return 1
    fi
    
    # Extract actual section headers
    local section_count=$(grep -c "^## " "$DOCS_FILE")
    local toc_entry_count=$(sed -n "${toc_start},${toc_end}p" "$DOCS_FILE" | grep -c "^\d\+\.")
    
    # Allow some flexibility in count matching
    if [[ $((section_count - toc_entry_count)) -gt 2 ]]; then
        echo "TOC entries ($toc_entry_count) don't match section count ($section_count)"
        return 1
    fi
    
    return 0
}

# Test that links are properly formatted
test_link_formatting() {
    # Check for broken markdown links
    local broken_links=$(grep -o '\[.*\](' "$DOCS_FILE" | grep -v '\[.*\](#' | grep -v 'http' | wc -l)
    
    if [[ $broken_links -gt 0 ]]; then
        echo "Found $broken_links potentially broken internal links"
        return 1
    fi
    
    return 0
}

# Test that badges/shields are present
test_badges_present() {
    local badge_count=$(grep -c 'img.shields.io\|badge' "$DOCS_FILE")
    
    if [[ $badge_count -lt 3 ]]; then
        echo "Insufficient badges found: $badge_count"
        return 1
    fi
    
    return 0
}

# Test that contact information is provided
test_contact_information() {
    local contact_info=(
        "support"
        "GitHub"
        "email"
    )
    
    for info in "${contact_info[@]}"; do
        if ! grep -qi "$info" "$DOCS_FILE"; then
            echo "Missing contact information: $info"
            return 1
        fi
    done
    
    return 0
}

# Test document structure and formatting
test_document_structure() {
    # Check for proper heading hierarchy
    local h1_count=$(grep -c "^# " "$DOCS_FILE")
    local h2_count=$(grep -c "^## " "$DOCS_FILE")
    local h3_count=$(grep -c "^### " "$DOCS_FILE")
    
    if [[ $h1_count -ne 1 ]]; then
        echo "Document should have exactly 1 H1 heading, found: $h1_count"
        return 1
    fi
    
    if [[ $h2_count -lt 8 ]]; then
        echo "Document should have at least 8 H2 headings, found: $h2_count"
        return 1
    fi
    
    return 0
}

# Test that version information is current
test_version_information() {
    # Check for version-related information
    local version_indicators=(
        "Version"
        "v[0-9]"
        "2024\|2025"
    )
    
    local version_found=false
    for indicator in "${version_indicators[@]}"; do
        if grep -qi "$indicator" "$DOCS_FILE"; then
            version_found=true
            break
        fi
    done
    
    if [[ "$version_found" != "true" ]]; then
        echo "No version information found in documentation"
        return 1
    fi
    
    return 0
}

# Test that prerequisites are clearly stated
test_prerequisites_documented() {
    local prerequisites=(
        "Node.js"
        "Docker"
        "RAM\|memory"
        "disk space"
    )
    
    for prereq in "${prerequisites[@]}"; do
        if ! grep -qi "$prereq" "$DOCS_FILE"; then
            echo "Missing prerequisite: $prereq"
            return 1
        fi
    done
    
    return 0
}

# Test that examples and demos are mentioned
test_examples_and_demos() {
    local demo_elements=(
        "demo"
        "example"
        "sample"
        "localhost"
    )
    
    for element in "${demo_elements[@]}"; do
        if ! grep -qi "$element" "$DOCS_FILE"; then
            echo "Missing demo/example element: $element"
            return 1
        fi
    done
    
    return 0
}

# Run all documentation validation tests
run_all_doc_tests() {
    echo -e "${BLUE}Starting DevFlow Documentation Validation${NC}"
    echo "=========================================="
    
    # Structure and completeness tests
    run_doc_test "required sections" test_required_sections
    run_doc_test "document structure" test_document_structure
    run_doc_test "table of contents accuracy" test_table_of_contents_accuracy
    
    # Content accuracy tests
    run_doc_test "service URLs documented" test_service_urls_documented
    run_doc_test "all services described" test_all_services_described
    run_doc_test "technology stack documented" test_technology_stack_documented
    run_doc_test "installation instructions" test_installation_instructions
    run_doc_test "prerequisites documented" test_prerequisites_documented
    
    # Feature documentation tests
    run_doc_test "troubleshooting completeness" test_troubleshooting_completeness
    run_doc_test "performance metrics documented" test_performance_metrics_documented
    run_doc_test "security documentation" test_security_documentation
    run_doc_test "deployment documentation" test_deployment_documentation
    
    # Quality and formatting tests
    run_doc_test "code examples present" test_code_examples_present
    run_doc_test "link formatting" test_link_formatting
    run_doc_test "badges present" test_badges_present
    run_doc_test "contact information" test_contact_information
    run_doc_test "version information" test_version_information
    run_doc_test "examples and demos" test_examples_and_demos
    
    # Print summary
    echo ""
    echo "=========================================="
    echo -e "Documentation tests run: ${BLUE}$DOC_TESTS_RUN${NC}"
    echo -e "Documentation tests passed: ${GREEN}$DOC_TESTS_PASSED${NC}"
    echo -e "Documentation tests failed: ${RED}$DOC_TESTS_FAILED${NC}"
    
    if [[ $DOC_TESTS_FAILED -eq 0 ]]; then
        echo -e "${GREEN}All documentation validation tests passed!${NC}"
        return 0
    else
        echo -e "${RED}Some documentation tests failed. Check $TEST_LOG for details.${NC}"
        return 1
    fi
}

# Generate documentation quality report
generate_doc_quality_report() {
    local report_file="$TEST_DIR/documentation-quality-report.md"
    
    echo "Generating documentation quality report..."
    
    {
        echo "# DevFlow Documentation Quality Report"
        echo "Generated: $(date)"
        echo ""
        
        echo "## Document Statistics"
        echo "- Total lines: $(wc -l < "$DOCS_FILE")"
        echo "- Word count: $(wc -w < "$DOCS_FILE")"
        echo "- Character count: $(wc -c < "$DOCS_FILE")"
        echo "- H1 headings: $(grep -c "^# " "$DOCS_FILE")"
        echo "- H2 headings: $(grep -c "^## " "$DOCS_FILE")"
        echo "- H3 headings: $(grep -c "^### " "$DOCS_FILE")"
        echo "- Code blocks: $(grep -c '```' "$DOCS_FILE")"
        echo "- Tables: $(grep -c '|.*|' "$DOCS_FILE")"
        echo "- Links: $(grep -o '\[.*\](' "$DOCS_FILE" | wc -l)"
        echo "- Images/Badges: $(grep -c '!\[' "$DOCS_FILE")"
        echo ""
        
        echo "## Content Analysis"
        echo "- Services mentioned: $(grep -oi 'api-gateway\|data-ingestion\|stream-processing\|ml-pipeline\|dashboard\|mongodb\|redis\|influxdb\|kafka' "$DOCS_FILE" | sort -u | wc -l)"
        echo "- Technologies mentioned: $(grep -oi 'next\.js\|typescript\|node\.js\|react\|docker\|kubernetes\|graphql' "$DOCS_FILE" | sort -u | wc -l)"
        echo "- URLs documented: $(grep -o 'http://localhost:[0-9]*' "$DOCS_FILE" | sort -u | wc -l)"
        echo ""
        
        echo "## Quality Metrics"
        echo "- Tests passed: $DOC_TESTS_PASSED/$DOC_TESTS_RUN"
        echo "- Success rate: $(( DOC_TESTS_PASSED * 100 / DOC_TESTS_RUN ))%"
        echo ""
        
        if [[ $DOC_TESTS_FAILED -gt 0 ]]; then
            echo "## Failed Tests"
            grep "FAIL:" "$TEST_LOG" | sed 's/FAIL: /- /'
            echo ""
        fi
        
        echo "## Recommendations"
        if [[ $DOC_TESTS_FAILED -eq 0 ]]; then
            echo "- Documentation quality is excellent"
            echo "- All validation tests passed"
            echo "- Consider periodic reviews to maintain quality"
        else
            echo "- Address failed validation tests"
            echo "- Review missing sections or content"
            echo "- Ensure all links and references are accurate"
        fi
        
    } > "$report_file"
    
    echo -e "${GREEN}Documentation quality report generated: $report_file${NC}"
}

# Main execution
main() {
    init_doc_test_environment
    
    run_all_doc_tests
    local test_result=$?
    
    generate_doc_quality_report
    
    return $test_result
}

# Run tests if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi