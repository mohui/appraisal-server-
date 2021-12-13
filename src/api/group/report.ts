import {appDB, unifs} from '../../app';
import * as dayjs from 'dayjs';
import * as path from 'path';
import {getAreaTree, getHospitals} from './common';
import {KatoCommonError, should, validate} from 'kato-server';
import {BasicTagUsages, MarkTagUsages} from '../../../common/rule-score';
import {getBasicData, getMarks, percentString} from './score';
import {promises as fs} from 'fs';
import * as PizZip from 'pizzip';

//这个库的导出声明方式有问题, 只能require或者设置esModuleInterop
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Docxtemplater = require('docxtemplater');

/**
 * 公卫报告存储路径
 */
export const reportDir = '/report/appraisal/report';

/**
 * 语义化时间
 *
 * @param time 时间字符串, '202001'
 */
export async function displayTime(time) {
  const year = dayjs(time).year();
  const month = dayjs(time).month() + 1;
  let dateLabel = `${year}年${month}月报告`;
  if (month === 3) dateLabel = `${year}年第一季度报告`;
  if (month === 6) dateLabel = `${year}年上半年报告`;
  if (month === 9) dateLabel = `${year}第三季度报告`;
  if (month === 12) dateLabel = `${year}年度报告`;
  return dateLabel;
}

/**
 * 获取指标数据
 *
 * @param code
 * @param time
 */
