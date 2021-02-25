import {promises as fs} from 'fs';
import path from 'upath';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import {KatoCommonError} from 'kato-server';

import {getAreaTree, getLeaves} from './group';
import {getBasicData, getMarks, percentString} from './group/score';
import * as dayjs from 'dayjs';
import {BasicTagUsages, MarkTagUsages} from '../../common/rule-score';

const exampleData = {
  file: '340203_202012.docx',
  date_label: '2020第1季度',
  start_date: '2020-01-01',
  end_date: '2020-12-31',
  area_name: '弋江区',
  data: [
    {
      title: '弋江区2020第一季度建档率',
      name: '建档率',
      tables: [
        {
          is_rate: true,
          title: '表一: 中心机构总体建档率',
          rows: [
            {
              index: 1,
              name: 'A服务中心',
              value: 2993,
              basic: 123123,
              rate: '90.99%'
            },
            {
              index: 2,
              name: 'B服务中心',
              value: 2993,
              basic: 123123,
              rate: '90.99%'
            }
          ]
        },
        {
          is_num: true,
          title: '表二: 中心/卫生院机构（不含下属机构）建档率',
          rows: [
            {
              index: 1,
              name: 'A服务中心',
              value: 2993,
              basic: 123123,
              rate: '90.99%'
            },
            {
              index: 2,
              name: 'B服务中心',
              value: 2993,
              basic: 123123,
              rate: '90.99%'
            }
          ]
        },
        {
          is_rate: true,
          title: '表三：卫生站/卫生室建档率',
          rows: [
            {
              index: 1,
              name: 'C卫生站',
              value: 2993,
              basic: 123123,
              rate: '90.99%'
            },
            {
              index: 2,
              name: 'D卫生室',
              value: 2993,
              basic: 123123,
              rate: '90.99%'
            }
          ]
        }
      ]
    }
  ]
};

async function getWordData(title, dataList) {
  return {
    file: `${title.fileName}`,
    date_label: `${title.dateLabel}`,
    start_date: `${title.startDate}`,
    end_date: `${title.endDate}`,
    area_name: `${title.areaName}`,
    data: dataList
  };
}

