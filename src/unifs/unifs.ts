//联合文件系统接口
import {Readable, Writable} from 'stream';
import {Buffer} from 'buffer';
import * as path from 'upath';

//文件数据,二进制或字符串
export type UnionFileData = Buffer | string;

//文件/目录信息
export type UnionFileStats = {
  //文件路径
  name: string;
  //是否是一个目录
  isDirectory: boolean;
  //文件大小,只有文件项才可信
  size: number;
  //最后的修改时间,只有文件项才可信
  lastModifiedTime: Date;
};

//文件系统异常,整个unifs的所有异常都继承自它
export class FileSystemError extends Error {
  name = 'FileSystemError';

  /**
   * 构造函数
   * @param cause   上游异常的详情,如果异常是由另外一个异常所引发的,则值为message
   */
  constructor(public cause?: string) {
    super();
  }
}

//文件通用异常,所有和文件相关的异常都应该继承他
export class FileCommonError extends FileSystemError {
  name = 'FileCommonError';
  message = '文件通用异常';

  constructor(public filePath: string, cause?: string) {
    super(cause);
  }
}

export class FileAlreadyExistError extends FileCommonError {
  name = 'FileAlreadyExistError';
  message = '文件已存在';
}

export class FilePathInvalidError extends FileCommonError {
  name = 'FilePathInvalidError';
  message = '非法的文件路径';
}

export class FileNotFoundError extends FileCommonError {
  name = 'FileNotFoundError';
  message = '文件找不到异常';
}

export class FileReadError extends FileCommonError {
  name = 'FileReadError';
  message = '文件读取异常';
}

export class FileWriteError extends FileCommonError {
  name = 'FileWriteError';
  message = '文件写入异常';
}

/**
 * 流拷贝,成功/异常都会关闭src和dist
 * @param src   源头流
 * @param dist  目标流
 */
export async function copyStream(src: Readable, dist: Writable): Promise<any> {
  return new Promise((resolve, reject) => {
    src.on('error', err => {
      dist.destroy(err);
      reject(new FileSystemError(err.message));
    });

    dist.on('error', err => {
      src.destroy(err);
      reject(new FileSystemError(err.message));
    });

    dist.on('finish', () => {
      src.destroy();
      dist.destroy();
      resolve();
    });

    src.pipe(dist);
  });
}

//路径包含
export function pathInclude(parent: string, child: string): boolean {
  const relative = path.relative(parent, child);
  return !!relative && !relative.startsWith('..') && !path.isAbsolute(relative);
}

//格式化目录路径
export function normalizeDirPath(dirPath: string): string {
  dirPath = path.normalizeSafe(dirPath);
  const pathSegments = dirPath
    .split('/')
    .map(s => s.trim())
    .filter(s => s !== '');
  if (pathSegments.length > 0) return '/' + pathSegments.join('/') + '/';
  else return '/';
}

export class FileDeleteError extends FileCommonError {
  name = 'FileDeleteError';
  message = '文件删除异常';
}

//目录通用异常,所有和目录相关的异常都应该继承他
export class DirectoryCommonError extends FileSystemError {
  name = 'DirectoryCommonError';
  message = '目录通用异常';

  constructor(public dirPath: string, cause?: string) {
    super(cause);
  }
}
//抽象文件系统,实现了文件的写入/读取/删除/外部访问,目录的枚举等工作
export abstract class UnionFileSystem {
  /**
   * 创建一个到目标文件地址的写入流,如果目标文件存在则抛出FileAlreadyExistError
   * @param name 目标文件地址
   */
  abstract async createWriteStream(name: string): Promise<Writable>;

  /**
   * 创建一个到目标文件地址的读取流,如果目标文件不存在则抛出FileNotFoundError
   * @param name 目标文件地址
   */
  abstract async createReadStream(name: string): Promise<Readable>;

  /**
   * 获取目标文件地址的文件信息,如果文件不存在,抛出FileNotFoundError
   * @param name 目标文件地址
   */
  abstract async statFile(name: string): Promise<UnionFileStats>;

  /**
   * 删除指定文件路径的文件
   * @param name 目标文件路径
   */
  abstract async deleteFile(name: string): Promise<void>;

  /**
   * 列出指定目录下的文件和目录信息
   * @param subPath 目标目录
   */
  abstract async list(subPath: string): Promise<UnionFileStats[]>;

  /**
   * 目录递归遍历
   * @param subPath   目录路径
   * @param callback  回调, 传入单个的目录属性(UnionFileStats)和父目录名
   */
  async dirWalk(
    subPath: string,
    callback: (
      dirStat: UnionFileStats,
      parentDirName: string
    ) => Promise<void> | any
  ): Promise<void> {
    const stats = await this.list(subPath);
    const dirStats = stats.filter(s => s.isDirectory);
    for (const dirStat of dirStats) {
      await callback(dirStat, subPath);
      await this.dirWalk(dirStat.name, callback);
    }
  }

