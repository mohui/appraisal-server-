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
        <span>个人档案列表</span>
      </div>
      <el-form :model="queryForm" label-width="100px" size="mini">
        <el-row>
          <el-col :span="6" :xs="24" :sm="12" :md="6" :lg="6" :xl="4">
            <el-form-item label="姓名:">
              <kn-debounce-input
                v-model.trim="queryForm.name"
                placeholder="请输入要查询的姓名"
                clearable
              ></kn-debounce-input>
            </el-form-item>
          </el-col>
          <el-col :span="6" :xs="24" :sm="12" :md="6" :lg="6" :xl="4">
            <el-form-item label="身份证号码:">
              <kn-debounce-input
                v-model.trim="queryForm.idCard"
                placeholder="请输入要查询的身份证号码"
                clearable
              ></kn-debounce-input>
            </el-form-item>
          </el-col>
          <el-col :span="6" :xs="24" :sm="12" :md="6" :lg="6" :xl="4">
            <el-form-item label="管理机构:">
              <el-select
                v-model="queryForm.hospital"
                clearable
                placeholder="请选择"
                style="width: 100%;"
              >
                <el-option
                  v-for="item in hospitals"
                  :key="item.id"
                  :label="item.name"
                  :value="item.id"
                >
                </el-option>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="6" :xs="24" :sm="12" :md="6" :lg="6" :xl="4">
            <el-form-item label="人群分类:">
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
            </el-form-item>
          </el-col>
          <el-col :span="6" :xs="24" :sm="12" :md="6" :lg="6" :xl="4">
            <el-form-item label="档案问题:">
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
            </el-form-item>
          </el-col>
          <el-col :span="5" :xs="24" :sm="24" :md="12" :lg="6" :xl="4">
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
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <el-table
        v-loading="$asyncComputed.serverData.updating"
        :data="tableData"
        @row-click="handleCellClick"
        :cell-class-name="cellClassHover"
        stripe
        border
        size="small"
        height="100%"
        style="flex-grow: 1;"
      >
        <el-table-column prop="name" label="姓名" min-width="50" align="center">
        </el-table-column>
        <el-table-column
          prop="idCardfFormat"
          label="身份证"
          min-width="80"
          align="center"
        ></el-table-column>
        <el-table-column
          prop="hospitalName"
          label="管理机构"
          min-width="100"
          align="center"
        ></el-table-column>
        <el-table-column label="人群分类" min-width="100" align="center">
          <template slot-scope="scope">
            <el-tag
              v-for="tag of scope.row.personTags"
              :key="tag.label"
              style="margin-right: 5px"
              size="mini"
              :type="tag.type ? 'primary' : 'danger'"
              >{{ tag.label }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="档案问题" min-width="400" align="center">
          <template slot-scope="scope">
            <el-tag
              v-for="tag of scope.row.tags"
              :key="tag.label"
              style="margin-right: 5px"
              size="mini"
              :type="tag.type ? 'primary' : 'danger'"
              >{{ tag.label }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
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
    </el-card>
  </div>
</template>

<script>
import {
  personTags,
  personTagList,
  documentTagList,
  documentTags
} from '../../../../common/person-tag.ts';

export default {
  name: 'PersonList',
  created() {
    this.initParams(this.$route);
  },
  data() {
    return {
      pageSize: 50,
      pageNo: 1,
      hospitals: this.$settings.user.hospitals,
      queryForm: {
        name: '',
        hospital: '',
        idCard: '',
        tags: [],
        personTags: []
      },
      personTagList: personTagList,
      tagList: documentTagList
    };
  },
  computed: {
    tableData() {
      return this.serverData.rows.map(it => {
        it.tags = [];
        it.personTags = [];
        //重点人群
        if (it.C00) it.personTags.push(personTags.C00);
        if (it.C01) it.personTags.push(personTags.C01);
        if (it.C02) it.personTags.push(personTags.C02);
        if (it.C03) it.personTags.push(personTags.C03);
        if (it.C04) it.personTags.push(personTags.C04);
        if (it.C05) it.personTags.push(personTags.C05);
        // 健康档案标记
        if (it.S03 !== null) it.tags.push(documentTags.S03(it.S03));
        if (it.S23 !== null) it.tags.push(documentTags.S23(it.S23));
        // 老年人标记
        if (it.O00 !== null) it.tags.push(documentTags.O00(it.O00));
        if (it.O01 !== null) it.tags.push(documentTags.O01(it.O01));
        if (it.O02 !== null) it.tags.push(documentTags.O02(it.O02));
        // 高血压标记
        if (it.H01 !== null) it.tags.push(documentTags.H01(it.H01));
        if (it.H02 !== null) it.tags.push(documentTags.H02(it.H02));
        // 糖尿病标记
        if (it.D01 !== null) it.tags.push(documentTags.D01(it.D01));
        if (it.D02 !== null) it.tags.push(documentTags.D02(it.D02));
        it.idCardfFormat = it.idCard.replace(
          /^(.{10})(?:\d+)(.{2})$/,
          '$1******$2'
        );
        return it;
      });
    }
  },
  watch: {
    queryForm: {
      handler() {
        this.pageNo = 1;
        const urlTags = JSON.stringify(this.queryForm.tags);
        let query = {};
        if (this.queryForm.name) query.name = this.queryForm.name;
        if (this.queryForm.hospital) query.hospital = this.queryForm.hospital;
        if (this.queryForm.idCard) query.idCard = this.queryForm.idCard;
        if (this.queryForm.tags.length) query.tags = urlTags;
        else delete query.tags;
        this.$router.replace({query: query}).catch(err => {
          err;
        });
      },
      deep: true
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
          tags: this.queryForm.tags
            .concat(this.queryForm.personTags)
            .reduce((res, next) => {
              res[`${next}`] = next.includes('C0');
              return res;
            }, {})
        });
      },
      default() {
        return {
          count: 0,
          rows: []
        };
      }
    }
  },
  methods: {
    initParams(route) {
      if (route.query.name) this.queryForm.name = route.query.name;
      if (route.query.hospital) this.queryForm.hospital = route.query.hospital;
      if (route.query.idCard) this.queryForm.idCard = route.query.idCard;
      if (route.query.tags) this.queryForm.tags = JSON.parse(route.query.tags);
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
            id: row.id,
            tags: JSON.stringify(row.tags)
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
        idCard: '',
        tags: [],
        personTags: []
      };
    }
  }
};
</script>

<style lang="scss">
.person-name {
  cursor: pointer;

  :hover {
    color: #1a95d7;
  }
}
</style>
