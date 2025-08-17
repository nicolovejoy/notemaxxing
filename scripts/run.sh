#!/bin/bash

# Master script for running various project operations
# Usage: ./scripts/run.sh [command]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

function print_usage {
    echo "Usage: ./scripts/run.sh [command]"
    echo ""
    echo "Available commands:"
    echo "  setup-db         - Run complete database setup (destructive)"
    echo "  revert-policies  - Revert to simple RLS policies"
    echo "  deploy-functions - Deploy Edge Functions to Supabase"
    echo "  build-info       - Generate build info"
    echo "  help            - Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./scripts/run.sh setup-db"
    echo "  ./scripts/run.sh deploy-functions"
}

function setup_db {
    echo -e "${YELLOW}⚠️  WARNING: This will reset your entire database!${NC}"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 1
    fi
    
    echo -e "${GREEN}Setting up database...${NC}"
    echo "Please run the following SQL scripts in your Supabase dashboard:"
    echo "1. scripts/complete-database-setup.sql"
    echo ""
    echo "Go to: https://app.supabase.com/project/YOUR_PROJECT/sql/new"
}

function revert_policies {
    echo -e "${GREEN}Reverting to simple RLS policies...${NC}"
    echo "Please run the following SQL script in your Supabase dashboard:"
    echo "1. scripts/revert-broken-policies.sql"
    echo ""
    echo "This will fix any RLS circular dependency issues."
}

function deploy_functions {
    echo -e "${GREEN}Deploying Edge Functions...${NC}"
    bash "$SCRIPT_DIR/deploy-edge-functions.sh"
}

function build_info {
    echo -e "${GREEN}Generating build info...${NC}"
    node "$SCRIPT_DIR/generate-build-info.js"
}

# Main command handler
case "$1" in
    setup-db)
        setup_db
        ;;
    revert-policies)
        revert_policies
        ;;
    deploy-functions)
        deploy_functions
        ;;
    build-info)
        build_info
        ;;
    help|--help|-h|"")
        print_usage
        ;;
    *)
        echo -e "${RED}Error: Unknown command '$1'${NC}"
        echo ""
        print_usage
        exit 1
        ;;
esac