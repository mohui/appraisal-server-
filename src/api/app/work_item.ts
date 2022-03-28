import HisWorkItem from '../his/work_item';
import {appDB} from '../../app';
import {KatoCommonError, should, validate} from 'kato-server';
import {getHospital, monthToRange} from '../his/service';
import {Context} from '../context';
import {UserType} from '../../../common/user';
import {HisStaffMethod, HisWorkMethod, multistep} from '../../../common/his';
import {workPointCalculation} from '../his/score';
import Decimal from 'decimal.js';

async function getHisWorkItemMapping(itemId) {
  return await appDB.execute(
    //language=PostgreSQL
    `
      select item, source
      from his_work_item_mapping
      where item = ?
    `,
    itemId
  );
}

/**
 * 根据工分项id获取工分项详情
 * @param itemId
 */
async function getHisWorkItem(itemId) {
  return (
    await appDB.execute(
      //language=PostgreSQL
      `
        select id,
               hospital,
               name,
               method,
               type,
               remark,
               item_type "itemType",
               steps
        from his_work_item
        where id = ?
      `,
      itemId
    )
  )[0];
}

async function getItemDetail(itemId, month) {
  /**
   * 1: 根据工分项id查询工分项详情
   * 1.1: name: 获取工分项名称, type: 关联员工; 动态/固定', method: 得分方式; 计数/总和
   * 2: 查询工分项目员工关联表
   * 2.1: 获取关联员工,取值范围
   * 3: 获取工分来源
   */
  if (Context.current.user.type !== UserType.STAFF)
    throw new KatoCommonError('非员工账号,不能查看');
  // region 获取查询条件

  // 1: 根据工分项id查询工分项详情
  const workItemModel = (
    await appDB.execute(
      // language=PostgreSQL
      `
        select item.id,
               item.hospital,
               item.name,
               item.method,
               item.type,
               item.remark,
               item.steps
        from his_work_item item
        where item.id = ?
      `,
      itemId
    )
  )[0];
  if (!workItemModel) throw new KatoCommonError('该工分项不存在');

  // 2: 查询工分项目员工关联表
  const workItemStaffMappingModel = await appDB.execute(
    // language=PostgreSQL
    `
      select mapping.id,
             mapping.item,
             mapping.source,
             mapping.type
      from his_work_item_staff_mapping mapping
      where mapping.item = ?
    `,
    itemId
  );
  // 3: 获取工分来源
  const itemSources: {
    item: string;
    source: string;
  }[] = await getHisWorkItemMapping(itemId);
  const mappings = itemSources.map(it => it.source);

  // 当是固定的时候,staffs有值,获取绑定的员工或科室
  const staffs =
    workItemModel.type === HisStaffMethod.STATIC
      ? workItemStaffMappingModel.map(it => ({
          code: it.source,
          type: it.type
        }))
      : [];

  // 动态的时候, scope有值,根据状态逆推取值范围
  const scope =
    workItemModel.type === HisStaffMethod.DYNAMIC
      ? workItemStaffMappingModel[0].type
      : null;
  // endregion

  const hospital = await getHospital();
  // 时间转化为月份的开始时间和结束时间
  const {start, end} = monthToRange(month);

  // 调用工分计算接口
  const workItems = await workPointCalculation(
    Context.current.user.id,
    hospital,
    start,
    end,
    workItemModel.name,
    workItemModel.method,
    mappings,
    workItemModel.type,
    staffs,
    scope
  );
  let workload;
  // 判断是计数还是总和
  if (workItemModel.method === HisWorkMethod.AMOUNT) {
    // 计数的单位量是总条数
    workload = new Decimal(workItems.length);
  } else if (workItemModel.method === HisWorkMethod.SUM) {
    // 总和的单位量是所有数量的和
    workload = workItems.reduce(
      (prev, curr) => new Decimal(prev).add(curr.value),
      new Decimal(0)
    );
  }
  return {
    data: workItems.map(it => ({
      ...it,
      value: Number(it.value)
    })),
    score: workload
  };
}

export default class AppWorkItem {
  /**
   * 工分项得分,权重
   *
   * @param itemId 工分项id
   * @param month 时间
   * @return {
   *     id: 工分项id,
   *     name: 工分项名称,
   *     score?: 工分项校正前工分,
   *     steps: 梯度[
   *         {
   *             "end": null(负无穷),
   *             "unit": 工作量分值,
   *             "start": null(正无穷)
   *             "num": 工作量
   *             "total": 工分
   *         }
   *     ],
   *     rate?: 权重,
   *     remark?: 备注,
   *     method?: 得分方式; 计数/总和
   * }
   */
  @validate(should.string().required(), should.date().required())
  async summary(itemId, month) {
    if (Context.current.user.type !== UserType.STAFF)
      throw new KatoCommonError('非员工账号,不能查看');

    // region 工分项
    // 查询工分项目
    const workItemModel: {
      itemId: string;
      itemName: string;
      method: string;
      steps: {start: number | null; end: number | null; unit: number}[];
    } = (
      await appDB.execute(
        // language=PostgreSQL
        `
          select item.id   "itemId",
                 item.name "itemName",
                 item.method,
                 item.steps
          from his_work_item item
          where item.id = ?
        `,
        itemId
      )
    )[0];
    // 获取工作量
    const work = await getItemDetail(itemId, month);
    const works = multistep(workItemModel.steps, work.score.toNumber());
    // 累加梯度得分
    const sum = works.reduce(
      (prev, curr) => new Decimal(prev).add(curr.total),
      new Decimal(0)
    );
    // endregion

    // region 工分项占比
    const staffItemMappingModel: {
      staff: string;
      item: string;
      rate: number;
      remark: string;
    } = (
      await appDB.execute(
        // language=PostgreSQL
        `
          select staff, item, rate, remark
          from his_staff_work_item_mapping
          where item = ?
            and staff = ?
        `,
        itemId,
        Context.current.user.id
      )
    )[0];
    // endregion
    return {
      id: workItemModel.itemId,
      name: workItemModel.itemName,
      score: Number(sum),
      method: workItemModel.method,
      steps: works,
      rate: staffItemMappingModel?.rate ?? null,
      remark: staffItemMappingModel?.remark ?? null
    };
  }

