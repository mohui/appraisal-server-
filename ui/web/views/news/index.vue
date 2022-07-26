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
        <span>新闻资讯库</span>
        <el-button
          style="float: right;margin: -4px 0 0 20px;"
          size="small"
          type="primary"
          @click="addNews"
          >新建
        </el-button>
      </div>
      <el-form
        ref="newsForm"
        :model="searchForm"
        label-width="100px"
        size="mini"
      >
        <el-row>
          <el-col :span="5" :xs="24" :sm="24" :md="5" :lg="5" :xl="5">
            <el-form-item label="标题：">
              <el-input
                v-model="searchForm.title"
                size="mini"
                clearable
              ></el-input>
            </el-form-item>
          </el-col>
          <el-col :span="4" :xs="24" :sm="24" :md="4" :lg="4" :xl="4">
            <el-form-item label="来源：">
              <el-input
                v-model="searchForm.source"
                size="mini"
                clearable
              ></el-input>
            </el-form-item>
          </el-col>
          <el-col :span="7" :xs="24" :sm="24" :md="7" :lg="7" :xl="7">
            <el-form-item label="创建时间：">
              <el-date-picker
                v-model="searchForm.createdAt"
                type="daterange"
                range-separator="至"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                style="width: 100%;"
              >
              </el-date-picker>
            </el-form-item>
          </el-col>
          <el-col :span="4" :xs="24" :sm="24" :md="4" :lg="4" :xl="4">
            <el-form-item label="状态：">
              <el-select
                v-model="searchForm.status"
                clearable
                placeholder="请选择"
              >
                <el-option
                  v-for="item in statusList"
                  :key="item.value"
                  :label="item.name"
                  :value="item.value"
                >
                </el-option>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="4" :xs="24" :sm="24" :md="4" :lg="4" :xl="4">
            <el-form-item label="" style="margin-left: -80px;">
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
        v-loading="$asyncComputed.list.updating"
        v-hidden-scroll
        size="medium"
        :data="listData"
        height="100%"
        style="flex-grow: 1;"
        :header-cell-style="{background: '#F3F4F7', color: '#555'}"
        :cell-class-name="cellClassHover"
        @row-click="handleCellClick"
      >
        <el-table-column align="center" width="60" label="序号" fixed="left">
          <template v-slot="scope">
            {{ scope.row.index }}
          </template>
        </el-table-column>
        <el-table-column
          label="标题"
          fixed="left"
          :min-width="computedColWidth('title')"
        >
          <template v-slot="scope">
            {{ scope.row.title }}
            <span v-if="scope.row.toped_at" class="is-top">置顶</span>
          </template>
        </el-table-column>
        <el-table-column
          label="数据来源"
          :min-width="computedColWidth('source')"
          prop="source"
        >
        </el-table-column>
        <el-table-column
          label="创建时间"
          :min-width="computedColWidth('created_at')"
          prop="created_at"
        >
        </el-table-column>
        <el-table-column
          label="发布时间"
          :min-width="computedColWidth('published_at')"
          prop="published_at"
        >
        </el-table-column>
        <el-table-column
          label="发布者"
          :min-width="computedColWidth('publishedName')"
          prop="publishedName"
        >
        </el-table-column>
        <el-table-column
          label="状态"
          :min-width="computedColWidth('status')"
          prop="status"
        >
        </el-table-column>
        <el-table-column
          label="地区"
          :min-width="computedColWidth('areas')"
          prop="areas"
        >
          <template v-slot="scope">
            <span :title="scope.row.areas" class="areas">
              {{ scope.row.areas }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="操作" fixed="right" min-width="140">
          <template v-slot="scope">
            <el-tooltip content="编辑" :enterable="false">
              <el-button
                type="primary"
                icon="el-icon-edit"
                circle
                size="mini"
                @click.stop="editNews(scope.row)"
              >
              </el-button>
            </el-tooltip>
            <el-tooltip content="下架" :enterable="false">
              <el-button
                icon="el-icon-download"
                circle
                type="danger"
                size="mini"
                :disabled="scope.row.status !== newsStatus.PUBLISHED"
                @click.stop="offlineNews(scope)"
              >
                <!-- 只有已发布的新闻，有下架功能，未发布和已下架的就置灰-->
              </el-button>
            </el-tooltip>
            <el-tooltip content="删除" :enterable="false">
              <el-button
                icon="el-icon-delete"
                circle
                type="danger"
                size="mini"
                @click.stop="delNews(scope)"
              >
              </el-button>
            </el-tooltip>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        v-reset-scroll
        background
        :current-page="searchForm.pageNo"
        :page-size="searchForm.pageSize"
        layout="sizes, prev, next"
        style="margin:10px 0 -20px -10px;"
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
  </div>
</template>

<script>
import {newsStatus, statusList} from '../../../../common/news.ts';
export default {
  name: 'News',
  data() {
    return {
      isLoading: false,
      newsStatus,
      statusList,
      searchForm: {
        title: null,
        source: null,
        createdAt: null,
        status: null,
        pageSize: 20,
        pageNo: 1
      }
    };
  },
  computed: {
    listData() {
      const {pageSize, pageNo} = this.searchForm;
      return this.list.data.map((it, i) => ({
        ...it,
        crawled_at: it?.crawled_at?.$format(),
        created_at: it?.created_at?.$format(),
        published_at: it?.published_at?.$format(),
        areas: it.arealist.map(item => item.name).join(','),
        index: (pageNo - 1) * pageSize + i + 1
      }));
    }
  },
  watch: {
    ['searchForm.title']: {
      handler() {
        this.searchForm.pageNo = 1;
      },
      deep: true
    },
    ['searchForm.source']: {
      handler() {
        this.searchForm.pageNo = 1;
      },
      deep: true
    },
    ['searchForm.createdAt']: {
      handler() {
        this.searchForm.pageNo = 1;
      },
      deep: true
    },
    ['searchForm.status']: {
      handler() {
        this.searchForm.pageNo = 1;
      },
      deep: true
    }
  },
  asyncComputed: {
    list: {
      async get() {
        const {
          title,
          source,
          createdAt,
          status,
          pageSize,
          pageNo
        } = this.searchForm;
        let startDate = null;
        let endDate = null;
        if (createdAt) {
          startDate = createdAt[0];
          endDate = createdAt[1];
          endDate = this.$dayjs(endDate).add(1, 'day');
        }
        return await this.$api.News.list({
          title: title || null,
          source: source || null,
          createdAtStart: startDate,
          createdAtEnd: endDate,
          status: status || null,
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
    computedColWidth(field) {
      let width = this.$widthCompute(
        this.listData.map(item => item[field] || '--')
      );
      if (field === 'title') {
        width += 100;
      } else if (field === 'areas') {
        width = 90;
      } else {
        width += 20;
      }
      return width;
    },
    // 新建资讯
    addNews() {
      this.$router.push({
        name: 'news-edit'
      });
    },
    async offlineNews({row}) {
      if (row.status === newsStatus.PUBLISHED) {
        try {
          await this.$api.News.removed(row.id);
          this.$message({
            type: 'success',
            message: '下架成功!'
          });
          this.$asyncComputed.list.update();
        } catch (e) {
          this.$message.error(e.message);
        }
      }
    },
    // 编辑资讯
    editNews({id}) {
      this.$router.push({
        name: 'news-edit',
        query: {id}
      });
    },
    // 删除资讯
    delNews({row}) {
      this.$confirm('此操作将永久删除该资讯, 是否继续?', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
        .then(async () => {
          try {
            await this.$api.News.delete(row.id);
            this.$message({
              type: 'success',
              message: '删除成功!'
            });
            this.$asyncComputed.list.update();
          } catch (e) {
            this.$message.error(e.message);
          }
        })
        .catch(() => {
          this.$message({
            type: 'info',
            message: '已取消删除'
          });
        });
    },
    // 设置标题可点击样式
    cellClassHover({columnIndex}) {
      if (columnIndex === 1) return 'news-title';
    },
    // 点击标题跳转详情
    handleCellClick(row, column) {
      if (column.label === '标题') {
        return this.$router.push({
          name: 'news-edit',
          query: {
            id: row.id
          }
        });
      }
    },
    reset() {
      this.searchForm = {
        title: null,
        source: null,
        createdAt: null,
        status: null,
        pageSize: 20,
        pageNo: 1
      };
    }
  }
};
</script>

<style lang="scss" scoped>
@import '../../styles/vars';
::v-deep .news-title {
  cursor: pointer;
  :hover {
    color: $color-primary;
  }
}
.is-top {
  color: #f00;
}
.areas {
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
