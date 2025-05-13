#!/bin/bash
# Script to convert all LESS files to SASS (fixed version)

# Make sure the conversion script is executable
chmod +x less-to-sass.js

# Create the necessary directory structure
mkdir -p app/bundles/CoreBundle/Assets/scss/app/scss/components
mkdir -p app/bundles/CoreBundle/Assets/scss/app/scss/layouts

# Find and convert all component LESS files
echo "Converting component files..."
for file in app/bundles/CoreBundle/Assets/css/app/less/components/*.less; do
  if [ -f "$file" ]; then
    echo "Converting $file..."
    ddev exec node less-to-sass.js "$file" "app/bundles/CoreBundle/Assets/scss/app/scss"
  fi
done

# Find and convert all layout LESS files
echo "Converting layout files..."
for file in app/bundles/CoreBundle/Assets/css/app/less/layouts/*.less; do
  if [ -f "$file" ]; then
    echo "Converting $file..."
    ddev exec node less-to-sass.js "$file" "app/bundles/CoreBundle/Assets/scss/app/scss"
  fi
done

# Convert custom.less
echo "Converting custom.less..."
ddev exec node less-to-sass.js "app/bundles/CoreBundle/Assets/css/app/less/custom.less" "app/bundles/CoreBundle/Assets/scss/app/scss"

# Convert marketplace.less
echo "Converting marketplace.less..."
ddev exec node less-to-sass.js "app/bundles/CoreBundle/Assets/css/app/less/marketplace.less" "app/bundles/CoreBundle/Assets/scss/app/scss"

# Convert variables.less
echo "Converting variables.less..."
ddev exec node less-to-sass.js "app/bundles/CoreBundle/Assets/css/app/less/variables.less" "app/bundles/CoreBundle/Assets/scss/app/scss"

# Convert mixins.less
echo "Converting mixins.less..."
ddev exec node less-to-sass.js "app/bundles/CoreBundle/Assets/css/app/less/mixins.less" "app/bundles/CoreBundle/Assets/scss/app/scss"

# Convert spinning.less
echo "Converting spinning.less..."
ddev exec node less-to-sass.js "app/bundles/CoreBundle/Assets/css/app/less/spinning.less" "app/bundles/CoreBundle/Assets/scss/app/scss"

echo "Conversion complete!"
echo "Next steps:"
echo "1. Update import paths in SCSS files"
echo "2. Install dependencies with: ddev exec npm install"
echo "3. Test compilation with: ddev exec npx sass app/bundles/CoreBundle/Assets/scss/app.scss app/bundles/CoreBundle/Assets/scss/app.css"
echo "4. View the compiled CSS in the browser"
