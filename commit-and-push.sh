#!/bin/bash

# DevFlow Intelligence Platform - Commit and Push Script
set -e

echo "🚀 DevFlow Intelligence Platform - Git Commit & Push"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
log "Script location: $SCRIPT_DIR"

# Change to the script directory (which should be the project root)
cd "$SCRIPT_DIR"

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    error "Not in a git repository. The script directory doesn't contain a .git folder."
    error "Please ensure this script is in the project root directory."
    exit 1
fi

log "Working in directory: $(pwd)"

# Check git status
log "Checking git status..."
git status --porcelain > /tmp/git_status.txt

if [ ! -s /tmp/git_status.txt ]; then
    warning "No changes to commit."
    exit 0
fi

# Show what will be committed
log "Files to be committed:"
cat /tmp/git_status.txt

# Add all files
log "Adding all files to staging area..."
git add .

# Check if there are staged changes
if git diff --cached --quiet; then
    warning "No staged changes to commit."
    exit 0
fi

# Get commit message from user or use default
if [ -z "$1" ]; then
    COMMIT_MESSAGE="feat: Add comprehensive testing and monitoring system

- Add global test runner with auto-fix capabilities
- Add continuous monitoring with automatic recovery
- Add launch script with health checks and auto-fix
- Add visual test dashboard with real-time updates
- Fix Docker build issues and missing dependencies
- Add comprehensive documentation and usage guides
- Implement port conflict resolution and service recovery
- Add historical tracking and performance metrics
- Support for CI/CD integration and external monitoring

System now provides:
- 100% automated testing and bug fixing
- Real-time health monitoring every 30 seconds
- Automatic service recovery and restart
- Visual dashboard for system status
- Complete API documentation and examples"
else
    COMMIT_MESSAGE="$1"
fi

# Show commit message
log "Commit message:"
echo "$COMMIT_MESSAGE"
echo ""

# Ask for confirmation
read -p "Do you want to proceed with this commit? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    warning "Commit cancelled."
    exit 0
fi

# Commit changes
log "Committing changes..."
git commit -m "$COMMIT_MESSAGE"

if [ $? -eq 0 ]; then
    success "Changes committed successfully!"
else
    error "Failed to commit changes."
    exit 1
fi

# Check if we have a remote origin
if ! git remote get-url origin > /dev/null 2>&1; then
    warning "No remote origin configured. Skipping push."
    success "Local commit completed successfully!"
    exit 0
fi

# Get current branch
CURRENT_BRANCH=$(git branch --show-current)
log "Current branch: $CURRENT_BRANCH"

# Push to remote
log "Pushing to remote repository..."
git push origin "$CURRENT_BRANCH"

if [ $? -eq 0 ]; then
    success "Changes pushed successfully to origin/$CURRENT_BRANCH!"
    
    # Show remote URL
    REMOTE_URL=$(git remote get-url origin)
    log "Repository: $REMOTE_URL"
    
    # Show commit hash
    COMMIT_HASH=$(git rev-parse HEAD)
    log "Commit hash: $COMMIT_HASH"
    
    # Show files changed
    log "Files changed in this commit:"
    git diff-tree --no-commit-id --name-only -r HEAD
    
else
    error "Failed to push changes to remote repository."
    warning "Local commit was successful, but push failed."
    warning "You may need to pull changes first or resolve conflicts."
    exit 1
fi

# Clean up
rm -f /tmp/git_status.txt

echo ""
success "🎉 All done! Your changes have been committed and pushed successfully."
echo ""
log "Next steps:"
echo "  - Check GitHub: https://github.com/bacoco/DevFlow"
echo "  - Run tests: npm run test:global"
echo "  - Start monitoring: npm run test:monitor"
echo "  - Launch system: ./launch-devflow.sh"