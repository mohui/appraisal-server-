const config = require('config');
const express = require('express');
const devServer = require('./src/dev-server').devServer;
const proxy = require('http-proxy-middleware');
const portFinder = require('portfinder');
const fallback = require('connect-history-api-fallback');
(async () => {
  try {
    // 判断web是否配置
    const apiServer = config.api;
    if (apiServer === undefined) {
      console.error("请配置'@/config/development.js'中的api属性");
      process.exit();
    }

    const app = express();
    app.use(fallback());
    app.use(devServer);
    app.use(
      proxy.createProxyMiddleware('/api', {
        target: apiServer,
        changeOrigin: true,
        logLevel: 'warn',
        ws: true
      })
    );

    let port = await portFinder.getPortPromise({port: 8080, stopPort: 8090});
    app.listen(port, '0.0.0.0', () =>
      console.log(`Server on http://0.0.0.0:${port}`)
    );
  } catch (e) {
    console.error('服务启动失败: ', e.message);
  }
})();
