#!/bin/bash

# Script exits immediately if any command fails
set -e

# =====================================
# CSYE6225 Application Setup Script
# Target OS: Ubuntu 24.04 LTS
# =====================================

# Ensure script is run as root
if [ "$EUID" -ne 0 ]; then
  echo "Please run as root or using sudo"
  exit 1
fi

# -------------------------------------
# Update and upgrade system packages
# -------------------------------------

# Forcing the non interactive mode to avoid (Y/N) during automation
export DEBIAN_FRONTEND=noninteractive

# Refreshes package list
apt update -y

# Applies latest patches
apt upgrade -y

# -------------------------------------
# Install PostgreSQL
# -------------------------------------

# Condition to check if postgres is not installed
if ! command -v psql >/dev/null 2>&1; then
  apt install -y postgresql postgresql-contrib
fi

# Start PostgreSQL and enable it on boot
systemctl enable postgresql
systemctl start postgresql

# -------------------------------------
# Step 4: Create PostgreSQL database and user
# -------------------------------------

DB_NAME="csye6225_webapp_db"
DB_USER="webappuser"

sudo -u postgres psql <<EOF
DO \$\$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_database WHERE datname = '${DB_NAME}') THEN
      CREATE DATABASE ${DB_NAME};
   END IF;
END
\$\$;

DO \$\$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${DB_USER}') THEN
      CREATE USER ${DB_USER};
   END IF;
END
\$\$;

GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
EOF

# -------------------------------------
# Step 5: Install Node.js 20 and pm2
# -------------------------------------

# Check if Node.js is installed; install Node.js 20 if missing
if ! command -v node >/dev/null 2>&1; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
fi

# Check if PM2 is installed; install it globally if missing
if ! command -v pm2 >/dev/null 2>&1; then
    npm install -g pm2
fi

# -------------------------------------
# Step 6: Create application group and user
# -------------------------------------

# Create group if it does not exist
if ! getent group csye6225 >/dev/null; then
    groupadd csye6225
fi

# Create user if it does not exist
# --system: create a system account
# --no-create-home: do not create a home directory
# --gid csye6225: assign user to application group
# --shell /usr/sbin/nologin: disable interactive login
if ! id csye6225 >/dev/null 2>&1; then
    useradd \
        --system \
        --no-create-home \
        --gid csye6225 \
        --shell /usr/sbin/nologin \
        csye6225
fi


