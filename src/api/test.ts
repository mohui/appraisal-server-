import {Worker} from 'worker_threads';

export default class Test {
  test() {
    return new Date();
  }

  worker(n) {
    const work = new Worker('./src/utils/back-work.js', {workerData: n});
    return new Promise(resolve => {
      work.on('message', val => {
        resolve(val);
      });
    });
  }
}