export default class JxReport {
  /**
   * 获取指标数据
   *
   * @param code
   * @param year
   */
  async getExponent(code, year) {
    // 获取所有权限[1:省,2:市,3:区,4:中心,5:卫生室/站]
    const allTree = await getAreaTree();
    // 判断当前权限是否在权限树中,如果在,数据几级权限
    const findObj = allTree.find(it => it.code === code);
    if (!findObj) throw new KatoCommonError(`code为 [${code}] 不合法`);
    const level = findObj.level;

    const title = {
      fileName: `${findObj.name}-${dayjs()
        .subtract(1, 'M')
        .startOf('M')
        .format('YYYYMM')}.docx`,
      dateLabel: `${year}年度`,
      startDate: dayjs()
        .startOf('y')
        .format('YYYY-MM-DD'),
      endDate: dayjs()
        .subtract(1, 'M')
        .endOf('M')
        .format('YYYY-MM-DD'),
      areaName: `${findObj.name}`
    };

    // 获取当前权限下的所有权限
    const tree = await getAreaTree(code);

    //如果权限等级大于3,说明是区及以上
    let streetList;
    if (level <= 4) {
      streetList = tree
        .map(it => {
          return allTree.find(
            item => it.code === item.code && item.level === 4
          );
        })
        .filter(it => it);
    } else {
      // 否则权限就是卫生站/室这一级
      streetList = tree;
    }

    // 获取考核指标
    const markList = Object.keys(MarkTagUsages).filter(
      it =>
        it !== 'Attach' &&
        it !== 'HE08' &&
        it !== 'HE10' &&
        it !== 'SC00' &&
        it !== 'SC01'
    );

    const dataList = [];
    // 根据考核指标获取数据
    for (const markItem of markList) {
      let i = 1;
      let j = 1;

      const dataTable = [];

      // 表一: 中心机构总体数据 变量
      const dataRow1 = [];
      // 表二: 中心/卫生院机构(不含下属机构) 变量
      const dataRow2 = [];
      // 表三: 卫生站/卫生室 变量
      const dataRow3 = [];
      let isRate = true;

      // 循环获取分母
      for (const it of streetList) {
        // 获取当前权限(中心层级)下的所有机构(最后一级的卫生站或者卫生室,包括中心自己)
        const leaves = await getLeaves(it.code);

        // 建档率
        if (MarkTagUsages[markItem].code === 'S01') {
          // 表一: 中心机构总体
          const mark = await getMarks(it.code, year);
          const basicData = await getBasicData(
            leaves,
            BasicTagUsages.DocPeople,
            year
          );

          dataRow1.push({
            index: i,
            name: `${it?.name}`,
            value: mark?.S00,
            basic: basicData,
            rate: `${percentString(mark?.S00, basicData)}`
          });
          // 表二表三只显示机构本身的
          for (const hospital of leaves) {
            // 仅仅返回中心这一个机构的数据
            const hospitalMark = await getMarks(hospital.code, year);

            const hospitalBasicData = await getBasicData(
              [hospital],
              BasicTagUsages.DocPeople,
              year
            );

            // 表二: 中心/卫生院机构（不含下属机构）
            if (hospital?.name === it?.name) {
              dataRow2.push({
                index: i,
                name: `${hospital?.name}`,
                value: hospitalMark?.S00,
                basic: hospitalBasicData,
                rate: `${percentString(hospitalMark?.S00, hospitalBasicData)}`
              });
            } else {
              // 表三: 卫生站/卫生室
              dataRow3.push({
                index: j,
                name: `${hospital?.name}`,
                value: hospitalMark?.S00,
                basic: hospitalBasicData,
                rate: `${percentString(hospitalMark?.S00, hospitalBasicData)}`
              });
              j++;
            }
          }
        }
        // 规范率(规范的电子档案数 / 建立电子健康档案人数)
        if (MarkTagUsages[markItem].code === 'S23') {
          // 表一: 中心机构总体
          // 获取分子,分母
          const mark = await getMarks(it.code, year);
          dataRow1.push({
            index: i,
            name: `${it?.name}`,
            value: mark?.S23,
            basic: mark?.S00,
            rate: `${percentString(mark?.S23, mark?.S00)}`
          });

          // 表二表三只显示机构本身的
          for (const hospital of leaves) {
            // 仅仅返回中心这一个机构的数据
            const hospitalMark = await getMarks(hospital.code, year);

            // 表二: 中心/卫生院机构（不含下属机构）
            if (hospital?.name === it?.name) {
              dataRow2.push({
                index: i,
                name: `${hospital?.name}`,
                value: hospitalMark?.S23,
                basic: hospitalMark?.S00,
                rate: `${percentString(hospitalMark?.S23, hospitalMark?.S00)}`
              });
            } else {
              // 表三: 卫生站/卫生室
              dataRow3.push({
                index: j,
                name: `${hospital?.name}`,
                value: hospitalMark?.S23,
                basic: hospitalMark?.S00,
                rate: `${percentString(hospitalMark?.S23, hospitalMark?.S00)}`
              });
              j++;
            }
          }
        }
        // 健康档案使用率(档案中有动态记录的档案份数 / 建立电子健康档案人数)
        if (MarkTagUsages[markItem].code === 'S03') {
          // 表一: 中心机构总体
          // 获取分子,分母
          const mark = await getMarks(it.code, year);
          dataRow1.push({
            index: i,
            name: `${it?.name}`,
            value: mark?.S03,
            basic: mark?.S00,
            rate: `${percentString(mark?.S03, mark?.S00)}`
          });

          // 表二表三只显示机构本身的
          for (const hospital of leaves) {
            // 仅仅返回中心这一个机构的数据
            const hospitalMark = await getMarks(hospital.code, year);

            // 表二: 中心/卫生院机构（不含下属机构）
            if (hospital?.name === it?.name) {
              dataRow2.push({
                index: i,
                name: `${hospital?.name}`,
                value: hospitalMark?.S03,
                basic: hospitalMark?.S00,
                rate: `${percentString(hospitalMark?.S03, hospitalMark?.S00)}`
              });
            } else {
              // 表三: 卫生站/卫生室
              dataRow3.push({
                index: j,
                name: `${hospital?.name}`,
                value: hospitalMark?.S03,
                basic: hospitalMark?.S00,
                rate: `${percentString(hospitalMark?.S03, hospitalMark?.S00)}`
              });
              j++;
            }
          }
        }
        // 老年人健康管理率(年内接受老年人健康管理人数 / 辖区内65岁及以上常住居民数)
        if (MarkTagUsages[markItem].code === 'O00') {
          // 表一: 中心机构总体
          const mark = await getMarks(it.code, year);
          const basicData = await getBasicData(
            leaves,
            BasicTagUsages.OldPeople,
            year
          );
          dataRow1.push({
            index: i,
            name: `${it?.name}`,
            value: mark?.O00,
            basic: basicData,
            rate: `${percentString(mark?.O00, basicData)}`
          });
          // 表二表三只显示机构本身的
          for (const hospital of leaves) {
            // 仅仅返回中心这一个机构的数据
            const hospitalMark = await getMarks(hospital.code, year);

            const hospitalBasicData = await getBasicData(
              [hospital],
              BasicTagUsages.OldPeople,
              year
            );

            // 表二: 中心/卫生院机构（不含下属机构）
            if (hospital?.name === it?.name) {
              dataRow2.push({
                index: i,
                name: `${hospital?.name}`,
                value: hospitalMark?.O00,
                basic: hospitalBasicData,
                rate: `${percentString(hospitalMark?.O00, hospitalBasicData)}`
              });
            } else {
              // 表三: 卫生站/卫生室
              dataRow3.push({
                index: j,
                name: `${hospital?.name}`,
                value: hospitalMark?.O00,
                basic: hospitalBasicData,
                rate: `${percentString(hospitalMark?.O00, hospitalBasicData)}`
              });
              j++;
            }
          }
        }
        // 老年人中医药健康管理率(年内接受中医药健康管理服务的65岁及以上居民数 / 年内接受健康管理的65岁及以上常住居民数)
        if (MarkTagUsages[markItem].code === 'O02') {
          // 表一: 中心机构总体
          const mark = await getMarks(it.code, year);
          const basicData = await getBasicData(
            leaves,
            BasicTagUsages.OldPeople,
            year
          );
          dataRow1.push({
            index: i,
            name: `${it?.name}`,
            value: mark?.O02,
            basic: basicData,
            rate: `${percentString(mark?.O02, basicData)}`
          });
          // 表二表三只显示机构本身的
          for (const hospital of leaves) {
            // 仅仅返回中心这一个机构的数据
            const hospitalMark = await getMarks(hospital.code, year);

            const hospitalBasicData = await getBasicData(
              [hospital],
              BasicTagUsages.OldPeople,
              year
            );

            // 表二: 中心/卫生院机构（不含下属机构）
            if (hospital?.name === it?.name) {
              dataRow2.push({
                index: i,
                name: `${hospital?.name}`,
                value: hospitalMark?.O02,
                basic: hospitalBasicData,
                rate: `${percentString(hospitalMark?.O02, hospitalBasicData)}`
              });
            } else {
              // 表三: 卫生站/卫生室
              dataRow3.push({
                index: j,
                name: `${hospital?.name}`,
                value: hospitalMark?.O02,
                basic: hospitalBasicData,
                rate: `${percentString(hospitalMark?.O02, hospitalBasicData)}`
              });
              j++;
            }
          }
        }
        // 高血压健康管理率(一年内已管理的高血压患者数 / 年内辖区应管理高血压患者总数)
        if (MarkTagUsages[markItem].code === 'H00') {
          // 表一: 中心机构总体
          const mark = await getMarks(it.code, year);
          const basicData = await getBasicData(
            leaves,
            BasicTagUsages.HypertensionPeople,
            year
          );
          dataRow1.push({
            index: i,
            name: `${it?.name}`,
            value: mark?.H00,
            basic: basicData,
            rate: `${percentString(mark?.H00, basicData)}`
          });
          // 表二表三只显示机构本身的
          for (const hospital of leaves) {
            // 仅仅返回中心这一个机构的数据
            const hospitalMark = await getMarks(hospital.code, year);

            const hospitalBasicData = await getBasicData(
              [hospital],
              BasicTagUsages.HypertensionPeople,
              year
            );

            // 表二: 中心/卫生院机构（不含下属机构）
            if (hospital?.name === it?.name) {
              dataRow2.push({
                index: i,
                name: `${hospital?.name}`,
                value: hospitalMark?.H00,
                basic: hospitalBasicData,
                rate: `${percentString(hospitalMark?.H00, hospitalBasicData)}`
              });
            } else {
              // 表三: 卫生站/卫生室
              dataRow3.push({
                index: j,
                name: `${hospital?.name}`,
                value: hospitalMark?.H00,
                basic: hospitalBasicData,
                rate: `${percentString(hospitalMark?.H00, hospitalBasicData)}`
              });
              j++;
            }
          }
        }
        // 高血压规范管理率(按照规范要求进行高血压患者健康管理的人数 / 一年内已管理的高血压患者人数)
        if (MarkTagUsages[markItem].code === 'H01') {
          // 表一: 中心机构总体
          // 获取分子,分母
          const mark = await getMarks(it.code, year);
          dataRow1.push({
            index: i,
            name: `${it?.name}`,
            value: mark?.H01,
            basic: mark?.H00,
            rate: `${percentString(mark?.H01, mark?.H00)}`
          });

          // 表二表三只显示机构本身的
          for (const hospital of leaves) {
            // 仅仅返回中心这一个机构的数据
            const hospitalMark = await getMarks(hospital.code, year);

            // 表二: 中心/卫生院机构（不含下属机构）
            if (hospital?.name === it?.name) {
              dataRow2.push({
                index: i,
                name: `${hospital?.name}`,
                value: hospitalMark?.H01,
                basic: hospitalMark?.H00,
                rate: `${percentString(hospitalMark?.H01, hospitalMark?.H00)}`
              });
            } else {
              // 表三: 卫生站/卫生室
              dataRow3.push({
                index: j,
                name: `${hospital?.name}`,
                value: hospitalMark?.H01,
                basic: hospitalMark?.H00,
                rate: `${percentString(hospitalMark?.H01, hospitalMark?.H00)}`
              });
              j++;
            }
          }
        }
        // 高血压控制率(一年内最近一次随访血压达标人数 / 一年内已管理的高血压患者人数)
        if (MarkTagUsages[markItem].code === 'H02') {
          // 表一: 中心机构总体
          // 获取分子,分母
          const mark = await getMarks(it.code, year);
          dataRow1.push({
            index: i,
            name: `${it?.name}`,
            value: mark?.H02,
            basic: mark?.H00,
            rate: `${percentString(mark?.H02, mark?.H00)}`
          });

          // 表二表三只显示机构本身的
          for (const hospital of leaves) {
            // 仅仅返回中心这一个机构的数据
            const hospitalMark = await getMarks(hospital.code, year);

            // 表二: 中心/卫生院机构（不含下属机构）
            if (hospital?.name === it?.name) {
              dataRow2.push({
                index: i,
                name: `${hospital?.name}`,
                value: hospitalMark?.H02,
                basic: hospitalMark?.H00,
                rate: `${percentString(hospitalMark?.H02, hospitalMark?.H00)}`
              });
            } else {
              // 表三: 卫生站/卫生室
              dataRow3.push({
                index: j,
                name: `${hospital?.name}`,
                value: hospitalMark?.H02,
                basic: hospitalMark?.H00,
                rate: `${percentString(hospitalMark?.H02, hospitalMark?.H00)}`
              });
              j++;
            }
          }
        }
        // 糖尿病健康管理率(一年内已管理的2型糖尿病患者数 / 年内辖区2型糖尿病患者总数)
        if (MarkTagUsages[markItem].code === 'D00') {
          // 表一: 中心机构总体
          const mark = await getMarks(it.code, year);
          const basicData = await getBasicData(
            leaves,
            BasicTagUsages.DiabetesPeople,
            year
          );
          dataRow1.push({
            index: i,
            name: `${it?.name}`,
            value: mark?.D00,
            basic: basicData,
            rate: `${percentString(mark?.D00, basicData)}`
          });
          // 表二表三只显示机构本身的
          for (const hospital of leaves) {
            // 仅仅返回中心这一个机构的数据
            const hospitalMark = await getMarks(hospital.code, year);

            const hospitalBasicData = await getBasicData(
              [hospital],
              BasicTagUsages.DiabetesPeople,
              year
            );

            // 表二: 中心/卫生院机构（不含下属机构）
            if (hospital?.name === it?.name) {
              dataRow2.push({
                index: i,
                name: `${hospital?.name}`,
                value: hospitalMark?.D00,
                basic: hospitalBasicData,
                rate: `${percentString(hospitalMark?.D00, hospitalBasicData)}%`
              });
            } else {
              // 表三: 卫生站/卫生室
              dataRow3.push({
                index: j,
                name: `${hospital?.name}`,
                value: hospitalMark?.D00,
                basic: hospitalBasicData,
                rate: `${percentString(hospitalMark?.D00, hospitalBasicData)}`
              });
              j++;
            }
          }
        }
        // 糖尿病规范管理率(按照规范要求进行2型糖尿病患者健康管理的人数 / 一年内已管理的2型糖尿病患者人数 )
        if (MarkTagUsages[markItem].code === 'D01') {
          // 表一: 中心机构总体
          // 获取分子,分母
          const mark = await getMarks(it.code, year);
          dataRow1.push({
            index: i,
            name: `${it?.name}`,
            value: mark?.D01,
            basic: mark?.D00,
            rate: `${percentString(mark?.D01, mark?.D00)}`
          });

          // 表二表三只显示机构本身的
          for (const hospital of leaves) {
            // 仅仅返回中心这一个机构的数据
            const hospitalMark = await getMarks(hospital.code, year);

            // 表二: 中心/卫生院机构（不含下属机构）
            if (hospital?.name === it?.name) {
              dataRow2.push({
                index: i,
                name: `${hospital?.name}`,
                value: hospitalMark?.D01,
                basic: hospitalMark?.D00,
                rate: `${percentString(hospitalMark?.D01, hospitalMark?.D00)}`
              });
            } else {
              // 表三: 卫生站/卫生室
              dataRow3.push({
                index: j,
                name: `${hospital?.name}`,
                value: hospitalMark?.D01,
                basic: hospitalMark?.D00,
                rate: `${percentString(hospitalMark?.D01, hospitalMark?.D00)}`
              });
              j++;
            }
          }
        }
        // 糖尿病控制率(一年内最近一次随访空腹血糖达标人数 / 一年内已管理的2型糖尿病患者人数)
        if (MarkTagUsages[markItem].code === 'D02') {
          // 表一: 中心机构总体
          // 获取分子,分母
          const mark = await getMarks(it.code, year);
          dataRow1.push({
            index: i,
            name: `${it?.name}`,
            value: mark?.D02,
            basic: mark?.D00,
            rate: `${percentString(mark?.D02, mark?.D00)}`
          });

          // 表二表三只显示机构本身的
          for (const hospital of leaves) {
            // 仅仅返回中心这一个机构的数据
            const hospitalMark = await getMarks(hospital.code, year);

            // 表二: 中心/卫生院机构（不含下属机构）
            if (hospital?.name === it?.name) {
              dataRow2.push({
                index: i,
                name: `${hospital?.name}`,
                value: hospitalMark?.D02,
                basic: hospitalMark?.D00,
                rate: `${percentString(hospitalMark?.D02, hospitalMark?.D00)}`
              });
            } else {
              // 表三: 卫生站/卫生室
              dataRow3.push({
                index: j,
                name: `${hospital?.name}`,
                value: hospitalMark?.D02,
                basic: hospitalMark?.D00,
                rate: `${percentString(hospitalMark?.D02, hospitalMark?.D00)}`
              });
              j++;
            }
          }
        }
        // 发放健康教育印刷资料的种类 HE00
        if (MarkTagUsages[markItem].code === 'HE00') {
          isRate = false;
          // 表一: 中心机构总体
          // 获取分子,分母
          const mark = await getMarks(it.code, year);
          dataRow1.push({
            index: i,
            name: `${it?.name}`,
            value: mark?.HE00
          });

          // 表二表三只显示机构本身的
          for (const hospital of leaves) {
            // 仅仅返回中心这一个机构的数据
            const hospitalMark = await getMarks(hospital.code, year);

            // 表二: 中心/卫生院机构（不含下属机构）
            if (hospital?.name === it?.name) {
              dataRow2.push({
                index: i,
                name: `${hospital?.name}`,
                value: hospitalMark?.HE00
              });
            } else {
              // 表三: 卫生站/卫生室
              dataRow3.push({
                index: j,
                name: `${hospital?.name}`,
                value: hospitalMark?.HE00
              });
              j++;
            }
          }
        }
        // 播放健康教育音像资料的种类 HE02
        if (MarkTagUsages[markItem].code === 'HE02') {
          isRate = false;
          // 表一: 中心机构总体
          // 获取分子,分母
          const mark = await getMarks(it.code, year);
          dataRow1.push({
            index: i,
            name: `${it?.name}`,
            value: mark?.HE02
          });

          // 表二表三只显示机构本身的
          for (const hospital of leaves) {
            // 仅仅返回中心这一个机构的数据
            const hospitalMark = await getMarks(hospital.code, year);

            // 表二: 中心/卫生院机构（不含下属机构）
            if (hospital?.name === it?.name) {
              dataRow2.push({
                index: i,
                name: `${hospital?.name}`,
                value: hospitalMark?.HE02
              });
            } else {
              // 表三: 卫生站/卫生室
              dataRow3.push({
                index: j,
                name: `${hospital?.name}`,
                value: hospitalMark?.HE02
              });
              j++;
            }
          }
        }
        // 健康教育宣传栏的更新次数 HE06
        if (MarkTagUsages[markItem].code === 'HE06') {
          isRate = false;
          // 表一: 中心机构总体
          // 获取分子,分母
          const mark = await getMarks(it.code, year);
          dataRow1.push({
            index: i,
            name: `${it?.name}`,
            value: mark?.HE06
          });

          // 表二表三只显示机构本身的
          for (const hospital of leaves) {
            // 仅仅返回中心这一个机构的数据
            const hospitalMark = await getMarks(hospital.code, year);

            // 表二: 中心/卫生院机构（不含下属机构）
            if (hospital?.name === it?.name) {
              dataRow2.push({
                index: i,
                name: `${hospital?.name}`,
                value: hospitalMark?.HE06
              });
            } else {
              // 表三: 卫生站/卫生室
              dataRow3.push({
                index: j,
                name: `${hospital?.name}`,
                value: hospitalMark?.HE06
              });
              j++;
            }
          }
        }
        // 健康教育讲座次数合格率 HE07(一年内举办健康知识讲座的次数 / 一年内应举办健康知识讲座的次数)
        if (MarkTagUsages[markItem].code === 'HE07') {
          // 表一: 中心机构总体
          const mark = await getMarks(it.code, year);
          const basicData = await getBasicData(
            leaves,
            BasicTagUsages.HE07,
            year
          );
          dataRow1.push({
            index: i,
            name: `${it?.name}`,
            value: mark?.HE07,
            basic: basicData,
            rate: `${percentString(mark?.HE07, basicData)}`
          });
          // 表二表三只显示机构本身的
          for (const hospital of leaves) {
            // 仅仅返回中心这一个机构的数据
            const hospitalMark = await getMarks(hospital.code, year);

            const hospitalBasicData = await getBasicData(
              [hospital],
              BasicTagUsages.HE07,
              year
            );

            // 表二: 中心/卫生院机构（不含下属机构）
            if (hospital?.name === it?.name) {
              dataRow2.push({
                index: i,
                name: `${hospital?.name}`,
                value: hospitalMark?.HE07,
                basic: hospitalBasicData,
                rate: `${percentString(hospitalMark?.HE07, hospitalBasicData)}`
              });
            } else {
              // 表三: 卫生站/卫生室
              dataRow3.push({
                index: j,
                name: `${hospital?.name}`,
                value: hospitalMark?.HE07,
                basic: hospitalBasicData,
                rate: `${percentString(hospitalMark?.HE07, hospitalBasicData)}`
              });
              j++;
            }
          }
        }
        // 健康教育咨询次数的合格率 HE09
        if (MarkTagUsages[markItem].code === 'HE09') {
          // 表一: 中心机构总体
          const mark = await getMarks(it.code, year);
          const basicData = await getBasicData(
            leaves,
            BasicTagUsages.HE09,
            year
          );
          dataRow1.push({
            index: i,
            name: `${it?.name}`,
            value: mark?.HE09,
            basic: basicData,
            rate: `${percentString(mark?.HE09, basicData)}`
          });
          // 表二表三只显示机构本身的
          for (const hospital of leaves) {
            // 仅仅返回中心这一个机构的数据
            const hospitalMark = await getMarks(hospital.code, year);

            const hospitalBasicData = await getBasicData(
              [hospital],
              BasicTagUsages.HE09,
              year
            );

            // 表二: 中心/卫生院机构（不含下属机构）
            if (hospital?.name === it?.name) {
              dataRow2.push({
                index: i,
                name: `${hospital?.name}`,
                value: hospitalMark?.HE09,
                basic: hospitalBasicData,
                rate: `${percentString(hospitalMark?.HE09, hospitalBasicData)}`
              });
            } else {
              // 表三: 卫生站/卫生室
              dataRow3.push({
                index: j,
                name: `${hospital?.name}`,
                value: hospitalMark?.HE09,
                basic: hospitalBasicData,
                rate: `${percentString(hospitalMark?.HE09, hospitalBasicData)}`
              });
              j++;
            }
          }
        }
        i++;
      }

      if (isRate) {
        // 表一: 中心机构总体
        const dataTableObj1 = {
          is_rate: true,
          title: `表一: 中心机构总体${MarkTagUsages[markItem].name}`,
          rows: dataRow1
        };
        // 表二: 中心/卫生院机构（不含下属机构）
        const dataTableObj2 = {
          is_rate: true,
          title: `表二: 中心/卫生院机构（不含下属机构）${MarkTagUsages[markItem].name}`,
          rows: dataRow2
        };
        // 表三: 卫生站/卫生室
        const dataTableObj3 = {
          is_rate: true,
          title: `表三: 卫生站/卫生室${MarkTagUsages[markItem].name}`,
          rows: dataRow3
        };
        dataTable.push(dataTableObj1, dataTableObj2, dataTableObj3);
      } else {
        // 表一: 中心机构总体
        const dataTableObj1 = {
          is_num: true,
          title: `表一: 中心机构总体${MarkTagUsages[markItem].name}`,
          rows: dataRow1
        };
        // 表二: 中心/卫生院机构（不含下属机构）
        const dataTableObj2 = {
          is_num: true,
          title: `表二: 中心/卫生院机构（不含下属机构）${MarkTagUsages[markItem].name}`,
          rows: dataRow2
        };
        // 表三: 卫生站/卫生室
        const dataTableObj3 = {
          is_num: true,
          title: `表三: 卫生站/卫生室${MarkTagUsages[markItem].name}`,
          rows: dataRow3
        };
        dataTable.push(dataTableObj1, dataTableObj2, dataTableObj3);
      }

      //
      dataList.push({
        title: `${title.areaName}${title.dateLabel}${MarkTagUsages[markItem].name}`,
        name: `${MarkTagUsages[markItem].name}`,
        tables: dataTable
      });
    }

    // 判断权限是几级权限
    return getWordData(title, dataList);
  }
  async generate(params) {
    // const a = await this.getExponent(code, year);
    //TODO: 调试代码, 正式完成后删除
    if (!params) params = exampleData;
    //读取模板文件
    const content = await fs.readFile(
      path.join(__dirname, './template.docx'),
      'binary'
    );
    //新建doc对象
    const doc = new Docxtemplater(new PizZip(content));
    //设置数据
    doc.setData(params);
    //渲染数据
    doc.render();
    //导出文件
    await fs.writeFile(
      path.join('./tmp', params.file),
      doc.getZip().generate({
        type: 'nodebuffer'
      })
    );
  }
}
