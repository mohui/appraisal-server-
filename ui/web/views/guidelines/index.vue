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
      <div slot="header">
        <span>医学指南</span>
      </div>
      <el-form
        ref="ruleForm"
        :model="searchForm"
        label-width="100px"
        size="mini"
      >
        <el-row>
          <el-col :span="8" :xs="24" :sm="12" :md="8" :lg="8" :xl="8">
            <el-form-item label="关键字：">
              <el-input
                v-model="searchForm.keyword"
                size="mini"
                clearable
              ></el-input>
            </el-form-item>
          </el-col>
          <el-col :span="8" :xs="24" :sm="24" :md="8" :lg="8" :xl="8">
            <el-form-item label="">
              <el-button
                type="primary"
                size="mini"
                @click="$asyncComputed.list.update()"
              >
                查询
              </el-button>
              <el-button type="primary" size="mini" @click="reset">
                重置条件
              </el-button>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <el-table
        stripe
        size="medium"
        :cell-class-name="cellClassHover"
        :data="list.data"
        border
        height="100%"
        style="flex-grow: 1;"
        @row-click="handleCellClick"
      >
        <el-table-column align="center" width="50" label="序号">
          <template slot-scope="scope">
            {{ scope.$index + 1 }}
          </template>
        </el-table-column>
        <el-table-column label="名称" prop="name"> </el-table-column>
      </el-table>
      <el-pagination
        background
        :current-page="searchForm.pageNo"
        :page-size="searchForm.pageSize"
        layout="total, sizes, prev, pager, next"
        style="margin:10px 0 -20px;"
        :total="list.rows"
        @size-change="
          size => {
            searchForm.pageSize = size;
            searchForm.pageNo = 1;
          }
        "
        @current-change="
          no => {
            searchForm.pageNo = no;
          }
        "
      >
      </el-pagination>
    </el-card>
    <el-dialog
      :title="pdfTitle"
      :visible.sync="dialogVisible"
      width="90%"
      class="dialog"
      :before-close="handleClose"
    >
      <div class="pdf" v-loading="!pageTotalNum">
        <el-button-group style="margin: 0 auto;">
          <el-button
            type="primary"
            icon="el-icon-arrow-left"
            size="mini"
            @click="prePage"
          >
            上一页
          </el-button>
          <el-button type="primary" size="mini" @click="nextPage">
            下一页
            <i class="el-icon-arrow-right el-icon--right"></i>
          </el-button>
        </el-button-group>
        <div style="margin:10px auto 0; color: #409EFF">
          {{ pageNum }} / {{ pageTotalNum }}
        </div>
        <pdf
          :page="pageNum"
          :src="url"
          @num-pages="pageTotalNum = $event"
        ></pdf>
      </div>
      <span slot="footer" class="dialog-footer">
        <el-button type="primary" @click="handleClose">关 闭</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import pdf from 'vue-pdf';
export default {
  name: 'Guidelines',
  components: {
    pdf
  },
  data() {
    return {
      isLoading: false,
      dialogVisible: false,
      url: '',
      pdfTitle: '',
      pageNum: 1,
      pageTotalNum: 0,
      searchForm: {
        keyword: null,
        pageSize: 20,
        pageNo: 1
      }
    };
  },
  created() {
    this.getList();
  },
  asyncComputed: {
    list: {
      async get() {
        const {keyword, pageSize, pageNo} = this.searchForm;
        return await this.$api.Guidelines.list({
          keyword: keyword || null,
          pageSize,
          pageNo
        });
      },
      default() {
        return {
          data: [],
          pages: 0,
          rows: 0
        };
      }
    }
  },
  methods: {
    handleClose() {
      this.url = '';
      this.dialogVisible = false;
      this.pageTotalNum = 1;
      this.pageNum = 1;
    },
    // 上一页
    prePage() {
      let page = this.pageNum;
      page = page > 1 ? page - 1 : this.pageTotalNum;
      this.pageNum = page;
    },

    // 下一页
    nextPage() {
      let page = this.pageNum;
      page = page < this.pageTotalNum ? page + 1 : 1;
      this.pageNum = page;
    },
    async getList() {
      this.isLoading = true;
      try {
        this.list = await this.$api.Guidelines.list(this.searchForm);
      } catch (e) {
        this.$message.error(e.message);
      } finally {
        this.isLoading = false;
      }
    },
    //设置标题可点击样式
    cellClassHover({columnIndex}) {
      if (columnIndex === 1) return 'guide-name';
    },
    //点击标题跳转详情
    handleCellClick(row, column) {
      if (column.property === 'name') {
        this.pdfTitle = row.name;

        const loadingTask = pdf.createLoadingTask(row.url);
        this.url = loadingTask;
        loadingTask.promise
          .then(() => {
            this.dialogVisible = true;
          })
          .catch(() => {
            this.$message.error('文件不存在');
          });
      }
    },
    reset() {
      this.searchForm = {
        keyword: null,
        pageSize: 20,
        pageNo: 1
      };
    }
  }
};
</script>

<style lang="scss" scoped>
.tags-title {
  cursor: pointer;
  :hover {
    color: #1a95d7;
  }
}
.pdf {
  display: flex;
  flex-direction: column;
}
/deep/ .dialog {
  .el-dialog__header {
    border-bottom: 1px dashed #1a95d7;
  }
  .el-dialog__body {
    height: calc(100% - 190px);
    overflow-y: auto;
  }
}
</style>
