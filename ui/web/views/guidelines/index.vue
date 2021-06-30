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
      :visible.sync="dialogVisible"
      width="90%"
      class="dialog"
      top="5vh"
      :before-close="handleClose"
    >
      <div slot="title" class="pdf-title">
        <div>
          {{ pdfTitle }}
          <span style="margin:0 auto; color: #409EFF">
            {{ pageNum }} / {{ pageTotalNum }}
          </span>
        </div>
        <div>
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
        </div>
        <div>
          <el-button type="primary" size="mini" @click="downloadFile" plain>
            下载
          </el-button>
        </div>
        <div>&nbsp;</div>
      </div>
      <div class="pdf" v-loading="!pageTotalNum">
        <pdf
          :page="pageNum"
          :src="url"
          @num-pages="pageTotalNum = $event"
        ></pdf>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import pdf from 'vue-pdf';
import axios from 'axios';

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
      downloadURL: '',
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
    downloadFile() {
      this.previewDown().then(v => {
        if (v.status === 200) {
          if (v) {
            const elink = document.createElement('a');
            elink.href = window.URL.createObjectURL(
              new Blob([v.data], {type: `application/pdf`})
            );
            elink.style.display = 'none';
            elink.setAttribute('download', this.pdfTitle);
            document.body.appendChild(elink);
            elink.click();
            URL.revokeObjectURL(elink.href); // 释放URL 对象
            document.body.removeChild(elink);
          }
        }
      });
    },
    previewDown() {
      return new Promise((resolve, reject) => {
        axios({
          url: this.downloadURL,
          timeout: 0,
          method: 'get',
          responseType: 'blob',
          header: {'Content-Type': 'multipart/form-data'}
        })
          .then(res => {
            resolve(res);
          })
          .catch(err => {
            reject(err);
          });
      });
    },
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
        this.downloadURL = row.url;
        console.log(this.url);
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
  .el-dialog {
    height: calc(100% - 140px);
    .el-dialog__header {
      border-bottom: 1px dashed #1a95d7;
      .pdf-title {
        display: flex;
        justify-content: space-between;
      }
    }
    .el-dialog__body {
      height: calc(100% - 140px);
      overflow-y: auto;
    }
    .el-dialog__footer {
      text-align: center;
    }
  }
}
</style>
