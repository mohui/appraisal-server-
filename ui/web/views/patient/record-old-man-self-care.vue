<template>
  <div style="height: 100%;">
    <el-card
      class="box-card"
      style="height: 100%;"
      shadow="never"
      :body-style="{
        height: $settings.isMobile ? 'calc(100% - 60px)' : 'calc(100% - 110px)',
        display: 'flex',
        'flex-direction': 'column',
        padding: $settings.isMobile ? '0' : '20px'
      }"
    >
      <div slot="header" class="clearfix">
        <span>老年人生活自理能力评估表</span>
        <el-button
          style="float: right;margin: -4px 0 0 20px;"
          size="small"
          type="primary"
          @click="$router.go(-1)"
          >返回
        </el-button>
      </div>
      <div
        v-loading="isLoading"
        v-show="!isError"
        style="flex-grow: 1;height: 0; overflow-y: auto;"
      >
        <div class="record-head">
          <div style="float: right;">评估时间：{{ person.checkDate }}</div>
          姓名：<strong>{{ person.name }}</strong>
        </div>
        <table class="record-table">
          <colgroup>
            <col width="20%" />
            <col />
            <col />
            <col />
            <col />
            <col />
          </colgroup>
          <tbody>
            <tr>
              <th rowspan="2">评估事项、内容与评分</th>
              <th colspan="5">
                程度等级
              </th>
            </tr>
            <tr>
              <th>可自理</th>
              <th>
                轻度依赖
              </th>
              <th>
                中度依赖
              </th>
              <th>
                不能自理
              </th>
              <th>
                判断评分
              </th>
            </tr>
            <tr>
              <td>进餐：使用餐具将饭菜送入口、咀嚼、吞咽等活动</td>
              <td :class="{em: person.mealNormal}">
                独立完成
              </td>
              <td>
                —
              </td>
              <td :class="{em: person.mealModerate}">
                需要协助，如切碎、搅拌食物等
              </td>
              <td :class="{em: person.mealDisable}">
                完全需要帮助
              </td>
              <td rowspan="2">
                <em>
                  {{ person.mealScore }}
                </em>
              </td>
            </tr>
            <tr>
              <td>评分</td>
              <td>
                0
              </td>
              <td>
                0
              </td>
              <td>
                3
              </td>
              <td>
                5
              </td>
            </tr>
            <tr>
              <td>梳洗：梳头、洗脸、刷牙、剃须、洗澡等活动</td>
              <td :class="{em: person.washNormal}">
                独立完成
              </td>
              <td :class="{em: person.washMild}">
                能独立地洗头、梳头、洗脸、刷牙、剃须等；洗澡需要协助
              </td>
              <td :class="{em: person.washModerate}">
                在协助下和适当的时间内，能完成部分梳洗活动
              </td>
              <td :class="{em: person.washDisable}">
                完全需要帮助
              </td>
              <td rowspan="2">
                <em>
                  {{ person.washScore }}
                </em>
              </td>
            </tr>
            <tr>
              <td>评分</td>
              <td>
                0
              </td>
              <td>
                1
              </td>
              <td>
                3
              </td>
              <td>
                7
              </td>
            </tr>
            <tr>
              <td>穿衣：穿衣裤、袜子、鞋子等活动</td>
              <td :class="{em: person.dressNormal}">
                独立完成
              </td>
              <td>
                —
              </td>
              <td :class="{em: person.dressModerate}">
                需要协助，在适当的时间内完成部分穿衣
              </td>
              <td :class="{em: person.dressDisable}">
                完全需要帮助
              </td>
              <td rowspan="2">
                <em>
                  {{ person.dressScore }}
                </em>
              </td>
            </tr>
            <tr>
              <td>评分</td>
              <td>
                0
              </td>
              <td>
                0
              </td>
              <td>
                3
              </td>
              <td>
                5
              </td>
            </tr>
            <tr>
              <td>如厕：小便、大便等活动及自控</td>
              <td :class="{em: person.toiletNormal}">
                不需协助，可自控
              </td>
              <td :class="{em: person.toiletMild}">
                偶尔失禁，但基本上能如厕或使用便具
              </td>
              <td :class="{em: person.toiletModerate}">
                经常失禁，在很多提示和协助下尚能如厕或使用便具
              </td>
              <td :class="{em: person.toiletDisable}">
                完全失禁，完全需要帮助
              </td>
              <td rowspan="2">
                <em>
                  {{ person.toiletScore }}
                </em>
              </td>
            </tr>
            <tr>
              <td>评分</td>
              <td>
                0
              </td>
              <td>
                1
              </td>
              <td>
                5
              </td>
              <td>
                10
              </td>
            </tr>
            <tr>
              <td>活动：站立、室内行 走、上下楼梯、户外活动</td>
              <td :class="{em: person.activityNormal}">
                独立完成所有活动
              </td>
              <td :class="{em: person.activityMild}">
                借助较小的外力或辅助装臵能完成 站立、行走、上下楼梯等
              </td>
              <td :class="{em: person.activityModerate}">
                借助较大的外力才能完成站立、行走，不能上下楼梯
              </td>
              <td :class="{em: person.activityDisable}">
                卧床不起，活动完全需要帮助
              </td>
              <td rowspan="2">
                <em>
                  {{ person.activityScore }}
                </em>
              </td>
            </tr>
            <tr>
              <td>评分</td>
              <td>
                0
              </td>
              <td>
                1
              </td>
              <td>
                5
              </td>
              <td>
                10
              </td>
            </tr>
            <tr>
              <td colspan="5">总得分</td>
              <td>
                <em>
                  {{ person.total }}
                </em>
              </td>
            </tr>
          </tbody>
        </table>
        <div class="explain">
          <p class="title">填表说明：</p>
          <p>
            该表为自评表，根据下表中 5
            个方面进行评估，将各方面判断评分汇总后，0～3 分者 为可自理；4～8
            分者为轻度依赖；9～18 分者为中度依赖； ≥19 分者为不能自理。
          </p>
        </div>
      </div>
      <div v-show="isError">
        数据请求出错，请及时联系管理员。
      </div>
    </el-card>
  </div>
