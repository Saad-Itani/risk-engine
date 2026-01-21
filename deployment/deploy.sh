#!/bin/bash
set -e

# ============================================================================
# Risk Engine Deployment Script
# ============================================================================
# Usage:
#   ./deploy.sh           - Standard deployment (pull, build, restart)
#   ./deploy.sh --initial - First-time setup (includes DB initialization)
#
# This script handles:
#   - Pulling latest code from git
#   - Updating Python dependencies
#   - Building React frontend
#   - Restarting backend service
#   - Reloading nginx
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
INITIAL_DEPLOY=false

# Parse arguments
if [[ "$1" == "--initial" ]]; then
    INITIAL_DEPLOY=true
fi

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

log_section() {
    echo ""
    echo "=========================================="
    echo "$1"
    echo "=========================================="
}

# Display banner
log_section "Risk Engine Deployment Script"
echo "Project directory: $PROJECT_DIR"
echo "Initial deploy: $INITIAL_DEPLOY"
echo ""

# Step 1: Pull latest code
log_section "Step 1: Pulling Latest Code"
cd "$PROJECT_DIR"

# Check if git repo
if [ ! -d ".git" ]; then
    log_error "Not a git repository. Please run this script from the Risk Engine directory."
    exit 1
fi

log_info "Fetching from remote..."
git fetch origin

log_info "Resetting to origin/main..."
git reset --hard origin/main

log_success "Code updated to latest version"
log_info "Current commit: $(git rev-parse --short HEAD) - $(git log -1 --pretty=%B | head -n 1)"

# Step 2: Backend - Update Python dependencies
log_section "Step 2: Updating Backend Dependencies"

if [ ! -d "$PROJECT_DIR/venv" ]; then
    log_error "Virtual environment not found at $PROJECT_DIR/venv"
    log_error "Please create it first: python3.11 -m venv venv"
    exit 1
fi

source "$PROJECT_DIR/venv/bin/activate"

log_info "Upgrading pip..."
pip install -q --upgrade pip

log_info "Installing requirements..."
pip install -q -r "$PROJECT_DIR/requirements.txt"

log_success "Backend dependencies updated"

# Step 3: Frontend - Build
log_section "Step 3: Building Frontend"

cd "$PROJECT_DIR/frontend"

if [ ! -f "package.json" ]; then
    log_error "package.json not found in frontend directory"
    exit 1
fi

log_info "Installing npm dependencies..."
npm install --silent

log_info "Building production bundle..."
npm run build

if [ ! -d "$PROJECT_DIR/frontend/dist" ]; then
    log_error "Frontend build failed - dist directory not found"
    exit 1
fi

log_success "Frontend built successfully"

# Step 4: Database initialization (only on initial deploy)
if [ "$INITIAL_DEPLOY" = true ]; then
    log_section "Step 4: Initializing Database (Initial Deploy)"

    cd "$PROJECT_DIR"
    source "$PROJECT_DIR/venv/bin/activate"

    log_info "Creating database schema..."
    python -m backend.scripts.init_db
    log_success "Database schema created"

    log_info "Loading companies..."
    python -m backend.scripts.load_companies
    log_success "Companies loaded"

    log_warning "Starting price backfill (this may take 20-30 minutes)..."
    log_info "Backfilling historical prices..."
    python -m backend.scripts.backfill_prices
    log_success "Price data backfilled"
else
    log_info "Skipping database initialization (not initial deploy)"
fi

# Step 5: Restart backend service
log_section "Step 5: Restarting Backend Service"

log_info "Restarting risk-engine-backend service..."
sudo systemctl restart risk-engine-backend

# Wait for service to start
sleep 3

# Check service status
if sudo systemctl is-active --quiet risk-engine-backend; then
    log_success "Backend service restarted successfully"
else
    log_error "Backend service failed to start"
    log_error "Checking service logs..."
    sudo systemctl status risk-engine-backend --no-pager -l | tail -n 20
    exit 1
fi

# Step 6: Reload nginx
log_section "Step 6: Reloading Nginx"

log_info "Testing nginx configuration..."
sudo nginx -t

if [ $? -eq 0 ]; then
    log_info "Reloading nginx..."
    sudo systemctl reload nginx
    log_success "Nginx reloaded successfully"
else
    log_error "Nginx configuration test failed"
    exit 1
fi

# Final summary
log_section "Deployment Completed Successfully!"
echo ""
echo "Application URL: https://risk.saaditani.com"
echo ""
echo "Service Status:"
sudo systemctl status risk-engine-backend --no-pager -l | head -n 10
echo ""
log_success "All done! Your application is now live."
echo ""

# Deactivate venv
deactivate 2>/dev/null || true
