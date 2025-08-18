#!/bin/bash

# Database-as-Code deployment script
# Applies Atlas schema (tables) and then views

set -e  # Exit on error

echo "🚀 Starting database schema deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if database URL is provided
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}Error: DATABASE_URL environment variable not set${NC}"
    echo "Usage: DATABASE_URL='postgresql://...' ./apply-schema.sh"
    exit 1
fi

# Navigate to terraform directory
cd "$(dirname "$0")/terraform"

# Initialize Terraform if needed
if [ ! -d ".terraform" ]; then
    echo -e "${YELLOW}Initializing Terraform...${NC}"
    terraform init
fi

# Apply Atlas schema (tables, indexes, foreign keys)
echo -e "${YELLOW}Applying Atlas schema (tables, indexes, constraints)...${NC}"
terraform apply -var="database_url=$DATABASE_URL" -auto-approve

# Apply views separately (since they require Atlas paid tier)
echo -e "${YELLOW}Applying database views...${NC}"
psql "$DATABASE_URL" -f ../atlas/views.sql

echo -e "${GREEN}✅ Database schema deployment complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Update your .env.local with the new database credentials"
echo "2. Run 'npm run dev' to test locally"
echo "3. Deploy to Vercel with updated environment variables"