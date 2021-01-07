import {BasicTagDataModel} from '../database/model';
import {appDB} from '../app';
import {KatoCommonError, should, validate} from 'kato-server';
import dayjs from 'dayjs';
import {BasicTags} from '../../common/rule-score';
import {Context} from './context';
import Excel from 'exceljs';
import ContentDisposition from 'content-disposition';
import {Op} from 'sequelize';

export default class BasicTag {
  //设置基础数据
  @validate(
    should.object({
      id: should.string().description('基础数据id'),
      value: should.number().description('数据值'),
      hospitalId: should.string().description('机构id'),
      code: should.string().description('基础数据code'),
      year: should.number().description('年份')
    })
  )
  async upsert(params) {
    return appDB.transaction(async () => {
      const {id = '', value = 0} = params;
      try {
        //id不存在则插入新数据
        if (!id) {
          //自动设置修改人姓名
          params.editor = Context.current.user.name;
          return await BasicTagDataModel.create(params);
        }
        //否则修改已有的数据
        const tag = await BasicTagDataModel.findOne({where: {id}, lock: true});
        tag.value = value;
        tag.editor = Context.current.user.name;
        return await tag.save();
      } catch (e) {
        throw new KatoCommonError(e);
      }
    });
  }

  //导入上一年基础数据
  @validate(
    should
      .string()
      .required()
      .description('大类指标的code'),
    should
      .number()
      .required()
      .description('需要导入的年份')
  )
  async upsertLastYear(tagCode, year) {
    const importable = this.importable(tagCode, year);
    if (!importable) throw new KatoCommonError('上一年数据导入有误');
    //当前用户地区权限下所直属的机构
    const hospitals = Context.current.user.hospitals;
    //获取大类指标下的所有的小类
    const childrenTag = BasicTags.find(bt => bt.code === tagCode).children;

    //机构和指标对应数组
    let hospitalTags = [];
    for (let i = 0; i < childrenTag.length; i++) {
      for (let j = 0; j < hospitals.length; j++) {
        hospitalTags.push({
          name: hospitals[j].name,
          regionId: hospitals[j].regionId,
          parent: hospitals[j].parent,
          hospitalId: hospitals[j].id,
          code: childrenTag[i].code,
          value: 0
        });
      }
    }

    const lastResult = await Promise.all(
      hospitalTags.map(async it => {
        //查询某个机构下某个指标的数据
        const basicData = await BasicTagDataModel.findOne({
          where: {code: it.code, hospitalId: it.hospitalId, year: year - 1}
        });
        //该数据存在则赋值相关字段
        return basicData ? {...it, ...basicData.toJSON()} : it;
      })
    );
    await Promise.all(
      lastResult.map(async it => {
        await this.upsert({
          value: it.value,
          hospitalId: it.hospitalId,
          code: it.code,
          year: year
        });
      })
    );
  }

  @validate(
    should
      .string()
      .required()
      .description('大类指标的code'),
    should
      .number()
      .required()
      .description('年份')
  )
  async list(tagCode, year) {
    //当前用户地区权限下所直属的机构
    const hospitals = Context.current.user.hospitals;
    //获取大类指标下的所有的小类
    const childrenTag = BasicTags.find(bt => bt.code === tagCode).children;

    //机构和指标对应数组
    let hospitalTags = [];
    for (let i = 0; i < childrenTag.length; i++) {
      for (let j = 0; j < hospitals.length; j++) {
        hospitalTags.push({
          name: hospitals[j].name,
          regionId: hospitals[j].regionId,
          parent: hospitals[j].parent,
          hospitalId: hospitals[j].id,
          code: childrenTag[i].code,
          value: 0
        });
      }
    }

    const queryResult = await Promise.all(
      hospitalTags.map(async it => {
        //查询某个机构下某个指标的数据
        const basicData = await BasicTagDataModel.findOne({
          where: {code: it.code, hospitalId: it.hospitalId, year}
        });
        //该数据存在则赋值相关字段
        return basicData ? {...it, ...basicData.toJSON()} : it;
      })
    );

    //组织返回结果
    return hospitals.map(h => {
      //该机构的所有相关指标数据
      const tags = queryResult.filter(q => q.hospitalId === h.id);
      //对更新时间进行排序,目的取出最新的更新时间和最后的修改人
      const sortTags =
        tags.sort((p, n) => dayjs(n?.updated_at).isAfter(p?.updated_at)) || [];
      h['updated_at'] = sortTags[0]?.updated_at || null;
      h['editor'] = sortTags[0]?.editor || null;
      //给该机构对象添加相应的指标字段
      tags.forEach(
        tag =>
          (h[tag.code] = {
            id: tag.id,
            code: tag.code,
            value: tag.value,
            year: tag?.year ?? year
          })
      );
      return h;
    });
  }

