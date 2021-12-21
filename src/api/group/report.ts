import {originalDB, unifs} from '../../app';
import * as dayjs from 'dayjs';
import * as path from 'path';
import {getAreaTree, getHospitals, info} from './common';
import {KatoCommonError, should, validate} from 'kato-server';
import {BasicTagUsages, MarkTagUsages} from '../../../common/rule-score';
import {getBasicData, getMarks, percentString} from './score';
import {promises as fs} from 'fs';
import * as PizZip from 'pizzip';
import Decimal from 'decimal.js';

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

      // 建档率(建立电子健康档案人数 / 辖区内常住居民数)
      if (MarkTagUsages[markItem].code === 'S01') {
        // 表一: 中心机构总体
        const mark = await getMarks(it.code, year);
        const basicData = await getBasicData(
          hospitalIds,
          BasicTagUsages.DocPeople,
          year
        );
        // 如果是高校的机构,放到表三中
        if (it.label === 'hospital.school') {
          dataRow3.push({
            index: j,
            name: `${it?.name}`,
            value: mark?.S00,
            basic: basicData,
            rate: `${percentString(mark?.S00, basicData)}`
          });
          j++;
        } else {
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
      }
      // 规范率(规范的电子档案数 / 建立电子健康档案人数)
      if (MarkTagUsages[markItem].code === 'S23') {
        // 表一: 中心机构总体
        // 获取分子,分母
        const mark = await getMarks(it.code, year);
        // 如果是高校的机构,放到表三中
        if (it.label === 'hospital.school') {
          dataRow3.push({
            index: j,
            name: `${it?.name}`,
            value: mark?.S23,
            basic: mark?.S00,
            rate: `${percentString(mark?.S23, mark?.S00)}`
          });
          j++;
        } else {
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
      }
      // 健康档案使用率(档案中有动态记录的档案份数 / 建立电子健康档案人数)
      if (MarkTagUsages[markItem].code === 'S03') {
        // 表一: 中心机构总体
        // 获取分子,分母
        const mark = await getMarks(it.code, year);
        // 如果是高校的机构,放到表三中
        if (it.label === 'hospital.school') {
          dataRow3.push({
            index: j,
            name: `${it?.name}`,
            value: mark?.S03,
            basic: mark?.S00,
            rate: `${percentString(mark?.S03, mark?.S00)}`
          });
          j++;
        } else {
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
        // 如果是高校的机构,放到表三中
        if (it.label === 'hospital.school') {
          dataRow3.push({
            index: j,
            name: `${it?.name}`,
            value: mark?.O00,
            basic: basicData,
            rate: `${percentString(mark?.O00, basicData)}`
          });
          j++;
        } else {
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
        // 如果是高校的机构,放到表三中
        if (it.label === 'hospital.school') {
          dataRow3.push({
            index: j,
            name: `${it?.name}`,
            value: mark?.O02,
            basic: basicData,
            rate: `${percentString(mark?.O02, basicData)}`
          });
          j++;
        } else {
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
        // 如果是高校的机构,放到表三中
        if (it.label === 'hospital.school') {
          dataRow3.push({
            index: j,
            name: `${it?.name}`,
            value: mark?.H00,
            basic: basicData,
            rate: `${percentString(mark?.H00, basicData)}`
          });
          j++;
        } else {
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
      }
      // 高血压规范管理率(按照规范要求进行高血压患者健康管理的人数 / 一年内已管理的高血压患者人数)
      if (MarkTagUsages[markItem].code === 'H01') {
        // 表一: 中心机构总体
        // 获取分子,分母
        const mark = await getMarks(it.code, year);
        // 如果是高校的机构,放到表三中
        if (it.label === 'hospital.school') {
          dataRow3.push({
            index: j,
            name: `${it?.name}`,
            value: mark?.H01,
            basic: mark?.H00,
            rate: `${percentString(mark?.H01, mark?.H00)}`
          });
          j++;
        } else {
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
      }
      // 高血压控制率(一年内最近一次随访血压达标人数 / 一年内已管理的高血压患者人数)
      if (MarkTagUsages[markItem].code === 'H02') {
        // 表一: 中心机构总体
        // 获取分子,分母
        const mark = await getMarks(it.code, year);
        // 如果是高校的机构,放到表三中
        if (it.label === 'hospital.school') {
          dataRow3.push({
            index: j,
            name: `${it?.name}`,
            value: mark?.H02,
            basic: mark?.H00,
            rate: `${percentString(mark?.H02, mark?.H00)}`
          });
          j++;
        } else {
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
        // 如果是高校的机构,放到表三中
        if (it.label === 'hospital.school') {
          dataRow3.push({
            index: j,
            name: `${it?.name}`,
            value: mark?.D00,
            basic: basicData,
            rate: `${percentString(mark?.D00, basicData)}`
          });
          j++;
        } else {
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
      }
      // 糖尿病规范管理率(按照规范要求进行2型糖尿病患者健康管理的人数 / 一年内已管理的2型糖尿病患者人数 )
      if (MarkTagUsages[markItem].code === 'D01') {
        // 表一: 中心机构总体
        // 获取分子,分母
        const mark = await getMarks(it.code, year);
        // 如果是高校的机构,放到表三中
        if (it.label === 'hospital.school') {
          dataRow3.push({
            index: j,
            name: `${it?.name}`,
            value: mark?.D01,
            basic: mark?.D00,
            rate: `${percentString(mark?.D01, mark?.D00)}`
          });
          j++;
        } else {
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
      }
      // 糖尿病控制率(一年内最近一次随访空腹血糖达标人数 / 一年内已管理的2型糖尿病患者人数)
      if (MarkTagUsages[markItem].code === 'D02') {
        // 表一: 中心机构总体
        // 获取分子,分母
        const mark = await getMarks(it.code, year);
        // 如果是高校的机构,放到表三中
        if (it.label === 'hospital.school') {
          dataRow3.push({
            index: j,
            name: `${it?.name}`,
            value: mark?.D02,
            basic: mark?.D00,
            rate: `${percentString(mark?.D02, mark?.D00)}`
          });
          j++;
        } else {
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
      }
      // 发放健康教育印刷资料的种类 HE00
      if (MarkTagUsages[markItem].code === 'HE00') {
        isRate = false;
        // 表一: 中心机构总体
        // 获取分子,分母
        const mark = await getMarks(it.code, year);
        // 如果是高校的机构,放到表三中
        if (it.label === 'hospital.school') {
          dataRow3.push({
            index: j,
            name: `${it?.name}`,
            value: mark?.HE00
          });
          j++;
        } else {
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
      }
      // 播放健康教育音像资料的种类 HE02
      if (MarkTagUsages[markItem].code === 'HE02') {
        isRate = false;
        // 表一: 中心机构总体
        // 获取分子,分母
        const mark = await getMarks(it.code, year);
        // 如果是高校的机构,放到表三中
        if (it.label === 'hospital.school') {
          dataRow3.push({
            index: j,
            name: `${it?.name}`,
            value: mark?.HE02
          });
          j++;
        } else {
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
      }
      // 健康教育宣传栏的更新次数 HE06
      if (MarkTagUsages[markItem].code === 'HE06') {
        isRate = false;
        // 表一: 中心机构总体
        // 获取分子,分母
        const mark = await getMarks(it.code, year);
        // 如果是高校的机构,放到表三中
        if (it.label === 'hospital.school') {
          dataRow3.push({
            index: j,
            name: `${it?.name}`,
            value: mark?.HE06
          });
          j++;
        } else {
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
      }
      // 健康教育讲座次数合格率(一年内举办健康知识讲座的次数 / 一年内应举办健康知识讲座的次数)
      if (MarkTagUsages[markItem].code === 'HE07') {
        // 表一: 中心机构总体
        const mark = await getMarks(it.code, year);
        const basicData = await getBasicData(
          hospitalIds,
          BasicTagUsages.HE07,
          year
        );
        // 如果是高校的机构,放到表三中
        if (it.label === 'hospital.school') {
          dataRow3.push({
            index: j,
            name: `${it?.name}`,
            value: mark?.HE07,
            basic: basicData,
            rate: `${percentString(mark?.HE07, basicData)}`
          });
          j++;
        } else {
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
      }
      // 健康教育咨询次数的合格率(一年内举办健康教育咨询的次数 / 一年内应举办健康教育咨询的次数)
      if (MarkTagUsages[markItem].code === 'HE09') {
        // 表一: 中心机构总体
        const mark = await getMarks(it.code, year);
        const basicData = await getBasicData(
          hospitalIds,
          BasicTagUsages.HE09,
          year
        );
        // 如果是高校的机构,放到表三中
        if (it.label === 'hospital.school') {
          dataRow3.push({
            index: j,
            name: `${it?.name}`,
            value: mark?.HE09,
            basic: basicData,
            rate: `${percentString(mark?.HE09, basicData)}`
          });
          j++;
        } else {
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
      }
      // 高危人群规范管理率(规范管理的高危人群数 / 高危人群档案数)
      if (MarkTagUsages[markItem].code === 'CH01') {
        // 表一: 中心机构总体
        const mark = await getMarks(it.code, year);
        const basicData = await getBasicData(
          hospitalIds,
          BasicTagUsages.HR00,
          year
        );
        // 如果是高校的机构,放到表三中
        if (it.label === 'hospital.school') {
          dataRow3.push({
            index: j,
            name: `${it?.name}`,
            value: mark?.CH01,
            basic: basicData,
            rate: `${percentString(mark?.CH01, basicData)}`
          });
          j++;
        } else {
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
      }
      // 其他慢病规范管理率(规范管理的其他慢性病档案 / 其他慢病管理人数档案数)
      if (MarkTagUsages[markItem].code === 'CO01') {
        // 表一: 中心机构总体
        const mark = await getMarks(it.code, year);
        const basicData = await getBasicData(
          hospitalIds,
          BasicTagUsages.OCD00,
          year
        );
        // 如果是高校的机构,放到表三中
        if (it.label === 'hospital.school') {
          dataRow3.push({
            index: j,
            name: `${it?.name}`,
            value: mark?.CO01,
            basic: basicData,
            rate: `${percentString(mark?.CO01, basicData)}`
          });
          j++;
        } else {
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
      }
      // 早孕建册率(辖区内孕13周之前建册并进行第1次产前检查的产妇人数 / 该地该时间内活产数)
      if (MarkTagUsages[markItem].code === 'MCH01') {
        // 表一: 中心机构总体
        const mark = await getMarks(it.code, year);
        // 如果是高校的机构,放到表三中
        if (it.label === 'hospital.school') {
          dataRow3.push({
            index: j,
            name: `${it?.name}`,
            value: mark?.MCH01,
            basic: mark?.MCH00,
            rate: `${percentString(mark?.MCH01, mark?.MCH00)}`
          });
          j++;
        } else {
          dataRow1.push({
            index: i,
            name: `${it?.name}`,
            value: mark?.MCH01,
            basic: mark?.MCH00,
            rate: `${percentString(mark?.MCH01, mark?.MCH00)}`
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
                value: hospitalMark?.MCH01,
                basic: hospitalMark?.MCH00,
                rate: `${percentString(
                  hospitalMark?.MCH01,
                  hospitalMark?.MCH00
                )}`
              });
            } else {
              // 表三: 卫生站/卫生室
              dataRow3.push({
                index: j,
                name: `${hospital?.name}`,
                value: hospitalMark?.MCH01,
                basic: hospitalMark?.MCH00,
                rate: `${percentString(
                  hospitalMark?.MCH01,
                  hospitalMark?.MCH00
                )}`
              });
              j++;
            }
          }
        }
      }
      // 产后访视率(辖区内产妇出院后7天内接受过产后访视的产妇人数 / 该地该时间内活产数)
      if (MarkTagUsages[markItem].code === 'MCH02') {
        // 表一: 中心机构总体
        const mark = await getMarks(it.code, year);
        // 如果是高校的机构,放到表三中
        if (it.label === 'hospital.school') {
          dataRow3.push({
            index: j,
            name: `${it?.name}`,
            value: mark?.MCH02,
            basic: mark?.MCH00,
            rate: `${percentString(mark?.MCH02, mark?.MCH00)}`
          });
          j++;
        } else {
          dataRow1.push({
            index: i,
            name: `${it?.name}`,
            value: mark?.MCH02,
            basic: mark?.MCH00,
            rate: `${percentString(mark?.MCH02, mark?.MCH00)}`
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
                value: hospitalMark?.MCH02,
                basic: hospitalMark?.MCH00,
                rate: `${percentString(
                  hospitalMark?.MCH02,
                  hospitalMark?.MCH00
                )}`
              });
            } else {
              // 表三: 卫生站/卫生室
              dataRow3.push({
                index: j,
                name: `${hospital?.name}`,
                value: hospitalMark?.MCH02,
                basic: hospitalMark?.MCH00,
                rate: `${percentString(
                  hospitalMark?.MCH02,
                  hospitalMark?.MCH00
                )}`
              });
              j++;
            }
          }
        }
      }
      // 新生儿访视率(年度辖区内按照规范要求接受1次及以上访视的新生儿人数 / 年度辖区内活产数)
      if (MarkTagUsages[markItem].code === 'MCH03') {
        // 表一: 中心机构总体
        const mark = await getMarks(it.code, year);
        const basicData = await getBasicData(
          hospitalIds,
          BasicTagUsages.Children00,
          year
        );
        // 如果是高校的机构,放到表三中
        if (it.label === 'hospital.school') {
          dataRow3.push({
            index: j,
            name: `${it?.name}`,
            value: mark?.MCH03,
            basic: basicData,
            rate: `${percentString(mark?.MCH03, basicData)}`
          });
          j++;
        } else {
          dataRow1.push({
            index: i,
            name: `${it?.name}`,
            value: mark?.MCH03,
            basic: basicData,
            rate: `${percentString(mark?.MCH03, basicData)}`
          });
          // 表二表三只显示机构本身的
          for (const hospital of hospitals) {
            // 仅仅返回中心这一个机构的数据
            const hospitalMark = await getMarks(hospital.code, year);

            const hospitalBasicData = await getBasicData(
              [hospital.code],
              BasicTagUsages.Children00,
              year
            );

            // 表二: 中心/卫生院机构（不含下属机构）
            if (hospital?.name === it?.name) {
              dataRow2.push({
                index: i,
                name: `${hospital?.name}`,
                value: hospitalMark?.MCH03,
                basic: hospitalBasicData,
                rate: `${percentString(hospitalMark?.MCH03, hospitalBasicData)}`
              });
            } else {
              // 表三: 卫生站/卫生室
              dataRow3.push({
                index: j,
                name: `${hospital?.name}`,
                value: hospitalMark?.MCH03,
                basic: hospitalBasicData,
                rate: `${percentString(hospitalMark?.MCH03, hospitalBasicData)}`
              });
              j++;
            }
          }
        }
      }
      // 儿童健康管理率(年度辖区内接受1次及以上随访的0-3岁儿童数 / 年度辖区内0-6岁儿童数)
      if (MarkTagUsages[markItem].code === 'MCH04') {
        // 表一: 中心机构总体
        const mark = await getMarks(it.code, year);
        const basicData = await getBasicData(
          hospitalIds,
          BasicTagUsages.Children01,
          year
        );
        // 如果是高校的机构,放到表三中
        if (it.label === 'hospital.school') {
          dataRow3.push({
            index: j,
            name: `${it?.name}`,
            value: mark?.MCH04,
            basic: basicData,
            rate: `${percentString(mark?.MCH04, basicData)}`
          });
          j++;
        } else {
          dataRow1.push({
            index: i,
            name: `${it?.name}`,
            value: mark?.MCH04,
            basic: basicData,
            rate: `${percentString(mark?.MCH04, basicData)}`
          });
          // 表二表三只显示机构本身的
          for (const hospital of hospitals) {
            // 仅仅返回中心这一个机构的数据
            const hospitalMark = await getMarks(hospital.code, year);

            const hospitalBasicData = await getBasicData(
              [hospital.code],
              BasicTagUsages.Children01,
              year
            );

            // 表二: 中心/卫生院机构（不含下属机构）
            if (hospital?.name === it?.name) {
              dataRow2.push({
                index: i,
                name: `${hospital?.name}`,
                value: hospitalMark?.MCH04,
                basic: hospitalBasicData,
                rate: `${percentString(hospitalMark?.MCH04, hospitalBasicData)}`
              });
            } else {
              // 表三: 卫生站/卫生室
              dataRow3.push({
                index: j,
                name: `${hospital?.name}`,
                value: hospitalMark?.MCH04,
                basic: hospitalBasicData,
                rate: `${percentString(hospitalMark?.MCH04, hospitalBasicData)}`
              });
              j++;
            }
          }
        }
      }
      // 签约服务覆盖率(总签约人群数 / 服务人口数)
      if (MarkTagUsages[markItem].code === 'SN00') {
        // 表一: 中心机构总体
        const mark = await getMarks(it.code, year);
        const basicData = await getBasicData(
          hospitalIds,
          BasicTagUsages.DocPeople,
          year
        );
        // 如果是高校的机构,放到表三中
        if (it.label === 'hospital.school') {
          dataRow3.push({
            index: j,
            name: `${it?.name}`,
            value: mark?.SN00,
            basic: basicData,
            rate: `${percentString(mark?.SN00, basicData)}`
          });
          j++;
        } else {
          dataRow1.push({
            index: i,
            name: `${it?.name}`,
            value: mark?.SN00,
            basic: basicData,
            rate: `${percentString(mark?.SN00, basicData)}`
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
                value: hospitalMark?.SN00,
                basic: hospitalBasicData,
                rate: `${percentString(hospitalMark?.SN00, hospitalBasicData)}`
              });
            } else {
              // 表三: 卫生站/卫生室
              dataRow3.push({
                index: j,
                name: `${hospital?.name}`,
                value: hospitalMark?.SN00,
                basic: hospitalBasicData,
                rate: `${percentString(hospitalMark?.SN00, hospitalBasicData)}`
              });
              j++;
            }
          }
        }
      }
      // 重点人群签约服务覆盖率(重点人群签约数 / 重点人群总数)
      if (MarkTagUsages[markItem].code === 'SN01') {
        // 表一: 中心机构总体
        const mark = await getMarks(it.code, year);
        // 如果是高校的机构,放到表三中
        if (it.label === 'hospital.school') {
          dataRow3.push({
            index: j,
            name: `${it?.name}`,
            value: mark?.SN01,
            basic: mark?.focused,
            rate: `${percentString(mark?.SN01, mark?.focused)}`
          });
          j++;
        } else {
          dataRow1.push({
            index: i,
            name: `${it?.name}`,
            value: mark?.SN01,
            basic: mark?.focused,
            rate: `${percentString(mark?.SN01, mark?.focused)}`
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
                value: hospitalMark?.SN01,
                basic: hospitalMark?.focused,
                rate: `${percentString(
                  hospitalMark?.SN01,
                  hospitalMark?.focused
                )}`
              });
            } else {
              // 表三: 卫生站/卫生室
              dataRow3.push({
                index: j,
                name: `${hospital?.name}`,
                value: hospitalMark?.SN01,
                basic: hospitalMark?.focused,
                rate: `${percentString(
                  hospitalMark?.SN01,
                  hospitalMark?.focused
                )}`
              });
              j++;
            }
          }
        }
      }
      // 计划生育特扶人员签约率(计划生育特扶人员签约数 / 计划生育特扶人员数)
      if (MarkTagUsages[markItem].code === 'SN02') {
        // 表一: 中心机构总体
        const mark = await getMarks(it.code, year);
        // 如果是高校的机构,放到表三中
        if (it.label === 'hospital.school') {
          dataRow3.push({
            index: j,
            name: `${it?.name}`,
            value: mark?.SN02,
            basic: mark?.C07,
            rate: `${percentString(mark?.SN02, mark?.C07)}`
          });
          j++;
        } else {
          dataRow1.push({
            index: i,
            name: `${it?.name}`,
            value: mark?.SN02,
            basic: mark?.C07,
            rate: `${percentString(mark?.SN02, mark?.C07)}`
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
                value: hospitalMark?.SN02,
                basic: hospitalMark?.C07,
                rate: `${percentString(hospitalMark?.SN02, hospitalMark?.C07)}`
              });
            } else {
              // 表三: 卫生站/卫生室
              dataRow3.push({
                index: j,
                name: `${hospital?.name}`,
                value: hospitalMark?.SN02,
                basic: hospitalMark?.C07,
                rate: `${percentString(hospitalMark?.SN02, hospitalMark?.C07)}`
              });
              j++;
            }
          }
        }
      }
      // 有偿签约率(有偿签约人数 / 服务人口数)
      if (MarkTagUsages[markItem].code === 'SN03') {
        // 表一: 中心机构总体
        const mark = await getMarks(it.code, year);
        const basicData = await getBasicData(
          hospitalIds,
          BasicTagUsages.DocPeople,
          year
        );
        // 如果是高校的机构,放到表三中
        if (it.label === 'hospital.school') {
          dataRow3.push({
            index: j,
            name: `${it?.name}`,
            value: mark?.SN03,
            basic: basicData,
            rate: `${percentString(mark?.SN03, basicData)}`
          });
          j++;
        } else {
          dataRow1.push({
            index: i,
            name: `${it?.name}`,
            value: mark?.SN03,
            basic: basicData,
            rate: `${percentString(mark?.SN03, basicData)}`
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
                value: hospitalMark?.SN03,
                basic: hospitalBasicData,
                rate: `${percentString(hospitalMark?.SN03, hospitalBasicData)}`
              });
            } else {
              // 表三: 卫生站/卫生室
              dataRow3.push({
                index: j,
                name: `${hospital?.name}`,
                value: hospitalMark?.SN03,
                basic: hospitalBasicData,
                rate: `${percentString(hospitalMark?.SN03, hospitalBasicData)}`
              });
              j++;
            }
          }
        }
      }
      // 高血压病人有偿签约率(高血压有偿签约人数 / 高血压在管患者总数)
      if (MarkTagUsages[markItem].code === 'SN04') {
        // 表一: 中心机构总体
        const mark = await getMarks(it.code, year);

        // 如果是高校的机构,放到表三中
        if (it.label === 'hospital.school') {
          dataRow3.push({
            index: j,
            name: `${it?.name}`,
            value: mark?.SN04,
            basic: mark?.C02,
            rate: `${percentString(mark?.SN04, mark?.C02)}`
          });
          j++;
        } else {
          dataRow1.push({
            index: i,
            name: `${it?.name}`,
            value: mark?.SN04,
            basic: mark?.C02,
            rate: `${percentString(mark?.SN04, mark?.C02)}`
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
                value: hospitalMark?.SN04,
                basic: hospitalMark?.C02,
                rate: `${percentString(hospitalMark?.SN04, hospitalMark?.C02)}`
              });
            } else {
              // 表三: 卫生站/卫生室
              dataRow3.push({
                index: j,
                name: `${hospital?.name}`,
                value: hospitalMark?.SN04,
                basic: hospitalMark?.C02,
                rate: `${percentString(hospitalMark?.SN04, hospitalMark?.C02)}`
              });
              j++;
            }
          }
        }
      }
      // 糖尿病人有偿签约率(糖尿病有偿签约人数 / 糖尿病在管患者总数)
      if (MarkTagUsages[markItem].code === 'SN05') {
        // 表一: 中心机构总体
        const mark = await getMarks(it.code, year);

        // 如果是高校的机构,放到表三中
        if (it.label === 'hospital.school') {
          dataRow3.push({
            index: j,
            name: `${it?.name}`,
            value: mark?.SN05,
            basic: mark?.C03,
            rate: `${percentString(mark?.SN05, mark?.C03)}`
          });
          j++;
        } else {
          dataRow1.push({
            index: i,
            name: `${it?.name}`,
            value: mark?.SN05,
            basic: mark?.C03,
            rate: `${percentString(mark?.SN05, mark?.C03)}`
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
                value: hospitalMark?.SN05,
                basic: hospitalMark?.C03,
                rate: `${percentString(hospitalMark?.SN05, hospitalMark?.C03)}`
              });
            } else {
              // 表三: 卫生站/卫生室
              dataRow3.push({
                index: j,
                name: `${hospital?.name}`,
                value: hospitalMark?.SN05,
                basic: hospitalMark?.C03,
                rate: `${percentString(hospitalMark?.SN05, hospitalMark?.C03)}`
              });
              j++;
            }
          }
        }
      }
      // 续约率(明年继续签约的人数 / 今年签约的居民总数)
      if (MarkTagUsages[markItem].code === 'SN07') {
        // 表一: 中心机构总体
        const mark = await getMarks(it.code, year);
        if (it.label === 'hospital.school') {
          dataRow3.push({
            index: j,
            name: `${it?.name}`,
            value: mark?.SN07,
            basic: mark?.SN00,
            rate: `${percentString(mark?.SN07, mark?.SN00)}`
          });
          j++;
        } else {
          dataRow1.push({
            index: i,
            name: `${it?.name}`,
            value: mark?.SN07,
            basic: mark?.SN00,
            rate: `${percentString(mark?.SN07, mark?.SN00)}`
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
                value: hospitalMark?.SN07,
                basic: hospitalMark?.SN00,
                rate: `${percentString(hospitalMark?.SN07, hospitalMark?.SN00)}`
              });
            } else {
              // 表三: 卫生站/卫生室
              dataRow3.push({
                index: j,
                name: `${hospital?.name}`,
                value: hospitalMark?.SN07,
                basic: hospitalMark?.SN00,
                rate: `${percentString(hospitalMark?.SN07, hospitalMark?.SN00)}`
              });
              j++;
            }
          }
        }
      }
      // 有偿续约率(明年继续有偿签约人数 / 今年度有偿签约居民总数)
      if (MarkTagUsages[markItem].code === 'SN08') {
        // 表一: 中心机构总体
        const mark = await getMarks(it.code, year);
        if (it.label === 'hospital.school') {
          dataRow3.push({
            index: j,
            name: `${it?.name}`,
            value: mark?.SN08,
            basic: mark?.SN03,
            rate: `${percentString(mark?.SN08, mark?.SN03)}`
          });
          j++;
        } else {
          dataRow1.push({
            index: i,
            name: `${it?.name}`,
            value: mark?.SN08,
            basic: mark?.SN03,
            rate: `${percentString(mark?.SN08, mark?.SN03)}`
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
                value: hospitalMark?.SN08,
                basic: hospitalMark?.SN03,
                rate: `${percentString(hospitalMark?.SN08, hospitalMark?.SN03)}`
              });
            } else {
              // 表三: 卫生站/卫生室
              dataRow3.push({
                index: j,
                name: `${hospital?.name}`,
                value: hospitalMark?.SN08,
                basic: hospitalMark?.SN03,
                rate: `${percentString(hospitalMark?.SN08, hospitalMark?.SN03)}`
              });
              j++;
            }
          }
        }
      }
      // 履约率(履约的项目数 / 签约的项目总数)
      if (MarkTagUsages[markItem].code === 'SN10') {
        // 表一: 中心机构总体
        const mark = await getMarks(it.code, year);

        if (it.label === 'hospital.school') {
          dataRow3.push({
            index: j,
            name: `${it?.name}`,
            value: mark?.SN10,
            basic: mark?.SN09,
            rate: `${percentString(mark?.SN10, mark?.SN09)}`
          });
          j++;
        } else {
          dataRow1.push({
            index: i,
            name: `${it?.name}`,
            value: mark?.SN10,
            basic: mark?.SN09,
            rate: `${percentString(mark?.SN10, mark?.SN09)}`
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
                value: hospitalMark?.SN10,
                basic: hospitalMark?.SN09,
                rate: `${percentString(hospitalMark?.SN10, hospitalMark?.SN09)}`
              });
            } else {
              // 表三: 卫生站/卫生室
              dataRow3.push({
                index: j,
                name: `${hospital?.name}`,
                value: hospitalMark?.SN10,
                basic: hospitalMark?.SN09,
                rate: `${percentString(hospitalMark?.SN10, hospitalMark?.SN09)}`
              });
              j++;
            }
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
        (prev, curr) => new Decimal(prev).add(curr.value),
        new Decimal(0)
      );
      const dataRow1Obj = {
        index: '',
        name: '合计',
        value: dataRow1Value
      };
      // 这个可能存在没有的情况
      if (dataRow1[0]?.basic || dataRow1[0]?.basic === 0) {
        const dataRow1Basic = dataRow1.reduce(
          (prev, curr) => new Decimal(prev).add(curr.basic),
          new Decimal(0)
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
        (prev, curr) => new Decimal(prev).add(curr.value),
        new Decimal(0)
      );
      const dataRow2Obj = {
        index: '',
        name: '合计',
        value: dataRow2Value
      };
      // 这个可能存在没有的情况
      if (dataRow2[0]?.basic || dataRow2[0]?.basic === 0) {
        const dataRow2Basic = dataRow2.reduce(
          (prev, curr) => new Decimal(prev).add(curr.basic),
          new Decimal(0)
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
        (prev, curr) => new Decimal(prev).add(curr.value),
        new Decimal(0)
      );
      const dataRow3Obj = {
        index: '',
        name: '合计',
        value: dataRow3Value
      };
      // 这个可能存在没有的情况
      if (dataRow3[0]?.basic || dataRow3[0]?.basic === 0) {
        const dataRow3Basic = dataRow3.reduce(
          (prev, curr) => new Decimal(prev).add(curr.basic),
          new Decimal(0)
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
   *
   * @param time 报告时间. 格式: YYYYMM
   */
  async generateAll(time) {
    //查询所有地区
    const allTree = await originalDB.execute(`select code, name from area`);
    // 生成所有的地区
    for (const it of allTree) {
      try {
        info(`生成 ${it.name} ${time} 公卫报告 - 开始`);
        await this.generate(time, it.code);
        info(`生成 ${it.name} ${time} 公卫报告 - 完成`);
      } catch (e) {
        info(`生成 ${it.name} ${time} 公卫报告 - 失败`, e);
      }
    }
  }

  /**
   * 生成指定时间和数据节点的公卫报告
   *
   * @param time 报告时间. 格式: YYYYMM
   * @param code 数据节点id
   */
  @validate(should.string().required(), should.string().required())
  async generate(time, code) {
    const data = await getExponent(code, time);
    await render(data);
  }
}
