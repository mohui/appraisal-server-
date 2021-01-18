import {
  DirectoryCommonError,
  FileAlreadyExistError,
  FileCommonError,
  FileDeleteError,
  FileNotFoundError,
  FileReadError,
  FileSystemError,
  FileWriteError,
  normalizeDirPath,
  UnionFileStats,
  UnionFileSystem
} from './unifs';
import {PassThrough, Readable, Writable} from 'stream';
import * as joi from 'joi';
import * as OSS from 'ali-oss';
import * as dayjs from 'dayjs';

type OSSFileSystemOptions = {
  //access key
  accessKey: string;
  //secret key
  secretKey: string;
  //空间名
  bucket: string;
  //区域, 默认'oss-cn-beijing'(北京), 如果endpoint填入,则不起作用,因为 region + internal => endpoint
  region?: string;
  //终结点url
  endpoint?: string;
  //是否使用阿里云内网, 有效性同region
  internal?: boolean;
  //是否使用cname域名上传, 默认false
  cname?: boolean;
  //是否使用安全连接, 默认true
  secure?: boolean;
  //请求超时时间(ms), 默认 60 * 1000
  timeout?: number;
};

function filePathToFileKey(filePath: string): string {
  return filePath.startsWith('/') ? filePath.substring(1) : filePath;
}

function fileKeyToFilePath(fileKey: string): string {
  return fileKey.startsWith('/') ? fileKey : '/' + fileKey;
}

export class OSSFileSystem extends UnionFileSystem {
  private readonly client: OSS;

  constructor(private options: OSSFileSystemOptions) {
    super();

    const validateResult = joi.validate(options, {
      accessKey: joi.string().required(),
      secretKey: joi.string().required(),
      bucket: joi.string().required(),
      region: joi.string().default('oss-cn-beijing'),
      endpoint: joi.string(),
      internal: joi.boolean().default(false),
      cname: joi.boolean().default(false),
      secure: joi.boolean().default(true),
      timeout: joi.number().default(60 * 1000)
    });

    if (validateResult.error)
      throw new FileSystemError(
        `初始化文件系统OSSFileSystem失败,${validateResult.error.message}`
      );
    this.options = validateResult.value;

    this.client = new OSS({
      accessKeyId: this.options.accessKey,
      accessKeySecret: this.options.secretKey,
      bucket: this.options.bucket,
      endpoint: this.options.endpoint,
      region: this.options.region,
      internal: this.options.internal,
      cname: this.options.cname,
      secure: this.options.secure,
      timeout: this.options.timeout
    });
  }

  async createReadStream(name: string): Promise<Readable> {
    try {
      const result = await this.client.getStream(filePathToFileKey(name));
      return result.stream;
    } catch (e) {
      if (e.code === 'NoSuchKey') throw new FileNotFoundError(name);
      throw new FileReadError(name, e.message);
    }
  }

  async createWriteStream(name: string): Promise<Writable> {
    if (await this.isFileExist(name)) throw new FileAlreadyExistError(name);
    const outputStream = new PassThrough();
    //上传promise
    const uploadComplete = new Promise((resolve, reject) => {
      this.client
        .putStream(filePathToFileKey(name), outputStream)
        .then(resolve)
        .catch(e => {
          reject(new FileWriteError(e.message));
        });
    });
    //将流分成两份
    const inputStream = new PassThrough({
      final(callback: (error?: Error | null) => void): void {
        outputStream.end(() =>
          uploadComplete.then(() => callback()).catch(err => callback(err))
        );
      }
    });
    //管道拷贝
    inputStream.pipe(outputStream, {end: false});
    //管道错误
    inputStream.on('error', err => outputStream.destroy(err));
    outputStream.on('error', err => inputStream.destroy(err));

    return inputStream;
  }

  async deleteFile(name: string): Promise<void> {
    try {
      await this.client.delete(filePathToFileKey(name));
    } catch (e) {
      throw new FileDeleteError(name, e.message);
    }
  }

  async getExternalUrl(name: string, expireTime?: Date): Promise<string> {
    try {
      return this.client.signatureUrl(filePathToFileKey(name), {
        expires: expireTime
          ? dayjs(expireTime).diff(new Date(), 'second')
          : undefined
      });
    } catch (e) {
      throw new FileSystemError(`无法获取文件 ${name} 的外部链接`);
    }
  }

  async list(subPath: string): Promise<UnionFileStats[]> {
    subPath = normalizeDirPath(subPath);

    let nextMarker: string = null;
    let isTruncated = false;

    const stats: UnionFileStats[] = [];
    try {
      do {
        const result = await this.client.list(
          {
            prefix: filePathToFileKey(subPath),
            'max-keys': 1000,
            marker: nextMarker,
            delimiter: '/'
          },
          {}
        );

        if (result.prefixes)
          stats.push(
            ...result.prefixes.map(p => ({
              name: fileKeyToFilePath(p),
              isDirectory: true,
              size: 0,
              lastModifiedTime: new Date()
            }))
          );

        if (result.objects)
          stats.push(
            ...result.objects
              .filter(o => !o.name.endsWith('/'))
              .map(o => ({
                name: fileKeyToFilePath(o.name),
                isDirectory: false,
                size: o.size,
                lastModifiedTime: new Date(o.lastModified)
              }))
          );

        nextMarker = result.nextMarker;
        isTruncated = result.isTruncated;
      } while (isTruncated);
    } catch (e) {
      throw new DirectoryCommonError(subPath, e.message);
    }
    return stats;
  }

  async statFile(name: string): Promise<UnionFileStats> {
    if (name.endsWith('/')) throw new FileNotFoundError(name);

    try {
      const fileKey = filePathToFileKey(name);
      const result = await this.client.list(
        {
          prefix: fileKey,
          'max-keys': 1000,
          delimiter: '/'
        },
        {}
      );

      if (result.objects) {
        const obj = result.objects.find(o => o.name === fileKey);
        if (obj)
          return {
            name: name,
            isDirectory: false,
            size: obj.size,
            lastModifiedTime: new Date(obj.lastModified)
          };
      }
    } catch (e) {
      throw new FileCommonError(name, e.message);
    }

    throw new FileNotFoundError(name);
  }

  //针对阿里云oss的拷贝优化实现,直接调用API,而不是通过流来复制,另外oss没有movefile的API,所以不优化
  async copyFile(src: string, dist: string): Promise<void> {
    if (await this.isFileExist(dist)) throw new FileAlreadyExistError(dist);
    try {
      await this.client.copy(filePathToFileKey(dist), filePathToFileKey(src));
    } catch (e) {
      if (e.code === 'NoSuchKey') throw new FileNotFoundError(src);
      throw new FileCommonError(src);
    }
  }
}
