#!/bin/bash

# Simple database setup script without Atlas complexity

set -e

echo "🚀 Setting up database schema..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if database URL is provided
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}Error: DATABASE_URL environment variable not set${NC}"
    echo "Usage: DATABASE_URL='postgresql://...' ./apply-database.sh"
    exit 1
fi

# Apply complete schema
echo -e "${YELLOW}Applying database schema...${NC}"
psql "$DATABASE_URL" -f "$(dirname "$0")/setup-database.sql"

echo -e "${GREEN}✅ Database setup complete!${NC}"
echo ""
echo "The following have been created:"
echo "- All tables (folders, notebooks, notes, etc.)"
echo "- All indexes and foreign keys"
echo "- Views (folders_with_stats, user_stats) with correct owner_id"
echo "- Row Level Security enabled on all tables"