packer {
  required_plugins {
    amazon = {
      version = ">= 1.2.0"
      source  = "github.com/hashicorp/amazon"
    }
    googlecompute = {
      version = ">= 1.1.0"
      source  = "github.com/hashicorp/googlecompute"
    }
  }
}

# -----------------------------------------------
# AWS AMI Source - Ubuntu 24.04 LTS
# -----------------------------------------------
source "amazon-ebs" "webapp" {
  ami_name        = "csye6225-webapp-${formatdate("YYYY-MM-DD-hhmm", timestamp())}"
  ami_description = "CSYE6225 Web Application Custom AMI"
  instance_type   = var.aws_instance_type
  region          = var.aws_region
  source_ami      = var.source_ami
  ssh_username    = "ubuntu"

  # No subnet_id — Packer auto-uses default VPC

  aws_polling {
    delay_seconds = 120
    max_attempts  = 50
  }

  # Keep AMI private, share only with DEMO account
  ami_users = [var.aws_demo_account_id]

  launch_block_device_mappings {
    device_name           = "/dev/sda1"
    volume_size           = 25
    volume_type           = "gp2"
    delete_on_termination = true
  }
}

# -----------------------------------------------
# GCP Custom Image Source - Ubuntu 24.04 LTS
# -----------------------------------------------
source "googlecompute" "webapp" {
  project_id              = var.gcp_project_id
  source_image_family     = "ubuntu-2404-lts-amd64"
  source_image_project_id = ["ubuntu-os-cloud"]
  zone                    = var.gcp_zone
  machine_type            = "e2-medium"
  ssh_username            = "ubuntu"
  image_name              = "csye6225-webapp-${formatdate("YYYY-MM-DD-hhmm", timestamp())}"
  image_description       = "CSYE6225 Web Application Custom Image"
  image_family            = "csye6225-webapp"
  image_project_id        = var.gcp_project_id
}

# -----------------------------------------------
# Build
# -----------------------------------------------
build {
  sources = [
    "source.amazon-ebs.webapp",
    "source.googlecompute.webapp"
  ]

  # Copy application artifact to the instance
  provisioner "file" {
    source      = var.app_artifact_path
    destination = "/tmp/webapp.zip"
  }

  # Copy systemd service file
  provisioner "file" {
    source      = "packer/webapp.service"
    destination = "/tmp/webapp.service"
  }

  # Copy CloudWatch agent configuration
  provisioner "file" {
    source      = "packer/amazon-cloudwatch-agent.json"
    destination = "/tmp/amazon-cloudwatch-agent.json"
  }

  # Copy setup script
  provisioner "file" {
    source      = "scripts/setup.sh"
    destination = "/tmp/setup.sh"
  }

  # Run setup script
  provisioner "shell" {
    environment_vars = [
      "DEBIAN_FRONTEND=noninteractive"
    ]
    inline = [
      "chmod +x /tmp/setup.sh",
      "sudo -E /tmp/setup.sh",
      "rm -f /tmp/setup.sh"
    ]
  }

  post-processor "manifest" {
    output     = "packer-manifest.json"
    strip_path = true
  }
}
