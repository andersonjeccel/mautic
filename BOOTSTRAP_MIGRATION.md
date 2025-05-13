# Bootstrap Migration from LESS to SASS

This document tracks the migration of Bootstrap from LESS to SASS in the Mautic project.

## Completed Tasks

- [x] Create migration plan and task list
- [x] Identify current Bootstrap version and implementation (Bootstrap 3.4.1 with LESS)
- [x] Identify key LESS files that need to be migrated

## In Progress Tasks

- [x] Determine target Bootstrap version with SASS support (Bootstrap 5.3.6)
- [x] Update package.json with new dependencies
- [x] Set up SASS compilation in build process
- [x] Create directory structure for SASS files
- [x] Create core SCSS files (bootstrap.scss, variables.scss, mixins.scss)
- [x] Install new dependencies with npm
- [x] Set up programmatic conversion of LESS files to SASS
- [x] Run full conversion of LESS files to SASS
- [x] Fix compilation issues and update import paths
- [ ] Test SASS compilation with Grunt
- [ ] Test styling across all components

## Future Tasks

- [ ] Update import statements in all SASS files
- [ ] Update documentation for theme developers
- [ ] Create migration guide for custom themes

## Implementation Plan

We will migrate from Bootstrap 3.4.1 with LESS to Bootstrap 5.3.6 with SASS. This involves:

1. Updating dependencies in package.json:
   - Remove `grunt-contrib-less`
   - Add `grunt-sass` or `node-sass` and related dependencies
   - Update Bootstrap to a version that supports SASS

2. Converting LESS files to SASS format:
   - Convert variable syntax (@ → $)
   - Update mixins and functions to SASS syntax
   - Adapt nesting and import statements

3. Updating the build process:
   - Modify Gruntfile.js to use SASS instead of LESS
   - Update file paths and compilation options

4. Testing all components to ensure styling is maintained

### Relevant Files

- `/app/bundles/CoreBundle/Assets/css/libraries/bootstrap/bootstrap.less` - Main Bootstrap import file
- `/app/bundles/CoreBundle/Assets/css/libraries/bootstrap/bootstrap-mautic-custom-variables.less` - Custom Bootstrap variables
- `/app/bundles/CoreBundle/Assets/css/app.less` - Main application styles
- `/Gruntfile.js` - Build configuration for LESS compilation
- `/package.json` - Dependencies including Bootstrap 3.4.1
