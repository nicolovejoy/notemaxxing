#!/bin/bash

# Deploy Edge Functions to Supabase
# This script deploys the Edge Functions needed for shared resource access

set -e

echo "🚀 Deploying Edge Functions to Supabase..."

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed. Please install it first:"
    echo "   brew install supabase/tap/supabase"
    exit 1
fi

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "❌ .env.local file not found. Please create it first."
    exit 1
fi

# Extract project ref from SUPABASE_URL
PROJECT_REF=$(grep NEXT_PUBLIC_SUPABASE_URL .env.local | cut -d'=' -f2 | cut -d'/' -f3 | cut -d'.' -f1)

if [ -z "$PROJECT_REF" ]; then
    echo "❌ Could not extract project reference from .env.local"
    echo "   Please ensure NEXT_PUBLIC_SUPABASE_URL is set correctly"
    exit 1
fi

echo "📎 Linking to project: $PROJECT_REF"

# Link to the project (this will prompt for auth if needed)
supabase link --project-ref "$PROJECT_REF"

echo "📦 Deploying get-shared-resources function..."

# Deploy the Edge Function
supabase functions deploy get-shared-resources

echo "✅ Edge Functions deployed successfully!"
echo ""
echo "📝 Next steps:"
echo "1. Test the function by refreshing your app"
echo "2. Check the function logs with: supabase functions logs get-shared-resources"
echo "3. If there are issues, check the Supabase dashboard"
echo ""
echo "🔍 To verify deployment:"
echo "   - User B should now see shared folders"
echo "   - Check browser console for 'Loaded shared folders via Edge Function' messages"