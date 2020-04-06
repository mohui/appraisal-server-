//TODO: webpack-dev-middleware这个库写得跟坨屎一样,只能全局一个,没法close(虽然文档上有)
const webpack = require('webpack');
const compiler = webpack(require('../ui/webpack.dev'));
let devMiddleware;
let hotMiddleware;

export async function devServer(req, res, next) {
  //延时加载
  if (!devMiddleware) {
    devMiddleware = require('webpack-dev-middleware')(compiler, {
      stats: 'minimal',
      hot: true
    });
    await new Promise((resolve, reject) => {
      devMiddleware.waitUntilValid((_, err) => (err ? reject(err) : resolve()));
    });
  }
  if (!hotMiddleware)
    hotMiddleware = require('webpack-hot-middleware')(compiler);
  devMiddleware(req, res, () => hotMiddleware(req, res, next));
}
