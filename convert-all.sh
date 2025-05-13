#!/bin/bash
# Script to convert all LESS files to SASS

# Make sure the conversion script is executable
chmod +x less-to-sass.js

# Create the necessary directory structure
mkdir -p app/bundles/CoreBundle/Assets/scss/app/scss/components
mkdir -p app/bundles/CoreBundle/Assets/scss/app/scss/layouts

# Convert all component LESS files to SCSS
echo "Converting component files..."
ddev exec node less-to-sass.js "app/bundles/CoreBundle/Assets/css/app/less/components/*.less" "app/bundles/CoreBundle/Assets/scss/app/scss"

# Convert all layout LESS files to SCSS
echo "Converting layout files..."
ddev exec node less-to-sass.js "app/bundles/CoreBundle/Assets/css/app/less/layouts/*.less" "app/bundles/CoreBundle/Assets/scss/app/scss"

# Convert custom.less
echo "Converting custom.less..."
ddev exec node less-to-sass.js "app/bundles/CoreBundle/Assets/css/app/less/custom.less" "app/bundles/CoreBundle/Assets/scss/app/scss"

# Convert marketplace.less
echo "Converting marketplace.less..."
ddev exec node less-to-sass.js "app/bundles/CoreBundle/Assets/css/app/less/marketplace.less" "app/bundles/CoreBundle/Assets/scss/app/scss"

echo "Conversion complete!"
echo "Next steps:"
echo "1. Update import paths in SCSS files"
echo "2. Install dependencies with: ddev exec npm install"
echo "3. Test compilation with: ddev exec npx sass app/bundles/CoreBundle/Assets/scss/app.scss app/bundles/CoreBundle/Assets/scss/app.css"
echo "4. View the compiled CSS in the browser"
