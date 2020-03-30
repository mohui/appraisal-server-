import Process = NodeJS.Process;

declare var _DEV_: boolean;

declare interface ExtendedProcess extends Process {
  //application实例
  app: any
  //http server监听的地址
  host: string
  //http server监听的端口
  port: number
}

//sql模板文件
declare module "*.sql.hbs";
