variable "aws_region" {
  type        = string
  default     = "us-east-1"
  description = "AWS region to build the AMI in"
}

variable "source_ami" {
  type        = string
  default     = "ami-0b6c6ebed2801a5cb" # Ubuntu 24.04 LTS us-east-1
  description = "Source AMI ID for the custom image"
}

variable "aws_instance_type" {
  type        = string
  default     = "t2.micro"
  description = "EC2 instance type for building the AMI"
}

variable "aws_demo_account_id" {
  type        = string
  description = "AWS DEMO account ID to share the AMI with"
  default     = ""
}

variable "gcp_project_id" {
  type        = string
  description = "GCP DEV project ID where the image will be built"
  default     = "placeholder"
}

# Used in CI/CD pipelines to specify the GCP project for sharing the image with
variable "gcp_demo_project_id" {
  type        = string
  description = "GCP DEMO project ID to share the image with"
  default     = ""
}

variable "gcp_zone" {
  type        = string
  default     = "us-east1-b"
  description = "GCP zone to build the image in"
}

# variable "db_password" {
#   type        = string
#   default     = "placeholder"
#   sensitive   = true
#   description = "Password for the PostgreSQL database user"
# }

variable "app_artifact_path" {
  type        = string
  default     = "webapp.zip"
  description = "Path to the application artifact zip file"
}