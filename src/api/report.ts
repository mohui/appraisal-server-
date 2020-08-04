import {ossClient} from '../../util/oss';
import * as config from 'config';
import * as path from 'upath';

export default class Report {
  /**
   * 获取报告列表
   *
   * @param id 地区或机构id
   * @return {
   *   id: 文件id
   *   name: 文件名
   *   url: 文件下载地址
   * }
   */
  async list(id) {
    return (
      (
        await ossClient.store.list({
          prefix: config.get('report.prefix'),
          delimiter: '/'
        })
      )?.objects ?? []
    )
      .filter(it => it.name.includes(`${id}_`)) // 文件名约定为 id_时间.docx
      .map(it => ({
        id: it.name,
        name: path.parse(it.name).name,
        url: it.url
      }));
  }
}
