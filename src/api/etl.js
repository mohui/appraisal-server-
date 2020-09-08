import {appDB, etlDB} from '../app';
import dayjs from 'dayjs';
import {HospitalModel} from '../database/model';

const startDate = dayjs().format('YYYY-01-01');

const locked = {
  hospital: null
};

export default class ETL {
  /**
   * 获取机构同步列表
   */
  async list() {
    return (await HospitalModel.findAll()).map(it => ({
      ...it.toJSON(),
      running: it.id === locked.hospital
    }));
  }

  /**
   * 启动机构同步任务
   *
   * @param hospital
   * @returns {Promise<{hospital: null}>}
   */
  async run(hospital) {
    // 判断是否有运行的机构
    if (locked.hospital) {
      return locked;
    }

    // 锁定运行的机构
    locked.hospital = hospital;

    // 同步机构
    this.job(hospital);
  }

  /**
   * 同步机构
   *
   * @param hospital
   * @returns {Promise<void>}
   */
  async job(hospital) {
    await this.personInfo(hospital);
    await this.heathy(hospital);
    await this.hypertension(hospital);
    await this.diabetes(hospital);
    await this.old(hospital);
    await this.score(hospital);

    // 同步完成, 置空
    locked.hospital = null;
  }

  /**
   * 同步工分表
   *
   * @param hospital 医院id
   */
  async score(hospital) {
    // 查询organization
    const organizationIds = await this.getOrganizations(hospital);

    // 工分表
    // language=TSQL
    const rows = (
      await Promise.all(
        organizationIds.map(id =>
          etlDB.execute(
            `
              select *
              from dbo.view_WorkScoreTotal
              where OperateOrganization = ?
                and MissionTime >= ?
            `,
            id,
            startDate
          )
        )
      )
    ).flat();

    // upsert score
    let index = 0;
    const counts = rows.length;
    for (let it of rows) {
      await appDB.transaction(async () => {
        // 删除原有数据
        // language=PostgreSQL
        await appDB.execute(
          `
            delete
            from view_WorkScoreTotal
            where WorkScoreID = ?
          `,
          it.WorkScoreID
        );

        // 新增数据
        const cols = Object.keys(it);
        const sql = `insert into view_WorkScoreTotal(${cols.join()}) values(${cols
          .map(() => '?')
          .join()})`;
        await appDB.execute(
          sql,
          ...cols.map(key => {
            return it[key];
          })
        );
        console.log(`WorkScore ${++index} - ${counts}`);
      });
    }
  }

  /**
   * 同步老年人表
   *
   * @param hospital 医院id
   */
  async old(hospital) {
    // 查询organization
    const organizationIds = await this.getOrganizations(hospital);

    // 老年人生活自理能力表
    // language=TSQL
    const rows = (
      await Promise.all(
        organizationIds.map(id =>
          etlDB.execute(
            `
              select d.*
              from dbo.view_HealthCheckTableScore d
                     inner join dbo.view_Healthy h on d.IncrementNo = h.IncrementNo
                     inner join dbo.view_PersonInfo p on h.PersonNum = p.PersonNum
              where p.AdminOrganization = ?
                and p.WriteOff = 0
            `,
            id
          )
        )
      )
    ).flat();

    // upsert score
    let index = 0;
    const counts = rows.length;
    for (let it of rows) {
      await appDB.transaction(async () => {
        // 删除原有数据
        // language=PostgreSQL
        await appDB.execute(
          `
            delete
            from view_HealthCheckTableScore
            where ScoreID = ?
          `,
          it.ScoreID
        );

        // 新增数据
        const cols = Object.keys(it);
        const sql = `insert into view_HealthCheckTableScore(${cols.join()}) values(${cols
          .map(() => '?')
          .join()})`;
        await appDB.execute(
          sql,
          ...cols.map(key => {
            return it[key];
          })
        );
        console.log(`CheckScore ${++index} - ${counts}`);
      });
    }
  }

