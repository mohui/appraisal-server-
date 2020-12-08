const {workerData, parentPort} = require('worker_threads');

let data = workerData;
//测试
(async () => {
  await new Promise(resolve => setTimeout(() => resolve(data), 3000));
  console.log('data', data);
})();

parentPort.postMessage('worker OK');
