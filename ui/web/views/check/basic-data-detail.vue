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
                {{ scope.row.created_at }}
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
                  @click="scope.row.active = false"
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
  </div>
</template>

<script>
import {BasicTags} from '../../../../common/rule-score.ts';

export default {
  name: 'BasicDataDetail',
  data() {
    return {
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
  methods: {
    async getLists(code) {
      let result = await this.$api.BasicTag.list(code);
      this.listData = result
        .map(it => it.parent)
        .filter((it, index, arr) => arr.indexOf(it) === index)
        .map(it => ({
          name: result.filter(item => item.id === it)[0]?.name,
          code: it
        }))
        .filter(it => it.name)
        .map(it => ({
          ...it,
          child: result
            .filter(item => item.parent === it.code || item.id === it.code)
            .map(it => ({
              ...it,
              created_at: it.created_at.$format('YYYY-MM-DD'),
              active: false
            }))
        }));
    },
    //修改数据
    async edit(row) {
      row.active = true;
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
                code: this.curCode
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