  /**
   * 文件递归遍历, 同目录递归遍历一样, 只不过回调传入的单个文件属性
   * @param subPath   目录路径
   * @param callback  回调, 参数为单个文件属性和文件所处的上级目录
   */
  async fileWalk(
    subPath: string,
    callback: (
      fileStat: UnionFileStats,
      parentDirName: string
    ) => Promise<void> | any
  ): Promise<void> {
    const stats = await this.list(subPath);
    const fileStats = stats.filter(s => !s.isDirectory);
    const dirStats = stats.filter(s => s.isDirectory);

    //遍历该目录下的文件
    for (const fileStat of fileStats) await callback(fileStat, subPath);

    //如果该目录下还有文件夹,则递归调用,遍历子文件夹的文件
    for (const dirStat of dirStats) await this.fileWalk(dirStat.name, callback);
  }

  /**
   * 获取指定文件的外部访问url,如果目标文件不存在,则抛出FileNotFoundError
   * @param name  目标文件
   * @param expireTime  url授权过期时间,不传则表示永不过期
   */
  abstract async getExternalUrl(
    name: string,
    expireTime?: Date
  ): Promise<string>;

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  constructor(options?: any) {}

  /**
   * 目标文件是否存在
   * @param name 目标文件
   */
  async isFileExist(name: string): Promise<boolean> {
    try {
      await this.statFile(name);
    } catch (e) {
      return false;
    }
    return true;
  }

  /**
   * 把数据写入目标文件
   * @param name  目标文件
   * @param data  数据, 可以是Buffer | string | Readable流
   * @param encoding  如果数据是一个string,这里规定编码格式
   */
  //@typescript-eslint/no-unused-vars
  async writeFile(
    name: string,
    data: UnionFileData | Readable,
    encoding: BufferEncoding = 'utf-8'
  ) {
    const writeStream = await this.createWriteStream(name);
    if (data instanceof Readable) {
      //如果data是一个readable流,则直接拷贝流
      await copyStream(data, writeStream);
      return;
    } else {
      try {
        await new Promise((resolve, reject) => {
          if (typeof data === 'string') {
            data = Buffer.from(data, encoding);
          } else if (!(data instanceof Buffer)) {
            reject(
              new FileWriteError(
                name,
                '写入文件的data类型必须为Buffer或者String或者可读流'
              )
            );
            return;
          }
          //如果写入异常,则引发reject
          writeStream.on('error', reject);
          //写入数据
          writeStream.end(data, resolve);
        });
      } catch (e) {
        if (!(e instanceof FileSystemError))
          (e as any) = new FileWriteError(name, e.message);
        //异常关闭writeStream
        writeStream.destroy(e);
        throw e;
      }
      //正常关闭writeStream
      writeStream.destroy();
    }
  }

  /**
   * 从目标文件中读取数据
   * @param name  目标文件
   * @param encoding  如果指定,则把文件的数据以encoding编码成字符串返回,否则返回Buffer
   */
  async readFile(
    name: string,
    encoding?: BufferEncoding
  ): Promise<UnionFileData> {
    const buffers = [];
    const stream = await this.createReadStream(name);
    return new Promise((resolve, reject) => {
      stream.on('data', buf => buffers.push(buf));
      stream.on('error', reject);
      stream.on('end', () => {
        try {
          const buffer = Buffer.concat(buffers);
          if (encoding) resolve(buffer.toString(encoding));
          else resolve(buffer);
        } catch (e) {
          reject(new FileReadError(name, e.message));
        } finally {
          stream.destroy();
        }
      });
    });
  }

  /**
   * 文件拷贝
   * @param src   源文件地址
   * @param dist  目标地址
   */
  async copyFile(src: string, dist: string) {
    let srcStream: Readable, distStream: Writable;
    try {
      srcStream = await this.createReadStream(src);
    } catch (e) {
      //如果创建src流就出现了异常,则直接返回异常
      if (e instanceof FileCommonError) throw e;
      throw new FileCommonError(src, e.message);
    }
    try {
      distStream = await this.createWriteStream(dist);
    } catch (e) {
      //如果创建dist流出现异常,则需要正常关闭src流的异常
      srcStream.destroy();
      if (e instanceof FileCommonError) throw e;
      else throw new FileCommonError(src, e.message);
    }
    try {
      await copyStream(srcStream, distStream);
    } catch (e) {
      //如果copy过程中出现异常,则不需要做流关闭的操作,因为copy自己会做好
      if (e instanceof FileCommonError) throw e;
      else throw new FileCommonError(src, e.message);
    }
  }

  /**
   * 移动文件
   * @param src   源文件地址
   * @param dist  目标地址
   */
  async moveFile(src: string, dist: string) {
    await this.copyFile(src, dist);
    await this.deleteFile(src);
  }

  //生命周期函数,当文件系统被初始化时调用
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async init() {}

  //生命周期函数,当文件系统被销毁时调用
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async close() {}
}
