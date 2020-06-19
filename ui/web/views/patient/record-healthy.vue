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
        <span>健康体检表</span>
        <el-button
          style="float: right;margin: -4px 0 0 20px;"
          size="small"
          type="primary"
          @click="$router.go(-1)"
          >返回
        </el-button>
      </div>
      <div style="flex-grow: 1;height: 0; overflow-y: auto;">
        <table class="record-table">
          <tbody>
            <tr>
              <td colspan="2">体检日期</td>
              <td>年 月 日</td>
              <td>责任医生</td>
              <td></td>
            </tr>
            <tr>
              <td>内 容</td>
              <td colspan="4">
                检 查 项 目
              </td>
            </tr>
            <tr>
              <td>症状</td>
              <td colspan="4">
                1 无症状 2 头痛 3 头晕 4 心悸 5 胸闷 6 胸痛 7 慢性咳嗽 8 咳痰 9
                呼吸困难 10 多饮 11 多尿 12 体重下降 13 乏力 14 关节肿痛 15
                视力模糊 16 手脚麻木 17 尿急 18 尿痛 19 便秘 20 腹泻 21 恶心呕吐
                22 眼花 23 耳鸣 24 乳房胀痛 25 其他 □/□/□/□/□/□/□/□/□/□
              </td>
            </tr>
            <tr>
              <td rowspan="9">一般状况</td>
              <td>体 温</td>
              <td>℃</td>
              <td>脉 率</td>
              <td>次/分钟</td>
            </tr>
            <tr>
              <td rowspan="2">呼吸频率</td>
              <td rowspan="2">次/分钟</td>
              <td rowspan="2">血 压</td>
              <td>左 侧/ mmHg</td>
            </tr>
            <tr>
              <td>右 侧/ mmHg</td>
            </tr>
            <tr>
              <td>身 高</td>
              <td>
                cm
              </td>
              <td>
                体 重
              </td>
              <td>
                kg
              </td>
            </tr>
            <tr>
              <td>腰 围</td>
              <td>
                cm
              </td>
              <td>
                体质指数（BMI）
              </td>
              <td>
                Kg/m2
              </td>
            </tr>
            <tr>
              <td>老年人健康状态 自我评估*</td>
              <td colspan="3">
                1 满意 2 基本满意 3 说不清楚 4 不太满意 5 不满意
              </td>
            </tr>
            <tr>
              <td>老年人生活自理 能力自我评估*</td>
              <td colspan="3">
                1 可自理（0～3 分） 2 轻度依赖（4～8 分） 3 中度依赖（9～18 分)
                4 不能自理（≥19 分）
              </td>
            </tr>
            <tr>
              <td>老年人 认知功能*</td>
              <td colspan="3">
                1 粗筛阴性 2 粗筛阳性， 简易智力状态检查，总分
              </td>
            </tr>
            <tr>
              <td>老年人 情感状态*</td>
              <td colspan="3">
                1 粗筛阴性 2 粗筛阳性， 老年人抑郁评分检查，总分
              </td>
            </tr>
            <tr>
              <td rowspan="13">生活方式</td>
              <td rowspan="3">
                体育锻炼
              </td>
              <td>
                锻炼频率
              </td>
              <td colspan="2">
                1 每天 2 每周一次以上 3 偶尔 4 不锻炼
              </td>
            </tr>
            <tr>
              <td>每次锻炼时间</td>
              <td>分钟</td>
              <td>坚持锻炼时间 年</td>
            </tr>
            <tr>
              <td>锻炼方式</td>
              <td colspan="2">/</td>
            </tr>
            <tr>
              <td>饮食习惯</td>
              <td colspan="3">
                1 荤素均衡 2 荤食为主 3 素食为主 4 嗜盐 5 嗜油 6 嗜糖
              </td>
            </tr>
            <tr>
              <td rowspan="3">吸烟情况</td>
              <td>
                吸烟状况
              </td>
              <td colspan="2">
                1 从不吸烟 2 已戒烟 3 吸烟
              </td>
            </tr>
            <tr>
              <td>日吸烟量</td>
              <td colspan="2">
                平均 支
              </td>
            </tr>
            <tr>
              <td>开始吸烟年龄</td>
              <td>
                岁
              </td>
              <td>
                戒烟年龄 岁
              </td>
            </tr>
            <tr>
              <td rowspan="5">饮酒情况</td>
              <td>饮酒频率</td>
              <td colspan="2">
                1 从不 2 偶尔 3 经常 4 每天
              </td>
            </tr>
            <tr>
              <td>日饮酒量</td>
              <td colspan="2">
                平均 两
              </td>
            </tr>
            <tr>
              <td>是否戒酒</td>
              <td colspan="2">1 未戒酒 2 已戒酒，戒酒年龄： 岁</td>
            </tr>
            <tr>
              <td>开始饮酒年龄</td>
              <td>岁</td>
              <td>近一年内是否曾醉酒 1 是 2 否</td>
            </tr>
            <tr>
              <td>饮酒种类</td>
              <td colspan="2">1 白酒 2 啤酒 3 红酒 4 黄酒 ５其他</td>
            </tr>
            <tr>
              <td>职业病危害因素 接触史</td>
              <td colspan="3">
                1 无 2 有（工种 从业时间 年） <br />毒物种类 粉尘 防护措施 1 无
                2 有 <br />放射物质 防护措施 1 无 2 有 <br />物理因素 防护措施 1
                无 2 有 <br />化学物质 防护措施 1 无 2 有 <br />其他 防护措施 1
                无 2 有 □□□□□□
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </el-card>
  </div>
</template>

<script>
//script
</script>

<style lang="scss">
.record-table {
  width: 100%;
  margin: 0 auto;
  background-color: #fff;
  border-collapse: collapse;
  border-right: 1px solid #ccc;
  border-bottom: 1px solid #ccc;
  line-height: 2;
  tr {
    td {
      padding: 0 10px;
      border-top: 1px solid #ccc;
      border-left: 1px solid #ccc;
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
