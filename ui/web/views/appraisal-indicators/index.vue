<template>
  <div>
    <div class="m30" style="font-size:14px">
      <el-card shadow="never">
        <div class="clearfix header-title" style="float:left; font-size: 18px;">
          {{ subtitle }}两卡制管理
        </div>
        <div class="kpiSum-select">
          <span>维度：</span>
          <el-button-group style="margin: auto 10px auto 0; float:left;">
            <el-button
              style="float:left;"
              @click="latTypeChanged('quality')"
              :class="{'el-button--primary': params.listFlag === 'quality'}"
              type="default"
              >质量系数
            </el-button>
            <el-button
              @click="latTypeChanged('score')"
              :class="{'el-button--primary': params.listFlag === 'score'}"
              type="default"
              >工分值
            </el-button>
          </el-button-group>
          <el-button
            plain
            style="float:right; margin: 0 30px;"
            :class="{'show-back': showBack}"
            type="primary"
            @click="goBack"
            v-if="!params.showRank"
            >返回
          </el-button>
        </div>
      </el-card>
    </div>
    <el-row>
      <el-col :span="8" class="animated fadeInLeft" style="padding-right:0">
        <el-card shadow="hover">
          <div class="score-detail" v-if="params.listFlag === 'score'">
            <p style="font-size:22px; margin:0; text-align:left;">
              工分值
              <el-button
                plain
                style="float: right"
                size="small"
                type="primary"
                @click="dialogSearch"
                >查询工分
              </el-button>
            </p>

            <p style="color: #6C7177; font-size:16px; margin:10px 0;">校正后</p>
            <h3 style="font-size: 30px; margin:0; display:inline-block">
              {{ correctScore }}
            </h3>
            <span>分</span>
            <p style="margin:10px 0;">{{ pointDate }}</p>
            <p style="font-size:13px;">{{ subtitle }}</p>
            <table
              style="width: 100%;margin-top: 20px;color: #666;"
              v-if="!params.showRank && params.listFlag === 'score'"
            >
              <tr>
                <td style="width: 33%;text-align: center">
                  <p>{{ Math.round(pointData.workPoint) }}分</p>
                  <p>校正前</p>
                </td>
                <td
                  style="width: 33%;text-align: center;vertical-align: middle;"
                >
                  X
                </td>
                <td style="text-align: center">
                  <p>{{ Math.round(pointData.coefficient * 100) }}%</p>
                  <p>质量系数</p>
                </td>
              </tr>
            </table>

            <div style="padding-top: 40px;" v-else>
              <p>校正前 {{ Math.round(pointData.workPoint) }}分</p>
            </div>
          </div>
          <div class="grid-content bg-fff score-detail" v-else>
            <two-card-circle
              :coefficient="coefficient"
              :pointDate="pointDate"
              :subtitle="subtitle"
              :text="text"
            ></two-card-circle>
            <span
              style="bottom: 20px;position: absolute;left: 50%;margin-left: -90px;"
            >
              (计算时校正系数：{{
                Math.round(coefficient * 100) > boundary
                  ? 100
                  : Math.round(coefficient * 100)
              }}%)
            </span>
          </div>
        </el-card>
      </el-col>
      <el-col
        :span="16"
        class="animated fadeInRight"
        v-if="params.listFlag === 'quality'"
      >
        <el-card shadow="hover">
          <two-card-echart
            :xAxisData="xAxisData"
            :yAxisData="yAxisData"
            :lineText="lineText"
            :listFlag="params.listFlag"
          ></two-card-echart>
        </el-card>
      </el-col>
      <div v-else>
        <el-col :span="10" class="animated fadeInDown">
          <el-card shadow="hover">
            <div class="score-detail">
              <two-card-bar
                :barxAxisData="barxAxisData"
                :baryAxisData="baryAxisData"
              ></two-card-bar>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6" class="animated fadeInRight" style="padding-left:0;">
          <el-card shadow="hover">
            <div class="score-detail">
              <p style="font-size:22px; margin:0; text-align:left;">
                人脸采集信息
              </p>
              <p
                style="font-size:16px; margin:30px 0; text-align:left; color:#333"
              >
                人脸采集数：{{ this.faceNum }}
              </p>
              <p
                style="font-size:16px; margin:30px 0; text-align:left; color:#333"
              >
                人脸采集率：{{ this.faceRate }}
              </p>
            </div>
          </el-card>
        </el-col>
      </div>
    </el-row>
    <el-row
      v-if="
        (params.showRank && params.listFlag === 'score') ||
          (params.showRank && params.listFlag === 'quality')
      "
    >
      <el-col :span="24" class="animated fadeInUp">
        <div
          style="overflow: hidden"
          v-if="params.showRank"
          :style="{height: totalShowMore ? 'auto' : totalShowHeight + 'px'}"
        >
          <el-card shadow="hover">
            <div class="grid-content bg-fff" ref="totalContent">
              <h3 class="ins-ranking-title">
                机构排行（含一级机构及下属二级机构）
              </h3>
              <div v-for="(item, index) of listOne" :key="item.code">
                <Accordion
                  v-if="params.listFlag === 'quality'"
                  :Accordionindex="0"
                  :AccordionData="`${index + 1}、${item.parentName}`"
                >
                  <div
                    slot="Sizes"
                    style="float: right; width: 80px; text-align: right;"
                  >
                    {{ item.sizes }}家
                  </div>
                  <div slot="Progress" style="padding: 10px 20px 0;">
                    <el-progress
                      :text-inside="true"
                      :stroke-width="18"
                      :percentage="Math.round(item.coeff / item.sizes)"
                    >
                      {{ Math.round(item.coeff / item.sizes) }}%
                    </el-progress>
                  </div>
                  <div slot="First" style="padding: 0 20px">
                    <ul>
                      <li
                        class="pointer"
                        v-for="(i, index) of item.child"
                        :key="index"
                        @click="showHospital(i.code)"
                      >
                        {{ i.name }} {{ Math.round(i.coeff) }}%
                      </li>
                    </ul>
                  </div>
                </Accordion>
                <Accordion
                  v-else
                  :Accordionindex="0"
                  :AccordionData="`${index + 1}、${item.parentName}`"
                >
                  <div slot="Sizes">{{ item.sizes }}家</div>
                  <div slot="Progress">
                    <progress-test
                      :label="item.score"
                      :height="18"
                      :percentage="
                        item.score != 0
                          ? Math.round((item.score / maxScore) * 100)
                          : 0
                      "
                      style="padding:0 20px;"
                    >
                    </progress-test>
                  </div>
                  <div slot="First" style="padding: 0 20px">
                    <ul>
                      <li
                        class="pointer"
                        v-for="(i, index) of item.child"
                        :key="index"
                        @click="showHospital(i.code)"
                      >
                        {{ i.name }} {{ Math.round(i.score) }}分
                      </li>
                    </ul>
                  </div>
                </Accordion>
              </div>
            </div>
          </el-card>
        </div>
        <div v-show="totalLongContent" :class="{'show-more': totalShowMore}">
          <div class="showmore" @click="totalToggleShowMore">
            {{ totalShowMore ? '收起' : '显示更多' }}
          </div>
        </div>
      </el-col>
    </el-row>
    <el-row>
      <el-col :span="12">
        <div
          style="overflow: hidden"
          v-if="params.showRank"
          :style="{height: oneShowMore ? 'auto' : oneShowHeight + 'px'}"
        >
          <el-card shadow="hover">
            <div class="grid-content bg-fff" ref="oneContent">
              <h3 class="ins-ranking-title">一级机构排行</h3>
              <div v-for="(item, index) of listTwo" :key="item.code">
                <div
                  v-if="params.listFlag === 'quality'"
                  class="pointer"
                  @click="showHospital(item.code)"
                >
                  <p>
                    {{ index + 1 }}、{{ item.name }}
                    <span style="float:right"
                      >{{ Math.round(item.coeff) }}% 考核办法</span
                    >
                  </p>
                  <el-progress
                    :text-inside="true"
                    :stroke-width="18"
                    :percentage="Math.round(item.coeff)"
                    >{{ Math.round(item.coeff) }}%
                  </el-progress>
                </div>

                <div v-else class="pointer" @click="showHospital(item.code)">
                  <p>{{ index + 1 }}、{{ item.name }}</p>
                  <progress-test
                    :label="item.score"
                    :height="18"
                    :percentage="
                      item.score != 0
                        ? Math.round((item.score / maxScore) * 100)
                        : 0
                    "
                    style="padding:0 20px;"
                  >
                  </progress-test>
                </div>
              </div>
            </div>
          </el-card>
        </div>
        <div v-show="oneisLongContent" :class="{'show-more': oneShowMore}">
          <div class="showmore" @click="oneToggleShowMore">
            {{ oneShowMore ? '收起' : '显示更多' }}
          </div>
        </div>
      </el-col>
      <el-col :span="12">
        <div
          style="overflow: hidden"
          v-if="params.showRank"
          :style="{height: showMore ? 'auto' : showHeight + 'px'}"
        >
          <el-card shadow="hover">
            <div class="grid-content bg-fff rank-list" ref="content">
              <h3 class="ins-ranking-title">二级机构排行</h3>
              <div v-for="(item, index) of listThree" :key="item.code">
                <div
                  v-if="params.listFlag === 'quality'"
                  class="pointer"
                  @click="showHospital(item.code)"
                >
                  <p>
                    {{ index + 1 }}、{{ item.name }}
                    <span style="float:right"
                      >{{ Math.round(item.coeff) }}% 考核办法</span
                    >
                  </p>
                  <el-progress
                    :text-inside="true"
                    :stroke-width="18"
                    :percentage="Math.round(item.coeff)"
                    >{{ Math.round(item.coeff) }}%
                  </el-progress>
                </div>
                <div v-else class="pointer" @click="showHospital(item.code)">
                  <p>{{ index + 1 }}、{{ item.name }}</p>
                  <progress-test
                    :label="item.score"
                    :height="18"
                    :percentage="
                      item.score != 0
                        ? Math.round((item.score / maxScore) * 100)
                        : 0
                    "
                    style="padding:0 20px;"
                  >
                  </progress-test>
                </div>
              </div>
            </div>
          </el-card>
        </div>
        <div v-show="isLongContent" :class="{'show-more': showMore}">
          <div class="showmore" @click="toggleShowMore">
            {{ showMore ? '收起' : '显示更多' }}
          </div>
        </div>
      </el-col>
    </el-row>
    <el-row v-if="!params.showRank && params.listFlag === 'quality'">
      <el-col :span="24" v-loading="loading">
        <div>
          <div style="width: 100%; height:40px;">
            <h5 style="float:left">
              {{ systemName }}
              <span style="color: #666;font-size: 14px;">{{
                hospitalScore
              }}</span>
            </h5>
            <el-button
              plain
              style="margin-left: 30px;"
              type="primary"
              size="small"
              @click="dialogDownVisible = true"
              >考核结果下载
            </el-button>
            <div style="float: right" v-if="userLevel === '3'">
              系统自动打分：
              <el-switch
                style="padding-right: 20px;"
                @change="setCheckLock"
                v-model="isLock"
                active-color="#13ce66"
                inactive-color="#ff4949"
                active-text="开启"
                inactive-text="关闭"
                active-value="N"
                inactive-value="Y"
              >
              </el-switch>
              <el-button
                plain
                type="primary"
                size="small"
                @click="oneKeyScore"
                :disabled="lockLoding"
                >全部开启打分</el-button
              >
            </div>
          </div>
          <div
            class="check-table"
            v-for="(item, index) in tableData"
            :key="index"
          >
            <div class="check-table-title">
              <span>{{ item.name }}</span>
            </div>
            <el-table
              :data="item.children"
              show-summary
              :summary-method="getTotal"
              style="width: 100%"
            >
              <el-table-column
                type="index"
                align="center"
                label="序号"
              ></el-table-column>
              <el-table-column prop="name" align="center" label="考核内容">
              </el-table-column>
              <el-table-column
                prop="ruleScore"
                align="center"
                width="50px"
                label="分值"
              >
              </el-table-column>
              <el-table-column
                prop="checkStandard"
                align="center"
                width="284px"
                label="考核标准"
              >
              </el-table-column>
              <el-table-column
                prop="checkMethod"
                align="center"
                label="考核方法"
              >
              </el-table-column>
              <el-table-column
                prop="evaluateStandard"
                align="center"
                label="评分标准"
              >
              </el-table-column>
              <el-table-column prop="isLock" align="center" label="系统打分">
                <template slot-scope="scope">
                  <el-switch
                    v-if="userLevel === '3'"
                    v-model="scope.row.isLock"
                    active-text="开启"
                    inactive-text="关闭"
                    active-value="N"
                    inactive-value="Y"
                    @change="changeStatus(scope.row)"
                  >
                  </el-switch>
                </template>
              </el-table-column>
              <el-table-column
                prop="checkScore"
                align="center"
                width="200px"
                label="打分"
              >
                <template slot-scope="scope">
                  <span v-if="scope.row.show">
                    <el-input-number
                      size="mini"
                      :min="0"
                      :step="1"
                      :precision="2"
                      style="width:84%"
                      :max="scope.row.ruleScore"
                      v-model="scope.row.checkScore"
                    >
                    </el-input-number>
                  </span>
                  <span v-else>{{ scope.row.checkScore }}</span>
                  <i
                    v-if="
                      scope.row.standardName &&
                        scope.row.standardName.length &&
                        userLevel === '3'
                    "
                    style="padding-left:5px; color:#ff9800"
                    class="el-icon-warning"
                    @click="dialogTableShow(scope.row)"
                  ></i>
                  <i
                    v-if="scope.row.attachments && scope.row.attachments.length"
                    style="padding-left:5px; color:#ff9800"
                    class="el-icon-document"
                    @click="dialogFileShow(scope.row)"
                  ></i>
                </template>
              </el-table-column>

              <el-table-column align="center" label="操作" width="184px">
                <template slot-scope="scope">
                  <el-button
                    plain
                    v-if="userLevel === '5' && scope.row.upButton"
                    type="primary"
                    size="small"
                    @click="upLoadMaterial(scope.row)"
                    >上传考核资料
                  </el-button>
                  <el-button
                    plain
                    type="success"
                    v-else-if="scope.row.show && userLevel === '3'"
                    size="small"
                    @click="saveData(scope.row)"
                    >保存
                  </el-button>
                  <el-button
                    plain
                    v-else-if="userLevel === '3'"
                    type="primary"
                    size="small"
                    @click="scoreData(scope.row)"
                    >打分
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </div>
      </el-col>
    </el-row>
    <el-row v-if="!params.showRank && params.listFlag === 'score'">
      <el-col :span="12">
        <el-card shadow="hover">
          <p style="color:#1096d0; font-size:20px; font-weight:500;">
            医生工分
          </p>
          <el-table
            :data="doctorList"
            :header-cell-style="{background: '#e4e2df', color: '#333'}"
          >
            <el-table-column type="expand" prop="children">
              <template slot-scope="scope">
                <el-table
                  :data="scope.row.children"
                  :show-header="false"
                  :row-class-name="tableRowClassName"
                >
                  <el-table-column type="index" align="center">
                  </el-table-column>
                  <el-table-column prop="name" align="center"></el-table-column>
                  <el-table-column
                    prop="workScore"
                    align="center"
                  ></el-table-column>
                </el-table>
              </template>
            </el-table-column>
            <el-table-column label="序号" align="center">
              <template slot-scope="scope">
                <span>【{{ scope.$index + 1 }}】</span>
              </template>
            </el-table-column>
            <el-table-column label="医生" align="center">
              <template slot-scope="scope">
                <span>{{ scope.row.doctorName }}</span>
              </template>
            </el-table-column>
            <el-table-column align="center" label="工分值">
              <template slot-scope="scope">
                <span>{{ scope.row.workScore }}</span>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="hover">
          <p style="color:#1096d0; font-size:20px; font-weight:500;">
            工分项目
          </p>
          <el-table
            :data="ruleList"
            :header-cell-style="{background: '#e4e2df', color: '#333'}"
            ref="refTable"
          >
            <el-table-column type="expand" prop="children">
              <template slot-scope="scope">
                <el-table
                  :data="scope.row.children"
                  :show-header="false"
                  :row-class-name="tableRowClassName"
                >
                  <el-table-column type="index" align="center">
                  </el-table-column>
                  <el-table-column
                    prop="doctorName"
                    align="center"
                  ></el-table-column>
                  <el-table-column
                    prop="workScore"
                    align="center"
                  ></el-table-column>
                </el-table>
              </template>
            </el-table-column>
            <el-table-column label="序号" align="center">
              <template slot-scope="scope">
                <span>【{{ scope.$index + 1 }}】</span>
              </template>
            </el-table-column>
            <el-table-column label="工分目录" align="center">
              <template slot-scope="scope">
                <span>{{ scope.row.category }}</span>
              </template>
            </el-table-column>
            <el-table-column align="center" label="工分值">
              <template slot-scope="scope">
                <span>{{ scope.row.workScore }}</span>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>

    <el-dialog title="指标结果" :visible.sync="dialogTableVisible" width="30%">
      <div v-loading="dialogLoading">
        <p style="border-bottom: 1px solid #ccc;padding-bottom: 10px;">
          评分标准：{{ standardText }}
        </p>
        <div
          style="font-size: 14px;"
          v-for="(item, index) of dialogList"
          :key="index"
        >
          <ul style="padding:0;">
            <li
              style="list-style: none; border-bottom: 1px solid #ccc; padding-bottom:10px;"
            >
              指标：<strong>{{ item.standardName }}</strong>
              {{ item.content }}
              <el-tooltip
                class="item"
                effect="dark"
                content="基础数据暂时没有数据，需要去维护基础数据"
                placement="right-start"
              >
                <i
                  v-if="item.baseInfo === 0"
                  style="padding-left:5px; color:#ff9800"
                  class="el-icon-warning"
                ></i>
              </el-tooltip>

              &nbsp;&nbsp;&nbsp;&nbsp;<el-button
                plain
                size="small"
                v-if="item.returnList.length"
                :loading="downLoading"
                @click="excelExport(item.standardId)"
                type="primary"
                >明细下载
              </el-button>
            </li>
          </ul>
          <div
            class="table-responsive"
            style="max-height: 200px; overflow-y: scroll"
            v-if="item.returnList.length"
          >
            <table
              style="width:100%"
              class="table table-striped"
              align="center"
            >
              <tbody>
                <tr v-for="(it, index) of item.returnList" :key="index">
                  <td v-for="(i, index) of it" :key="index">
                    {{ i }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </el-dialog>
    <el-dialog title="考核资料" :visible.sync="dialogFileVisible" width="30%">
      <div>
        <p style="border-bottom: 1px solid #ccc;padding-bottom: 10px;">
          评分标准：{{ standardText }}
        </p>
        <div
          style="font-size: 14px; line-height: 2;"
          v-for="(item, index) of curRule.attachments"
          :key="index"
        >
          <a :href="item.attachment" target="_blank">{{
            item.name || item.attachment.split('/').pop()
          }}</a>
        </div>
      </div>
    </el-dialog>
    <el-dialog title="工分值查询" :visible.sync="dialogScore" width="30%">
      <div style="clear:both;"></div>
      <div v-loading="dialogScoreLoading">
        <div style="display: flex;margin: 20px 0">
          <span style="margin:auto 10px auto 0">日期选择: </span>
          <el-date-picker
            v-model="date"
            type="daterange"
            :picker-options="pickerOptions"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
          >
          </el-date-picker>
        </div>
        <div style="display: flex;margin: 20px 0">
          <span style="margin:auto 10px auto 0">地区选择: </span>
          <el-cascader
            placeholder="请选择医联体机构"
            :options="areaList"
            v-model="areaSyscode"
            :props="{checkStrictly: true}"
            collapse-tags
            filterable
          ></el-cascader>
        </div>
        <div style="display: flex;margin: 20px 0">
          <span style="margin:auto 10px auto 0">分类选择: </span>
          <el-select v-model="scoreType" clearable placeholder="请选择分类">
            <el-option
              v-for="item in scoreSort"
              :key="item.code"
              :label="item.name"
              :value="item.code"
            >
            </el-option>
          </el-select>
        </div>
        <el-button plain type="primary" @click="searchScore">查询 </el-button>
        <hr />
        <p
          class="dialog-area-text"
          v-if="dialogSearchArea || dialogSearchScore"
        >
          查询结果 <br />
          地区: {{ dialogSearchArea }}, 工分值： {{ dialogSearchScore }}分
        </p>
      </div>
    </el-dialog>
    <el-dialog
      title="上传考核资料"
      :visible.sync="dialogUploadFormVisible"
      :before-close="handleClose"
      width="30%"
    >
      <el-form :model="curRule">
        <el-form-item label="考核内容">
          {{ curRule.name }}
        </el-form-item>
        <el-form-item label="上传文件">
          <el-upload
            name="attachments"
            accept=".jpg,.jpeg,.gif,.png,.doc,.docx,.xls,.xlsx,.pdf,.zip,.rar"
            class="upload-demo"
            ref="uploadForm"
            :multiple="true"
            :action="upLoadUrl"
            :headers="headers"
            :data="uploadData"
            :on-change="handleBeforeUpload"
            :before-upload="handleBeforeUpload"
            :on-progress="handleProgress"
            :on-success="uploadSuccess"
            :on-error="uploadError"
            :file-list="fileList"
            :auto-upload="false"
          >
            <el-button plain slot="trigger" size="small" type="primary"
              >选取文件</el-button
            >
            <div slot="tip" class="el-upload__tip" style="font-size:12px;">
              可以上传图片，word文件，xls文件，pdf文件，压缩包文件，单个文件不能超过5M。
            </div>
          </el-upload>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button plain @click="dialogUploadFormVisible = false"
          >取 消</el-button
        >
        <el-button
          plain
          type="primary"
          @click="saveUploadFiles"
          :loading="uploadLoading"
          >确 定</el-button
        >
      </div>
    </el-dialog>
    <el-dialog
      title="考核结果下载"
      :visible.sync="dialogDownVisible"
      width="30%"
    >
      <el-date-picker
        v-model="downDate"
        align="right"
        type="date"
        placeholder="选择日期"
        :picker-options="pickerOptions"
      >
      </el-date-picker>
      <el-button
        plain
        style="margin-left: 30px;"
        type="primary"
        size="small"
        @click="scores"
        >下载</el-button
      >
    </el-dialog>
  </div>
</template>

<script>
import dayjs from 'dayjs';
import twoCardEchart from './components/twocardLine';
import twoCardCircle from './components/twocardCircle';
import twoCardBar from './components/twocardBar';
import Accordion from './components/twocardAccordion';
import progressTest from './components/progressScore';
import {getToken} from '../../utils/cache';

export default {
  name: 'appraisal-indicators',
  components: {
    twoCardEchart,
    twoCardCircle,
    twoCardBar,
    progressTest,
    Accordion
  },
  data() {
    return {
      boundary: 84,
      latType: '',
      //参数对象
      params: {
        listFlag: 'score',
        showRank: true,
        id: ''
      },
      rankData: [],
      pointDate: '',
      pointData: {},
      correctScore: '',
      text: '',
      hospitalList: [],
      maxScore: '',
      tableData: [],
      hospitalScore: '',
      systemName: '',
      isLock: 'Y',
      xAxisData: [],
      yAxisData: [],
      lineText: '',
      doctorList: [],
      ruleList: [],
      coefficient: 0,
      subtitle: '',
      listOne: [],
      listTwo: [],
      listThree: [],
      showMore: false,
      oneShowMore: false,
      oneShowHeight: 300,
      isLongContent: false,
      oneisLongContent: false,
      showHeight: 300,
      totalLongContent: false,
      totalShowMore: false,
      totalShowHeight: 300,
      dialogTableVisible: false,
      dialogFileVisible: false,
      standardText: '',
      dialogList: [],
      dialogLoading: false,
      barxAxisData: [],
      baryAxisData: [],
      faceNum: 0,
      faceRate: 0,
      lockLoding: false,
      loading: false,
      showBack: false,
      userLevel: localStorage.getItem('level'),
      dialogScore: false,
      dialogScoreLoading: false,
      dialogUploadFormVisible: false,
      curRule: {
        name: '',
        rule: '',
        code: '',
        attachments: []
      },
      fileList: [],
      upLoadUrl: '',
      headers: {token: getToken()},
      maxSize: 5,
      progress: 0,
      date: '',
      pickerOptions: {
        disabledDate: time => {
          let one = 3600 * 1000 * 24;
          return time.getTime() > Date.now() - one;
        }
      },
      areaList: [],
      areaSyscode: [],
      scoreSort: [],
      scoreType: '',
      dialogSearchArea: '',
      dialogSearchScore: '',
      downLoading: false,
      dialogDownVisible: false,
      downDate: dayjs().subtract(1, 'day'),
      scoreList: {}
    };
  },

  created() {
    this.params.listFlag = this.$route.query.listFlag || 'score';
    this.params.showRank = this.$route.query.showRank !== 'false';
    //显示排行列表
    if (this.params.showRank) {
      //机构排行（质量系数/工分）
      this.getHospitalList();
    }
    if (localStorage.getItem('level') !== '5') {
      //质量系数
      this.areaPoint(this.$route.query.id);
      if (this.params.listFlag === 'score') {
        //查看工分值柱状图
        this.twoCardScoreBar(
          this.$route.query.id
            ? this.$route.query.id
            : localStorage.getItem('sysCode')
        );
        //查看工分值人脸信息
        this.faceNumber(
          this.$route.query.id
            ? this.$route.query.id
            : localStorage.getItem('sysCode')
        );
        if (this.$route.query.id) {
          //医生工分--工分项目
          this.hospitalDoctorPoint(this.$route.query.id);
        }
      } else if (this.params.listFlag === 'quality') {
        this.twoCardQualityLine(
          this.$route.query.id
            ? this.$route.query.id
            : localStorage.getItem('sysCode')
        );
        if (this.$route.query.id) {
          this.hospitalQualityFactor(this.$route.query.id);
        }
      }
    }
    if (localStorage.getItem('level') === '5') {
      this.params.showRank = false;
      this.showBack = true;
      this.areaPoint(localStorage.getItem('sysCode'));
      //查看工分值柱状图
      if (this.params.listFlag === 'score') {
        this.twoCardScoreBar(localStorage.getItem('sysCode'));
        this.faceNumber(localStorage.getItem('sysCode'));
        this.hospitalDoctorPoint(localStorage.getItem('sysCode'));
      } else if (this.params.listFlag === 'quality') {
        this.twoCardQualityLine(localStorage.getItem('sysCode'));
        this.hospitalQualityFactor(localStorage.getItem('sysCode'));
      }
      this.$router.push({
        query: {
          showRank: false,
          listFlag: this.params.listFlag,
          id: localStorage.getItem('sysCode')
        }
      });
    }
  },

  watch: {
    $route(to, from) {
      if (to.path !== from.path) {
        this.params.listFlag = 'score';
        this.params.showRank = true;
      }

      if (localStorage.getItem('level') !== '5') {
        this.getHospitalList();
        this.areaPoint(this.$route.query.id); //质量系数
        this.twoCardQualityLine(this.$route.query.id);
        this.twoCardScoreBar(
          this.$route.query.id
            ? this.$route.query.id
            : localStorage.getItem('sysCode')
        );
        if (this.params.listFlag === 'score') {
          this.faceNumber(
            this.$route.query.id
              ? this.$route.query.id
              : localStorage.getItem('sysCode')
          );
        }
        if (this.$route.query.id && this.params.listFlag === 'score') {
          this.hospitalDoctorPoint(this.$route.query.id); //工分详情
        } else if (this.$route.query.id && this.params.listFlag === 'quality') {
          //机构详情
          this.hospitalQualityFactor(this.$route.query.id); //质量系数机构详情
        }
      }

      if (
        Object.keys(from.query).length !== 0 &&
        localStorage.getItem('level') === '5' &&
        this.params.listFlag === 'score' &&
        this.params.showRank === false
      ) {
        this.twoCardScoreBar(localStorage.getItem('sysCode'));
        this.faceNumber(localStorage.getItem('sysCode'));
        this.hospitalDoctorPoint(localStorage.getItem('sysCode'));
      } else if (
        Object.keys(from.query).length !== 0 &&
        localStorage.getItem('level') === '5' &&
        this.params.listFlag === 'quality' &&
        this.params.showRank === false
      ) {
        this.twoCardQualityLine(localStorage.getItem('sysCode'));
        this.hospitalQualityFactor(localStorage.getItem('sysCode'));
      }
    },
    listOne() {
      this.totalCalculateHeight();
    },
    listTwo() {
      this.oneCalculateHeight();
    },
    listThree() {
      this._calculateHeight();
    }
  },
  computed: {
    uploadLoading() {
      return this.progress > 0 && this.progress < 100;
    },
    uploadData() {
      return {
        rule: JSON.stringify(this.curRule.rule),
        code: JSON.stringify(this.curRule.code)
      };
    }
  },
  methods: {
    async scores() {
      try {
        return await this.$phApi.Export.scores(
          this.$route.query.id,
          dayjs(this.downDate).toDate()
        );
      } catch (e) {
        this.$message({
          type: 'error',
          message: e.message
        });
      } finally {
        this.dialogDownVisible = false;
      }
    },
    dialogFileShow(item) {
      this.dialogFileVisible = true;
      this.standardText = item.evaluateStandard; //评分标准
      this.curRule.attachments = item.attachments;
    },
    upLoadMaterial(row) {
      this.curRule = {
        name: row.name,
        rule: row.ruleId,
        code: row.hospitalCode
      };
      this.dialogUploadFormVisible = true;
    },
    async saveUploadFiles() {
      await this.$refs.uploadForm.submit();
      this.dialogUploadFormVisible = false;
    },
    uploadSuccess(res) {
      try {
        if (res.rule) {
          this.$message({
            type: 'success',
            message: '上传审核资料成功'
          });
          // 上传成功重新刷新细则列表
          this.hospitalQualityFactor(this.$route.query.id);
        }
      } catch (e) {
        this.$message({
          type: 'error',
          message: e.message
        });
      }
      this.fileList = [];
    },
    uploadError(err) {
      this.$message.error(err);
    },
    handleProgress(event) {
      this.progress = Number(event.percent.toFixed(2));
    },
    handleBeforeUpload(file) {
      const fType = [
        'jpg',
        'jpeg',
        'gif',
        'png',
        'doc',
        'docx',
        'xls',
        'xlsx',
        'pdf',
        'zip',
        'rar'
      ];
      const fName = file.name
        .split('.')
        .pop()
        .toLowerCase();
      const hasType = fType.some(it => it === fName);
      const isLt5M = file.size / 1024 / 1024 < this.maxSize;

      if (!hasType) {
        this.$message.error(
          "仅允许上传'jpg','jpeg','gif','png','doc','docx','xls','xlsx','pdf','zip','rar'格式文件！"
        );
        return false;
      }
      if (!isLt5M) {
        this.$message.error(`单个文件大小不能超过${this.maxSize}M!`);
        return false;
      }
      return true;
    },
    handleClose() {
      this.fileList = [];
      this.dialogUploadFormVisible = false;
    },
    _calculateHeight() {
      // $nextTick()，等待内容获取完毕再计算高度，异步处理
      if (
        (this.params.showRank && this.params.listFlag === 'score') ||
        (this.params.showRank && this.params.listFlag === 'quality')
      ) {
        this.$nextTick().then(() => {
          let contentHeight = this.$refs.content.clientHeight;
          if (contentHeight > this.showHeight) {
            this.isLongContent = true;
          } else {
            this.isLongContent = false;
          }
        });
      }
    },
    oneCalculateHeight() {
      if (
        (this.params.showRank && this.params.listFlag === 'score') ||
        (this.params.showRank && this.params.listFlag === 'quality')
      ) {
        this.$nextTick().then(() => {
          let contentHeight = this.$refs.oneContent.clientHeight;
          if (contentHeight > this.oneShowHeight) {
            this.oneisLongContent = true;
          } else {
            this.oneisLongContent = false;
          }
        });
      }
    },

    totalCalculateHeight() {
      this.$nextTick().then(() => {
        // let contentHeight = this.$refs.totalContent.clientHeight;
        this.totalLongContent = true;
      });
    },

    toggleShowMore() {
      this.showMore = !this.showMore;
    },

    oneToggleShowMore() {
      this.oneShowMore = !this.oneShowMore;
    },

    totalToggleShowMore() {
      this.totalShowMore = !this.totalShowMore;
    },

    async dialogSearch() {
      this.date = [];
      this.areaSyscode = [];
      this.dialogSearchArea = '';
      this.dialogSearchScore = '';
      this.dialogScore = true;
      this.dialogScoreLoading = true;
      this.scoreSort = await this.$phApi.physicianScore.cateList();
      this.areaList = await this.$phApi.Search.hospitalList();
      this.dialogScoreLoading = false;
    },

    async searchScore() {
      this.date =
        this.date && this.date.length > 0
          ? this.date.map(i => dayjs(i).format('YYYY-MM-DD'))
          : [];
      let startDate = this.date[0];
      let endDate = this.date[1];
      try {
        if (this.date && this.date.length < 1) {
          return this.$message({
            type: 'error',
            message: '请选择查询日期'
          });
        }
        if (this.areaSyscode && this.areaSyscode.length < 1) {
          return this.$message({
            type: 'error',
            message: '请选择查询地区'
          });
        }
        let result = await this.$phApi.physicianScore.list(
          startDate,
          endDate,
          this.areaSyscode[this.areaSyscode.length - 1],
          this.scoreType
        );
        this.dialogSearchArea = result.name;
        this.dialogSearchScore = result.score;
      } catch (e) {
        this.$message({
          type: 'error',
          message: e.message
        });
      }
    },

    goBack() {
      this.params.showRank = true;
      this.oneisLongContent = true;
      this.isLongContent = true;
      this.totalLongContent = true;
      this.areaPoint();
      this.twoCardQualityLine();
      this.twoCardScoreBar(localStorage.getItem('sysCode'));
      this.faceNumber(localStorage.getItem('sysCode'));
      this.getHospitalList();
      if (this.params.listFlag === 'score') {
        this.$router.push({
          name: 'twocard',
          query: {
            listFlag: 'score',
            showRank: true
          }
        });
      } else if (this.params.listFlag === 'quality') {
        this.$router.push({
          name: 'twocard',
          query: {
            listFlag: 'quality',
            showRank: true
          }
        });
      }
    },

    latTypeChanged(type) {
      this.latType = type;
      if (type !== this.params.listFlag) {
        this.params.listFlag = type;
        this.params.id = this.$route.query.id;
        this.$router.push({query: this.params});
      }
    },

    getTotal(param) {
      const {columns, data} = param;
      const sums = [];
      columns.forEach((column, index) => {
        if (index === 0) {
          sums[index] = '小计';
          return;
        }
        const values = data.map(item => Number(item[column.property]));
        if (column.property === 'checkScore') {
          sums[index] = values.reduce((prev, curr) => {
            const value = Number(curr);
            if (!isNaN(value)) {
              return prev + curr;
            } else {
              return prev;
            }
          }, 0);
          sums[index];
        } else {
          sums[index] = '';
        }
      });
      return sums.map(i => {
        if (typeof i === 'number') {
          return i.toFixed(2);
        } else if (i === '小计') {
          return '小计';
        } else {
          return '';
        }
      });
    },

    //考核细则开关
    async changeStatus(row) {
      try {
        await this.$phApi.System.lockScore(
          row.isLock,
          row.hospitalCode,
          row.checkId,
          row.ruleId
        );
        this.$message({
          type: 'success',
          message: '更改成功'
        });
      } catch (e) {
        this.$message({
          type: 'danger',
          message: e.message
        });
      }
    },
    //全部开启打分
    async oneKeyScore() {
      this.lockLoding = true;
      this.loading = true;
      try {
        let checkId = this.tableData[0].children[0].checkId;
        await this.$phApi.System.oneKeyLockScore(
          checkId,
          this.$route.query.id,
          'N'
        );
        await this.$phApi.System.oneKeyScore(this.$route.query.id);
        this.$message({
          type: 'success',
          message: '开启成功'
        });
      } catch (e) {
        this.$message({
          type: 'danger',
          message: e.message
        });
      }
      this.loading = false;
      this.lockLoding = false;
      await this.hospitalQualityFactor(this.$route.query.id);
    },

    //考核项开关
    async setCheckLock() {
      let isLock = this.tableData[0].isLock === 'N' ? 'Y' : 'N';
      let checkId = this.tableData[0].children[0].checkId;
      this.tableData[0].isLock = isLock;

      try {
        await this.$phApi.System.lockScore(
          isLock,
          this.$route.query.id,
          checkId,
          ''
        );
      } catch (e) {
        this.$message({
          type: 'danger',
          message: e.message
        });
      }
    },

    // 质量系数历史趋势
    async twoCardQualityLine(id) {
      let arr = await this.$phApi.SystemList.areaTrend(id);
      if (arr.length) {
        this.xAxisData = arr.map(it => {
          let date = new Date(it.date);
          return (
            date.getFullYear() +
            '-' +
            (date.getMonth() + 1) +
            '-' +
            date.getDate()
          );
        });
        this.lineText = '%';
        this.yAxisData = arr
          .map(it => it.coefficient)
          .map(it => Math.round(it * 100));
      } else {
        this.xAxisData = [];
        this.lineText = '%';
        this.yAxisData = [];
      }
    },

    //查看工分值柱状图
    async twoCardScoreBar(id) {
      let arr = await this.$phApi.SystemPoint.doctorPoint(id);
      if (arr.length) {
        this.barxAxisData = arr.map(it => it.doctorName);
        this.baryAxisData = arr.map(it => it.workScore);
      } else {
        this.barxAxisData = [];
        this.baryAxisData = [];
      }
    },

    //人脸采集数
    async faceNumber(id) {
      let result = await this.$phApi.SystemPoint.faceNumber(id);
      this.faceNum = result.faceNum;
      this.faceRate = `${result.rate * 100}%`;
    },

    //质量系数
    async areaPoint(id) {
      let ret = await this.$phApi.SystemList.areaPoint(id);
      if (ret) {
        let d = new Date(ret.date);
        let dat =
          d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
        this.pointData = ret;
        this.coefficient = ret.coefficient;
        this.pointDate = dat;
        this.correctScore = Math.round(ret.correctScore);
        this.text = ret.name;
        this.subtitle = ret.subtitle;
      }
    },

    //机构排行
    async getHospitalList() {
      let result = await this.$phApi.SystemList.hospitalList();
      if (result.length) {
        this.rankData = result.map(it => ({
          ...it,
          coeff: Number((it.coeff * 100).toFixed(0)),
          score: Number(it.correctScore.toFixed(0))
        }));
        this.listOne = this.rankData
          .filter(
            (it, index, arr) =>
              arr.findIndex(value => value.parentName === it.parentName) ===
              index
          )
          .map(it =>
            Object.assign({}, it, {
              coeff: this.rankData
                .filter(item => item.parent === it.parent)
                .reduce((a, b) => a + b.coeff, 0),
              score: this.rankData
                .filter(item => item.parent === it.parent)
                .reduce((a, b) => a + b.score, 0),
              sizes: this.rankData.filter(item => item.parent === it.parent)
                .length,
              hidden: true,
              child: this.rankData
                .filter(item => item.parent === it.parent)
                .sort((a, b) => b.score - a.score)
            })
          )
          .map(it =>
            Object.assign({}, it, {
              mean: (it.coeff / it.sizes).toFixed(0)
            })
          )
          .sort((a, b) =>
            this.params.listFlag === 'quality'
              ? b.coeff / b.sizes - a.coeff / a.sizes
              : b.score - a.score
          );
        this.maxScore = Math.max(...this.listOne.map(it => it.score));
        //一级机构排行
        this.listTwo = this.rankData
          .filter(it => it.code === it.parent)
          .sort((a, b) =>
            this.params.listFlag === 'quality'
              ? b.coeff - a.coeff
              : b.score - a.score
          );
        this.listThree = this.rankData
          .filter(it => it.code !== it.parent)
          .sort((a, b) =>
            this.params.listFlag === 'quality'
              ? b.coeff - a.coeff
              : b.score - a.score
          );
      }
    },

    //医生详情
    async hospitalDoctorPoint(id) {
      this.doctorList = await this.$phApi.SystemList.hospitalDoctorPoint(id);
      this.ruleList = await this.$phApi.SystemList.hospitalPointInfo(id);
    },

    //机构详情
    async hospitalQualityFactor(id) {
      let result = await this.$phApi.SystemList.hospitalQualityFactoor(id);
      if (result.length) {
        this.tableData = result.map(it => ({
          ...it,
          children: it.children.map(item => ({
            ...item,
            show: false,
            upButton: item.standardName.some(it => it.formulaId === 'attach')
          })),
          ruleTotal: it.children
            .map(item => item.ruleScore)
            .reduce((acc, val) => acc + val, 0),
          checkTotal: it.children
            .map(item => item.checkScore)
            .reduce((acc, val) => acc + val, 0)
        }));
        this.hospitalScore =
          this.tableData
            .map(it => it.checkTotal)
            .reduce((acc, val) => acc + val, 0)
            .toFixed(2) +
          '分/' +
          this.tableData
            .map(it => it.ruleTotal)
            .reduce((acc, val) => acc + val, 0) +
          '分';
        this.systemName = this.tableData[0].systemName;
        this.isLock = this.tableData[0].isLock;
      }
    },

    //跳转机构
    showHospital(id) {
      this.params.showRank = false;
      this.$route.query.id = id;
      this.isLongContent = false;
      this.oneisLongContent = false;
      this.totalLongContent = false;
      this.$router.push({
        query: {
          showRank: false,
          listFlag: this.params.listFlag,
          id: id
        }
      });
    },
    //打分
    scoreData(row) {
      this.$set(row, 'show', true);
    },

    //保存打分
    async saveData(row) {
      if (row.checkScore > row.ruleScore) {
        this.$message({
          type: 'error',
          message: '打分不能超过最大分值！'
        });
        return;
      }
      if (row.checkScore < 0) {
        this.$message({
          type: 'error',
          message: '打分不能低于0分！'
        });
        return;
      }
      try {
        let checkId = row.checkId; // checkId	string	必填	考核制度ID
        let ruleId = row.ruleId; // ruleId	string	必填	系项ID
        let hospitalCode = row.hospitalCode; // hospitalCode	string	必填	机构code
        let hospitalName = row.hospitalName; // hospitalName	string	必填	机构名称
        let score = Number(row.checkScore); // score	number	必填	分数
        await this.$phApi.System.addScore(
          checkId,
          ruleId,
          hospitalCode,
          hospitalName,
          score
        );
        this.$message({
          type: 'success',
          message: '打分成功'
        });
        this.hospitalScore =
          this.tableData
            .map(it =>
              it.children
                .map(i => i.checkScore)
                .reduce((acc, val) => acc + val, 0)
            )
            .reduce((acc, val) => acc + val, 0) +
          '分/' +
          this.tableData
            .map(it => it.ruleTotal)
            .reduce((acc, val) => acc + val, 0) +
          '分';
        if (row.isLock === 'N') {
          row.isLock = 'Y';
          await this.changeStatus(row);
        }
        this.$set(row, 'show', false);
      } catch (e) {
        this.$message({
          type: 'danger',
          message: e.message
        });
      }
    },
    async dialogTableShow(row) {
      this.dialogTableVisible = true;
      this.dialogLoading = true;
      let standardId = row.standardName.map(i => i.id);
      let result = await this.standardInfo(standardId, row.hospitalCode);
      this.dialogList = result.map(i => {
        return {
          ...i,
          returnList: i.returnList.map(it => {
            return it.map(k =>
              k instanceof Date ? dayjs(k).format('YYYY-MM-DD HH:mm:ss') : k
            );
          })
        };
      });
      this.standardText = row.evaluateStandard; //评分标准
      this.dialogLoading = false;
    },
    async standardInfo(tag, sysCode) {
      try {
        return await this.$phApi.PhysicianStandardExt.standardInfo(
          tag,
          sysCode
        );
      } catch (e) {
        return [
          {
            standardId: '',
            standardName: '暂无结果',
            content: '',
            data: 0,
            returnList: []
          }
        ];
      }
    },
    //  明细下载
    async excelExport(tag) {
      this.downLoading = true;
      try {
        return await this.$phApi.Standard.excelExport(
          tag,
          this.$route.query.id
        );
      } catch (e) {
        this.$message({
          type: 'error',
          message: e.message
        });
      } finally {
        this.downLoading = false;
      }
    },
    tableRowClassName() {
      return 'success-row';
    }
  }
};
</script>

<style>
.header-title {
  font: bold 24px/2 Arial;
  color: #0090dc;
}

.table-responsive {
  background: #fbfcfd;
}

.table-responsive .table-striped thead {
  background-color: #ebebeb;
}

.table-responsive table tbody tr th {
  height: 30px;
  line-height: 30px;
  min-width: 40px;
  padding: 0 4px !important;
}

.table-responsive table tbody tr th:last-child {
  min-width: 80px;
}

.table-responsive table tbody tr td {
  font-size: 12px;
  white-space: nowrap;
  position: relative;
  vertical-align: middle;
  padding: 14px 18px;
  border-top: 1px solid rgba(0, 0, 0, 0.045);
}

.table-responsive table tbody tr td:first-child {
  color: #000;
  font-style: italic;
}
</style>

<style scoped>
h5 {
  color: #1a95d7;
  font-size: 20px;
  margin-top: 0;
  margin-bottom: 20px;
}

.pointer {
  cursor: pointer;
}

.kpiSum-select {
  width: 100%;
  height: 30px;
  line-height: 35px;
}

.kpiSum-select span {
  float: left;
  font-size: 14px;
  margin-left: 30px;
}

.score-detail {
  position: relative;
  height: 300px;
  text-align: center;
  box-sizing: border-box;
  color: #1096d0;
}

.check-table {
  margin-bottom: 50px;
}

.check-table-title {
  background: #ccc;
  width: 100%;
  line-height: 40px;
  padding-left: 20px;
  float: left;
  box-sizing: border-box;
}

.el-row {
  margin-bottom: 30px;
}

.el-col {
  border-radius: 4px;
  padding: 0 30px;
}

.bg-fff {
  background: #fff;
}

.grid-content {
  border-radius: 4px;
}

.ins-ranking-title {
  margin: 0;
  color: #1096d0;
  font-size: 20px;
}

.ins-ranking-title p {
  font-size: 16px;
}

.score >>> .el-progress__text {
  display: none;
}

.el-collapse {
  border-top: none;
}

.el-tabs >>> .el-tabs__header {
  margin: 0;
}

.el-card {
  height: 100%;
}

.el-card >>> .el-card__body {
  height: 100%;
}

.showmore {
  width: 100%;
  line-height: 30px;
  text-align: center;
  padding: 10px 0;
  background-color: #f5f5f5;
  border: 1px solid #f5f5f5;
  border-top: none;
  border-color: rgba(162, 162, 162, 0.1);
  color: #6c7177;
  font-size: 14px;
  cursor: pointer;
}

.show-back {
  display: none;
}

.dialog-area-text {
  font-size: 16px;
  font-weight: bold;
}

.el-table >>> .success-row {
  background: #f8f8f8;
}

.el-table >>> .el-table__expanded-cell[class*='cell'] {
  padding: 0;
}
</style>
