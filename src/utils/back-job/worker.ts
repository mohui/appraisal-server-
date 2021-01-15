import {parentPort, isMainThread, workerData} from 'worker_threads';
import {appDB, initFS, unifs} from '../../app';
import * as models from '../../database/model';
import dayjs = require('dayjs');
import Score from '../../api/group/score';
import SystemArea from '../../api/group/system_area';
const ScoreApi = new Score();
const SystemAreaApi = new SystemArea();
appDB.addModels(Object.values(models));

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
      const buffer = (await SystemAreaApi.getReportBuffer(
        code,
        year
      )) as Buffer;
      //初始化文件挂载
      await initFS();
      //写入本地
      jobResult = `/reportCheck/${fileName}-${dayjs().format(
        'YYYY-MM-DDTHH:mm:ss'
      )}考核结果.xls`;
      await unifs.writeFile(jobResult, buffer);
    }
    parentPort.postMessage({result: jobResult, error: null});
  } catch (e) {
    parentPort.postMessage({error: e.message || '未知错误'});
  }
})();
