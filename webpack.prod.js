const webpack = require('webpack');
const base = require('./webpack.base');
const merge = require('webpack-merge');

module.exports = merge(base, {
  mode: 'production',
  entry: {
    main: ['source-map-support/register', './index.js'],
    worker: ['./src/utils/back-job/worker']
  },
  plugins: [new webpack.DefinePlugin({_DEV_: false})]
});
