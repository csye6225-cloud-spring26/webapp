#!/bin/bash

# Script exits immediately if any command fails
set -e

# =====================================
# CSYE6225 Application Setup Script
# Target OS: Ubuntu 24.04 LTS
# Used by Packer for custom image builds
# =====================================

# Ensure script is run as root
if [ "$EUID" -ne 0 ]; then
  echo "ERROR: Please run as root or using sudo"
  exit 1
fi

# -------------------------------------
# Update and upgrade system packages
# -------------------------------------

export DEBIAN_FRONTEND=noninteractive

echo ">>> Updating system packages..."
apt-get update -y
echo ">>> Upgrading system packages..."
apt-get upgrade -y

if ! command -v unzip >/dev/null 2>&1; then
  echo ">>> Installing unzip..."
  apt-get install -y unzip
fi

# -------------------------------------
# Install Node.js 20
# -------------------------------------

if ! command -v node >/dev/null 2>&1; then
    echo ">>> Installing Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi

echo ">>> Node.js version: $(node --version)"
echo ">>> npm version: $(npm --version)"

# -------------------------------------
# Create application group and user
# -------------------------------------

if ! getent group csye6225 >/dev/null; then
    echo ">>> Creating group csye6225..."
    groupadd csye6225
fi

if ! id csye6225 >/dev/null 2>&1; then
    echo ">>> Creating user csye6225..."
    useradd \
        --system \
        --no-create-home \
        --gid csye6225 \
        --shell /usr/sbin/nologin \
        csye6225
fi

# -------------------------------------
# Deploy application files
# -------------------------------------

APP_DIR="/opt/csye6225"
APP_USER="csye6225"
APP_GROUP="csye6225"
APP_ARCHIVE="/tmp/webapp.zip"

mkdir -p "$APP_DIR"

if [ -f "$APP_ARCHIVE" ]; then
    echo ">>> Extracting application files..."
    unzip -o "$APP_ARCHIVE" -d "$APP_DIR"
else
    echo "ERROR: $APP_ARCHIVE not found!"
    exit 1
fi

# -------------------------------------
# Create a placeholder .env file
# (Real values injected by EC2 user data at boot time)
# -------------------------------------

echo ">>> Creating placeholder environment file..."
cat > "$APP_DIR/.env" <<EOF
# Placeholder — overwritten by EC2 user data at launch
PORT=8080
NODE_ENV=production
EOF

# -------------------------------------
# Install npm dependencies
# -------------------------------------

echo ">>> Installing npm dependencies..."
cd "$APP_DIR"
npm install

# -------------------------------------
# Set ownership and permissions
# ALL app files must be owned by csye6225:csye6225
# -------------------------------------

echo ">>> Setting ownership to csye6225:csye6225..."
chown -R "$APP_USER:$APP_GROUP" "$APP_DIR"

echo ">>> Setting permissions to 750..."
chmod -R 750 "$APP_DIR"

# -------------------------------------
# Install and enable systemd service
# -------------------------------------

echo ">>> Installing systemd service..."
cp /tmp/webapp.service /etc/systemd/system/webapp.service
sudo systemctl daemon-reload
sudo systemctl enable webapp

# -------------------------------------
# Cleanup
# -------------------------------------

echo ">>> Cleaning up temp files..."
rm -f /tmp/webapp.zip /tmp/webapp.service

echo ">>> Setup completed successfully!"