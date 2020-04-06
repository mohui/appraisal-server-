const path = require('upath');
const nodePath = require('path');
const VueLoaderPlugin = require('vue-loader/lib/plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

const isDev = process.env.NODE_ENV === 'development';
const dist = nodePath.normalize(path.join(process.cwd(), 'dist', 'static'));
const context = nodePath.normalize(path.join(process.cwd(), 'ui'));
const styleLoader = isDev ? 'vue-style-loader' : MiniCssExtractPlugin.loader;

module.exports = {
  context,
  output: {
    path: dist
  },
  module: {
    rules: [
      //vue组件
      {
        test: /\.vue$/,
        loader: 'vue-loader'
      },
      //js文件
      {
        test: /\.js$/,
        loader: 'babel-loader',
        exclude: file => /node_modules/.test(file) && !/\.vue\.js/.test(file)
      },
      //scss
      {
        test: /\.(sc|c)ss$/,
        use: [styleLoader, 'css-loader', 'sass-loader']
      },
      //less
      {
        test: /\.less$/,
        use: [
          styleLoader,
          'css-loader',
          {
            loader: 'less-loader',
            options: {
              modifyVars: {}
            }
          }
        ]
      },
      //其他raw文件
      {
        test: /\.(png|jpe?g|gif|svg)(\?.*)?$/,
        loader: 'url-loader',
        options: {
          limit: 10000,
          name: 'img/[name].[hash:8].[ext]'
        }
      },
      {
        test: /\.(mp4|webm|ogg|mp3|wav|flac|aac)(\?.*)?$/,
        loader: 'url-loader',
        options: {
          limit: 10000,
          name: 'media/[name].[hash:8].[ext]'
        }
      },
      {
        test: /\.(woff2?|eot|ttf|otf)(\?.*)?$/,
        loader: 'url-loader',
        options: {
          limit: 10000,
          name: 'fonts/[name].[hash:8].[ext]',
          publicPath: isDev ? '/' : '../'
        }
      }
    ]
  },
  resolve: {
    extensions: ['.vue', '.js']
  },
  plugins: [
    new VueLoaderPlugin(),
    //public文件夹拷贝
    new CopyWebpackPlugin([
      {
        from: 'public',
        toType: 'dir',
        ignore: ['.DS_Store']
      }
    ]),
    //释放到外部css
    new MiniCssExtractPlugin({
      filename: 'css/[name].[contenthash:8].css',
      chunkFilename: 'css/[name].[contenthash:8].css'
    })
  ]
};
