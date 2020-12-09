import {Worker} from 'worker_threads';
import * as path from 'path';

/***
 * 创建后台worker
 * @param job : 任务的名称
 * @param data : 所需参数
 */
export default function createBackJob(job: string, data?: object) {
  try {
    const work = new Worker(path.join(__dirname, './worker.js'), {
      workerData: job
    });
    const workData = JSON.stringify({job, ...data});

    //发布后台任务
    work.postMessage(workData);
    //监听后台任务的结果
    work.on('message', data => {
      console.log('main等到的消息', data);
    });
    return new Promise(resolve => {
      work.on('message', val => {
        resolve(val);
      });
    });
  } catch (e) {
    console.log('发生错误', e);
  }
}
