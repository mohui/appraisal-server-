import * as path from 'upath';
import * as express from 'express';
import * as config from 'config';
import * as http from 'http';
import * as cookieParser from 'cookie-parser';
import * as fallback from 'connect-history-api-fallback';
import {KatoUI} from 'kato-ui';
import {
  AuthenticateMiddleware,
  ExpressAdapter,
  Kato,
  RespondMiddleware
} from 'kato-server';
import {UserMiddleware} from './api/middleware/user';
import {AuditLogMiddleware} from './api/middleware/audit-log';
import {Sequelize} from 'sequelize-typescript';
import {createExtendedSequelize, Migrater, migrations} from './database';
import * as models from './database/model';
import * as cron from 'node-cron';
import {init as initBackJob} from './utils/back-job/index';
import {
  FileSystemError,
  LocalFileSystem,
  OSSFileSystem,
  OverlayFileSystem,
  UnionFileSystem
} from './unifs';
import * as dayjs from 'dayjs';
import {WeChatApi} from './utils/wechat';

//应用程序类
//所有的组件都会实例化挂载到这个里面成为属性
export class Application {
  express = express();
  server = http.createServer(this.express);
  appDB = createExtendedSequelize(new Sequelize(config.get('postgres')));
  originalDB = createExtendedSequelize(new Sequelize(config.get('original')));
  lakeDB = createExtendedSequelize(new Sequelize(config.get('lake')));

  //TODO: 临时需要, 等待公卫etl完成后即可弃用
  mappingDB = createExtendedSequelize(new Sequelize(config.get('mapping')));
  unifs: UnionFileSystem = new OverlayFileSystem();
  knowledgeDB = createExtendedSequelize(new Sequelize(config.get('knowledge')));
  // 微信接口客户端
  wx = new WeChatApi(config.get('wechat.appId'), config.get('wechat.secret'));

  constructor() {
    //同时也把app赋值给process中,方便全局访问
    (process as ExtendedProcess).app = this;
    //获取服务器监听的地址
    this.server.once('listening', () => {
      const address = this.server.address();
      if (typeof address !== 'string') {
        (process as ExtendedProcess).host = address.address;
        (process as ExtendedProcess).port = address.port;
      }
    });
  }

  async start() {
    // 设置服务器连接的超时时间
    this.server.setTimeout(0);

    //初始化数据库
    await this.initDB();
    //初始化express
    await this.initExpress();
    //初始化kato
    await this.initKato();
    //初始化文件系统
    await this.initFS();
    //初始化socket
    await this.initBackJob(this.server);
    //初始化web资源
    await this.initWebResource();
    //初始化定时任务
    await this.initScheduleJob();
    //错误处理
    this.express.on('error', err => console.error(err));

    return new Promise(resolve => {
      this.server.listen(config.get('port'), config.get('host'), () => {
        if (_DEV_) {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          require('killable')(this.server);
        }
        console.log(
          `Server on http://${config.get('host')}:${config.get('port')}`
        );
        resolve();
      });
    });
  }

  async shutdown() {
    //关闭数据库
    this.appDB && (await this.appDB.close());
    //关闭http服务器
    return new Promise(resolve => {
      this.server[(this.server as any).kill ? 'kill' : 'close'](() =>
        resolve()
      );
    });
  }

  async initDB() {
    this.appDB.addModels(Object.values(models));
    const migrate = new Migrater(this.appDB);
    migrations.forEach(m => migrate.addMigration(m));
    if (process.env.NODE_ENV === 'production') {
      await migrate.migrate(57);
    }
  }

  async initExpress() {
    //解析cookie
    this.express.use(cookieParser());
  }

  async initWebResource() {
    //fallback页面资源,处理vue路由
    this.express.use(fallback());

    //页面资源挂载
    if (_DEV_) {
      //开发模式下,使用开发服务器
      this.express.use(require('./dev-server').devServer);
    } else {
      //生产模式下,使用已经构建完成的静态文件
      this.express.use(express.static(path.join(__dirname, 'static')));
    }
  }

  async initKato() {
    //初始化kato
    const katoOptions = {
      //开发模式下启动kato的dev模式,dev模式下将把服务器错误堆栈传输到前端
      dev: _DEV_
    };
    const kato = new Kato(katoOptions);
    //动态加载kato模块
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('./kato-loader!./api/kato.config')(kato);
    //如果需要启动KatoUI的话,仅仅在开发环境下启用
    if (process.env.NODE_ENV === 'development' || process.env.KatoUI) {
      console.log(
        `Kato UI http://${config.get('host')}:${config.get('port')}/api/ui/`
      );
      kato.use(KatoUI);
    }
    //添加用户中间件,在验证中间件之前
    kato.use(UserMiddleware, AuthenticateMiddleware);
    //添加操作日志中间件, 在Respond中间件之后
    kato.useAfter(AuditLogMiddleware, RespondMiddleware);
    //挂载kato处理中间件
    this.express.use('/api', ExpressAdapter(kato));
  }

  async initScheduleJob() {
    //每天凌晨4点执行自动打分
    cron.schedule(config.get('queue.cron'), async () => {
      try {
        const scoreAPI = new (require('./api/group/score').default)();
        await scoreAPI.autoScoreAllChecks(true);
      } catch (e) {
        console.log(`定时任务失败: ${e}`);
      }
    });

    // 只需要生成一份,正式版才有值
    if (config.get('generate.cron')) {
      // 自动生成公卫报告
      cron.schedule(config.get('generate.cron'), async () => {
        try {
          //获取上月的时间字符串, 格式为年月
          const time = dayjs()
            .subtract(1, 'month')
            .format('YYYYMM');
          const api = new (require('./api/group/report').default)();
          await api.generateAll(time);
          console.log('生成公卫报告完成');
        } catch (e) {
          console.log(`生成公卫报告失败: ${e}`);
        }
      });
    }
    //医疗绩效的每日打分
    const hisConfig = config.get<string>('queue.his');
    if (hisConfig) {
      cron.schedule(hisConfig, async () => {
        try {
          console.log('医疗绩效打分开始');
          const api = new (require('./api/his/score').default)();
          await api.autoScoreAll();
          console.log('医疗绩效打分完成');
        } catch (e) {
          console.log(`医疗绩效打分失败: ${e}`);
        }
      });
    }
  }

  async initBackJob(app) {
    await initBackJob(app);
  }

  async initFS() {
    const typeMapToFS: {[typeName: string]: typeof UnionFileSystem} = {
      local: LocalFileSystem,
      oss: OSSFileSystem
    };
    console.log('初始化联合文件系统');
    (config.get('unifs') as any[]).forEach(c => {
      const fs = typeMapToFS[c.type];
      if (fs) {
        (this.unifs as OverlayFileSystem).mount(
          c.path,
          new (fs as any)(c.options)
        );
        console.log(
          `===> 挂载 '${c.path}' 类型 ${c.type} 选项: ${JSON.stringify(
            c.options
          )}`
        );
      } else
        throw new FileSystemError(`不存在对应type ${c.type} 的文件系统实现`);
    });
    await this.unifs.init();
    console.log('文件系统初始化完毕');
  }
}

//实例化一个app
export const app = new Application();

//导出各种便捷属性
export const appDB = app.appDB;
export const originalDB = app.originalDB;
export const lakeDB = app.lakeDB;
export const mappingDB = app.mappingDB;
export const unifs = app.unifs;
export const initFS = app.initFS;
export const knowledgeDB = app.knowledgeDB;
export const wx = app.wx;
