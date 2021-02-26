import {promises as fs} from 'fs';
import path from 'upath';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import {KatoCommonError, should, validate} from 'kato-server';

import {getAreaTree, getLeaves} from './group';
import {getBasicData, getMarks, percentString} from './group/score';
import * as dayjs from 'dayjs';
import {BasicTagUsages, MarkTagUsages} from '../../common/rule-score';
import {appDB} from '../app';

/**
 * 获取指标数据
 *
 * @param code
 * @param time
 */
async function getExponent(code, time) {
  const year = dayjs(time.toString()).year();
  const month = dayjs(time.toString()).month() + 1;
  let dateLabel = `${year}-${month}月`;
  if (month === 3) dateLabel = `${year}第一季度`;
  if (month === 6) dateLabel = `${year}上半年`;
  if (month === 12) dateLabel = `${year}年度`;

  // 获取所有权限[1:省,2:市,3:区,4:中心,5:卫生室/站]
  const allTree = await getAreaTree();
  // 判断当前权限是否在权限树中,如果在,数据几级权限
  const findObj = allTree.find(it => it.code === code);
  if (!findObj) throw new KatoCommonError(`code为 [${code}] 不合法`);
  const level = findObj.level;

  const title = {
    fileName: `${findObj.code}-${dayjs()
      .subtract(1, 'M')
      .startOf('M')
      .format('YYYYMM')}.docx`,
    dateLabel: `${dateLabel}`,
    startDate: dayjs(time.toString())
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
        const basicData = await getBasicData(leaves, BasicTagUsages.HE07, year);
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
        const basicData = await getBasicData(leaves, BasicTagUsages.HE09, year);
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
    // 区分数据列表是率还是数
    let type = {
      is_num: true
    };
    if (isRate) {
      type = {
        is_rate: true
      };
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

    //
    dataList.push({
      title: `${title.areaName}${title.dateLabel}${MarkTagUsages[markItem].name}`,
      name: `${MarkTagUsages[markItem].name}`,
      tables: dataTable
    });
  }

  return {
    file: `${title.fileName}`,
    date_label: `${title.dateLabel}`,
    start_date: `${title.startDate}`,
    end_date: `${title.endDate}`,
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
  await fs.writeFile(
    path.join('./tmp', data.file),
    doc.getZip().generate({
      type: 'nodebuffer'
    })
  );
}

export default class JxReport {
  /**
   * 生成公卫报告
   * @param time
   * @param code
   * @returns {Promise<void>}
   */
  @validate(
    should
      .number()
      .required()
      .description('年份加月份比如202003'),
    should
      .string()
      .allow(null)
      .description('地区code或机构id')
  )
  async generate(time, code) {
    // 如果传了code,就只生成这个地区的公卫报告
    if (code) {
      const data = await getExponent(code, time);
      await render(data);
    }

    // 如果code为空,生成所有地区的公卫报告
    const allTree = await appDB.execute(`select code, name from area`);
    // 生成所有的地区
    for (const it of allTree) {
      const data = await getExponent(it.code, time);
      await render(data);
    }
  }
}
