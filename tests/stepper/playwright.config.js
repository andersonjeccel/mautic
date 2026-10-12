const {defineConfig} = require('@playwright/test');

module.exports = defineConfig({
  testDir: __dirname,
  testMatch: '*.spec.js',
  workers: 1,
  use: {baseURL: 'http://127.0.0.1:4179', headless: true},
  webServer: {
    command: 'node tests/stepper/server.js',
    cwd: require('path').resolve(__dirname, '../..'),
    url: 'http://127.0.0.1:4179',
    reuseExistingServer: false,
  },
});