  /**
   * 同步体检表
   *
   * @param hospital 医院id
   */
  async heathy(hospital) {
    // 查询organization
    const organizationIds = await this.getOrganizations(hospital);

    // 体检表
    // language=TSQL
    const rows = (
      await Promise.all(
        organizationIds.map(id =>
          etlDB.execute(
            `
              select d.*
              from dbo.view_Healthy d
                     inner join dbo.view_PersonInfo p on d.PersonNum = p.PersonNum
              where p.AdminOrganization = ?
                and p.WriteOff = 0
                and d.checkupDate >= ?
            `,
            id,
            startDate
          )
        )
      )
    ).flat();

    // upsert healthy
    let index = 0;
    const counts = rows.length;
    for (let it of rows) {
      await appDB.transaction(async () => {
        // 删除原有数据
        // language=PostgreSQL
        await appDB.execute(
          `
            delete
            from view_Healthy
            where IncrementNo = ?
          `,
          it.IncrementNo
        );

        // 新增数据
        const cols = Object.keys(it);
        const sql = `insert into view_Healthy(${cols.join()}) values(${cols
          .map(() => '?')
          .join()})`;
        await appDB.execute(
          sql,
          ...cols.map(key => {
            return it[key];
          })
        );
        console.log(`healthy ${++index} - ${counts}`);
      });
    }
  }

  /**
   * 同步糖尿病登记和随访表
   *
   * @param hospital 医院id
   */
  async diabetes(hospital) {
    // 查询organization
    const organizationIds = await this.getOrganizations(hospital);

    // 登记表
    const cards = (
      await Promise.all(
        organizationIds.map(id =>
          // language=TSQL
          etlDB.execute(
            `
              select d.*
              from dbo.view_Diabetes d
                     inner join dbo.view_PersonInfo p on d.PersonNum = p.PersonNum
              where p.AdminOrganization = ?
                and p.WriteOff = 0
            `,
            id
          )
        )
      )
    ).flat();

    // 随访表
    // language=TSQL
    const visits = (
      await Promise.all(
        cards.map(async it =>
          etlDB.execute(
            `
              select v.*
              from dbo.view_DiabetesVisit v
                     inner join dbo.view_Diabetes d on v.SugarDiseaseCardID = d.SugarDiseaseCardID
              where d.SugarDiseaseCardID = ?
                and v.FollowUpDate >= ?
            `,
            it.SugarDiseaseCardID,
            startDate
          )
        )
      )
    ).flat();

    // upsert visits
    let index = 0;
    let counts = visits.length;
    for (let it of visits) {
      await appDB.transaction(async () => {
        // 删除原有数据
        // language=PostgreSQL
        await appDB.execute(
          `
            delete
            from view_DiabetesVisit
            where DiabetesFollowUpID = ?
          `,
          it.DiabetesFollowUpID
        );
        // 新增数据
        const cols = Object.keys(it);
        const sql = `insert into view_DiabetesVisit(${cols.join()}) values(${cols
          .map(() => '?')
          .join()})`;
        await appDB.execute(
          sql,
          ...cols.map(key => {
            return it[key];
          })
        );
        console.log(`DiabetesVisit ${++index} - ${counts}`);
      });
    }

    // upsert cards
    index = 0;
    counts = cards.length;
    for (let it of cards) {
      await appDB.transaction(async () => {
        // 删除原有数据
        // language=PostgreSQL
        await appDB.execute(
          `
            delete
            from view_Diabetes
            where SugarDiseaseCardID = ?
          `,
          it.SugarDiseaseCardID
        );
        // 新增数据
        const cols = Object.keys(it);
        const sql = `insert into view_Diabetes(${cols.join()}) values(${cols
          .map(() => '?')
          .join()})`;
        await appDB.execute(
          sql,
          ...cols.map(key => {
            return it[key];
          })
        );
        console.log(`Diabetes ${++index} - ${counts}`);
      });
    }
  }

