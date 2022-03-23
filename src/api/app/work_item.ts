import {appDB} from '../../app';
import {KatoCommonError} from 'kato-server';
import {dayToRange, monthToRange} from '../his/service';
import {Context} from '../context';
import {UserType} from '../../../common/user';

export default class AppWorkItem {
  async detail(itemId, month) {
    if (Context.current.user.type !== UserType.STAFF)
      throw new KatoCommonError('非员工账号,不能查看');

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
      steps: workItemModel.steps,
      rate: staffItemMappingModel.rate,
      remark: staffItemMappingModel.remark,
      items: []
    };
  }
}
