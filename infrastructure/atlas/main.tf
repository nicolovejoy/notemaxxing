terraform {
  required_version = ">= 1.0"
  
  required_providers {
    atlas = {
      source  = "ariga/atlas"
      version = "~> 0.9.0"
    }
  }
}

variable "database_url" {
  description = "PostgreSQL connection string for the new Supabase database"
  type        = string
  sensitive   = true
}

# Atlas provider doesn't need configuration
provider "atlas" {}

# Main database schema resource
resource "atlas_schema" "notemaxxing" {
  hcl = file("${path.module}/schema.hcl")
  url = var.database_url
  
  # Exclude Supabase-managed schemas
  exclude = [
    "auth.*",
    "storage.*",
    "realtime.*",
    "extensions.*",
    "pgbouncer.*",
    "_analytics.*",
    "_realtime.*",
    "supabase_functions.*",
    "information_schema.*",
    "pg_*",
    "graphql.*",
    "graphql_public.*",
    "vault.*",
    "pgsodium.*",
    "pgsodium_masks.*"
  ]
  
  # Development database for safe testing
  # dev_url = "docker://postgres/15"
}