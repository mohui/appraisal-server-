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
  async preview(itemId, month) {
    return [
      {
        date: '2022-03-22T13:32:01.137+08:00',
        itemId:
          '门诊.检查项目.1d770e664923b0f1853739fa97245504191c54c9df7d85fa6e52c40e1e42f5e4.d5b67950f33ce068ad1e9e1a072203177ed68e9d54cd33aa7b85f0842da7ce22',
        itemName: '新型冠状病毒核酸检测',
        staffId:
          'd826700a8ec4e9f22821fb3924186a992ea2be9e6a4d5adb3a51883e32cfee61',
        staffName: '毕德平',
        type: 'HIS员工',
        value: '40.00'
      }
    ];
  }
}
