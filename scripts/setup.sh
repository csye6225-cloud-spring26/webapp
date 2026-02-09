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