  @validate(
    should
      .string()
      .required()
      .description('大类指标的code'),
    should
      .number()
      .required()
      .description('年份')
  )
  async importable(tagCode, year) {
    //当前用户地区权限下所直属的机构
    const hospitals = Context.current.user.hospitals;
    //获取大类指标下的所有的小类
    const childrenTag = BasicTags.find(bt => bt.code === tagCode).children;
    year = Number(year);
    const lastYear = year - 1;

    //当前年份的基础数据大于0的总计
    const thisYearCount = await BasicTagDataModel.count({
      where: {
        year: year,
        hospitalId: {[Op.in]: hospitals.map(h => h.id)},
        code: {[Op.in]: childrenTag.map(c => c.code)},
        value: {[Op.gt]: 0}
      }
    });
    //上一年的基础数据大于0的总数
    const lastYearCount = await BasicTagDataModel.count({
      where: {
        year: lastYear,
        hospitalId: {[Op.in]: hospitals.map(h => h.id)},
        code: {[Op.in]: childrenTag.map(c => c.code)},
        value: {[Op.gt]: 0}
      }
    });
    return thisYearCount === 0 && lastYearCount > 0;
  }

  @validate(
    should
      .string()
      .required()
      .description('基础数据code'),
    should
      .number()
      .required()
      .description('年份')
  )
  async dataDownload(tagCode, year) {
    //当前基础数据下的所有属性
    const tags = BasicTags.find(bt => bt.code === tagCode)?.children;
    if (!tags) throw new KatoCommonError('该基础数据不存在');
    //组装机构与基础数据的关系数据
    const listData = (await this.list(tagCode, year)).map(item => {
      return [item.id, item.name].concat(tags.map(tag => item[tag.code].value));
    });

    //创建工作表
    const workBook = new Excel.Workbook();
    const workSheet = workBook.addWorksheet('基础数据导入');
    //第一行头部
    workSheet.addRow([
      `${Context.current.user.region.name}-${
        BasicTags.find(bt => bt.code === tagCode).name
      }基础数据表(仅基础数据的值可修改)`
    ]);
    //第二行 机构id, 名称, 基础数据名
    workSheet.addRow(['机构id', '机构名称', ...tags.map(tag => tag.name)]);
    //第三行 字段名
    workSheet.addRow(['hospitalId', 'name', ...tags.map(tag => tag.code)]);
    //剩下的数据行
    workSheet.addRows(listData);
    //文件名
    const fileName = `${Context.current.user.region.name}-${
      BasicTags.find(bt => bt.code === tagCode).name
    }基础数据表.xls`;

    const buffer = await workBook.xlsx.writeBuffer();
    Context.current.bypassing = true;
    let res = Context.current.res;
    //设置请求头信息，设置下载文件名称,同时处理中文乱码问题
    res.setHeader('Content-Disposition', ContentDisposition(fileName));
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    res.setHeader('Content-Type', 'application/vnd.ms-excel');
    res.send(buffer);
    res.end();
  }

  //基础数据导入接口
  @validate(
    should.required().description('文件'),
    should
      .string()
      .required()
      .description('基础数据code'),
    should
      .number()
      .required()
      .description('年份')
  )
  async dataImport(file, tagCode, year) {
    return appDB.transaction(async () => {
      //读取基础数据声明文件
      const basicTags = BasicTags.find(tag => tag.code === tagCode)?.children;
      if (!basicTags) throw new KatoCommonError('基础数据code传递有误');
      //读取文件
      const workBook = new Excel.Workbook();
      const workSheet = await workBook.xlsx.load(file.buffer);
      const data = workSheet.getWorksheet(1);
      //所有基础数据code
      let tags = [];
      //所有机构和每个基础数据的对应数据
      let tagHospital = [];
      //遍历excel表格的数据
      data.eachRow((row, index) => {
        //取出基础数据的code
        if (index === 3) {
          row.eachCell((cell, cellIndex) => {
            if (cellIndex > 2) {
              if (!basicTags.find(tag => tag.code === cell.value))
                throw new KatoCommonError('表格中基础数据code填写有误');
              tags.push(cell.value);
            }
          });
        }
        //组装机构与code的数据
        if (index > 3) {
          tags.forEach(tag =>
            tagHospital.push({
              hospitalId: row.values[1],
              code: tag,
              value: row.values[3],
              year
            })
          );
        }
      });
      //查询基础数据机构表,找出已存在的数据的id
      tagHospital = await Promise.all(
        tagHospital.map(async item => {
          const tagData = await BasicTagDataModel.findOne({
            where: {hospitalId: item.hospitalId, code: item.code}
          });
          if (tagData) item.id = tagData.id;
          return item;
        })
      );
      //批量更新基础数据
      return await Promise.all(
        tagHospital.map(async item => {
          try {
            return await this.upsert(item);
          } catch (e) {
            return {error: e.message, ...item};
          }
        })
      );
    });
  }
}
