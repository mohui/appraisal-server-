<template>
  <div style="height: 100%;">
    <el-card
      style="height: 100%;"
      shadow="never"
      :body-style="{
        height: 'calc(100% - 110px)',
        display: 'flex',
        'flex-direction': 'column'
      }"
    >
      <div slot="header" class="clearfix">
        <span>{{ standardName }}</span>
        <el-button
          plain
          style="margin: -9px 20px;"
          type="primary"
          size="mini"
          @click="dataDownload"
          >导出数据
        </el-button>
        <el-button
          plain
          style="margin: -9px 20px;"
          type="primary"
          size="mini"
          @click="dialogImportVisible = true"
          >批量导入数据
        </el-button>
        <el-button
          style="float: right;margin: -9px;"
          type="primary"
          @click="
            $router.push({
              name: 'basic-data'
            })
          "
          >返回
        </el-button>
      </div>
      <div style="flex: 1 1 auto; overflow-y: auto;height: 0px;">
        <div v-for="(item, i) of listData" :key="i" style="">
          <p>{{ i + 1 }} {{ item.name }}</p>
          <el-table
            stripe
            size="mini"
            :data="item.child"
            v-loading="isLoading"
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
                <el-button
                  plain
                  v-if="scope.row.active"
                  type="success"
                  size="mini"
                  @click="updateTaskCount(scope.row)"
                >
                  保存
                </el-button>
                <el-button
                  plain
                  v-if="scope.row.active"
                  type="primary"
                  size="mini"
                  @click="cancelData(scope.row)"
                >
                  取消
                </el-button>
                <el-button
                  plain
                  v-else
                  type="primary"
                  size="mini"
                  @click="edit(scope.row)"
                >
                  编辑
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
    </el-card>
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
            :data="{tagCode: JSON.stringify(curCode)}"
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
        <el-button
          plain
          type="primary"
          @click="dataImport"
          :loading="uploadLoading"
        >
          确 定
        </el-button>
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
      dialogImportVisible: false,
      maxSize: 5,
      progress: 0,
      fileList: [],
      headers: {token: getToken()},
      isLoading: true,
      standardName: '',
      listData: [],
      curTag: [],
      curCode: ''
    };
  },
  async created() {
    this.isLoading = true;
    this.standardName = this.$route.query.name;
    this.curTag = BasicTags.filter(
      s => s.name === this.standardName
    )[0].children;
    let code = (this.curCode = this.$route.query.code);
    await this.getLists(code);
    this.isLoading = false;
  },
  computed: {
    uploadLoading() {
      return this.progress > 0 && this.progress < 100;
    }
  },
  methods: {
    async dataImport() {
      await this.$refs.uploadForm.submit();
      this.dialogImportVisible = false;
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
    uploadSuccess() {
      try {
        this.$message({
          type: 'success',
          message: '批量导入数据成功'
        });
        this.getLists(this.curCode);
      } catch (e) {
        this.$message.error(e.message);
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
        await this.$api.BasicTag.dataDownload(this.curCode);
      } catch (e) {
        this.$message.error(e.message);
      }
    },
    async getLists(code) {
      let result = await this.$api.BasicTag.list(code);
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
        .filter(it => it.name.indexOf('中心') !== -1)
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
      this.listData = arr;
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
                code: it.code
              })
          )
      )
        .then(res => {
          console.log(res);
          this.$message({
            type: 'success',
            message: '数据保存成功！'
          });
          item.active = false;
        })
        .catch(err => this.$message.error(err.message));
    }
  }
};
</script>

<style scoped></style>