async function getExponent(code, time) {
  const year = dayjs(time).year();

  const dateLabel = await displayTime(time);

  // 获取所有权限[1:省,2:市,3:区,4:中心,5:卫生室/站]
  const allTree = await getAreaTree(null);
  // 判断当前权限是否在权限树中,如果在,数据几级权限
  const findObj = allTree.find(it => it.code === code);
  if (!findObj) throw new KatoCommonError(`code为 [${code}] 不合法`);
  const level = findObj.level;

  const title = {
    fileName: `${findObj.code}-${time}.docx`,
    dateLabel: `${dateLabel}`,
    startDate: dayjs(time)
      .startOf('y')
      .format('YYYY-MM-DD'),
    endDate: dayjs(time)
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
        return allTree.find(item => it.code === item.code && item.level === 4);
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
      it !== 'HE11' &&
      it !== 'HE12' &&
      it !== 'HE13' &&
      it !== 'HE14' &&
      it !== 'HE15' &&
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
      // 获取所有机构信息
      const hospitals = await getHospitals(it.code);
      // 获取机构id
      const hospitalIds = hospitals.map(it => it.code);

      // 建档率
      if (MarkTagUsages[markItem].code === 'S01') {
        // 表一: 中心机构总体
        const mark = await getMarks(it.code, year);
        const basicData = await getBasicData(
          hospitalIds,
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
        for (const hospital of hospitals) {
          // 仅仅返回中心这一个机构的数据
          const hospitalMark = await getMarks(hospital.code, year);

          const hospitalBasicData = await getBasicData(
            [hospital.code],
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
        for (const hospital of hospitals) {
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
        for (const hospital of hospitals) {
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
          hospitalIds,
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
        for (const hospital of hospitals) {
          // 仅仅返回中心这一个机构的数据
          const hospitalMark = await getMarks(hospital.code, year);

          const hospitalBasicData = await getBasicData(
            [hospital.code],
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
          hospitalIds,
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
        for (const hospital of hospitals) {
          // 仅仅返回中心这一个机构的数据
          const hospitalMark = await getMarks(hospital.code, year);

          const hospitalBasicData = await getBasicData(
            [hospital.code],
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
          hospitalIds,
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
        for (const hospital of hospitals) {
          // 仅仅返回中心这一个机构的数据
          const hospitalMark = await getMarks(hospital.code, year);

          const hospitalBasicData = await getBasicData(
            [hospital.code],
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
        for (const hospital of hospitals) {
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
        for (const hospital of hospitals) {
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
          hospitalIds,
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
        for (const hospital of hospitals) {
          // 仅仅返回中心这一个机构的数据
          const hospitalMark = await getMarks(hospital.code, year);

          const hospitalBasicData = await getBasicData(
            [hospital.code],
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
              rate: `${percentString(hospitalMark?.D00, hospitalBasicData)}`
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
        for (const hospital of hospitals) {
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
        for (const hospital of hospitals) {
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
        for (const hospital of hospitals) {
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
        for (const hospital of hospitals) {
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
        for (const hospital of hospitals) {
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
          hospitalIds,
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
        for (const hospital of hospitals) {
          // 仅仅返回中心这一个机构的数据
          const hospitalMark = await getMarks(hospital.code, year);

          const hospitalBasicData = await getBasicData(
            [hospital.code],
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
          hospitalIds,
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
        for (const hospital of hospitals) {
          // 仅仅返回中心这一个机构的数据
          const hospitalMark = await getMarks(hospital.code, year);

          const hospitalBasicData = await getBasicData(
            [hospital.code],
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
      // 高危人群规范管理率 CH01
      if (MarkTagUsages[markItem].code === 'CH01') {
        // 表一: 中心机构总体
        const mark = await getMarks(it.code, year);
        const basicData = await getBasicData(
          hospitalIds,
          BasicTagUsages.HR00,
          year
        );
        dataRow1.push({
          index: i,
          name: `${it?.name}`,
          value: mark?.CH01,
          basic: basicData,
          rate: `${percentString(mark?.CH01, basicData)}`
        });
        // 表二表三只显示机构本身的
        for (const hospital of hospitals) {
          // 仅仅返回中心这一个机构的数据
          const hospitalMark = await getMarks(hospital.code, year);

          const hospitalBasicData = await getBasicData(
            [hospital.code],
            BasicTagUsages.HR00,
            year
          );

          // 表二: 中心/卫生院机构（不含下属机构）
          if (hospital?.name === it?.name) {
            dataRow2.push({
              index: i,
              name: `${hospital?.name}`,
              value: hospitalMark?.CH01,
              basic: hospitalBasicData,
              rate: `${percentString(hospitalMark?.CH01, hospitalBasicData)}`
            });
          } else {
            // 表三: 卫生站/卫生室
            dataRow3.push({
              index: j,
              name: `${hospital?.name}`,
              value: hospitalMark?.CH01,
              basic: hospitalBasicData,
              rate: `${percentString(hospitalMark?.CH01, hospitalBasicData)}`
            });
            j++;
          }
        }
      }
      // 其他慢病规范管理率 CO01
      if (MarkTagUsages[markItem].code === 'CO01') {
        // 表一: 中心机构总体
        const mark = await getMarks(it.code, year);
        const basicData = await getBasicData(
          hospitalIds,
          BasicTagUsages.OCD00,
          year
        );
        dataRow1.push({
          index: i,
          name: `${it?.name}`,
          value: mark?.CO01,
          basic: basicData,
          rate: `${percentString(mark?.CO01, basicData)}`
        });
        // 表二表三只显示机构本身的
        for (const hospital of hospitals) {
          // 仅仅返回中心这一个机构的数据
          const hospitalMark = await getMarks(hospital.code, year);

          const hospitalBasicData = await getBasicData(
            [hospital.code],
            BasicTagUsages.OCD00,
            year
          );

          // 表二: 中心/卫生院机构（不含下属机构）
          if (hospital?.name === it?.name) {
            dataRow2.push({
              index: i,
              name: `${hospital?.name}`,
              value: hospitalMark?.CO01,
              basic: hospitalBasicData,
              rate: `${percentString(hospitalMark?.CO01, hospitalBasicData)}`
            });
          } else {
            // 表三: 卫生站/卫生室
            dataRow3.push({
              index: j,
              name: `${hospital?.name}`,
              value: hospitalMark?.CO01,
              basic: hospitalBasicData,
              rate: `${percentString(hospitalMark?.CO01, hospitalBasicData)}`
            });
            j++;
          }
        }
      }
      i++;
    }
    // 区分数据列表是率还是数
    const type = {
      // eslint-disable-next-line @typescript-eslint/camelcase
      is_num: true,
      // eslint-disable-next-line @typescript-eslint/camelcase
      is_rate: false
    };
    if (isRate) {
      // eslint-disable-next-line @typescript-eslint/camelcase
      type.is_num = false;
      // eslint-disable-next-line @typescript-eslint/camelcase
      type.is_rate = true;
    }
    // 计算合计2021-04-13
    // 如果数组为空,也没必要合计
    if (dataRow1.length > 0) {
      // 这个必有
      const dataRow1Value = dataRow1.reduce(
        (prev, curr) => Number(prev) + curr.value,
        0
      );
      const dataRow1Obj = {
        index: '',
        name: '合计',
        value: dataRow1Value
      };
      // 这个可能存在没有的情况
      if (dataRow1[0]?.basic || dataRow1[0]?.basic === 0) {
        const dataRow1Basic = dataRow1.reduce(
          (prev, curr) => Number(prev) + curr.basic,
          0
        );
        dataRow1Obj['basic'] = dataRow1Basic;
        dataRow1Obj['rate'] = `${percentString(dataRow1Value, dataRow1Basic)}`;
      }
      dataRow1.push(dataRow1Obj);
    }

    // 如果数组为空,也没必要合计
    if (dataRow2.length > 0) {
      // 这个必有
      const dataRow2Value = dataRow2.reduce(
        (prev, curr) => Number(prev) + curr.value,
        0
      );
      const dataRow2Obj = {
        index: '',
        name: '合计',
        value: dataRow2Value
      };
      // 这个可能存在没有的情况
      if (dataRow2[0]?.basic || dataRow2[0]?.basic === 0) {
        const dataRow2Basic = dataRow2.reduce(
          (prev, curr) => Number(prev) + curr.basic,
          0
        );
        dataRow2Obj['basic'] = dataRow2Basic;
        dataRow2Obj['rate'] = `${percentString(dataRow2Value, dataRow2Basic)}`;
      }
      dataRow2.push(dataRow2Obj);
    }

    // 如果数组为空,也没必要合计
    if (dataRow3.length > 0) {
      // 这个必有
      const dataRow3Value = dataRow3.reduce(
        (prev, curr) => Number(prev) + curr.value,
        0
      );
      const dataRow3Obj = {
        index: '',
        name: '合计',
        value: dataRow3Value
      };
      // 这个可能存在没有的情况
      if (dataRow3[0]?.basic || dataRow3[0]?.basic === 0) {
        const dataRow3Basic = dataRow3.reduce(
          (prev, curr) => Number(prev) + curr.basic,
          0
        );
        dataRow3Obj['basic'] = dataRow3Basic;
        dataRow3Obj['rate'] = `${percentString(dataRow3Value, dataRow3Basic)}`;
      }
      dataRow3.push(dataRow3Obj);
    }

    // 表一: 中心机构总体
    const dataTableObj1 = {
      ...type,
      title: `表一: 中心机构总体${MarkTagUsages[markItem].name}`,
      rows: dataRow1
    };
    // 表二: 中心/卫生院机构（不含下属机构）
    const dataTableObj2 = {
      ...type,
      title: `表二: 中心/卫生院机构（不含下属机构）${MarkTagUsages[markItem].name}`,
      rows: dataRow2
    };
    // 表三: 卫生站/卫生室
    const dataTableObj3 = {
      ...type,
      title: `表三: 卫生站/卫生室${MarkTagUsages[markItem].name}`,
      rows: dataRow3
    };
    // 如果是最后一级,仅仅是机构这一级权限
    if (level === 5) {
      dataTableObj1.title = `表一: 卫生站/卫生室${MarkTagUsages[markItem].name}`;
      dataTable.push(dataTableObj1);
    } else {
      dataTable.push(dataTableObj1, dataTableObj2, dataTableObj3);
    }
    //表格数据重排序
    const tables = dataTable.map(item => {
      item.rows = item.rows
        //排序
        .sort((a, b) => {
          //index为false的是合计行, 排最后
          if (!a.index) {
            return 1;
          } else if (!b.index) {
            return -1;
          } else if (a.rate) {
            //XX率的排序
            if (a.basic && b.basic) {
              return b.value / b.basic - a.value / a.basic;
            } else if (!a.basic) {
              return 1;
            } else if (!b.basic) {
              return -1;
            }
          } else {
            //XX值的排序
            return b.value - a.value;
          }
        })
        //序号重新赋值
        .map((row, index) => ({
          ...row,
          index: row.index ? index + 1 : row.index
        }));
      return item;
    });
    //
    dataList.push({
      title: `${title.areaName}${title.dateLabel}${MarkTagUsages[markItem].name}`,
      name: `${MarkTagUsages[markItem].name}`,
      tables: tables
    });
  }

  return {
    file: `${title.fileName}`,
    // eslint-disable-next-line @typescript-eslint/camelcase
    date_label: `${title.dateLabel}`,
    // eslint-disable-next-line @typescript-eslint/camelcase
    start_date: `${title.startDate}`,
    // eslint-disable-next-line @typescript-eslint/camelcase
    end_date: `${title.endDate}`,
    // eslint-disable-next-line @typescript-eslint/camelcase
    area_name: `${title.areaName}`,
    data: dataList
  };
}

async function render(data) {
  //读取模板文件
  const content = await fs.readFile(
    path.join(__dirname, './template.docx'),
    'binary'
  );
  //新建doc对象
  const doc = new Docxtemplater(new PizZip(content));
  //设置数据
  doc.setData(data);
  //渲染数据
  doc.render();
  //导出文件
  if (process.env.NODE_ENV === 'production') {
    await unifs.writeFile(
      path.join(reportDir, data.file),
      doc.getZip().generate({
        type: 'nodebuffer'
      })
    );
  } else {
    await fs.writeFile(
      path.join('./tmp', data.file),
      doc.getZip().generate({
        type: 'nodebuffer'
      })
    );
  }
}

export default class PHReport {
  /**
   * 获取报告列表
   *
   * @param id 地区或机构id
   * @return {
   *   id: 文件id
   *   name: 文件名
   *   url: 文件下载地址
   * }
   */
  async list(id) {
    const urlList = await unifs.list(reportDir);

    const urlList1 = await Promise.all(
      urlList
        .filter(it => it.isDirectory === false)
        .map(async it => {
          const areaTimeStr = path.parse(it.name)?.name;
          const strLength = areaTimeStr.length;
          const areaId = areaTimeStr.substr(0, strLength - 7);
          const time = areaTimeStr.split('-').pop();
          const timeTitle = await displayTime(time);
          return {
            id: it.name,
            name: `${timeTitle}`,
            url: await this.sign(it.name),
            area: areaId,
            time: time
          };
        })
    );
    return urlList1
      .filter(it => it.area === id)
      .map(it => {
        return {
          id: it.id,
          name: it.name,
          url: it.url
        };
      });
  }

  /**
   * unifs文件地址
   *
   * @param file 签名
   */
  async sign(file) {
    return await unifs.getExternalUrl(file);
  }

  /**
   * 自动生成公卫报告
   */
  async generateAll() {
    // 自动获取上月的,格式为年月
    const time = dayjs()
      .subtract(1, 'month')
      .format('YYYYMM');

    // 生成所有地区的公卫报告
    const allTree = await appDB.execute(`select code, name from area`);
    // 生成所有的地区
    for (const it of allTree) {
      await this.generate(time, it.code);
    }
  }

  /**
   * 生成公卫报告
   * @param time 年份加月份
   * @param code 地区code或机构id
   * @returns {Promise<void>}
   */
  @validate(
    should
      .string()
      .required()
      .description('年份加月份比如202003'),
    should
      .string()
      .required()
      .description('地区code或机构id')
  )
  async generate(time, code) {
    const data = await getExponent(code, time);
    return await render(data);
  }
}
