#!/bin/bash
set -e

# ============================================================================
# Risk Engine - Initial VPS Setup Script
# ============================================================================
# This script prepares a fresh Ubuntu/Debian VPS for Risk Engine deployment
#
# Usage:
#   wget https://raw.githubusercontent.com/[your-repo]/Risk_Engine/main/deployment/install.sh
#   chmod +x install.sh
#   sudo ./install.sh
#
# What it does:
#   - Installs system dependencies (Python, nginx, Node.js, etc.)
#   - Creates risk-engine user
#   - Creates necessary directories with proper permissions
#   - Sets up basic firewall rules (optional)
# ============================================================================

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

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    log_error "Please run this script as root (use sudo)"
    exit 1
fi

log_section "Risk Engine - Initial VPS Setup"
echo "This script will install dependencies and prepare the VPS"
echo ""

# Update system packages
log_section "Step 1: Updating System Packages"
log_info "Running apt-get update..."
apt-get update -qq

log_info "Upgrading installed packages..."
apt-get upgrade -y -qq

log_success "System packages updated"

# Install system dependencies
log_section "Step 2: Installing System Dependencies"

log_info "Installing Python 3.11 and build tools..."
apt-get install -y -qq \
    software-properties-common

# Add deadsnakes PPA for Python 3.11 (if on Ubuntu < 23.04)
if ! python3.11 --version &> /dev/null; then
    log_info "Adding deadsnakes PPA for Python 3.11..."
    add-apt-repository -y ppa:deadsnakes/ppa
    apt-get update -qq
fi

apt-get install -y -qq \
    python3.11 \
    python3.11-venv \
    python3.11-dev \
    python3-pip \
    build-essential \
    libsqlite3-dev \
    git \
    curl \
    wget

log_success "Python 3.11 installed"

log_info "Installing nginx..."
apt-get install -y -qq nginx
log_success "Nginx installed"

log_info "Installing Node.js and npm..."
# Install Node.js 20.x LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y -qq nodejs
log_success "Node.js $(node --version) and npm $(npm --version) installed"

# Create risk-engine user
log_section "Step 3: Creating Application User"

if id -u risk-engine > /dev/null 2>&1; then
    log_warning "User 'risk-engine' already exists, skipping creation"
else
    log_info "Creating risk-engine user..."
    useradd -r -m -s /bin/bash -d /opt/risk-engine -c "Risk Engine Application" risk-engine
    log_success "User 'risk-engine' created"
fi

# Create necessary directories
log_section "Step 4: Creating Directories"

log_info "Creating application directories..."
mkdir -p /opt/risk-engine
mkdir -p /var/lib/risk-engine
mkdir -p /var/log/risk-engine

log_success "Directories created"

log_info "Setting ownership and permissions..."
chown -R risk-engine:risk-engine /opt/risk-engine
chown -R risk-engine:risk-engine /var/lib/risk-engine
chown -R risk-engine:risk-engine /var/log/risk-engine

chmod 750 /opt/risk-engine
chmod 750 /var/lib/risk-engine
chmod 750 /var/log/risk-engine

log_success "Permissions set"

# Optional: Setup UFW firewall
log_section "Step 5: Firewall Configuration (Optional)"

if command -v ufw &> /dev/null; then
    log_info "UFW detected. Configure firewall? (y/n)"
    read -p "" -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "Configuring UFW firewall..."
        ufw --force enable
        ufw default deny incoming
        ufw default allow outgoing
        ufw allow ssh
        ufw allow http
        ufw allow https
        log_success "Firewall configured"
    else
        log_info "Skipping firewall configuration"
    fi
else
    log_info "UFW not installed, skipping firewall setup"
    log_info "You can install it later with: apt-get install ufw"
fi

# Summary
log_section "Setup Complete!"
echo ""
log_success "VPS is ready for Risk Engine deployment"
echo ""
echo "Next steps:"
echo "  1. Switch to risk-engine user: sudo su - risk-engine"
echo "  2. Clone repository: git clone [your-repo-url] /opt/risk-engine"
echo "  3. Setup Python venv: cd /opt/risk-engine && python3.11 -m venv venv"
echo "  4. Install dependencies: source venv/bin/activate && pip install -r requirements.txt"
echo "  5. Setup frontend: cd frontend && npm install"
echo "  6. Follow deployment guide to configure services"
echo ""
log_info "See deployment/README.md for detailed instructions"
echo ""
