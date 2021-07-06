import {Readable, Writable} from 'stream';
import * as path from 'upath';
import {
  copyStream,
  FileAlreadyExistError,
  FileNotFoundError,
  FilePathInvalidError,
  FileSystemError,
  UnionFileStats,
  UnionFileSystem
} from './unifs';
import {createReadStream, createWriteStream} from 'fs';
import {mkdirp, readdir, stat, unlink, Stats} from 'fs-extra';
import * as joi from 'joi';
import {Request, Response, NextFunction} from 'express';
import * as forge from 'node-forge';
import * as url from 'url';
import {app} from '../app';
import * as cors from 'cors';

type LocalFileSystemOptions = {
  //本地文件路径
  base: string;
  //生成外部访问的参数,如果不支持外部访问,undefined表示关闭外部访问功能
  external?: {
    //外部基路径,如,http://xxx.com
    baseUrl: string;
    //http服务根目录下的路径,/uploads
    prefix: string;
    //生成授权key需要的md5盐
    key: string;
  };
};

export class LocalFileSystem extends UnionFileSystem {
  constructor(private options: LocalFileSystemOptions) {
    super(options);

    const validateResult = joi.validate(options, {
      base: joi.string().required(),
      external: {
        baseUrl: joi.string().required(),
        prefix: joi.string().default(''),
        key: joi
          .string()
          .min(4)
          .max(16)
      }
    });
    if (validateResult.error)
      throw new FileSystemError(
        `初始化文件系统LocalFileSystem失败,${validateResult.error.message}`
      );
    this.options = validateResult.value;

    this.options.base = path.normalizeSafe(this.options.base);

    if (options.external) {
      //准备初始化挂载
      app.express.use(
        this.options.external.prefix,
        cors(),
        async (req: Request, res: Response, next: NextFunction) => {
          if (req.method === 'GET' && typeof req.query.key !== 'undefined') {
            const filePath = url.parse(decodeURIComponent(req.url)).pathname;

            //判断文件存不存在
            if (!(await this.isFileExist(filePath))) {
              res.setHeader('Content-Type', 'text/plain;charset=utf-8');
              res.status(404).end(`访问的文件不存在`);
              return;
            }

            //验证时间
            const unixTimeString = (req?.query?.time as string) ?? '-1';
            const unixTime = parseInt(unixTimeString);
            if (isNaN(unixTime)) {
              res.setHeader('Content-Type', 'text/plain;charset=utf-8');
              res.status(401).end('未授权的文件访问');
              return;
            }
            if (unixTime !== -1 && Date.now() > unixTime) {
              res.setHeader('Content-Type', 'text/plain;charset=utf-8');
              res.status(401).end('访问令牌已经过期');
              return;
            }

            //验证权限
            try {
              //以同样的方式生成授权key,然后比对
              const hmac = forge.hmac.create();
              hmac.start('sha1', this.options.external.key);
              hmac.update(`${unixTime}:${filePath}`);
              const key = hmac.digest().toHex();

              if (req.query.key !== key) {
                res.setHeader('Content-Type', 'text/plain;charset=utf-8');
                res.status(401).end('未授权的文件访问');
                return;
              }
            } catch (e) {
              res.setHeader('Content-Type', 'text/plain;charset=utf-8');
              res.status(403).end('验证过程出错');
              return;
            }

            //验证通过,开始返回文件
            try {
              const fileStream = await this.createReadStream(filePath);
              res.status(200);
              await copyStream(fileStream, res);
              return;
            } catch (e) {
              res.setHeader('Content-Type', 'text/plain;charset=utf-8');
              res.status(500).end('发送文件出错');
            }
          }
          next();
        }
      );
    }
  }

  async init(): Promise<any> {
    await super.init();
    await mkdirp(this.options.base);
  }

  //解析相对路径,返回本地文件系统的绝对路径
  private relativeToAbsolute(relativePath: string): string {
    const absPath = path.join(this.options.base, relativePath);
    if (!absPath.startsWith(this.options.base)) {
      throw new FilePathInvalidError(relativePath);
    }
    return absPath;
  }

  private absoluteToRelative(absolutePath: string): string {
    const relative = path.relative(this.options.base, absolutePath);
    if (relative.startsWith('..')) throw new FilePathInvalidError(relative);
    return '/' + relative;
  }

  async statFile(name: string): Promise<UnionFileStats> {
    let stats;
    try {
      stats = await stat(this.relativeToAbsolute(name));
    } catch (e) {
      throw new FileNotFoundError(name);
    }
    if (!stats.isFile()) throw new FileNotFoundError(name);
    return {
      name,
      isDirectory: false,
      size: stats.size,
      lastModifiedTime: stats.mtime
    };
  }

  async createReadStream(name: string): Promise<Readable> {
    if (!(await this.isFileExist(name))) throw new FileNotFoundError(name);
    return createReadStream(this.relativeToAbsolute(name));
  }

  async createWriteStream(name: string): Promise<Writable> {
    if (await this.isFileExist(name)) throw new FileAlreadyExistError(name);
    const realPath = this.relativeToAbsolute(name);
    await mkdirp(path.dirname(realPath));
    //创建文件流,如果文件流出现失败,则删除对应的文件
    const stream = createWriteStream(realPath);
    stream.on('error', () => this.deleteFile(realPath));
    return createWriteStream(realPath);
  }

  async deleteFile(name: string): Promise<any> {
    try {
      await unlink(this.relativeToAbsolute(name));
    } catch (e) {
      throw new FilePathInvalidError(name);
    }
  }

  async list(subPath: string): Promise<UnionFileStats[]> {
    const absPath = this.relativeToAbsolute(subPath);
    const fileNames = (await readdir(absPath)).map(name =>
      path.join(absPath, name)
    );
    const fileStats = await Promise.all(fileNames.map(f => stat(f)));
    return fileStats.map((s: Stats, index) => ({
      name: this.absoluteToRelative(fileNames[index]),
      isDirectory: s.isDirectory(),
      size: s.size,
      lastModifiedTime: s.mtime
    }));
  }

  async getExternalUrl(name: string, expireTime?: Date): Promise<string> {
    //-1代表永久授权
    const unixTime = expireTime ? expireTime.getTime() : -1;

    let url = encodeURI(
      `${this.options.external.baseUrl}${this.options.external.prefix}${name}`
    );

    if (this.options.external.key) {
      //生成授权key
      const hmac = forge.hmac.create();
      hmac.start('sha1', this.options.external.key);
      hmac.update(`${unixTime}:${name}`);
      const key = hmac.digest().toHex();

      url = url + '?key=' + key;
    }

    if (unixTime !== -1) url = url + '&time=' + unixTime;
    return url;
  }
}
