#!/usr/bin/env node

/**
 * LESS to SASS converter script
 * This script converts LESS files to SASS format by applying common conversion patterns
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Define conversion patterns
const conversionPatterns = [
  // Variables: @ -> $
  { pattern: /@(?!import|media|keyframes|-webkit-keyframes|font-face|supports|page|charset|namespace|document)/g, replacement: '$' },
  
  // Mixins: .mixin() -> @include mixin()
  { pattern: /\.([\w\-]*)\s*\((.*)\)\s*;/g, replacement: '@include $1($2);' },
  
  // Mixin definitions: .mixin() { -> @mixin mixin() {
  { pattern: /^(\s*)\.([a-zA-Z][\w\-]*)\s*\((.*?)\)\s*\{/gm, replacement: '$1@mixin $2($3) {' },
  
  // Extend: &:extend(.class) -> @extend .class
  { pattern: /&:extend\((.[^)]*)\);/g, replacement: '@extend $1;' },
  
  // String interpolation: @{var} -> #{$var}
  { pattern: /@\{([^}]*)\}/g, replacement: '#{$$1}' },
  
  // Property interpolation: ~"" -> #{}
  { pattern: /~"([^"]*)"/g, replacement: '#{$1}' },
  
  // Import statements: @import -> @import
  // (no change needed, but we'll update file extensions)
  { pattern: /@import\s+["']([^"']+)\.less["'];/g, replacement: '@import "$1.scss";' },
  
  // Color operations: lighten, darken, etc.
  { pattern: /lighten\(([^,]+),\s*([^)]+)\)/g, replacement: 'color.adjust($1, $lightness: $2)' },
  { pattern: /darken\(([^,]+),\s*([^)]+)\)/g, replacement: 'color.adjust($1, $lightness: -$2)' },
  
  // Comments: // -> //
  // (no change needed)
  
  // Nested properties: transform: { scale: 2 } -> transform: { scale: 2 }
  // (no change needed)
];

// Function to convert LESS content to SASS
function convertLessToSass(content) {
  let result = content;
  
  // Add SASS color module import at the top if color functions are used
  if (content.includes('lighten(') || content.includes('darken(')) {
    result = '@use "sass:color";\n' + result;
  }
  
  // Apply all conversion patterns
  conversionPatterns.forEach(({ pattern, replacement }) => {
    result = result.replace(pattern, replacement);
  });
  
  return result;
}

// Function to process a single file
function processFile(lessFile, outputDir) {
  const content = fs.readFileSync(lessFile, 'utf8');
  const convertedContent = convertLessToSass(content);
  
  // Extract the filename and directory structure after 'less'
  const lessPattern = /\/less\/(.+)$/;
  const match = lessFile.match(lessPattern);
  
  let outputPath;
  if (match && match[1]) {
    // If we found the pattern, use the structure after 'less'
    const subPath = match[1];
    outputPath = path.join(outputDir, subPath.replace(/\.less$/, '.scss'));
  } else {
    // Fallback: just use the filename
    const filename = path.basename(lessFile).replace(/\.less$/, '.scss');
    outputPath = path.join(outputDir, filename);
  }
  
  // Ensure output directory exists
  const outputDirPath = path.dirname(outputPath);
  if (!fs.existsSync(outputDirPath)) {
    fs.mkdirSync(outputDirPath, { recursive: true });
  }
  
  // Write converted content
  fs.writeFileSync(outputPath, convertedContent);
  console.log(`Converted: ${lessFile} -> ${outputPath}`);
}

// Main function
function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('Usage: node less-to-sass.js <glob-pattern> <output-dir>');
    console.error('Example: node less-to-sass.js "app/bundles/CoreBundle/Assets/css/**/*.less" "app/bundles/CoreBundle/Assets/scss"');
    process.exit(1);
  }
  
  const globPattern = args[0];
  const outputDir = args[1];
  
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Find all LESS files matching the pattern
  const lessFiles = glob.sync(globPattern);
  
  if (lessFiles.length === 0) {
    console.warn(`No files found matching pattern: ${globPattern}`);
    process.exit(0);
  }
  
  console.log(`Found ${lessFiles.length} LESS files to convert`);
  
  // Process each file
  lessFiles.forEach(file => processFile(file, outputDir));
  
  console.log('Conversion complete!');
}

main();
