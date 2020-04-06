const merge = require('webpack-merge');
const base = require('./webpack.base');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const FriendlyErrorsWebpackPlugin = require('friendly-errors-webpack-plugin');

module.exports = merge(base, {
  mode: 'development',
  devtool: 'cheap-module-eval-source-map',
  entry: {
    front: ['webpack-hot-middleware/client', './web/main.js']
  },
  plugins: [
    new webpack.HotModuleReplacementPlugin(),
    new webpack.DefinePlugin({
      _DEV_: true
    }),
    new HtmlWebpackPlugin({
      filename: 'index.html',
      template: './web/index.html',
      chunks: ['front']
    }),
    new FriendlyErrorsWebpackPlugin()
  ]
});
