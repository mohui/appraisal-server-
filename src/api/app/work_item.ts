import HisWorkItem from '../his/work_item';
import {appDB} from '../../app';
import {KatoCommonError, should, validate} from 'kato-server';
import {dayToRange, monthToRange} from '../his/service';
import {Context} from '../context';
import {UserType} from '../../../common/user';
import {HisStaffMethod} from '../../../common/his';

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

export default class AppWorkItem {
  /**
   * 公分项得分,权重
   *
   * @param itemId 公分项id
   * @param month 时间
   * @return {
   *     id: 公分项id,
   *     name: 公分项名称,
   *     score: 工分项校正前工分,
   *     steps: 梯度[
   *         {
   *             "end": null,
   *             "unit": 0.06,
   *             "start": null
   *         }
   *     ],
   *     rate: 权重,
   *     remark: 备注,
   *     method: 得分方式; 计数/总和,
   *     items: 项目来源[{
   *       id: '来源id',
   *       name: '来源名称'
   *     }]
   * }
   */
  @validate(should.string().required(), should.date().required())
  async detail(itemId, month) {
    if (Context.current.user.type !== UserType.STAFF)
      throw new KatoCommonError('非员工账号,不能查看');
    // // region 项目来源
    // const workItemMappingModels = await appDB.execute(
    //   //language=PostgreSQL
    //   `
    //     select item, source
    //     from his_work_item_mapping
    //     where item = ?
    //   `,
    //   itemId
    // );
    // return workItemMappingModels;
    // const workItemApi = new HisWorkItem();
    // // return await workItemApi.sources();
    // // endregion

    // region 工分项
    // 获取所传月份的开始时间 即所在月份的一月一号
    const monthTime = monthToRange(month);
    // 当天的开始时间和结束时间
    const {start, end} = dayToRange(monthTime.start);
    // 查询工分, 工分只存储在一号
    const workItemModel: {
      itemId: string;
      itemName: string;
      typeId: string;
      typeName: string;
      order: number;
      score: number;
      updated_at: Date;
      method: string;
      steps: object;
    } = (
      await appDB.execute(
        // language=PostgreSQL
        `
          select result.item_id   "itemId",
                 result.item_name "itemName",
                 result.type_id   "typeId",
                 result.type_name "typeName",
                 result."order",
                 result.score,
                 result.updated_at,
                 item.method,
                 item.steps
          from his_staff_work_result result
                 left join his_work_item item on result.item_id = item.id
          where result.item_id = ?
            and result.staff_id = ?
            and result.time >= ?
            and result.time < ?
        `,
        itemId,
        Context.current.user.id,
        start,
        end
      )
    )[0];
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
      score: workItemModel.score,
      method: workItemModel.method,
      steps: workItemModel.steps,
      rate: staffItemMappingModel.rate,
      remark: staffItemMappingModel.remark,
      items: []
    };
  }

  /**
   * 工作量明细
   *
   * @param itemId 公分项id
   * @param month 时间
   * @return [{
   *  itemId: 公分项id,
   *  itemName: 公分项名称,
   *  staffId: 员工id,
   *  staffName: 员工名称,
   *  type: 类型,
   *  value: 值,
   *  date: 时间,
   * }]
   */
  @validate(should.string().required(), should.date().required())
  async preview(itemId, month) {
    /**
     * 1: 根据工分项id查询工分项详情
     * 1.1: name: 获取公分项名称, type: 关联员工; 动态/固定', method: 得分方式; 计数/总和
     * 2: 查询工分项目员工关联表
     * 2.1: 获取关联员工,取值范围
     * 3: 获取工分来源
     */
    if (Context.current.user.type !== UserType.STAFF)
      throw new KatoCommonError('非员工账号,不能查看');
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

    // 动态的时候, 有值,根据状态逆推取值范围
    const scope =
      workItemModel.type === HisStaffMethod.DYNAMIC
        ? workItemStaffMappingModel[0].type
        : null;

    const workItemApi = new HisWorkItem();
    return workItemApi.preview(
      workItemModel.name,
      workItemModel.method,
      mappings,
      workItemModel.type,
      staffs,
      scope,
      Context.current.user.id,
      month
    );
  }
}