  /**
   * 同步高血压登记和随访表
   *
   * @param hospital 医院id
   */
  async hypertension(hospital) {
    // 查询organization
    const organizationIds = await this.getOrganizations(hospital);

    // 高血压登记表
    const cards = (
      await Promise.all(
        organizationIds.map(id =>
          // language=TSQL
          etlDB.execute(
            `
              select h.*
              from dbo.view_Hypertension h
                     inner join dbo.view_PersonInfo p on h.PersonNum = p.PersonNum
              where p.AdminOrganization = ?
                and p.WriteOff = 0
            `,
            id
          )
        )
      )
    ).flat();

    // 高血压随访表
    // language=TSQL
    const visits = (
      await Promise.all(
        cards.map(async it =>
          etlDB.execute(
            `
              select v.*
              from dbo.view_HypertensionVisit v
                     inner join dbo.view_Hypertension d on v.HypertensionCardID = d.HypertensionCardID
              where d.HypertensionCardID = ?
                and v.FollowUpDate >= ?
            `,
            it.HypertensionCardID,
            startDate
          )
        )
      )
    ).flat();

    // upsert visits
    let index = 0;
    let counts = visits.length;
    for (let it of visits) {
      await appDB.transaction(async () => {
        // 删除原有数据
        // language=PostgreSQL
        await appDB.execute(
          `
            delete
            from view_HypertensionVisit
            where HighbloodID = ?
          `,
          it.HighbloodID
        );
        // 新增数据
        const cols = Object.keys(it);
        const sql = `insert into view_HypertensionVisit(${cols.join()}) values(${cols
          .map(() => '?')
          .join()})`;
        await appDB.execute(
          sql,
          ...cols.map(key => {
            return it[key];
          })
        );
        console.log(`HypertensionVisit ${++index} - ${counts}`);
      });
    }

    // upsert cards
    index = 0;
    counts = cards.length;
    for (let it of cards) {
      await appDB.transaction(async () => {
        // 删除原有数据
        // language=PostgreSQL
        await appDB.execute(
          `
            delete
            from view_Hypertension
            where HypertensionCardID = ?
          `,
          it.HypertensionCardID
        );
        // 新增数据
        const cols = Object.keys(it);
        const sql = `insert into view_Hypertension(${cols.join()}) values(${cols
          .map(() => '?')
          .join()})`;
        await appDB.execute(
          sql,
          ...cols.map(key => {
            return it[key];
          })
        );
        console.log(`Hypertension ${++index} - ${counts}`);
      });
    }
  }

  /**
   * 同步个人表
   *
   * @param hospital 医院id
   */
  async personInfo(hospital) {
    // 查询organization
    const organizationIds = await this.getOrganizations(hospital);

    // 个人信息表
    // language=TSQL
    const persons = (
      await Promise.all(
        organizationIds.map(id =>
          etlDB.execute(
            `
              select *
              from dbo.view_PersonInfo
              where AdminOrganization = ?
            `,
            id
          )
        )
      )
    ).flat();

    // upsert person
    let index = 0;
    for (let it of persons) {
      await appDB.transaction(async () => {
        // 删除原有数据
        // language=PostgreSQL
        await appDB.execute(
          `
            delete
            from view_personinfo
            where personnum = ?
          `,
          it.PersonNum
        );

        // 新增数据
        const cols = Object.keys(it);
        const sql = `insert into view_personinfo(${cols.join()}) values(${cols
          .map(() => '?')
          .join()})`;
        await appDB.execute(
          sql,
          ...cols.map(key => {
            if (key === 'WriteOff') return !!it[key];
            else return it[key];
          })
        );
        console.log(`person ${++index} - ${persons.length}`);
      });
    }
  }

  async getOrganizations(hospital) {
    return (
      await appDB.execute(
        `select hishospid from hospital_mapping where h_id = ? `,
        hospital
      )
    ).map(it => it.hishospid);
  }
}
