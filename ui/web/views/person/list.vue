<template>
  <div style="height: 100%;">
    <el-card
      class="box-card"
      style="height: 100%;"
      shadow="never"
      :body-style="{
        height: 'calc(100% - 110px)',
        display: 'flex',
        'flex-direction': 'column',
        padding: $settings.isMobile ? '10px 0' : '20px'
      }"
    >
      <div slot="header" class="clearfix">
        <span>个人档案列表</span>
      </div>
      <kn-collapse
        :is-show="$settings.isMobile"
        :is-collapsed="isCollapsed"
        @toggle="is => (isCollapsed = is)"
      >
        <el-form :model="queryForm" label-width="100px" size="mini">
          <el-row>
            <el-col :span="6" :xs="24" :sm="12" :md="8" :lg="6" :xl="4">
              <el-form-item label="姓名:">
                <kn-debounce-input
                  v-model.trim="queryForm.name"
                  placeholder="请输入要查询的姓名"
                  clearable
                ></kn-debounce-input>
              </el-form-item>
            </el-col>
            <el-col :span="6" :xs="24" :sm="12" :md="8" :lg="6" :xl="4">
              <el-form-item label="身份证号码:">
                <kn-debounce-input
                  v-model.trim="queryForm.idCard"
                  placeholder="请输入要查询的身份证号码"
                  clearable
                ></kn-debounce-input>
              </el-form-item>
            </el-col>
            <el-col :span="6" :xs="24" :sm="12" :md="8" :lg="6" :xl="4">
              <el-form-item label="地区机构:">
                <div style="display: flex">
                  <kn-area-cascader
                    style="width: 100%"
                    :code="queryForm.region"
                    :hospital="queryForm.hospital"
                    @outValue="
                      value => {
                        queryForm.region = value.regionId;
                        queryForm.hospital = value.hospitalId;
                      }
                    "
                  ></kn-area-cascader>
                  <el-tooltip content="包含下属机构">
                    <el-checkbox
                      v-model="queryForm.include"
                      style="margin: 0 0 1px 5px"
                      :disabled="!queryForm.hospital"
                    ></el-checkbox>
                  </el-tooltip>
                </div>
              </el-form-item>
            </el-col>
            <el-col :span="6" :xs="24" :sm="12" :md="8" :lg="6" :xl="4">
              <el-form-item label="人群分类:">
                <div style="display: flex">
                  <el-select
                    v-model="queryForm.personTags"
                    clearable
                    multiple
                    collapse-tags
                    placeholder="未选择代表默认全人群"
                    style="width: 100%;"
                  >
                    <el-option
                      v-for="item in personTagList"
                      :key="item.id"
                      :label="item.name"
                      :value="item.id"
                    >
                    </el-option>
                  </el-select>
                  <el-tooltip content="任意满足">
                    <el-checkbox
                      v-model="queryForm.personOr"
                      style="margin: 0 0 1px 5px"
                      :disabled="!queryForm.personTags.length > 0"
                    ></el-checkbox>
                  </el-tooltip>
                </div>
              </el-form-item>
            </el-col>
            <el-col :span="6" :xs="24" :sm="12" :md="8" :lg="6" :xl="4">
              <el-form-item label="档案问题:">
                <div style="display: flex">
                  <el-select
                    v-model="queryForm.tags"
                    clearable
                    multiple
                    collapse-tags
                    placeholder="请选择"
                    style="width: 100%;"
                  >
                    <el-option
                      v-for="item in tagList"
                      :key="item.id"
                      :label="item.name"
                      :value="item.id"
                    >
                    </el-option>
                  </el-select>
                  <el-tooltip content="任意满足">
                    <el-checkbox
                      v-model="queryForm.documentOr"
                      style="margin: 0 0 1px 5px"
                      :disabled="!queryForm.tags.length > 0"
                    ></el-checkbox>
                  </el-tooltip>
                </div>
              </el-form-item>
            </el-col>
            <el-col :span="6" :xs="24" :sm="12" :md="8" :lg="6" :xl="4">
              <el-form-item label="年度:">
                <div>
                  <el-select
                    v-model="queryForm.year"
                    placeholder="请选择考核年度"
                    style="width: 100%;"
                  >
                    <el-option
                      v-for="item in yearList"
                      :key="item.value"
                      :label="item.label"
                      :value="item.value"
                    >
                    </el-option>
                  </el-select>
                </div>
              </el-form-item>
            </el-col>
            <el-col :span="5" :xs="24" :sm="24" :md="16" :lg="12" :xl="8">
              <el-form-item label="">
                <el-button
                  type="primary"
                  size="mini"
                  @click="$asyncComputed.serverData.update()"
                  >查询</el-button
                >
                <el-button
                  type="primary"
                  size="mini"
                  @click="handleResetCondition"
                >
                  重置条件
                </el-button>
                <el-button
                  v-permission="{permission: permission.PERSON_EXCEL}"
                  size="mini"
                  @click="getTableData()"
                >
                  导出表格</el-button
                >
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>
      </kn-collapse>
      <el-table
        ref="personTable"
        v-loading="$asyncComputed.serverData.updating"
        :data="tableData"
        empty-text="没有筛选到符合条件的数据"
        @row-click="handleCellClick"
        :cell-class-name="cellClassHover"
        stripe
        border
        size="small"
        height="100%"
        style="flex-grow: 1;"
      >
        <el-table-column prop="name" label="姓名" min-width="80" align="center">
        </el-table-column>
        <el-table-column
          prop="idCard"
          label="身份证"
          min-width="180"
          align="center"
        ></el-table-column>
        <el-table-column
          prop="hospitalName"
          label="管理机构"
          min-width="220"
          align="center"
        ></el-table-column>
        <el-table-column label="人群分类" min-width="200" align="center">
          <template slot-scope="scope">
            <el-tag
              v-for="tag of scope.row.personTags"
              :key="tag.label"
              :style="{
                marginRight: '5px',
                background: tag.type
                  ? ''
                  : 'linear-gradient(to right, rgba(83, 33, 188,1), rgba(81, 33, 188,0.5))',
                color: tag.type ? '' : 'white'
              }"
              size="mini"
              :type="tag.type ? 'primary' : 'danger'"
            >
              <el-popover
                placement="top"
                width="200"
                trigger="click"
                :disabled="
                  tag.type ||
                    !$settings.permissions.includes(permission.TAGS_DETAIL)
                "
              >
                <div v-if="tag.code === 'ai_2dm'">
                  糖尿病高风险，建议行口服葡萄糖耐量试验(OGTT)或糖化血红蛋白检查
                </div>
                <div v-else-if="tag.code === 'ai_hua'">
                  高尿酸血症发病高风险，建议定期进行相关检查并注意预防
                </div>
                <i
                  :style="{
                    cursor:
                      !tag.type &&
                      $settings.permissions.includes(permission.TAGS_DETAIL)
                        ? 'pointer'
                        : 'auto',
                    'font-style': 'normal'
                  }"
                  slot="reference"
                  >{{ tag.label }}</i
                >
              </el-popover>
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="档案问题" min-width="300" align="center">
          <template slot-scope="scope">
            <el-tag
              v-for="tag of scope.row.tags"
              :key="tag.label"
              style="margin-right: 5px"
              size="mini"
              :type="tag.type ? 'primary' : 'danger'"
            >
              <el-popover
                :ref="tag.code + scope.row.id"
                @show="(code = tag.code), (archivesID = scope.row.id)"
                :disabled="
                  tag.type ||
                    !$settings.permissions.includes(permission.TAGS_DETAIL)
                "
                :popper-options="{
                  boundariesElement: 'viewport',
                  removeOnDestroy: true
                }"
                placement="top"
                width="200"
                trigger="click"
              >
                <div
                  v-loading="
                    code === tag.code &&
                      $asyncComputed.nonstandardCausesSeverData.updating
                  "
                  v-html="nonstandardCauses"
                ></div>
                <i
                  :style="{
                    cursor:
                      !tag.type &&
                      $settings.permissions.includes(permission.TAGS_DETAIL)
                        ? 'pointer'
                        : 'auto',
                    'font-style': 'normal'
                  }"
                  slot="reference"
                  >{{ tag.label }}</i
                >
              </el-popover>
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
      <el-scrollbar class="scrollbar" v-if="$settings.isMobile">
        <el-pagination
          v-reset-scroll="'personTable'"
          background
          :page-size="pageSize"
          :current-page="pageNo"
          layout="total, sizes, prev, pager, next"
          style="margin:10px 0 -20px;"
          :page-sizes="[50, 100, 200, 400]"
          :total="serverData.count"
          @current-change="handlePageNoChange"
          @size-change="handlePageSizeChange"
        >
        </el-pagination>
      </el-scrollbar>
      <el-pagination
        v-else
        v-reset-scroll="'personTable'"
        background
        :page-size="pageSize"
        :current-page="pageNo"
        layout="total, sizes, prev, pager, next"
        style="margin:10px 0 -20px;"
        :page-sizes="[50, 100, 200, 400]"
        :total="serverData.count"
        @current-change="handlePageNoChange"
        @size-change="handlePageSizeChange"
      ></el-pagination>
    </el-card>
  </div>
