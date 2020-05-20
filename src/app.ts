import * as path from 'upath';
import * as express from 'express';
import * as config from 'config';
import * as http from 'http';
import * as cookieParser from 'cookie-parser';
import * as fallback from 'connect-history-api-fallback';
import {KatoUI} from 'kato-ui';
import {AuthenticateMiddleware, ExpressAdapter, Kato} from 'kato-server';

import {MySQL} from '../util/mysql';
import {UserMiddleware} from './api/middleware/user';
import {Sequelize} from 'sequelize-typescript';
import {createExtendedSequelize, Migrater, migrations} from './database';
import * as models from './database/model';

//应用程序类
//所有的组件都会实例化挂载到这个里面成为属性
export class Application {
  express = express();
  server = http.createServer(this.express);
  dataDB = new MySQL(config.get('data'));
  knrtDB = new MySQL(config.get('knrt'));
  appraisalDB = createExtendedSequelize(
    new Sequelize({
      dialect: 'postgres',
      host: config.get('postgres.host'),
      port: config.get('postgres.port'),
      username: config.get('postgres.username'),
      password: config.get('postgres.password'),
      database: config.get('postgres.database'),
      timezone: '+8:00',
      define: {
        underscored: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        deletedAt: 'deleted_at',
        paranoid: true
      },
      logging: console.log
    })
  );

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
    //初始化web资源
    await this.initWebResource();
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
    this.appraisalDB && (await this.appraisalDB.close());
    //关闭http服务器
    return new Promise(resolve => {
      this.server[(this.server as any).kill ? 'kill' : 'close'](() =>
        resolve()
      );
    });
  }

  async initDB() {
    this.appraisalDB.addModels(Object.values(models));
    const migrate = new Migrater(this.appraisalDB);
    migrations.forEach(m => migrate.addMigration(m));
    await migrate.migrate(1);
  }

  async initExpress() {
    //解析cookie
    this.express.use(cookieParser());
  }

  async initWebResource() {
    //fallback页面资源,处理vue路由
    this.express.use(
      fallback({
        htmlAcceptHeaders: ['text/html', 'application/xhtml+xml'],
        rewrites: [{from: /^\/admin.*$/, to: '/admin.html'}]
      })
    );

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
    if (process.env.NODE_ENV === 'development') {
      console.log(
        `Kato UI http://${config.get('host')}:${config.get('port')}/api/ui/`
      );
      kato.use(KatoUI);
    }
    //添加用户中间件,在验证中间件之前
    kato.use(UserMiddleware, AuthenticateMiddleware);
    //挂载kato处理中间件
    this.express.use('/api', ExpressAdapter(kato));
  }
}

//实例化一个app
export const app = new Application();

//导出各种便捷属性
export const dataDB = app.dataDB;
export const knrtDB = app.knrtDB;
export const appraisalDB = app.appraisalDB;