  /**
   * 工作量明细
   *
   * @param itemId 工分项id
   * @param month 时间
   * @param pageNo 当前页数
   * @param pageSize 每页显示条数
   * @return [{
   *  itemId: 工分项id,
   *  itemName: 工分项名称,
   *  staffId: 员工id,
   *  staffName: 员工名称,
   *  type: 类型,
   *  value: 值,
   *  date: 时间,
   * }]
   * @return {
   *     data: [
   *         {
   *             value: 值,
   *             date: 时间,
   *             itemId: 工分项id,
   *             itemName: 工分项名称,
   *             staffId: 员工id,
   *             staffName: 员工名称,
   *             type: 类型
   *         }
   *     ],
   *     score: 工作量,
   *     rows: 条数,
   *     pages: 页数
   * }
   */
  @validate(
    should.string().required(),
    should.date().required(),
    should.number().required(),
    should.number().required()
  )
  async detail(itemId, month, pageNo, pageSize) {
    if (Context.current.user.type !== UserType.STAFF)
      throw new KatoCommonError('非员工账号,不能查看');
    // 获取工作量明细和工作量
    const work = await getItemDetail(itemId, month);

    // 总条数
    const rows = work.data.length;
    return {
      data: work.data
        .sort((a, b) => (a.date.getTime() < b.date.getTime() ? 1 : -1))
        .slice((pageNo - 1) * pageSize, pageNo * pageSize),
      score: Number(work.score),
      rows,
      pages: Math.ceil(rows / pageSize)
    };
  }

  /**
   * 工分项目来源
   *
   * @param itemId 工分项id
   * @return [
   *     {
   *         id: '来源id',
   *         name: '来源名称'
   *     }
   * ]
   */
  @validate(should.string().required())
  async itemSources(itemId) {
    if (Context.current.user.type !== UserType.STAFF)
      throw new KatoCommonError('非员工账号,不能查看');
    const hospital = await getHospital();
    const workItemModel = await getHisWorkItem(itemId);
    if (!workItemModel) throw new KatoCommonError('工分项不存在');
    if (workItemModel.hospital !== hospital)
      throw new KatoCommonError('员工机构和工分项机构不匹配');
    // region 项目来源
    /**
     * 1: 获取所有选中工分项目来源
     * 2: 获取工分项目树形图
     * 3: 循环选中的工分项目来源id,递归获取工分项目详情
     * 4: 递归获取所有的最后一级的工分项目来源
     */
    // 所有的children节点
    const children = [];
    // 1: 获取所有选中工分项目
    const mappingModels: {
      item: string;
      source: string;
    }[] = await getHisWorkItemMapping(itemId);

    if (mappingModels.length > 0) {
      // 2: 获取工分项目树形图
      const workItemApi = new HisWorkItem();
      const sources = await workItemApi.sources();
      // 选中的所有的工分项目
      const itemSources = [];
      // 3: 循环选中的工分项目来源id,获取工分项目详情
      for (const mappingIt of mappingModels) {
        // 选中的工分项目
        let currentSources = null;
        // 递归查找选中的工分项目
        const getTree = function(sources, id) {
          for (const item of sources) {
            // 如果id和要查找的id相等
            if (item.id === id) {
              currentSources = item;
            } else {
              // 判断是否有子集,如果有接着查找
              if (item.children && item.children.length > 0) {
                getTree(item.children, id);
              }
            }
          }
          return currentSources;
        };
        const itemSource = await getTree(sources, mappingIt.source);
        itemSources.push(itemSource);
      }

      // 4: 递归获取所有的最后一级的工分项目来源
      for (const childIt of itemSources.map(it => it)) {
        // 判读是否是最后一级,如果是,查找子集,如果不是直接push进最后一级的数组中
        if (childIt.children && childIt.children.length > 0) {
          // 循环递归获取
          const getItemChildren = function(list) {
            for (let i = 0; i < list.length; i++) {
              const childList = list[i];
              if (childList.children && childList.children.length > 0) {
                getItemChildren(childList.children);
              } else {
                children.push(childList);
              }
            }
          };
          getItemChildren(childIt.children);
        } else {
          // push进数组中
          children.push(childIt);
        }
      }
    }
    // endregion
    return children?.map(it => ({
      id: it.id,
      name: it.name
    }));
  }
}
