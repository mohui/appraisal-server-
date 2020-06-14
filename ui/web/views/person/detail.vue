<template>
  <div style="height: 100%;">
    <el-card
      v-loading="$asyncComputed.serverData.updating"
      style="margin-bottom: 10px"
    >
      <div slot="header" class="clearfix">
        <span>个人档案</span>
        <el-button
          size="mini"
          type="primary"
          plain
          style="float: right"
          @click="handleBack"
          >返回</el-button
        >
      </div>
      <el-form v-if="$asyncComputed.serverData.success" size="mini">
        <el-form-item label="姓名: ">
          {{ serverData.document.name }}
        </el-form-item>
        <el-form-item label="性别: ">
          {{ serverData.document.sex === '1' ? '男' : '女' }}
        </el-form-item>
        <el-form-item label="身份证: ">
          {{ serverData.document.idcardno }}
        </el-form-item>

        <el-form-item label="出生日期: ">
          {{ serverData.document.birth.$format('YYYY-MM-DD') }}
        </el-form-item>
        <el-form-item label="联系方式: ">
          {{ serverData.document.phone }}
        </el-form-item>
      </el-form>
    </el-card>
    <el-card v-if="hypertensions.length > 0">
      <div slot="header" class="clearfix">
        <span>高血压登记</span>
      </div>
      <el-table :data="hypertensions" stripe border size="small">
        <el-table-column
          prop="systolicpressure"
          label="血压左（收缩压）"
        ></el-table-column>
        <el-table-column
          prop="assertpressure"
          label="血压右（舒张压）"
        ></el-table-column>
        <el-table-column prop="dutydoctor" label="建卡医生"></el-table-column>
        <el-table-column
          prop="responsibility"
          label="责任医生"
        ></el-table-column>
        <el-table-column prop="datecards" label="建卡日期"></el-table-column>
        <el-table-column prop="operatetime" label="录入时间"></el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script>
export default {
  name: 'detail',
  data() {
    return {
      id: null
    };
  },
  created() {
    const id = this.$route.query.id;
    if (!id) this.$router.push('/person');
    this.id = id;
  },
  computed: {
    hypertensions() {
      return this.serverData.hypertension.map(it => {
        it.datecards = it.datecards.$format();
        it.operatetime = it.operatetime.$format();
        return it;
      });
    }
  },
  asyncComputed: {
    serverData: {
      async get() {
        return await this.$api.Person.detail(this.id);
      },
      default() {
        return {
          // 个人信息
          document: {},
          // 高血压登记
          hypertension: []
        };
      }
    }
  },
  methods: {
    handleBack() {
      this.$router.go(-1);
    }
  }
};
</script>

<style scoped></style>
