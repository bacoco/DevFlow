#!/bin/bash

# DevFlow Platform Launcher for macOS
# This file can be double-clicked from Finder

# Get the directory where this script is located
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

# Change to the project directory
cd "$DIR"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${PURPLE}🚀 DevFlow Intelligence Platform${NC}"
echo -e "${PURPLE}================================${NC}"
echo ""
echo -e "${BLUE}Starting all services...${NC}"
echo ""

# Run the startup script
./devflow.sh

echo ""
echo -e "${GREEN}✅ Platform started successfully!${NC}"
echo ""
echo -e "${BLUE}Your browser should open automatically.${NC}"
echo -e "${BLUE}If not, go to: http://localhost:3010${NC}"
echo ""

# Try to open the browser automatically
if command -v open &> /dev/null; then
    echo "Opening browser..."
    sleep 3
    open http://localhost:3010
fi

echo ""
echo -e "${BLUE}Press any key to close this window...${NC}"
read -n 1 -s