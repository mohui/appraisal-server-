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
        <table class="record-he-table">
          <tbody>
            <tr>
              <td colspan="2">体检日期</td>
              <td colspan="2">年 月 日</td>
              <td>责任医生</td>
              <td colspan="2"></td>
            </tr>
            <tr>
              <td>内 容</td>
              <td colspan="6">
                检 查 项 目
              </td>
            </tr>
            <tr>
              <td>症状</td>
              <td colspan="6">
                1 无症状 2 头痛 3 头晕 4 心悸 5 胸闷 6 胸痛 7 慢性咳嗽 8 咳痰 9
                呼吸困难 10 多饮 11 多尿 12 体重下降 13 乏力 14 关节肿痛 15
                视力模糊 16 手脚麻木 17 尿急 18 尿痛 19 便秘 20 腹泻 21 恶心呕吐
                22 眼花 23 耳鸣 24 乳房胀痛 25 其他 □/□/□/□/□/□/□/□/□/□
              </td>
            </tr>
            <tr>
              <td rowspan="9">一般状况</td>
              <td colspan="2">体 温</td>
              <td>℃</td>
              <td>脉 率</td>
              <td colspan="2">次/分钟</td>
            </tr>
            <tr>
              <td rowspan="2" colspan="2">呼吸频率</td>
              <td rowspan="2">次/分钟</td>
              <td rowspan="2">血 压</td>
              <td>左 侧</td>
              <td>/ mmHg</td>
            </tr>
            <tr>
              <td>右 侧</td>
              <td>/ mmHg</td>
            </tr>
            <tr>
              <td colspan="2">身 高</td>
              <td>
                cm
              </td>
              <td>
                体 重
              </td>
              <td colspan="2">
                kg
              </td>
            </tr>
            <tr>
              <td colspan="2">腰 围</td>
              <td>
                cm
              </td>
              <td>
                体质指数（BMI）
              </td>
              <td colspan="2">
                Kg/m2
              </td>
            </tr>
            <tr>
              <td colspan="2">老年人健康状态 自我评估*</td>
              <td colspan="4">
                1 满意 2 基本满意 3 说不清楚 4 不太满意 5 不满意
              </td>
            </tr>
            <tr>
              <td colspan="2">老年人生活自理 能力自我评估*</td>
              <td colspan="4">
                1 可自理（0～3 分） 2 轻度依赖（4～8 分） 3 中度依赖（9～18 分)
                4 不能自理（≥19 分）
              </td>
            </tr>
            <tr>
              <td colspan="2">老年人 认知功能*</td>
              <td colspan="4">
                1 粗筛阴性 2 粗筛阳性， 简易智力状态检查，总分
              </td>
            </tr>
            <tr>
              <td colspan="2">老年人 情感状态*</td>
              <td colspan="4">
                1 粗筛阴性 2 粗筛阳性， 老年人抑郁评分检查，总分
              </td>
            </tr>
            <tr>
              <td rowspan="13">生活方式</td>
              <td rowspan="3" colspan="2">
                体育锻炼
              </td>
              <td>
                锻炼频率
              </td>
              <td colspan="3">
                1 每天 2 每周一次以上 3 偶尔 4 不锻炼
              </td>
            </tr>
            <tr>
              <td>每次锻炼时间</td>
              <td>分钟</td>
              <td>坚持锻炼时间</td>
              <td>年</td>
            </tr>
            <tr>
              <td>锻炼方式</td>
              <td colspan="3">/</td>
            </tr>
            <tr>
              <td colspan="2">饮食习惯</td>
              <td colspan="4">
                1 荤素均衡 2 荤食为主 3 素食为主 4 嗜盐 5 嗜油 6 嗜糖
              </td>
            </tr>
            <tr>
              <td rowspan="3" colspan="2">吸烟情况</td>
              <td>
                吸烟状况
              </td>
              <td colspan="3">
                1 从不吸烟 2 已戒烟 3 吸烟
              </td>
            </tr>
            <tr>
              <td>日吸烟量</td>
              <td colspan="3">
                平均 支
              </td>
            </tr>
            <tr>
              <td>开始吸烟年龄</td>
              <td>
                岁
              </td>
              <td>
                戒烟年龄
              </td>
              <td>
                岁
              </td>
            </tr>
            <tr>
              <td rowspan="5" colspan="2">饮酒情况</td>
              <td>饮酒频率</td>
              <td colspan="3">
                1 从不 2 偶尔 3 经常 4 每天
              </td>
            </tr>
            <tr>
              <td>日饮酒量</td>
              <td colspan="3">
                平均 两
              </td>
            </tr>
            <tr>
              <td>是否戒酒</td>
              <td colspan="2">1 未戒酒 2 已戒酒</td>
              <td>戒酒年龄： 岁</td>
            </tr>
            <tr>
              <td>开始饮酒年龄</td>
              <td>岁</td>
              <td>近一年内是否曾醉酒</td>
              <td>1 是 2 否</td>
            </tr>
            <tr>
              <td>饮酒种类</td>
              <td colspan="3">1 白酒 2 啤酒 3 红酒 4 黄酒 ５其他</td>
            </tr>
            <tr>
              <td colspan="2">职业病危害因素 接触史</td>
              <td colspan="4">
                1 无 2 有（工种 从业时间 年） <br />毒物种类 粉尘 防护措施 1 无
                2 有 <br />放射物质 防护措施 1 无 2 有 <br />物理因素 防护措施 1
                无 2 有 <br />化学物质 防护措施 1 无 2 有 <br />其他 防护措施 1
                无 2 有 □□□□□□
              </td>
            </tr>
            <tr>
              <td rowspan="4">脏器功能</td>
              <td colspan="2">口 腔</td>
              <td colspan="4">
                口唇 1 红润 2 苍白 3 发绀 4 皲裂 5 疱疹 齿列 1 正常 2 缺齿 3
                龋齿 4 义齿(假牙) 咽部 1 无充血 2 充血 3 淋巴滤泡增生 □ □/□/□□
              </td>
            </tr>
            <tr>
              <td colspan="2">视 力</td>
              <td colspan="4">
                左眼 右眼 （矫正视力：左眼 右眼 ）
              </td>
            </tr>
            <tr>
              <td colspan="2">听 力</td>
              <td colspan="4">
                1 听见 2 听不清或无法听见 □
              </td>
            </tr>
            <tr>
              <td colspan="2">运动功能</td>
              <td colspan="4">
                1 可顺利完成 2 无法独立完成任何一个动作 □
              </td>
            </tr>
            <tr>
              <td rowspan="19">查体</td>
              <td colspan="2">眼 底*</td>
              <td colspan="4">1 正常 2 异常 □</td>
            </tr>
            <tr>
              <td colspan="2">皮 肤</td>
              <td colspan="4">
                1 正常 2 潮红 3 苍白 4发绀 5 黄染 6 色素沉着 7 其他 □
              </td>
            </tr>
            <tr>
              <td colspan="2">巩 膜</td>
              <td colspan="4">1 正常 2 黄染 3 充血 4 其他 □</td>
            </tr>
            <tr>
              <td colspan="2">淋巴结</td>
              <td colspan="4">1 未触及 2 锁骨上 3 腋窝 4 其他 □</td>
            </tr>
            <tr>
              <td rowspan="3" colspan="2">肺</td>
              <td colspan="4">桶状胸：1 否 2 是 □</td>
            </tr>
            <tr>
              <td colspan="4">呼吸音：1 正常 2 异常 □</td>
            </tr>
            <tr>
              <td colspan="4">罗 音：1 无 2 干罗音 3 湿罗音 4 其他 □</td>
            </tr>
            <tr>
              <td colspan="2">心 脏</td>
              <td colspan="4">
                心率： 次/分钟 心律：1 齐 2 不齐 3 绝对不齐 杂音：1 无 2 有 □□
              </td>
            </tr>
            <tr>
              <td colspan="2">腹 部</td>
              <td colspan="4">
                压痛：1 无 2 有 包块：1 无 2 有 肝大：1 无 2 有 脾大：1 无 2 有
                移动性浊音：1 无 2 有 □□□□□
              </td>
            </tr>
            <tr>
              <td colspan="2">下肢水肿</td>
              <td colspan="4">1 无 2 单侧 3 双侧不对称 4 双侧对称</td>
            </tr>
            <tr>
              <td colspan="2">足背动脉搏动*</td>
              <td colspan="4">
                1 未触及 2 触及双侧对称 3 触及左侧弱或消失 4 触及右侧弱或消失 □
              </td>
            </tr>
            <tr>
              <td colspan="2">肛门指诊*</td>
              <td colspan="4">
                1 未及异常 2 触痛 3 包块 4 前列腺异常 5 其他 □
              </td>
            </tr>
            <tr>
              <td colspan="2">乳 腺*</td>
              <td colspan="4">
                1 未见异常 2 乳房切除 3 异常泌乳 4 乳腺包块 5 其他 □/□/□/□
              </td>
            </tr>
            <tr>
              <td rowspan="5">妇科*</td>
              <td>外阴</td>
              <td colspan="4">1 未见异常 2 异常 □</td>
            </tr>
            <tr>
              <td>阴道</td>
              <td colspan="4">1 未见异常 2 异常 □</td>
            </tr>
            <tr>
              <td>宫颈</td>
              <td colspan="4">1 未见异常 2 异常 □</td>
            </tr>
            <tr>
              <td>宫体</td>
              <td colspan="4">1 未见异常 2 异常 □</td>
            </tr>
            <tr>
              <td>附件</td>
              <td colspan="4">1 未见异常 2 异常 □</td>
            </tr>
            <tr>
              <td colspan="2">其 他*</td>
              <td colspan="4"></td>
            </tr>
            <tr>
              <td rowspan="16">辅助检查</td>
              <td colspan="2">血常规*</td>
              <td colspan="4">
                血红蛋白__________g/L 白细胞_______×109 /L 血小板______×109 /L
                其他____________________________________
              </td>
            </tr>
            <tr>
              <td colspan="2">尿常规*</td>
              <td colspan="4">
                尿蛋白_________尿糖_________尿酮体__________尿潜血___________
                其他______
              </td>
            </tr>
            <tr>
              <td colspan="2">空腹血糖*</td>
              <td colspan="4">
                _________________mmol/L 或 ___________________mg/dL
              </td>
            </tr>
            <tr>
              <td colspan="2">心电图*</td>
              <td colspan="4">
                1 正常 2 异常 □
              </td>
            </tr>
            <tr>
              <td colspan="2">尿微量白蛋白*</td>
              <td colspan="4">
                ___________mg/dL
              </td>
            </tr>
            <tr>
              <td colspan="2">大便潜血*</td>
              <td colspan="4">
                1 阴性 2 阳性 □
              </td>
            </tr>
            <tr>
              <td colspan="2">糖化血红蛋白*</td>
              <td colspan="4">
                %
              </td>
            </tr>
            <tr>
              <td colspan="2">乙型肝炎 表面抗原*</td>
              <td colspan="4">
                1 阴性 2 阳性 □
              </td>
            </tr>
            <tr>
              <td colspan="2">肝功能*</td>
              <td colspan="4">
                血清谷丙转氨酶 U/L 血清谷草转氨酶 U/L 白蛋白 g/L 总胆红素 μmol/L
                结合胆红素 μmol/L
              </td>
            </tr>
            <tr>
              <td colspan="2">肾功能*</td>
              <td colspan="4">
                血清肌酐 μmol/L 血尿素 mmol/L 血钾浓度 mmol/L 血钠浓度 mmol/L
              </td>
            </tr>
            <tr>
              <td colspan="2">血 脂*</td>
              <td colspan="4">
                总胆固醇 mmol/L 甘油三酯 mmol/L 血清低密度脂蛋白胆固醇 mmol/L
                血清高密度脂蛋白胆固醇 mmol/L
              </td>
            </tr>
            <tr>
              <td colspan="2">胸部 X 线片*</td>
              <td colspan="4">
                1 正常 2 异常 □
              </td>
            </tr>
            <tr>
              <td colspan="2" rowspan="2">B 超*</td>
              <td colspan="4">
                腹部 B 超 1 正常 2 异常 □
              </td>
            </tr>
            <tr>
              <td colspan="4">
                其他 1 正常 2 异常 □
              </td>
            </tr>
            <tr>
              <td colspan="2">宫颈涂片*</td>
              <td colspan="4">
                1 正常 2 异常 □
              </td>
            </tr>
            <tr>
              <td colspan="2">其 他*</td>
              <td colspan="4"></td>
            </tr>
            <tr>
              <td rowspan="11">现存主要 健康问题</td>
              <td colspan="2" rowspan="2">脑血管疾病</td>
              <td colspan="4">
                1 未发现 2 缺血性卒中 3 脑出血 4 蛛网膜下腔出血 5
                短暂性脑缺血发作
              </td>
            </tr>
            <tr>
              <td colspan="4">6 其他 □/□/□/□/□</td>
            </tr>
            <tr>
              <td colspan="2" rowspan="2">肾脏疾病</td>
              <td colspan="4">
                1 未发现 2 糖尿病肾病 3 肾功能衰竭 4 急性肾炎 5 慢性肾炎
              </td>
            </tr>
            <tr>
              <td colspan="4">6 其他 □/□/□/□/□</td>
            </tr>
            <tr>
              <td colspan="2" rowspan="2">心脏疾病</td>
              <td colspan="4">
                1 未发现 2 心肌梗死 3 心绞痛 4 冠状动脉血运重建 5 充血性心力衰竭
              </td>
            </tr>
            <tr>
              <td colspan="4">6 心前区疼痛 7 其他 □/□/□/□/□/□</td>
            </tr>
            <tr>
              <td colspan="2">血管疾病</td>
              <td colspan="4">
                1 未发现 2 夹层动脉瘤 3 动脉闭塞性疾病 4 其他 □/□/□
              </td>
            </tr>
            <tr>
              <td colspan="2" rowspan="2">眼部疾病</td>
              <td colspan="4">
                1 未发现 2 视网膜出血或渗出 3 视乳头水肿 4 白内障
              </td>
            </tr>
            <tr>
              <td colspan="4">5 其他 □/□/□/□</td>
            </tr>
            <tr>
              <td colspan="2">神经系统疾病</td>
              <td colspan="4">
                1 未发现 2 有 □
              </td>
            </tr>
            <tr>
              <td colspan="2">其他系统疾病</td>
              <td colspan="4">
                1 未发现 2 有 □
              </td>
            </tr>
            <tr>
              <td rowspan="6">住院治疗情况</td>
              <td rowspan="3" colspan="2">
                住院史
              </td>
              <td>入/出院日期</td>
              <td>原 因</td>
              <td>医疗机构名称</td>
              <td>病案号</td>
            </tr>
            <tr>
              <td>/</td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
            <tr>
              <td>/</td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
            <tr>
              <td rowspan="3" colspan="2">
                家 庭 病床史
              </td>
              <td>建/撤床日期</td>
              <td>原 因</td>
              <td>医疗机构名称</td>
              <td>病案号</td>
            </tr>
            <tr>
              <td>/</td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
            <tr>
              <td>/</td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
            <tr>
              <td rowspan="7">主要用药 情况</td>
              <td colspan="2">药物名称</td>
              <td>用 法</td>
              <td>用 量</td>
              <td>用药时间</td>
              <td>服药依从性 <br />1 规律 2 间断 3 不服药</td>
            </tr>
            <tr>
              <td colspan="2">1</td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
            <tr>
              <td colspan="2">2</td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
            <tr>
              <td colspan="2">3</td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
            <tr>
              <td colspan="2">4</td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
            <tr>
              <td colspan="2">5</td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
            <tr>
              <td colspan="2">6</td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
            <tr>
              <td rowspan="4">非免疫 规划预防 接种史</td>
              <td colspan="2">名 称</td>
              <td>接种日期</td>
              <td colspan="3">接种机构</td>
            </tr>
            <tr>
              <td colspan="2">1</td>
              <td></td>
              <td colspan="3"></td>
            </tr>
            <tr>
              <td colspan="2">2</td>
              <td></td>
              <td colspan="3"></td>
            </tr>
            <tr>
              <td colspan="2">3</td>
              <td></td>
              <td colspan="3"></td>
            </tr>
            <tr>
              <td>
                健康 评价
              </td>
              <td colspan="6">
                1 体检无异常 □ <br />2 有异常 <br />异常 1 <br />异常 2
                <br />异常 3 <br />异常 4
              </td>
            </tr>
            <tr>
              <td>健康指导</td>
              <td colspan="3">
                1 纳入慢性病患者健康管理 <br />2 建议复查 <br />3 建议转诊
              </td>
              <td colspan="3">
                危险因素控制： □/□/□/□/□/□/□ <br />1 戒烟 <br />2 健康饮酒
                <br />3 饮食 <br />4 锻炼 <br />5 减体重（目标 Kg） <br />6
                建议接种疫苗 <br />7 其他
              </td>
            </tr>
          </tbody>
        </table>
        <div class="explain">
          <p class="title">填表说明：</p>
          <p>
            1．本表用于老年人、高血压、2
            型糖尿病和严重精神障碍患者等的年度健康检查。一
            般居民的健康检查可参考使用，肺结核患者、孕产妇和 0-6
            岁儿童无须填写该表。
          </p>
          <p>
            2．表中带有*号的项目，在为一般居民建立健康档案时不作为免费检查项目，不同重点
            人群的免费检查项目按照各专项服务规范的具体说明和要求执行。对于不同的人群，完整的
            健康体检表指按照相应服务规范要求做完相关检查并记录的表格。
          </p>
          <p>
            3．一般状况 体质指数（BMI）=体重（kg）/身高的平方（m2）。
            老年人生活自理能力评估：65
            岁及以上老年人需填写此项，详见老年人健康管理服务 规范附件。
            老年人认知功能粗筛方法：告诉被检查者“我将要说三件物品的名称（如铅笔、卡车、
            书），请您立刻重复”。过 1
            分钟后请其再次重复。如被检查者无法立即重复或 1 分钟后无法
            完整回忆三件物品名称为粗筛阳性，需进一步行“简易智力状态检查量表”检查。
            老年人情感状态粗筛方法：询问被检查者“你经常感到伤心或抑郁吗”或“你的情绪怎
            么样”。如回答“是”或“我想不是十分好”，为粗筛阳性，需进一步行“老年抑郁量表”检
            查。
          </p>
          <p>
            4．生活方式
            体育锻炼：指主动锻炼，即有意识地为强体健身而进行的活动。不包括因工作或其他需
            要而必需进行的活动，如为上班骑自行车、做强体力工作等。锻炼方式填写最常采用的具体
            锻炼方式。
            吸烟情况：“从不吸烟者”不必填写“日吸烟量”、“开始吸烟年龄”、“戒烟年龄”等，
            已戒烟者填写戒烟前相关情况。
            饮酒情况：“从不饮酒者”不必填写其他有关饮酒情况项目，已戒酒者填写戒酒前相关
            情况，“日饮酒量”折合成白酒量。（啤酒/10=白酒量，红酒/4=白酒量，黄酒/5=白酒量）。
            职业暴露情况：指因患者职业原因造成的化学品、毒物或射线接触情况。如有，需填写
            具体化学品、毒物、射线名或填不详。
            职业病危险因素接触史：指因患者职业原因造成的粉尘、放射物质、物理因素、化学物
            质的接触情况。如有，需填写具体粉尘、放射物质、物理因素、化学物质的名称或填不详。
          </p>
          <p>
            5．脏器功能
            视力：填写采用对数视力表测量后的具体数值（五分记录），对佩戴眼镜者，可戴其平
            时所用眼镜测量矫正视力。
            听力：在被检查者耳旁轻声耳语“你叫什么名字”（注意检查时检查者的脸应在被检查
            者视线之外），判断被检查者听力状况。
            运动功能：请被检查者完成以下动作：“两手摸后脑勺”、“捡起这支笔”、“从椅子上站
            起，走几步，转身，坐下。”判断被检查者运动功能。
          </p>
          <p>
            6．查体
            如有异常请在横线上具体说明，如可触及的淋巴结部位、个数；心脏杂音描述；肝脾肋
            下触诊大小等。建议有条件的地区开展眼底检查，特别是针对高血压或糖尿病患者。
            眼底：如果有异常，具体描述异常结果。
            足背动脉搏动：糖尿病患者必须进行此项检查。
            乳腺：检查外观有无异常，有无异常泌乳及包块。 13 妇科：外阴
            记录发育情况及婚产式（未婚、已婚未产或经产式），如有异常情况请具
            体描述。 阴道
            记录是否通畅，黏膜情况，分泌物量、色、性状以及有无异味等。 宫颈
            记录大小、质地、有无糜烂、撕裂、息肉、腺囊肿；有无接触性出血、举
            痛等。 宫体 记录位臵、大小、质地、活动度；有无压痛等。 附件
            记录有无块物、增厚或压痛；若扪及肿块，记录其位臵、大小、质地；表
            面光滑与否、活动度、有无压痛以及与子宫及盆壁关系。左右两侧分别记
            录。
          </p>
          <p>
            7．辅助检查
            该项目根据各地实际情况及不同人群情况，有选择地开展。老年人，高血压、2
            型糖尿 病和严重精神障碍患者的免费辅助检查项目按照各项规范要求执行。
            尿常规中的“尿蛋白、尿糖、尿酮体、尿潜血”可以填写定性检查结果，阴性填“－”，
            阳性根据检查结果填写“＋”、“＋＋”、“＋＋＋”或“＋＋＋＋”，也可以填写定量检查结
            果，定量结果需写明计量单位。 大便潜血、肝功能、肾功能、胸部 X
            线片、B 超检查结果若有异常，请具体描述异常结 果。其中 B
            超写明检查的部位。65 岁及以上老年人腹部 B 超为免费检查项目。
            其他：表中列出的检查项目以外的辅助检查结果填写在“其他”一栏。
          </p>
          <p>
            8.现存主要健康问题：指曾经出现或一直存在，并影响目前身体健康状况的疾病。可以
            多选。若有高血压、糖尿病等现患疾病或者新增的疾病需同时填写在个人基本信息表既往史
            一栏。
          </p>
          <p>
            9.住院治疗情况：指最近 1
            年内的住院治疗情况。应逐项填写。日期填写年月，年份应 写 4
            位。如因慢性病急性发作或加重而住院/家庭病床，请特别说明。医疗机构名称应写全
            称。
          </p>
          <p>
            10.主要用药情况：对长期服药的慢性病患者了解其最近 1
            年内的主要用药情况，西药
            填写化学名及商品名，中药填写药品名称或中药汤剂，用法、用量按医生医嘱填写，用法指
            给药途径，如：口服、皮下注射等。用量指用药频次和剂量，如：每日三次，每次
            5mg 等。
            用药时间指在此时间段内一共服用此药的时间，单位为年、月或天。服药依从性是指对此药
            的依从情况，“规律”为按医嘱服药，“间断”为未按医嘱服药，频次或数量不足，“不服药”
            即为医生开了处方，但患者未使用此药。
          </p>
          <p>
            11.非免疫规划预防接种史：填写最近 1
            年内接种的疫苗的名称、接种日期和接种机构。
          </p>
          <p>
            12．健康评价：无异常是指无新发疾病原有疾病控制良好无加重或进展，否则为有异常，
            填写具体异常情况，包括高血压、糖尿病、生活能力，情感筛查等身体和心理的异常情况。
          </p>
          <p>
            13．健康指导：纳入慢性病患者健康管理是指高血压、糖尿病、严重精神障碍患者等重
            点人群定期随访和健康体检。减体重的目标是指根据居民或患者的具体情况，制定下次体检
            之前需要减重的目标值。
          </p>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script>
//script
</script>

<style lang="scss">
.record-he-table {
  width: 100%;
  max-width: 1200px;
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
