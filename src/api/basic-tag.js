import {BasicTagDataModel, HospitalModel} from '../database/model';
import {appDB} from '../app';
import {should, validate} from 'kato-server';
import dayjs from 'dayjs';
import {BasicTags} from '../../common/rule-score';
import {Context} from './context';

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
      const {id = '', value = 0} = params;
      //id不存在则插入新数据
      if (!id) return await BasicTagDataModel.create(params);

      //修改已有的数据
      const tag = await BasicTagDataModel.findOne({where: {id}, lock: true});
      tag.value = value;
      return await tag.save();
    });
  }

  @validate(
    should
      .string()
      .required()
      .description('大类指标的code')
  )
  async list(tagCode) {
    //当前用户地区权限下所直属的机构
    const centerHospitals = await HospitalModel.findAll({
      where: {region: Context.current.user.regionId}
    });

    //获取大类指标下的所有的小类
    const childrenTag = BasicTags.find(bt => bt.code === tagCode).children;

    return await Promise.all(
      centerHospitals.map(async h => {
        //以机构和小类code进行查询
        const childrenHospital = await Promise.all(
          await HospitalModel.findAll({
            where: {parent: h.id}
          }).map(async child => {
            child = child.toJSON();
            const tags = await Promise.all(
              childrenTag.map(async tag => {
                //查询某个机构下某个指标的数据
                const basicData = await BasicTagDataModel.findOne({
                  where: {code: tag.code, hospitalId: child.id}
                });
                //数据存在则返回该数据,不存在则构造一个新数据
                return (
                  basicData || {
                    hospitalId: child.id,
                    code: tag.code,
                    value: 0,
                    year: dayjs().year()
                  }
                );
              })
            );
            //给每个子机构添加相关指标的属性
            tags.forEach(tag => (child[tag.code] = tag));
            return child;
          })
        );
        return {...h.toJSON(), children: childrenHospital};
      })
    );
  }
}
