import axios from 'axios';
import {KatoCommonError, should, validate} from 'kato-server';
import Decimal from 'decimal.js';

export default class Drug {
  /**
   * 药品说明书列表
   *
   * @param params {
   *   keyword: 搜索条件
   *   pageSize: 分页大小
   *   pageNo: 页码
   * }
   * @return [{
   *   id: id
   *   name: 名称
   *   url: 超链接
   * }]
   */
  @validate(
    should.object({
      keyword: should.string().allow(null),
      pageSize: should
        .number()
        .integer()
        .positive()
        .required(),
      pageNo: should
        .number()
        .integer()
        .positive()
        .required()
    })
  )
  async list(params) {
    try {
      // 获取药品说明书列表
      const res = (
        await axios({
          url: 'https://ead.bjknrt.com/api/test/searchDrugs.ac',
          params: {keywords: params.keyword}
        })
      ).data;
      // 总条数
      const rows = res.data.length;
      // 总页数
      const pages = new Decimal(rows)
        .div(params.pageSize)
        .ceil()
        .toNumber();
      // 算出偏移量
      const data = res.data
        .splice(
          new Decimal(params.pageNo)
            .sub(1)
            .mul(params.pageSize)
            .toNumber(),
          params.pageSize
        )
        .map(it => ({
          id: it.id,
          name: it.name,
          url: it.url
        }));
      return {
        data,
        rows,
        pages
      };
    } catch (e) {
      throw new KatoCommonError('服务器抖动');
    }
  }
}
