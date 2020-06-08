<template>
  <div style="height: 100%;">
    <el-card
      class="box-card profile"
      style="height: 100%;"
      shadow="never"
      :body-style="{
        height: 'calc(100% - 100px)',
        display: 'flex',
        'flex-direction': 'column'
      }"
    >
      <div slot="header" class="clearfix">
        <span>个人中心</span>
      </div>
      <el-tabs tab-position="left">
        <el-tab-pane label="基本设置">
          <el-row :gutter="20">
            <el-col :span="16" style="padding-left: 40px;">
              <div class="title">基本信息</div>
              <el-form :model="userForm">
                <el-form-item label="用户名" :label-width="formLabelWidth">
                  {{ userForm.account }}
                </el-form-item>
                <el-form-item label="真实姓名" :label-width="formLabelWidth">
                  <el-input
                    class="input"
                    v-model="userForm.name"
                    autocomplete="off"
                  ></el-input>
                </el-form-item>
              </el-form>
              <div class="title"></div>
              <el-form :model="userForm">
                <el-form-item label="地区" :label-width="formLabelWidth">
                  {{ userForm.region.name }}
                </el-form-item>
              </el-form>
              <div class="title">角色权限</div>
              <el-form>
                <el-form-item label="角色" :label-width="formLabelWidth">
                  <el-tag
                    v-for="(it, index) of userForm.roles"
                    :key="index"
                    style="margin-right: 10px;"
                    >{{ it.name }}</el-tag
                  >
                </el-form-item>
              </el-form>
              <p>&nbsp;</p>
              <el-button @click="saveUser" type="primary"
                >保存个人信息</el-button
              >
            </el-col>
          </el-row>
        </el-tab-pane>
        <el-tab-pane label="安全设置">
          <el-row :gutter="20">
            <el-col :span="16" style="padding-left: 40px;">
              <div class="title">安全设置</div>
              <el-form :model="userForm">
                <el-form-item label="密码" :label-width="formLabelWidth">
                  <el-input
                    show-password
                    class="input"
                    v-model="userForm.password"
                    autocomplete="off"
                    placeholder="请输入密码"
                  ></el-input>
                </el-form-item>
              </el-form>
              <p>&nbsp;</p>
              <el-button @click="savePassword" type="primary">
                保存密码
              </el-button>
            </el-col>
          </el-row>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script>
export default {
  name: 'Profile',
  data() {
    return {
      formLabelWidth: '100px',
      userForm: {
        id: '',
        account: '',
        name: '',
        regionId: '',
        roles: [],
        region: {
          name: ''
        }
      }
    };
  },
  async created() {
    this.userForm = this.$settings.user;
  },
  methods: {
    async saveUser() {
      const {name} = this.userForm;
      try {
        await this.$api.User.updateProfile({name});
        this.$message({
          type: 'success',
          message: '修改用户成功!'
        });
      } catch (e) {
        this.$message.error(e.message);
      }
    },
    async savePassword() {
      const {id, password} = this.userForm;
      try {
        await this.$api.User.updatePassword(id, password);
        this.$message({
          type: 'success',
          message: '修改密码成功!'
        });
      } catch (e) {
        this.$message.error(e.message);
      }
    }
  }
};
</script>

<style type="scss" scoped>
.profile {
  font-size: 14px;
  .title {
    border-bottom: 1px solid #cccccc;
    margin: 5px 0;
    font-size: 20px;
    padding-bottom: 10px;
    font-weight: bold;
  }
  .input {
    width: auto;
  }
}
</style>
