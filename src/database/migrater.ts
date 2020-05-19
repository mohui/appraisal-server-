import {ExtendedSequelize} from './client';
import {AllowNull, Column, Model, Table, Unique} from 'sequelize-typescript';
import {Transaction} from 'sequelize';

//数据库版本
@Table({tableName: '_version'})
class DatabaseVersion extends Model<DatabaseVersion> {
  @AllowNull(false)
  @Unique
  @Column
  version: number;
}

//数据迁移任务接口,所有的迁移任务都需要实现这个接口
// eslint-disable-next-line @typescript-eslint/interface-name-prefix
export interface IMigration {
  //迁移任务的版本
  version: number;
  //迁移任务的名称,请使用中文
  name: string;

  //升级任务
  up(client: ExtendedSequelize): Promise<void>;

  //降级任务
  down(client: ExtendedSequelize): Promise<void>;
}

//数据库版本迁移器
export class Migrater {
  //存储迁移任务
  private migrations: IMigration[] = [];

  /**
   * 新建一个数据迁移器
   * @param client 要执行迁移的数据实例
   */
  constructor(private client: ExtendedSequelize) {
    this.client.addModels([DatabaseVersion]);
  }

  /**
   * 给迁移器添加一个迁移任务
   * @param migration 迁移任务
   */
  addMigration(migration: IMigration) {
    this.migrations.push(migration);
  }

  /**
   * 迁移至特定的数据库版本
   * @param version
   */
  async migrate(version: number): Promise<any> {
    //检查迁移任务
    if (this.migrations.filter(m => m.version < 0).length > 0)
      throw new Error('迁移任务的版本号不能小于0');
    if (
      this.migrations
        .map(m => m.version)
        .filter((v, index, array) => array.lastIndexOf(v) !== index).length > 0
    )
      throw new Error('迁移任务的版本号必须唯一,不能重复');
    if (
      this.migrations.filter(m => m.name === '' || typeof m.name !== 'string')
        .length > 0
    )
      throw new Error('迁移任务名称必须是非空字符串');
    if (
      this.migrations
        .sort((a, b) => (a.version > b.version ? 1 : -1))
        .filter((m, index) => m.version != index).length > 0
    )
      throw new Error('迁移任务的版本号必须为整数,且从0连续开始');
    //检查需要迁移的版本
    if (this.migrations.length <= 0) {
      console.log(`没有定义迁移任务,无需启动数据库迁移`);
      return;
    } else if (this.migrations.length === 1) {
      if (version !== this.migrations[0].version)
        throw new Error('只有一个迁移任务,只能迁移到它的版本');
    } else {
      const maxVersion = Math.max(...this.migrations.map(m => m.version));
      const minVersion = Math.min(...this.migrations.map(m => m.version));
      if (version > maxVersion || version < minVersion)
        throw new Error(
          `当前定义的迁移任务集合所允许的最大版本号不能大于${maxVersion},不能小于${minVersion}`
        );
    }

    console.log(`数据库版本迁移任务启动`);

    //整个迁移过程都运行在一个事务中
    await this.client.joinTx(async () => {
      //初始化数据库版本
      await DatabaseVersion.sync({logging: false});
      if (
        (
          await DatabaseVersion.findAll({
            lock: Transaction.LOCK.UPDATE,
            logging: false
          })
        ).length === 0
      )
        await new DatabaseVersion({version: -1}).save({logging: false});

      //获取数据库版本
      const databaseVersion = (
        await DatabaseVersion.findOne({
          lock: Transaction.LOCK.UPDATE,
          logging: false
        })
      ).version;

      if (databaseVersion < version) {
        //找到所有的需要升级的迁移任务
        const needMigrates = this.migrations
          .filter(m => m.version > databaseVersion && m.version <= version)
          .sort((a, b) => (a.version > b.version ? 1 : -1));
        try {
          //以事务的方式运行整个迁移过程
          await this.client.joinTx(async () => {
            //开始准备执行迁移任务
            console.log(
              `准备执行数据库版本升级任务,由 版本${databaseVersion} 升级到 版本${version}`
            );
            for (const migration of needMigrates) {
              try {
                console.log(
                  `\n^===> [${migration.version}]-[${migration.name}] 升级任务开始`
                );
                await migration.up(this.client);
                console.log(
                  `$===> [${migration.version}]-[${migration.name}] 升级任务完成\n`
                );
              } catch (e) {
                console.error(
                  `$===> [${migration.version}]-[${migration.name}] 升级任务失败,准备回滚\n`
                );
                throw e;
              }
            }
            //更新数据库版本号
            await DatabaseVersion.update(
              {version},
              {where: {version: databaseVersion}, logging: false}
            );
          });
          console.log(
            `数据库版本升级完成,当前数据库版本 ${
              (await DatabaseVersion.findOne({logging: false})).version
            }`
          );
        } catch (e) {
          console.error(`数据库版本升级失败,已回滚到原 版本${databaseVersion}`);
          throw e;
        }
      } else if (databaseVersion > version) {
        //找到所有需要降级的迁移任务
        const needMigrates = this.migrations
          .filter(m => m.version > version && m.version <= databaseVersion)
          .sort((a, b) => (a.version < b.version ? 1 : -1));
        try {
          //以事务的方式运行整个迁移过程
          await this.client.joinTx(async () => {
            //开始准备执行迁移任务
            console.log(
              `准备执行数据库版本降级任务,由 版本${databaseVersion} 降级到 版本${version}`
            );
            for (const migration of needMigrates) {
              try {
                console.log(
                  `\n^===> [${migration.version}]-[${migration.name}] 降级任务开始`
                );
                await migration.down(this.client);
                console.log(
                  `$===> [${migration.version}]-[${migration.name}] 降级任务完成\n`
                );
              } catch (e) {
                console.error(
                  `$===> [${migration.version}]-[${migration.name}] 降级任务失败,准备回滚\n`
                );
                throw e;
              }
            }
            //更新数据库版本号
            await DatabaseVersion.update(
              {version},
              {where: {version: databaseVersion}, logging: false}
            );
            console.log(`数据库版本降级完成,当前数据库版本 ${version}`);
          });
        } catch (e) {
          console.error(`数据库版本降级失败,已回滚到原 版本${databaseVersion}`);
          throw e;
        }
      } else console.log('数据库版本一致无需迁移');
    });

    console.log(`数据库版本迁移任务完毕\n`);
  }
}
