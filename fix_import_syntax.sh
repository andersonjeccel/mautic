#!/bin/bash

# Script to fix $import back to @import in SCSS files
echo "Fixing @import syntax in SCSS files..."

# Function to fix imports in a single SCSS file
fix_imports() {
    local file="$1"
    echo "Fixing imports in: $file"
    
    # Fix $import back to @import
    sed -i 's/\$import/@import/g' "$file"
    
    # Fix $font-face back to @font-face
    sed -i 's/\$font-face/@font-face/g' "$file"
    
    # Fix $media back to @media
    sed -i 's/\$media/@media/g' "$file"
    
    # Fix $keyframes back to @keyframes
    sed -i 's/\$keyframes/@keyframes/g' "$file"
}

# Fix all SCSS files
find . -name "*.scss" -type f -not -path "./node_modules/*" | while read -r file; do
    fix_imports "$file"
done

echo "Import syntax fixes complete."
