import {
  FileNotFoundError,
  FileSystemError,
  normalizeDirPath,
  pathInclude,
  UnionFileStats,
  UnionFileSystem
} from './unifs';
import {Readable, Writable} from 'stream';
import * as path from 'upath';

function parsePath(subPath: string, name: string): string {
  const relativePath = path.relative(subPath, name);
  return '/' + relativePath;
}
export class FileSystemNotFoundError extends FileNotFoundError {
  message = '找不到文件所有对应的文件系统';
}
export class OverlayFileSystem extends UnionFileSystem {
  private readonly mountPoints: {subPath: string; fs: UnionFileSystem}[] = [];

  mount(subPath: string, fs: UnionFileSystem): void {
    subPath = normalizeDirPath(subPath);
    if (this.mountPoints.find(p => p.subPath === subPath)) {
      console.warn(`路径 '${subPath}' 下已经挂载了文件系统了,请勿重新挂载`);
      return;
    }

    const conflict = this.mountPoints.find(
      p => pathInclude(p.subPath, subPath) || pathInclude(subPath, p.subPath)
    );
    if (conflict) {
      throw new FileSystemError(`存在冲突的挂载路径`);
    }

    this.mountPoints.push({subPath, fs});
  }

  private getMountPointByPath(
    filePath: string
  ): {subPath: string; fs: UnionFileSystem} {
    const mountPoint = this.mountPoints.find(p =>
      pathInclude(p.subPath, filePath)
    );
    if (mountPoint) return mountPoint;
    else throw new FileSystemNotFoundError(filePath);
  }

  async createReadStream(name: string): Promise<Readable> {
    const mountPoint = this.getMountPointByPath(name);
    return mountPoint.fs.createReadStream(parsePath(mountPoint.subPath, name));
  }

  async createWriteStream(name: string): Promise<Writable> {
    const mountPoint = this.getMountPointByPath(name);
    return mountPoint.fs.createWriteStream(parsePath(mountPoint.subPath, name));
  }

  async deleteFile(name: string): Promise<void> {
    const mountPoint = this.getMountPointByPath(name);
    return mountPoint.fs.deleteFile(parsePath(mountPoint.subPath, name));
  }

  async list(subPath: string): Promise<UnionFileStats[]> {
    subPath = normalizeDirPath(subPath);
    //如果这个目录是一个高层级的目录,下面包含了多个文件挂载点
    const mountPoints = this.mountPoints.filter(p =>
      pathInclude(subPath, p.subPath)
    );
    if (mountPoints.length > 0) {
      //则把它的子目录列出来就OK了
      return mountPoints
        .map(
          p =>
            p.subPath
              .replace(subPath, '') //去掉路径前缀
              .split('/')[0] //取得第一部分
        )
        .filter((name, index, names) => names.lastIndexOf(name) === index) //去重
        .map(name => subPath + name) //再补上路径前缀
        .map(dirname => ({
          //构造成为一个UnionFileStats(目录)
          name: dirname,
          isDirectory: true,
          size: 0,
          lastModifiedTime: new Date()
        }));
    } else if (this.mountPoints.find(p => p.subPath === subPath)) {
      //如果这个目录正好落在一个挂载点上,则列出该挂载点根目录下的所有文件/文件夹
      const fileStats = await this.mountPoints
        .find(p => p.subPath === subPath)
        .fs.list('/');
      //然后把这些信息中的name全部解析成相对于Overlay文件系统的路径
      return fileStats.map(s => ({
        ...s,
        name: path.join(subPath, s.name)
      }));
    } else if (this.mountPoints.find(p => pathInclude(p.subPath, subPath))) {
      //这个subPath是属于某个fs
      const mountPoint = this.getMountPointByPath(subPath);
      //把目录解析成为子文件系统的绝对目录,然后调用子文件系统的list方法
      const fileStats = await mountPoint.fs.list(
        parsePath(mountPoint.subPath, subPath)
      );
      //然后把这些信息中的name全部解析成相对于Overlay文件系统的路径
      return fileStats.map(s => ({
        ...s,
        name: path.join(mountPoint.subPath, s.name)
      }));
    } else return [];
  }

  async copyFile(src: string, dist: string): Promise<void> {
    const srcMountPoint = this.getMountPointByPath(src);
    const distMountPoint = this.getMountPointByPath(dist);
    if (srcMountPoint.subPath === distMountPoint.subPath) {
      //如果是同一个文件系统,则调用该文件系统内部的拷贝方法
      return srcMountPoint.fs.copyFile(
        parsePath(srcMountPoint.subPath, src),
        parsePath(distMountPoint.subPath, dist)
      );
    } else {
      //如果不是同一个文件系统,则使用默认的文件移动
      return super.copyFile(src, dist);
    }
  }

  async moveFile(src: string, dist: string): Promise<void> {
    const srcMountPoint = this.getMountPointByPath(src);
    const distMountPoint = this.getMountPointByPath(dist);
    if (srcMountPoint.subPath === distMountPoint.subPath) {
      //如果是同一个文件系统,则调用该文件系统内部的移动方法
      return srcMountPoint.fs.moveFile(
        parsePath(srcMountPoint.subPath, src),
        parsePath(distMountPoint.subPath, dist)
      );
    } else {
      //如果不是同一个文件系统,则使用默认的文件移动
      return super.moveFile(src, dist);
    }
  }

  async getExternalUrl(name: string, expireTime?: Date): Promise<string> {
    const mountPoint = this.getMountPointByPath(name);
    return mountPoint.fs.getExternalUrl(
      parsePath(mountPoint.subPath, name),
      expireTime
    );
  }

  async statFile(name: string): Promise<UnionFileStats> {
    const mountPoint = this.getMountPointByPath(name);
    const s = await mountPoint.fs.statFile(parsePath(mountPoint.subPath, name));
    return {
      ...s,
      name: path.join(mountPoint.subPath, name)
    };
  }

  async init(): Promise<any> {
    for (const p of this.mountPoints) await p.fs.init();
    await super.init();
  }

  async close(): Promise<any> {
    for (const p of this.mountPoints) await p.fs.close();
    await super.close();
  }
}
