import {unifs} from '../app';
import {v4 as uuid} from 'uuid';
import * as path from 'path';
import {KatoRuntimeError, should, validate} from 'kato-server';

/**
 * 医疗手工数据附件目录
 */
const HisManualAttachPath = '/his/manual';

export default class Upload {
  /**
   * unifs文件地址
   *
   * @param url unifs地址
   */
  async sign(url) {
    return await unifs.getExternalUrl(url);
  }

  /**
   * unifs文件地址列表
   * @param urls
   */
  @validate(should.array().required())
  async signList(urls) {
    const list = [];
    for (const it of urls) {
      list.push(await unifs.getExternalUrl(it));
    }
    return list;
  }

  /**
   * 医疗手工数据的附件上传接口
   *
   * @param file 文件对象
   * @return unifs地址
   */
  async uploadHisManualAttach(file) {
    const ext = path.extname(file?.originalname ?? '');
    if (!ext) throw new KatoRuntimeError(`文件扩展名不合法`);
    const filename = `${HisManualAttachPath}/${uuid()}${ext}`;
    await unifs.writeFile(filename, file.buffer);
    return filename;
  }

  @validate(should.string().required())
  async remove(path) {
    await unifs.deleteFile(path);
  }
}
