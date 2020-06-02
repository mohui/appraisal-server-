const merge = require('webpack-merge');
const base = require('./webpack.base');
const webpack = require('webpack');
const OptimizeCssnanoPlugin = require('@intervolga/optimize-cssnano-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = merge(base, {
  mode: 'production',
  output: {
    filename: 'js/[name].[contenthash:8].js',
    chunkFilename: 'js/[name].[contenthash:8].js'
  },
  entry: './web/main.js',
  plugins: [
    new webpack.DefinePlugin({
      _DEV_: false
    }),
    new OptimizeCssnanoPlugin({
      sourceMap: false,
      cssnanoOptions: {
        preset: [
          'default',
          {
            mergeLonghand: false,
            cssDeclarationSorter: false
          }
        ]
      }
    }),
    new HtmlWebpackPlugin({
      filename: 'index.html',
      template: './web/index.html'
    })
  ]
});
