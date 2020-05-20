<template>
  <div style="height: 100%;">
    <el-card
      class="box-card"
      style="height: 100%;"
      shadow="never"
      :body-style="{
        height: 'calc(100% - 100px)',
        display: 'flex',
        'flex-direction': 'column'
      }"
    >
      <div slot="header" class="clearfix">
        <span>用户列表</span>
        <el-button
          style="float: right;margin: -9px;"
          type="primary"
          @click="dialogFormAddUsersVisible = true"
          >新建用户</el-button
        >
      </div>
      <el-form
        ref="ruleForm"
        :model="searchForm"
        label-width="100px"
        size="mini"
      >
        <el-row>
          <el-col :span="6" :xs="24" :sm="12" :md="6" :lg="6" :xl="6">
            <el-form-item label="用户名：">
              <el-input v-model="searchForm.userName" size="mini"></el-input>
            </el-form-item>
          </el-col>
          <el-col :span="5" :xs="24" :sm="24" :md="12" :lg="6" :xl="6">
            <el-form-item label="">
              <el-button type="primary" size="mini">查询</el-button>
              <el-button type="primary" size="mini">重置条件</el-button>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <el-table
        stripe
        size="small"
        :data="tableData"
        style="flex-grow: 1; height: 100%;"
        :header-cell-style="{background: '#F3F4F7', color: '#555'}"
      >
        <el-table-column align="center" width="50" label="序号">
          <template slot-scope="scope">
            {{ scope.$index + 1 }}
          </template>
        </el-table-column>
        <el-table-column prop="user_id" label="用户Id"></el-table-column>
        <el-table-column label="头像">
          <template slot-scope="scope">
            <img :src="scope.row.avatar" />
          </template>
        </el-table-column>
        <el-table-column prop="user_name" label="用户名"></el-table-column>
        <el-table-column prop="real_name" label="姓名"></el-table-column>
        <el-table-column prop="mobile" label="手机号"></el-table-column>
        <el-table-column prop="location" label="所在地区"></el-table-column>
        <el-table-column label="操作">
          <el-button
            type="primary"
            size="small"
            @click="dialogFormEditUsersVisible = true"
            >修改</el-button
          >
          <el-button type="danger" size="small" @click="delUser"
            >删除</el-button
          >
        </el-table-column>
      </el-table>
      <el-pagination background layout="prev, pager, next" :total="100">
      </el-pagination>
    </el-card>
    <el-dialog title="新建用户" :visible.sync="dialogFormAddUsersVisible">
      <el-form :model="userForm">
        <el-form-item label="用户名" :label-width="formLabelWidth">
          <el-input v-model="userForm.name" autocomplete="off"></el-input>
        </el-form-item>
        <el-form-item label="昵称" :label-width="formLabelWidth">
          <el-input v-model="userForm.name" autocomplete="off"></el-input>
        </el-form-item>
        <el-form-item label="性别" :label-width="formLabelWidth">
          <el-input v-model="userForm.name" autocomplete="off"></el-input>
        </el-form-item>
        <el-form-item label="真实姓名" :label-width="formLabelWidth">
          <el-input v-model="userForm.name" autocomplete="off"></el-input>
        </el-form-item>
        <el-form-item label="电话号码" :label-width="formLabelWidth">
          <el-input v-model="userForm.name" autocomplete="off"></el-input>
        </el-form-item>
        <el-form-item label="地区" :label-width="formLabelWidth">
          <el-input v-model="userForm.name" autocomplete="off"></el-input>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="dialogFormAddUsersVisible = false">取 消</el-button>
        <el-button type="primary" @click="dialogFormAddUsersVisible = false">
          确 定
        </el-button>
      </div>
    </el-dialog>
    <el-dialog title="修改用户" :visible.sync="dialogFormEditUsersVisible">
      <el-form :model="userForm">
        <el-form-item label="用户名" :label-width="formLabelWidth">
          <el-input v-model="userForm.name" autocomplete="off"></el-input>
        </el-form-item>
        <el-form-item label="昵称" :label-width="formLabelWidth">
          <el-input v-model="userForm.name" autocomplete="off"></el-input>
        </el-form-item>
        <el-form-item label="性别" :label-width="formLabelWidth">
          <el-input v-model="userForm.name" autocomplete="off"></el-input>
        </el-form-item>
        <el-form-item label="真实姓名" :label-width="formLabelWidth">
          <el-input v-model="userForm.name" autocomplete="off"></el-input>
        </el-form-item>
        <el-form-item label="电话号码" :label-width="formLabelWidth">
          <el-input v-model="userForm.name" autocomplete="off"></el-input>
        </el-form-item>
        <el-form-item label="地区" :label-width="formLabelWidth">
          <el-input v-model="userForm.name" autocomplete="off"></el-input>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="dialogFormEditUsersVisible = false">取 消</el-button>
        <el-button type="primary" @click="dialogFormEditUsersVisible = false"
          >确 定</el-button
        >
      </div>
    </el-dialog>
  </div>
</template>

<script>
export default {
  name: 'Users',
  data() {
    return {
      dialogFormAddUsersVisible: false,
      dialogFormEditUsersVisible: false,
      formLabelWidth: '100px',
      userForm: {
        name: ''
      },
      searchForm: {
        userName: ''
      },
      tableData: [
        {
          user_id: '5d62946590250a0d49ee4003',
          nick_name: '超级管理员',
          mobile: '13900000001',
          email: '123456@qq.com',
          avatar:
            'http://hosfs.helloreact.cn/avatar/2020-04/02/0507/dog.jpg?x-oss-process=image/resize,m_fill,w_50,limit_1/format,png/circle,r_50',
          location: '芜湖市',
          real_name: 'Jack Zhang',
          user_name: 'admin'
        },
        {
          user_id: '5d62946590250a0d49ee4003',
          nick_name: '超级管理员',
          mobile: '13900000001',
          email: '123456@qq.com',
          avatar:
            'http://hosfs.helloreact.cn/avatar/2020-04/02/0507/dog.jpg?x-oss-process=image/resize,m_fill,w_50,limit_1/format,png/circle,r_50',
          location: '芜湖市',
          real_name: 'Jack Zhang',
          user_name: 'admin'
        },
        {
          user_id: '5d62946590250a0d49ee4003',
          nick_name: '超级管理员',
          mobile: '13900000001',
          email: '123456@qq.com',
          avatar:
            'http://hosfs.helloreact.cn/avatar/2020-04/02/0507/dog.jpg?x-oss-process=image/resize,m_fill,w_50,limit_1/format,png/circle,r_50',
          location: '芜湖市',
          real_name: 'Jack Zhang',
          user_name: 'admin'
        }
      ]
    };
  },
  methods: {
    delUser() {
      this.$confirm('此操作将永久删除该用户, 是否继续?', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
        .then(() => {
          this.$message({
            type: 'success',
            message: '删除成功!'
          });
        })
        .catch(() => {
          this.$message({
            type: 'info',
            message: '已取消删除'
          });
        });
    }
  }
};
</script>

<style scoped></style>
