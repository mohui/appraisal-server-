import config from 'config';
import OSS from 'ali-oss';

export class OSSClient {
  constructor(config) {
    this.config = config;
    this.store = new OSS(this.config);
  }

  /**
   * 文件存储, 返回URL
   *
   * @param name 对象名
   * @param file 文件
   * @param options 选项
   * @return 文件URL
   */
  async save(name, file, options) {
    return (await this.store.put(name, file, options)).url;
  }

  /**
   * 文件读取, 返回带签名的URL
   *
   * @param uri 文件路径
   * @return 带签名的URL
   */
  read(uri) {
    const regex = new RegExp(`${config.oss.region}\\.aliyuncs\\.com/(.*)`);

    let matches = regex.exec(uri);
    if (!matches || matches.length < 2) {
      return uri;
    }
    return this.store.signatureUrl(matches[1]);
  }

  /**
   *  获取下载word路径的签名
   *
   */
  readDoc(uri) {
    return this.store.signatureUrl(uri);
  }
}

/**
 * 公共存储
 *
 * @type {OSSClient}
 */
export const ossClient = new OSSClient(config.oss);
