const path = require('path');

module.exports = {
  entry: './app/bundles/CoreBundle/Assets/ts/stepper.ts',
  output: {
    path: path.resolve(__dirname, 'app/bundles/CoreBundle/Assets/js'),
    filename: '17.stepper.js',
    library: {name: ['Mautic', 'Stepper'], type: 'window', export: 'Stepper'},
  },
  module: {
    rules: [{
      test: /\.ts$/,
      use: {loader: 'ts-loader', options: {configFile: 'tsconfig.stepper.json'}},
    }],
  },
  resolve: {extensions: ['.ts', '.js']},
};
