import {parentPort, isMainThread, workerData} from 'worker_threads';
import {Workbook} from 'exceljs';
import * as path from 'path';

if (isMainThread) throw new Error('线程错误');
const wd = workerData;
parentPort.on('message', async data => {
  const {job} = JSON.parse(data);
  let jobResult: string;
  //考核报表任务
  if (job === 'reportCheck') {
    const {checkGroups, title} = JSON.parse(data);
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    jobResult = await reportCheck(checkGroups, title);
  }
  parentPort.postMessage(jobResult);
});

//考核报表下载
export async function reportCheck(
  checkGroups: any,
  title: any
): Promise<string> {
  const workBook = new Workbook();
  for (const it of checkGroups) {
    //开始创建Excel表格
    const workSheet = workBook.addWorksheet(`${it.name}考核结果`);

    //添加标题内容
    const firstRow = it.rules.map(item => `${item.ruleName}`);
    firstRow.unshift('机构名称');
    const ruleIds = it.rules.map(item => `${item.ruleId}`);

    // 填充每行数据
    const childrenHospitalCheckResult = it.hospitals.map(item => {
      // 机构的中文名称
      const data = [item.name];
      for (const ruleId of ruleIds) {
        const scoreObj = item.scores.find(
          scoreObj => scoreObj.ruleId === ruleId
        );
        data.push(Number(scoreObj?.score?.toFixed(2) ?? 0));
      }
      return data;
    });
    workSheet.addRows([firstRow, ...childrenHospitalCheckResult]);
  }
  const filepath = path.join(__dirname, `${title}`);
  await workBook.xlsx.writeFile(filepath);
  await new Promise(resolve => setTimeout(() => resolve(1), 3000));
  return filepath;
}

parentPort.postMessage(`${wd} is working`);
