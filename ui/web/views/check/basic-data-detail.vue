<template>
  <div v-loading="isLoading" class="flex-column-layout">
    <div class="jx-header">
      <div>
        <span class="header-title">{{ standardName }}</span>
        <el-select
          v-model="year"
          style="margin:0 20px"
          size="mini"
          placeholder="请选择考核年度"
          @change="handleYearChange()"
        >
          <el-option
            v-for="item in yearList"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          >
          </el-option>
        </el-select>
        <el-button
          style="margin: 0 20px;"
          type="primary"
          size="mini"
          @click="dataDownload"
          >导出数据
        </el-button>
        <el-button
          style="margin: 0 20px;"
          type="primary"
          size="mini"
          @click="dialogImportVisible = true"
          >批量导入数据
        </el-button>
      </div>
      <el-button
        type="primary"
        size="mini"
        plain
        @click="
          $router.push({
            name: 'basic-data'
          })
        "
        >返回
      </el-button>
    </div>
    <div
      v-if="isImportTable"
      style="height: 100%; display: flex; justify-content: center; align-items: center"
    >
      <el-button plain type="primary" @click="handleImportData"
        >导入上年度数据
      </el-button>
    </div>
    <div
      v-else
      v-hidden-scroll
      style="flex: 1 1 auto; overflow-y: auto;height: 0;"
    >
      <div v-for="(item, i) of listData" :key="i" style="">
        <p>{{ i + 1 }} {{ item.name }}</p>
        <el-table
          stripe
          size="mini"
          :data="item.child"
          border
          highlight-current-row
        >
          <el-table-column
            label="序号"
            type="index"
            width="50"
            align="center"
            fixed="left"
          ></el-table-column>
          <el-table-column prop="name" align="center" label="机构名称">
          </el-table-column>
          <el-table-column
            v-for="(field, index) of curTag"
            :key="index"
            :label="field.name"
            align="center"
          >
            <template slot-scope="scope">
              <el-input
                v-if="scope.row.active"
                size="small"
                @focus="scope.row[field.code].active = true"
                v-model="scope.row[field.code].value"
                placeholder="请输入"
              ></el-input>
              <span v-else>{{ scope.row[field.code].value }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="name" align="center" label="编辑时间">
            <template slot-scope="scope">
              {{ scope.row.updated_at }}
            </template>
          </el-table-column>
          <el-table-column prop="editor" align="center" label="编辑人">
          </el-table-column>
          <el-table-column width="180" label="操作" align="center">
            <template slot-scope="scope">
              <el-tooltip
                v-if="scope.row.active"
                content="保存"
                :enterable="false"
              >
                <el-button
                  type="success"
                  icon="el-icon-check"
                  circle
                  size="mini"
                  @click="updateTaskCount(scope.row)"
                >
                </el-button>
              </el-tooltip>
              <el-tooltip
                v-if="scope.row.active"
                content="取消编辑"
                :enterable="false"
              >
                <el-button
                  type="default"
                  icon="el-icon-close"
                  circle
                  size="mini"
                  @click="cancelData(scope.row)"
                >
                </el-button>
              </el-tooltip>
              <el-tooltip
                v-else-if="scope.row.id !== 'total'"
                content="编辑"
                :enterable="false"
              >
                <el-button
                  type="primary"
                  icon="el-icon-edit"
                  circle
                  size="mini"
                  @click="edit(scope.row)"
                >
                </el-button>
              </el-tooltip>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>
    <el-dialog
      title="批量导入数据"
      :visible.sync="dialogImportVisible"
      :before-close="handleClose"
      width="30%"
    >
      <el-form label-position="right" label-width="120px">
        <el-form-item label="上传文件：">
          <el-upload
            ref="uploadForm"
            :multiple="false"
            action="/api/BasicTag/dataImport.ac"
            :headers="headers"
            :data="{tagCode: JSON.stringify(curCode), year}"
            :before-upload="handleBeforeUpload"
            :on-progress="handleProgress"
            :on-success="uploadSuccess"
            :on-error="uploadError"
            :on-exceed="handleExceed"
            :limit="1"
            :file-list="fileList"
            :auto-upload="false"
          >
            <el-button plain size="small" type="primary">点击上传</el-button>
            <span class="el-alert--warning is-light">只能上传xls文件</span>
          </el-upload>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button plain @click="dialogImportVisible = false">
          取 消
        </el-button>
        <el-button :loading="importLoading" type="primary" @click="dataImport">
          确 定
        </el-button>
      </div>
    </el-dialog>
    <el-dialog
      title="批量导入结果"
      width="50%"
      :visible.sync="errorResultVisible"
    >
      <div style="display: flex;flex-direction: column">
        <span style="color:red">
          以下信息是导入出错的数据,请再检查一下数据,若还有疑问请将错误信息反馈给开发人员
        </span>
        <el-table
          :data="errorTable"
          stripe
          style="width: 100%;flex-grow: 1"
          size="mini"
          border
        >
          <el-table-column
            fixed
            label="序号"
            type="index"
            min-width="50"
            align="center"
          >
          </el-table-column>
          <el-table-column
            min-width="120"
            label="机构id"
            prop="hospitalId"
            align="center"
          >
          </el-table-column>
          <el-table-column
            min-width="80"
            label="基础数据code"
            prop="code"
            align="center"
          >
          </el-table-column>
          <el-table-column
            min-width="150"
            label="错误信息"
            prop="error"
            align="center"
          >
          </el-table-column>
        </el-table>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import {BasicTags} from '../../../../common/rule-score.ts';
import {getToken} from '../../utils/cache';

export default {
  name: 'BasicDataDetail',
  data() {
    return {
      isImportTable: false, //是否需要导入上年度数据
      dialogImportVisible: false,
      maxSize: 5,
      progress: 0,
      fileList: [],
      headers: {token: getToken()},
      isLoading: true,
      standardName: '',
      listData: [],
      curTag: [],
      curCode: '',
      errorTable: [],
      errorResultVisible: false,
      importLoading: false,
      year: this.$dayjs().year(), //考核年份，默认为当前年
      yearList: [
        {value: 2020, label: '2020年度'},
        {value: 2021, label: '2021年度'}
      ]
    };
  },
  async created() {
    this.isLoading = true;
    this.standardName = this.$route.query.name;
    this.year = Number(this.$route.query.year) || this.$dayjs().year();
    this.curTag = BasicTags.filter(
      s => s.name === this.standardName
    )[0].children;
    let code = (this.curCode = this.$route.query.code);
    await this.handleIsimportTable();
    await this.getLists(code);
    this.isLoading = false;
  },
  methods: {
    async dataImport() {
      this.importLoading = true;
      await this.$refs.uploadForm.submit();
    },
    //判断是否导入上年度数据
    async handleIsimportTable() {
      try {
        this.isImportTable = await this.$api.BasicTag.importable(
          this.curCode,
          this.year
        );
      } catch (e) {
        this.isImportTable = false;
      }
    },
    //导入上年度数据
    async handleImportData() {
      this.isLoading = true;
      try {
        await this.$api.BasicTag.upsertLastYear(this.curCode, this.year);
        await this.handleIsimportTable();
        await this.getLists(this.curCode);
      } catch (e) {
        this.$message.error(e.message);
      }
      this.isLoading = false;
    },
    handleClose() {
      this.fileList = [];
      this.dialogImportVisible = false;
    },
    handleBeforeUpload(file) {
      const fType = ['xls', 'xlsx'];
      const fName = file.name
        .split('.')
        .pop()
        .toLowerCase();
      const hasType = fType.some(it => it === fName);
      const isLt5M = file.size / 1024 / 1024 < this.maxSize;

      if (!hasType) {
        this.$message.error("仅允许上传'xls','xlsx'格式文件！");
        return false;
      }
      if (!isLt5M) {
        this.$message.error(`文件大小不能超过${this.maxSize}M!`);
        return false;
      }
      return true;
    },
    handleProgress(event) {
      this.progress = Number(event.percent.toFixed(2));
    },
    uploadSuccess(result) {
      try {
        this.errorTable = result.filter(item => item.error);
        if (this.errorTable.length === 0)
          this.$message({
            type: 'success',
            message: '批量导入数据成功'
          });
        else this.errorResultVisible = true;
        this.getLists(this.curCode);
      } catch (e) {
        this.$message.error(e.message);
      } finally {
        this.importLoading = false;
        this.dialogImportVisible = false;
      }
      this.fileList = [];
    },
    uploadError(e) {
      this.$message.error(e.message);
    },
    handleExceed() {
      this.$message('最多只能上传一个文件!');
    },
    async dataDownload() {
      try {
        await this.$api.BasicTag.dataDownload(this.curCode, this.year);
      } catch (e) {
        this.$message.error(e.message);
      }
    },
    async getLists(code) {
      let result = await this.$api.BasicTag.list(code, this.year);
      result = result.map(it => ({
        ...it,
        original: JSON.parse(JSON.stringify(it)),
        created_at: it.created_at.$format('YYYY-MM-DD'),
        updated_at: it.updated_at
          ? it.updated_at.$format('YYYY-MM-DD')
          : it.created_at.$format('YYYY-MM-DD'),
        active: false
      }));
      let arr = result
        .filter(
          it => it.name.endsWith('服务中心') || it.name.endsWith('卫生院')
        )
        .map(it => ({
          ...it,
          child: result.filter(
            item => item.parent === it.id || item.id === it.id
          )
        }));

      let cur = arr.map(it => it.child).flat();

      let other = {
        name: '其它',
        id: 'other',
        child: result.filter(it => cur.indexOf(it) === -1)
      };

      if (other.child.length) {
        arr.push(other);
      }
      //增加数据合计
      this.listData = arr.map(it => ({
        ...it,
        child: (() => {
          let item = JSON.parse(JSON.stringify(it.child[0]));
          item.name = '合计';
          item.id = 'total';
          item.updated_at = '';
          item.editor = '';
          this.curTag.forEach(i => {
            item[i.code].value = it.child.reduce((acc, cur) => {
              return acc + cur[i.code].value;
            }, 0);
          });
          return [...it.child, item];
        })()
      }));
    },
    //修改数据
    async edit(row) {
      row.active = true;
    },
    cancelData(row) {
      row.active = false;
      this.curTag.forEach(
        it => (row[it.code].value = row.original[it.code].value)
      );
    },
    //保存数据
    async updateTaskCount(item) {
      Promise.all(
        this.curTag
          .map(it => item[it.code])
          .filter(it => it.active)
          .map(
            async it =>
              await this.$api.BasicTag.upsert({
                id: it.id,
                value: +it.value,
                hospitalId: item.id,
                code: it.code,
                year: it.year
              })
          )
      )
        .then(res => {
          console.log('BasicTag.upsert res:', res);
          this.$message({
            type: 'success',
            message: '数据保存成功！'
          });
          item.active = false;
        })
        .catch(err => this.$message.error(err.message));
    },
    //年度选择
    async handleYearChange() {
      this.isLoading = true;
      this.$router.replace({
        query: {
          ...this.$route.query,
          year: this.year
        }
      });
      await this.handleIsimportTable();
      await this.getLists(this.curCode);
      this.isLoading = false;
    }
  }
};
</script>

<style scoped></style>
