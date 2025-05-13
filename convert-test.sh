#!/bin/bash
# Script to test LESS to SASS conversion on a small set of files

# Make the script executable
chmod +x less-to-sass.js

# Create components directory if it doesn't exist
mkdir -p app/bundles/CoreBundle/Assets/scss/app/scss/components

# Run the conversion script on a few component files
ddev exec node less-to-sass.js "app/bundles/CoreBundle/Assets/css/app/less/components/buttons.less" "app/bundles/CoreBundle/Assets/scss/app/scss"
ddev exec node less-to-sass.js "app/bundles/CoreBundle/Assets/css/app/less/components/alerts.less" "app/bundles/CoreBundle/Assets/scss/app/scss"
ddev exec node less-to-sass.js "app/bundles/CoreBundle/Assets/css/app/less/components/forms.less" "app/bundles/CoreBundle/Assets/scss/app/scss"

# Show the converted files
ls -la app/bundles/CoreBundle/Assets/scss/app/scss/components/
