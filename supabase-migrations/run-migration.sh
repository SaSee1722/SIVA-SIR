#!/bin/bash

# SIVA-SIR Database Migration Script
# This script helps you run the security columns migration

echo "========================================="
echo "SIVA-SIR Database Migration"
echo "Adding Security Columns"
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}This migration will add the following columns:${NC}"
echo "  - profiles.is_approved (BOOLEAN)"
echo "  - profiles.device_id (TEXT)"
echo "  - attendance_records.status (TEXT)"
echo "  - attendance_records.marked_by (TEXT)"
echo ""

echo -e "${YELLOW}IMPORTANT:${NC}"
echo "  - All existing students will be auto-approved"
echo "  - This is a safe migration (uses IF NOT EXISTS)"
echo "  - Existing data will not be lost"
echo ""

read -p "Do you want to continue? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo -e "${RED}Migration cancelled.${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}Choose your migration method:${NC}"
echo "1. Supabase Dashboard (Recommended - Copy SQL manually)"
echo "2. Direct Database Connection (Requires DATABASE_URL)"
echo "3. Show SQL only (Copy and paste yourself)"
echo ""

read -p "Enter your choice (1-3): " choice

case $choice in
    1)
        echo ""
        echo -e "${GREEN}Opening migration file...${NC}"
        echo ""
        echo "Please follow these steps:"
        echo "1. Go to your Supabase Dashboard"
        echo "2. Navigate to SQL Editor"
        echo "3. Click 'New Query'"
        echo "4. Copy the contents from: supabase-migrations/add_security_columns.sql"
        echo "5. Paste and click 'Run'"
        echo ""
        
        # Try to open the file
        if [[ "$OSTYPE" == "darwin"* ]]; then
            open supabase-migrations/add_security_columns.sql
        elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
            xdg-open supabase-migrations/add_security_columns.sql
        else
            cat supabase-migrations/add_security_columns.sql
        fi
        ;;
    
    2)
        echo ""
        read -p "Enter your DATABASE_URL: " db_url
        
        if [ -z "$db_url" ]; then
            echo -e "${RED}Error: DATABASE_URL is required${NC}"
            exit 1
        fi
        
        echo ""
        echo -e "${YELLOW}Running migration...${NC}"
        
        psql "$db_url" -f supabase-migrations/add_security_columns.sql
        
        if [ $? -eq 0 ]; then
            echo ""
            echo -e "${GREEN}✅ Migration completed successfully!${NC}"
        else
            echo ""
            echo -e "${RED}❌ Migration failed. Check the error messages above.${NC}"
            exit 1
        fi
        ;;
    
    3)
        echo ""
        echo -e "${GREEN}SQL Migration Script:${NC}"
        echo "========================================="
        cat supabase-migrations/add_security_columns.sql
        echo "========================================="
        ;;
    
    *)
        echo -e "${RED}Invalid choice. Exiting.${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}Next steps:${NC}"
echo "1. Verify the migration succeeded"
echo "2. Reload your app"
echo "3. Test the new security features"
echo ""
echo "For verification queries, see: supabase-migrations/README.md"
echo ""
