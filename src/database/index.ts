import {Sequelize} from 'sequelize';
import {createNamespace} from 'cls-hooked';

//初始化cls
export const context = createNamespace('db-ctx');
Sequelize.useCLS(context);

//导出客户端类
export * from './client';
//导出迁移器
export * from './migrater';
//导出迁移任务
export * from './migrations';
//导出model
export * from './model';
//导出sql模板渲染方法
export * from './template';