</template>

<script>
import {
  documentTagList,
  getTagsList,
  personTagList,
  personTags
} from '../../../../common/person-tag.ts';
import {Permission} from '../../../../common/permission.ts';

export default {
  name: 'PersonList',
  created() {
    this.initParams(this.$route);
  },
  data() {
    return {
      isCollapsed: !!this.$settings.isMobile,
      pageSize: 50,
      pageNo: 1,
      hospitals: this.$settings.user.hospitals,
      queryForm: {
        name: '',
        hospital: '',
        idCard: '',
        tags: [],
        year: this.$dayjs().year(),
        region: '',
        include: false,
        personTags: [],
        personOr: false, //人群分类是否or查询
        documentOr: false //档案问题是否or查询
      },
      permission: Permission,
      tagList: documentTagList,
      yearList: [
        {value: 2020, label: '2020年度'},
        {value: 2021, label: '2021年度'}
      ],
      archivesID: '', //档案id
      code: '', //tag code
      isInit: false //是否初始化页面,
    };
  },
  computed: {
    //人群分类下拉框选项
    personTagList() {
      return personTagList.filter(
        it =>
          (it.id !== personTags.ai_hua.code &&
            it.id !== personTags.ai_2dm.code) ||
          ((it.id === personTags.ai_hua.code ||
            it.id === personTags.ai_2dm.code) &&
            this.$settings.permissions.includes(this.permission.AI))
      );
    },
    //表格数据
    tableData() {
      return this.serverData.rows.map(it => {
        if (!this.$settings.permissions.includes(this.permission.AI)) {
          it[personTags.ai_2dm.code] = null;
          it[personTags.ai_hua.code] = null;
        }
        return getTagsList(it);
      });
    },
    //居民标签不规范的具体原因
    nonstandardCauses() {
      if (!this.nonstandardCausesSeverData) return '数据出错了';
      return this.nonstandardCausesSeverData
        .map(it => {
          return it.content;
        })
        .join('<br>');
    }
  },
  watch: {
    queryForm: {
      handler() {
        this.pageNo = 1;
        const urlTags = JSON.stringify(this.queryForm.tags);
        const urlPersonTags = JSON.stringify(this.queryForm.personTags);
        let query = {};
        if (this.queryForm.name) query.name = this.queryForm.name;
        if (this.queryForm.hospital) query.hospital = this.queryForm.hospital;
        if (this.queryForm.region) query.region = this.queryForm.region;
        if (this.queryForm.idCard) query.idCard = this.queryForm.idCard;
        if (this.queryForm.include) query.include = this.queryForm.include;
        if (this.queryForm.tags.length) query.tags = urlTags;
        else delete query.tags;
        if (this.queryForm.documentOr)
          query.documentOr = this.queryForm.documentOr;
        if (this.queryForm.personTags.length) query.personTags = urlPersonTags;
        else delete query.urlPersonTags;
        if (this.queryForm.personOr) query.personOr = this.queryForm.personOr;
        if (this.queryForm.year) query.year = this.queryForm.year;
        this.$router.replace({query: query}).catch(err => {
          err;
        });
      },
      deep: true
    },
    'queryForm.hospital'() {
      //判断是否是初始化页面，刷新过url
      //ture：保留原有的include
      //false：说明是手动更改机构，将include置为false（默认不包含下级机构）
      if (this.isInit) {
        //设置为默认值的false
        this.isInit = false;
      } else {
        this.queryForm.include = false;
      }
    },
    'queryForm.personTags'() {
      if (!this.queryForm.personTags.length > 0) {
        this.queryForm.personOr = false;
      }
    },
    'queryForm.tags'() {
      if (!this.queryForm.tags.length > 0) {
        this.queryForm.documentOr = false;
      }
    },
    //指标得分解读详情数据
    nonstandardCauses() {
      if (this.$refs[this.code + this.archivesID]) {
        //数据返回后更新popper，重新修正定位
        this.$nextTick(() => {
          this.$refs[this.code + this.archivesID][0].updatePopper();
        });
      }
    }
  },
  asyncComputed: {
    serverData: {
      async get() {
        return this.$api.Person.list({
          pageSize: this.pageSize,
          pageNo: this.pageNo,
          name: this.queryForm.name,
          idCard: this.queryForm.idCard,
          hospital: this.queryForm.hospital,
          region: this.queryForm.region,
          tags: this.queryForm.tags
            .concat(this.queryForm.personTags)
            .reduce((res, next) => {
              res[`${next}`] =
                next.includes('C') ||
                next.includes('E') ||
                next === 'ai_hua' ||
                next === 'ai_2dm';
              return res;
            }, {}),
          include: this.queryForm.include,
          personOr: this.queryForm.personOr,
          documentOr: this.queryForm.documentOr,
          year: this.queryForm.year
        });
      },
      default() {
        return {
          count: 0,
          rows: []
        };
      }
    },
    nonstandardCausesSeverData: {
      async get() {
        let result = await this.$api.Person.markContent(
          this.archivesID,
          this.code,
          this.queryForm.year
        );
        if (result.length === 0) {
          result = [{content: '暂无数据'}];
        }
        return result;
      },
      shouldUpdate() {
        return this.code;
      },
      default() {
        return [];
      }
    }
  },
  methods: {
    async getTableData() {
      await this.$api.Person.personExcel({
        name: this.queryForm.name,
        idCard: this.queryForm.idCard,
        hospital: this.queryForm.hospital,
        region: this.queryForm.region,
        tags: this.queryForm.tags
          .concat(this.queryForm.personTags)
          .reduce((res, next) => {
            res[`${next}`] = next.includes('C') || next.includes('E');
            return res;
          }, {}),
        include: this.queryForm.include,
        personOr: this.queryForm.personOr,
        documentOr: this.queryForm.documentOr,
        year: this.queryForm.year
      });
      this.$message.success('后台任务已进行, 请关注右上角任务进度~');
    },
    initParams(route) {
      this.isInit = true;
      if (route.query.name) this.queryForm.name = route.query.name;
      if (route.query.hospital) this.queryForm.hospital = route.query.hospital;
      if (route.query.region) this.queryForm.region = route.query.region;
      if (route.query.idCard) this.queryForm.idCard = route.query.idCard;
      if (route.query.include)
        this.queryForm.include = JSON.parse(route.query.include);
      if (route.query.tags) this.queryForm.tags = JSON.parse(route.query.tags);
      if (route.query.documentOr)
        this.queryForm.documentOr = JSON.parse(route.query.documentOr);
      if (route.query.personTags)
        this.queryForm.personTags = JSON.parse(route.query.personTags);
      if (route.query.personOr)
        this.queryForm.personOr = JSON.parse(route.query.personOr);
      if (route.query.year) this.queryForm.year = JSON.parse(route.query.year);
    },
    //设置标题可点击样式
    cellClassHover({columnIndex}) {
      if (columnIndex === 0) return 'person-name';
    },
    //点击标题跳转详情
    handleCellClick(row, column) {
      if (column.property === 'name')
        return this.$router.push({
          name: 'patient',
          query: {
            id: row.id
          }
        });
    },
    handlePageNoChange(no) {
      this.pageNo = no;
    },
    handlePageSizeChange(size) {
      this.pageNo = 1;
      this.pageSize = size;
    },
    handleResetCondition() {
      this.queryForm = {
        name: '',
        hospital: '',
        region: '',
        idCard: '',
        tags: [],
        include: false,
        personTags: [],
        personOr: false,
        documentOr: false
      };
    }
  }
};
</script>

<style lang="scss">
.scrollbar {
  height: 52px;
  .el-scrollbar__wrap {
    overflow-y: hidden !important;
  }
}
.person-name {
  cursor: pointer;

  :hover {
    color: #1a95d7;
  }
}
</style>
