#!/bin/bash

# Script to fix remaining LESS syntax in SCSS files
echo "Fixing SCSS syntax issues..."

# Function to fix a single SCSS file
fix_scss_file() {
    local file="$1"
    echo "Fixing: $file"
    
    # Fix variable references: @variable -> $variable (but not in CSS custom properties)
    sed -i 's/@\([a-zA-Z_-][a-zA-Z0-9_-]*\)\([^:]\)/\$\1\2/g' "$file"
    
    # Fix specific Bootstrap variable references
    sed -i 's/@brand-warning/\$brand-warning/g' "$file"
    sed -i 's/@brand-primary/\$brand-primary/g' "$file"
    sed -i 's/@zindex-navbar/\$zindex-navbar/g' "$file"
    sed -i 's/@header-zindex/\$header-zindex/g' "$file"
    sed -i 's/@content-zindex/\$content-zindex/g' "$file"
    sed -i 's/@sidebar-left-bg/\$sidebar-left-bg/g' "$file"
    sed -i 's/@sidebar-right-bg/\$sidebar-right-bg/g' "$file"
    sed -i 's/@mautic-primary/\$mautic-primary/g' "$file"
    sed -i 's/@primary-color/\$primary-color/g' "$file"
    sed -i 's/@screen-md-min/\$screen-md-min/g' "$file"
    sed -i 's/@badge-border-radius/\$badge-border-radius/g' "$file"
    sed -i 's/@input-height-base/\$input-height-base/g' "$file"
    sed -i 's/@font-size-base/\$font-size-base/g' "$file"
    sed -i 's/@screen-sm-min/\$screen-sm-min/g' "$file"
    sed -i 's/@screen-lg-min/\$screen-lg-min/g' "$file"
    
    # Fix mixin calls: .mixin() -> @include mixin()
    # This is more complex and needs careful handling
    sed -i 's/\.\([a-zA-Z_-][a-zA-Z0-9_-]*\)(\([^)]*\));/@include \1(\2);/g' "$file"
    
    # Fix string escaping: ~"string" -> "string" (SASS doesn't need escaping)
    sed -i 's/~"\([^"]*\)"/"\1"/g' "$file"
    
    # Fix contrast function calls (LESS specific)
    sed -i 's/contrast(\([^,)]*\))/if(lightness(\1) > 50%, #000, #fff)/g' "$file"
    sed -i 's/contrast(\([^,)]*\), \([^,)]*\), \([^)]*\))/if(lightness(\1) > 50%, \2, \3)/g' "$file"
    
    # Fix darken/lighten function calls (should work in SASS too, but let's make sure)
    # These should already work in SASS
    
    # Fix data-uri function (LESS specific) - already handled in main conversion
}

# Fix all SCSS files
find . -name "*.scss" -type f -not -path "./node_modules/*" | while read -r file; do
    fix_scss_file "$file"
done

echo "SCSS syntax fixes complete."
