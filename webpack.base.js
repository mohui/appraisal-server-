const nodeExternals = require('webpack-node-externals');
const {CleanWebpackPlugin} = require('clean-webpack-plugin');
const {CheckerPlugin: TSCheckerPlugin} = require('awesome-typescript-loader');
const FriendlyErrorsWebpackPlugin = require('friendly-errors-webpack-plugin');

module.exports = {
  target: 'node',
  devtool: 'source-map',
  optimization: {
    minimize: false,
    //防止在production下,模块被合并,导致类名出错
    concatenateModules: false,
    //不要把打包环境中的NODE_ENV直接定义到代码中
    nodeEnv: false
  },
  output: {
    devtoolModuleFilenameTemplate: '[resource-path]'
  },
  node: {
    __dirname: false,
    __filename: false
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [['@babel/preset-env', {targets: {node: '8'}}]],
            plugins: [
              'babel-plugin-macros',
              [
                '@babel/plugin-proposal-decorators',
                {
                  legacy: true
                }
              ],
              '@babel/plugin-proposal-class-properties',
              '@babel/plugin-proposal-optional-chaining',
              '@babel/plugin-proposal-nullish-coalescing-operator'
            ]
          }
        }
      },
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'awesome-typescript-loader',
            options: {
              useTranspileModule: true
            }
          }
        ]
      }
      // {
      //   test: /\.sql.hbs$/,
      //   exclude: /node_modules/,
      //   use: [
      //     'babel-loader',
      //     path.resolve('./sql-loader')
      //   ]
      // }
    ]
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  externals: [
    nodeExternals({
      whitelist: ['webpack/hot/poll?1000']
    })
  ],
  plugins: [
    new CleanWebpackPlugin(),
    new TSCheckerPlugin(),
    new FriendlyErrorsWebpackPlugin()
  ]
};
