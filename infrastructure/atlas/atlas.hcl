// Atlas configuration file
env "supabase" {
  // URL to the target database
  url = var.database_url
  
  // Use docker for dev database (schema diffing)
  dev = "docker://postgres/15/dev?search_path=public"
  
  // Only manage the public schema
  schemas = ["public"]
  
  // Exclude Supabase system schemas and views
  exclude = [
    "*.auth.*",
    "*.storage.*",
    "*.extensions.*", 
    "*.graphql.*",
    "*.graphql_public.*",
    "*.pgbouncer.*",
    "*.realtime.*",
    "*.vault.*",
    "public.folders_with_stats",
    "public.user_stats"
  ]
}