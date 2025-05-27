#!/bin/bash

# Script to convert LESS files to SCSS
# This script will:
# 1. Copy .less files to .scss files
# 2. Convert LESS syntax to SCSS syntax
# 3. Update import paths

echo "Starting LESS to SCSS conversion..."

# Function to convert a single file
convert_file() {
    local less_file="$1"
    local scss_file="${less_file%.less}.scss"
    
    echo "Converting: $less_file -> $scss_file"
    
    # Copy the file
    cp "$less_file" "$scss_file"
    
    # Convert LESS syntax to SCSS syntax
    sed -i 's/@\([a-zA-Z_-][a-zA-Z0-9_-]*\):/\$\1:/g' "$scss_file"  # Variables: @var -> $var
    sed -i 's/@import (less)/\@import/g' "$scss_file"  # Remove (less) from imports
    sed -i 's/\.less"/.scss"/g' "$scss_file"  # Update import extensions
    sed -i 's/\.less'\''/\.scss'\''/g' "$scss_file"  # Update import extensions with single quotes
    sed -i 's/app\/less\//app\/scss\//g' "$scss_file"  # Update path references
    sed -i 's/bootstrap\/less\//bootstrap\/scss\//g' "$scss_file"  # Update bootstrap paths
    sed -i 's/data-uri(/url(/g' "$scss_file"  # Convert data-uri to url (SASS doesn't have data-uri)
}

# Create scss directories
echo "Creating SCSS directory structure..."
mkdir -p app/bundles/CoreBundle/Assets/css/app/scss/layouts
mkdir -p app/bundles/CoreBundle/Assets/css/app/scss/components
mkdir -p app/bundles/CoreBundle/Assets/css/libraries/bootstrap
mkdir -p app/bundles/CoreBundle/Assets/css/libraries/chosen
mkdir -p app/bundles/CoreBundle/Assets/css/libraries/remixicon/fonts
mkdir -p app/bundles/CoreBundle/Assets/css/libraries/multiselect
mkdir -p app/bundles/CoreBundle/Assets/css/libraries/emoji
mkdir -p app/bundles/CoreBundle/Assets/css/libraries/other
mkdir -p plugins/MauticFocusBundle/Assets/css

# Convert all LESS files (excluding node_modules)
find . -name "*.less" -type f -not -path "./node_modules/*" | while read -r file; do
    convert_file "$file"
done

echo "Basic conversion complete. Manual fixes may be needed for:"
echo "1. Mixin definitions and calls"
echo "2. Complex variable interpolations"
echo "3. LESS-specific functions"
echo "4. String escaping"

echo "Conversion script finished."