</template>

<script>
export default {
  name: 'record-diabetes',
  data() {
    return {
      id: null,
      isLoading: false,
      isError: false,
      person: {
        id: '',
        healthyID: '',
        checkDate: '',
        name: '',
        mealNormal: false,
        mealModerate: false,
        mealDisable: false,
        mealScore: 0,
        washNormal: false,
        washMild: false,
        washModerate: false,
        washDisable: false,
        washScore: 0,
        dressNormal: false,
        dressModerate: false,
        dressDisable: false,
        dressScore: 0,
        toiletNormal: false,
        toiletMild: false,
        toiletModerate: false,
        toiletDisable: false,
        toiletScore: 0,
        activityNormal: false,
        activityMild: false,
        activityModerate: false,
        activityDisable: false,
        activityScore: 0,
        total: 0
      }
    };
  },
  created() {
    const id = this.$route.query.id;
    if (!id) this.$router.go(-1);
    this.id = id;
    this.getOldManSelfCareDetail(id);
  },
  methods: {
    async getOldManSelfCareDetail(id) {
      this.isLoading = true;
      try {
        let result = await this.$api.Person.oldManSelfCareDetail(id);
        if (result.length > 0) {
          this.person = Object.assign({}, result[0], {
            checkDate: result[0].checkDate.$format('YYYY-MM-DD')
          });
        }
      } catch (e) {
        this.$message.error(e.message);
        this.isError = true;
      } finally {
        this.isLoading = false;
      }
    }
  }
};
</script>

<style lang="scss" scoped>
@import './detail.scss';
</style>
