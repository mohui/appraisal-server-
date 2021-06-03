import {isMainThread, parentPort, workerData} from 'worker_threads';
import {appDB, initFS, unifs} from '../../app';
import * as models from '../../database/model';
import Score from '../../api/group/score';
import {getReportBuffer} from '../../api/group/system_area';
import {getPersonExcelBuffer} from '../../api/person.js';
import HisScore from '../../api/his/score';
import dayjs = require('dayjs');

appDB.addModels(Object.values(models));
const ScoreApi = new Score();
const hisScoreApi = new HisScore();

if (isMainThread) throw new Error('线程错误');

const {job} = workerData;

(async () => {
  let jobResult: string;
  try {
    //考核打分
    if (job === 'scoreCheck') {
      await ScoreApi.autoScore(workerData.checkId, workerData.isAuto);
    }
    //考核报表任务
    if (job === 'reportCheck') {
      const {code, year, fileName} = workerData;
      const buffer = (await getReportBuffer(code, year)) as Buffer;
      //初始化文件挂载
      await initFS();
      //写入本地
      jobResult = `/reportCheck/${fileName}-${dayjs().format(
        'YYYY-MM-DDTHH:mm:ss'
      )}考核结果.xls`;
      await unifs.writeFile(jobResult, buffer);
    }
    //档案人员表格任务
    if (job === 'personExcel') {
      const {params, fileName} = workerData;
      const buffer = (await getPersonExcelBuffer(params)) as Buffer;
      //初始化文件挂载
      await initFS();
      //写入本地
      jobResult = `/reportCheck/${fileName}-${dayjs().format(
        'YYYY-MM-DDTHH:mm:ss'
      )}.xls`;
      await unifs.writeFile(jobResult, buffer);
    }
    //医疗绩效打分
    if (job === 'HisSCore') {
      const {days, hospital} = workerData;
      for (const day of days) {
        //工分计算
        await hisScoreApi.workScoreHospital(day, hospital);
        //考核打分
        await hisScoreApi.autoScoreHospital(day, hospital);
      }
    }
    parentPort.postMessage({result: jobResult, error: null});
  } catch (e) {
    parentPort.postMessage({error: e.message || '未知错误'});
  }
})();
