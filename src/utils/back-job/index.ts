import {Worker} from 'worker_threads';
import * as path from 'path';
import {Server, Socket} from 'socket.io';
import {Context} from '../../api/context';
import {KatoCommonError} from 'kato-server';
import {v4 as uuid} from 'uuid';

const jobType: Array<string> = ['reportCheck'];

type Job = {
  id: string;
  userId: string;
  job: string;
  title: string;
  status: 'running' | 'success' | 'error';
  startTime: Date;
  endTime?: Date;
  result?: any;
};

//客户端集合
const clients: Array<{id: string; socket: Socket}> = [];
//任务集合
const jobs = new Map<string, Job>();

/***
 * 后台任务初始化
 * @param app
 */
export async function init(app) {
  //设置socket
  const io = new Server(app, {path: '/back-job'});
  io.on('connection', (socket: Socket) => {
    const id: string = (socket.handshake.query as any)?.id ?? '';

    if (!id) {
      socket.disconnect(true);
      return;
    }
    const current = clients.find(it => it.id === id);
    if (!current) clients.push({id, socket});
    //更新当前用户的后台任务事件
    jobs.forEach(value => {
      if (value.userId === id) socket.emit('update', value);
    });

    socket.on('disconnect', () => {
      const index = clients.findIndex(it => it.id === id);
      if (index > -1) clients.splice(index, 1);
    });
  });
}

/***
 * 创建后台worker
 * @params job : 任务的类型
 * @params title: 任务名称
 * @params data : 所需参数
 */
export async function createBackJob(job: string, title: string, data?: object) {
  try {
    if (jobType.indexOf(job) < 0) throw new KatoCommonError('任务不存在');

    const userId = Context.current.user.id;
    const backJob: Job = {
      id: uuid(),
      userId,
      job,
      title,
      status: 'running',
      startTime: new Date()
    };

    jobs.set(backJob.id, backJob);

    const work = new Worker(path.join(__dirname, './worker.js'), {
      workerData: {job, ...data}
    });
    const client = clients.find(it => it.id === userId);

    //监听后台任务的结果
    work.on('message', data => {
      // socket.io
      backJob.result = data;
      backJob.status = 'success';
      backJob.endTime = new Date();
      if (client) client.socket.emit('update', backJob);
    });
    if (client) client.socket.emit('update', backJob);
    return backJob;
  } catch (e) {
    console.log('发生错误', e);
  }
}
