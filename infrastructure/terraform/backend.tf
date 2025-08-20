terraform {
  backend "s3" {
    bucket = "notemaxxing-terraform-state"
    key    = "prod/terraform.tfstate"
    region = "us-east-1"
    
    # Enable encryption for security
    encrypt = true
    
    # Optional: Use DynamoDB for state locking (prevents concurrent modifications)
    # dynamodb_table = "terraform-state-lock"
  }
}