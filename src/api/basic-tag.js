import {BasicTagDataModel} from '../database/model';
import {appDB} from '../app';
import {should, validate} from 'kato-server';
import dayjs from 'dayjs';

export default class BasicTag {
  //设置基础数据
  @validate(
    should.object({
      id: should.string().description('基础数据id'),
      value: should.number().description('数据值'),
      hospitalId: should.string().description('机构id'),
      code: should.string().description('基础数据code')
    })
  )
  async upsert(params) {
    return appDB.transaction(async () => {
      //自动设置当前的年份
      params.year = dayjs().year();
      const {id = '', value = '0'} = params;
      //id不存在则插入新数据
      if (!id) return await BasicTagDataModel.create(params);

      //修改已有的数据
      const tag = await BasicTagDataModel.findOne({where: {id}, lock: true});
      tag.value = value;
      return await tag.save();
    });
  }
}
