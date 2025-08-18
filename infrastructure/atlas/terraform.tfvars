# Copy this file to terraform.tfvars and fill in your values
# DO NOT commit terraform.tfvars to git!

# Format: postgresql://[user]:[password]@[host]:[port]/[database]?sslmode=require
# 
# For new Supabase project, get this from:
# Settings -> Database -> Connection String -> URI
# Dedicated pooler URL
# database_url = "postgresql://postgres.dvuvhfjbjoemtoyfjjsg:3F8WVfPbjAKnij4jtE-3Zasve98887@dvuvhfjbjoemtoyfjjsg.supabase.co:6543/postgres"
# Shared Pooler URL
database_url = "postgresql://postgres.dvuvhfjbjoemtoyfjjsg:3F8WVfPbjAKnij4jtE-3Zasve98887@aws-1-us-west-1.pooler.supabase.com:5432/postgres"
# didn't work on free URL
# database_url = "postgresql://postgres:3F8WVfPbjAKnij4jtE-3Zasve98887@db.dvuvhfjbjoemtoyfjjsg.supabase.co:5432/postgres?sslmode=require"