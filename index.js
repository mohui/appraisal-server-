let {app} = require('./src/app');

//启动文件,支持热加载
(async () => {
  //正常启动程序
  try {
    await app.start();
  } catch (e) {
    if (!module.hot) {
      //如果不是热重载默认则输出错误,并退出程序,如果是热重载模式就什么都不做,等待重载任务重启程序
      console.error(e);
      //这里使用正确的退出码
      //是因为在带有监控的环境中(如:docker restart=on-failure)如果非正常退出则会尝试重启
      //而应用程序启动失败这样的异常不是重启能解决的,为避免无限重启带来资源的消耗,这里干脆返回正常退出
      process.exit(0);
    } else {
      console.error(e);
      await app.shutdown();
      console.error('[HMR] 应用程序启动失败! 等待代码更新...\n');
    }
  } finally {
    if (module.hot) {
      let isReloading = false;
      let pendingReload = false;
      module.hot.accept('./src/app', async function() {
        //重载函数
        const reload = async () => {
          //进入重载流程
          try {
            isReloading = true;
            console.log('\n[HMR] 准备重载应用程序...');
            console.log('[HMR] 关闭过时的应用程序');
            await app.shutdown();
            console.log('[HMR] 加载新的应用程序代码');
            app = require('./src/app').app;
            console.log('[HMR] 启动新的应用程序\n');
            await app.start();
            console.log('\n[HMR] 新应用程序启动完成\n');
          } catch (e) {
            console.error(e);
            await app.shutdown();
            console.error('[HMR] 应用程序重载失败! 等待代码更新...\n');
          } finally {
            isReloading = false;
          }

          //判断是否有推迟的重载任务
          if (pendingReload) {
            console.warn(`\n[HMR] 有被阻塞的重载任务,现在启动它`);
            pendingReload = false;
            await reload();
          }
        };

        if (isReloading) {
          console.warn('\n[HMR] 上一个重载正在进行,等待它完成...\n');
          pendingReload = true;
        } else {
          await reload();
        }
      });
    }
  }
})();
