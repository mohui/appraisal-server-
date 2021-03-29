<template>
  <div style="height: 100%;">
    <el-card
      class="box-card"
      style="height: 100%;"
      shadow="never"
      :body-style="{
        height: 'calc(100% - 110px)',
        display: 'flex',
        'flex-direction': 'column'
      }"
    >
      <div slot="header" class="clearfix">
        <span>产后访视记录表</span>
        <el-button
          style="float: right;margin: -4px 0 0 20px;"
          size="small"
          type="primary"
          @click="$router.go(-1)"
          >返回
        </el-button>
      </div>
      <div style="flex-grow: 1;height: 0; overflow-y: auto;">
        <el-row type="flex" class="record-head" justify="space-between">
          <el-col :span="6">
            姓名：<strong>{{ detailDate.maternalname }}</strong>
          </el-col>
          <el-col :span="6">编号：{{ detailDate.visitcode }}</el-col>
        </el-row>
        <table class="record-postpartum-visit">
          <tbody>
            <tr>
              <td colspan="4">随访日期</td>
              <td colspan="20">
                {{ detailDate.visitdate }}
              </td>
            </tr>
            <tr>
              <td colspan="4">分娩日期</td>
              <td colspan="20">
                暂无数据
              </td>
            </tr>
            <tr>
              <td colspan="4">出院日期</td>
              <td colspan="20">
                暂无数据
              </td>
            </tr>
            <tr>
              <td colspan="4">体温</td>
              <td colspan="20">
                {{ detailDate.temperaturedegrees.toFixed(2) }}
              </td>
            </tr>
            <tr>
              <td colspan="4">一般健康情况</td>
              <td colspan="20">
                暂无数据
              </td>
            </tr>
            <tr>
              <td colspan="4">一般心理状况</td>
              <td colspan="20">
                暂无数据
              </td>
            </tr>
            <tr>
              <td colspan="4">血 压(mmHg)</td>
              <td colspan="20">
                {{ detailDate.diastolicpressure }}
              </td>
            </tr>
            <tr>
              <td colspan="4">乳 房</td>
              <td colspan="20">
                {{ detailDate.breast }}
              </td>
            </tr>
            <tr>
              <td colspan="4">恶 露</td>
              <td colspan="20">
                {{ detailDate.lochiatype }}
              </td>
            </tr>
            <tr>
              <td colspan="4">子 宫</td>
              <td colspan="20">
                暂无数据
              </td>
            </tr>
            <tr>
              <td colspan="4">伤 口</td>
              <td colspan="20">
                {{ detailDate.perineaincision }}
              </td>
            </tr>
            <tr>
              <td colspan="4">其 他</td>
              <td colspan="20">
                暂无数据
              </td>
            </tr>
            <tr>
              <td colspan="4">分 类</td>
              <td colspan="20">
                暂无数据
              </td>
            </tr>
            <tr>
              <td colspan="4">指 导</td>
              <td colspan="20">
                暂无数据
              </td>
            </tr>
            <tr>
              <td colspan="4">转 诊</td>
              <td colspan="20">
                暂无数据
              </td>
            </tr>
            <tr>
              <td colspan="4">下次随访日期</td>
              <td colspan="20">
                暂无数据
              </td>
            </tr>
            <tr>
              <td colspan="4">随访医生签名</td>
              <td colspan="20">
                {{ detailDate.doctor }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </el-card>
  </div>
</template>

<script>
export default {
  name: 'record-postpartum-visit',
  data() {
    return {
      code: null
    };
  },
  created() {
    this.code = this.$route.query.id;
  },
  computed: {
    detailDate() {
      const date = this.detailServerDate;
      date.visitdate = date.visitdate?.$format('YYYY-MM-DD');
      return date;
    }
  },
  asyncComputed: {
    detailServerDate: {
      // 产后访视记录表详情
      async get() {
        return await this.$api.Person.maternalVisits(this.code);
      },
      default() {
        return [];
      }
    }
  }
};
</script>

<style scoped lang="scss">
.record-head {
  width: 100%;
  max-width: 1200px;
  margin-bottom: 10px;
}
.record-postpartum-visit {
  width: 100%;
  max-width: 1200px;
  background-color: #fff;
  border-collapse: collapse;
  border-right: 1px solid #ccc;
  border-bottom: 1px solid #ccc;
  line-height: 2;
  tr {
    td {
      padding: 3px 10px;
      border-top: 1px solid #ccc;
      border-left: 1px solid #ccc;
      em {
        color: #409eff;
      }
      sub {
        vertical-align: bottom;
      }
      &[rowspan] + td {
        text-align: center;
      }
    }
    :first-child {
      text-align: center;
      line-height: normal;
    }
    :last-child {
      text-align: left;
    }
  }
}
.explain {
  width: 100%;
  max-width: 1200px;
  font-size: 12px;
  .title {
    font-weight: bold;
    font-size: 16px;
  }
}
</style>
