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
# Install PostgreSQL
# -------------------------------------

if ! command -v psql >/dev/null 2>&1; then
  echo ">>> Installing PostgreSQL..."
  apt-get install -y postgresql postgresql-contrib
fi

echo ">>> Enabling and starting PostgreSQL..."
systemctl enable postgresql
systemctl start postgresql

# -------------------------------------
# Create PostgreSQL database and user
# -------------------------------------

DB_NAME="csye6225_webapp_db"
DB_USER="csye6225"
DB_PASSWORD="${DB_PASSWORD}"

echo ">>> Creating PostgreSQL user..."
if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1; then
    sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';"
fi

echo ">>> Creating PostgreSQL database..."
if ! sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"
fi

echo ">>> Granting database privileges..."
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"

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
# Create environment file
# (must exist before npm install / prisma generate)
# -------------------------------------

echo ">>> Creating environment file..."
cat > "$APP_DIR/.env" <<EOF
DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}
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