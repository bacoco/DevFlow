#!/bin/bash

# Test script to verify analyze_errors function
source run-devflow-complete.sh

# Override main function to prevent automatic execution
main() {
    echo "Test mode - not running main"
}

# Test the analyze_errors function
echo "Testing analyze_errors function..."
analyze_errors