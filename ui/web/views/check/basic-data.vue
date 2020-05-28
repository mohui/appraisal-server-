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
        <span>基础数据</span>
      </div>
      <el-table
        stripe
        size="mini"
        :data="serverData"
        v-loading="$asyncComputed.serverData.updating"
        border
        height="100%"
        style="flex-grow: 1;"
      >
        <el-table-column align="center" width="50" label="序号">
          <template slot-scope="scope">
            {{ scope.$index + 1 }}
          </template>
        </el-table-column>
        <el-table-column
          v-for="(field, index) of fields"
          :key="index"
          :label="field.name"
          :prop="field.prop"
          :min-width="field.width"
          align="center"
        >
        </el-table-column>
        <el-table-column align="center" width="220" fixed="right" label="操作">
          <template slot-scope="scope">
            <el-button
              plain
              type="primary"
              @click="edit(scope.row)"
              size="small"
              >编辑
            </el-button>
            <el-button
              plain
              style="background-color: #37474F; color:#fff"
              @click="uploadData(scope.row.code)"
              size="small"
              >批量导入数据
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script>
const fieldsMapping = [{name: '公共卫生服务', prop: 'name'}];
export default {
  name: 'basicData',
  data() {
    return {
      dialogFormVisible: false,
      dialogCloneFormVisible: false,
      dialogUploadFormVisible: false,
      form: {},
      fileList: [],
      importUrl: 'taskUrl',
      headers: {token: "getCookie('account')"},
      maxSize: 2,
      progress: 0,
      curCode: ''
    };
  },
  computed: {
    fields() {
      if (this.serverData === null) return [];
      if (this.serverData === undefined) return [];
      return fieldsMapping.map((map, index) => {
        return {
          name: map.name,
          prop: map.prop,
          width: this.$widthCompute([
            map.name,
            ...this.serverData.map(data => data[index])
          ])
        };
      });
    },
    uploadLoading() {
      return this.progress > 0 && this.progress < 100;
    }
  },
  asyncComputed: {
    serverData: {
      async get() {
        return await this.$phApi.Task.getTask();
      },
      default() {
        return [];
      }
    }
  },
  methods: {
    //编辑
    async edit(row) {
      await this.$router.push({
        path: 'basic-data-detail',
        query: {code: row.code, id: row.id, name: row.name}
      });
    },
    //导入
    async uploadData(row) {
      this.dialogUploadFormVisible = true;
      this.curCode = row;
    },

    async saveUploadRules() {
      await this.$refs.uploadForm.submit();
      this.dialogUploadFormVisible = false;
    },

    handleProgress(event) {
      this.progress = Number(event.percent.toFixed(2));
    },

    async uploadSuccess() {
      try {
        this.$message({
          type: 'success',
          message: '批量导入数据成功！'
        });
      } catch (e) {
        this.$message(e.message);
      }
      this.fileList = [];
    },

    handleClose() {
      this.fileList = [];
      this.dialogUploadFormVisible = false;
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

    handleExceed() {
      this.$message('最多只能上传一个文件!');
    },

    uploadError(err) {
      this.$message(err);
    },
    async downloadTemplate() {
      await this.$api.Task.exportTaskExcel(
        localStorage.getItem('code'),
        this.curCode
      );
    }
  }
};
</script>

<style scoped></style>
