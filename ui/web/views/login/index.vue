<template>
  <div class="container-full">
    <div class="page-container bg-blue-grey-900">
      <div v-if="!isRegister" class="login-card">
        <el-card class="box-card">
          <div slot="header" class="clearfix"><span>登录</span></div>
          <el-form
            ref="loginForm"
            :model="loginForm"
            status-icon
            :rules="rules"
            size="big"
            class="demo-ruleForm"
          >
            <el-form-item class="item" prop="account">
              <el-input
                v-model="loginForm.account"
                type="text"
                placeholder="用户名"
                auto-complete="off"
              ></el-input>
            </el-form-item>
            <el-form-item class="item" prop="pass">
              <el-input
                v-model="loginForm.pass"
                :type="inputType"
                placeholder="密码"
                auto-complete="off"
                @keyup.enter.native="submitForm"
              >
                <i
                  slot="suffix"
                  style="cursor: pointer;"
                  class="el-icon-view"
                  @click="isShowPwd()"
                ></i>
              </el-input>
            </el-form-item>
            <el-form-item>
              <el-button
                type="primary"
                :loading="btnLoading"
                style="width:100%;margin:20px 0;"
                @click="submitForm()"
                >确认
              </el-button>
            </el-form-item>
          </el-form>
          <div style="margin-top: -20px">
            <el-link type="primary" @click="isRegister = true">去注册</el-link>
          </div>
        </el-card>
      </div>
      <div v-else class="register-card">
        <el-card class="box-register-card">
          <div slot="header" class="clearfix"><span>注册</span></div>
          <el-form
            class="staff-form"
            ref="userFormAdd"
            :model="userForm"
            :rules="rulesAdd"
            label-position="top"
          >
            <el-row>
              <el-col :span="24">
                <el-form-item
                  ><span style="font-weight: bold">账户信息</span></el-form-item
                >
              </el-col>
              <el-col :span="12" :xs="24" :sm="12" :md="12" :lg="12" :xl="12">
                <el-form-item
                  label="登录名"
                  prop="account"
                  :label-width="formLabelWidth"
                >
                  <el-input
                    v-model="userForm.account"
                    autocomplete="off"
                    size="mini"
                  ></el-input>
                </el-form-item>
              </el-col>
              <el-col :span="12" :xs="24" :sm="12" :md="12" :lg="12" :xl="12">
                <el-form-item
                  label="密码"
                  prop="password"
                  :label-width="formLabelWidth"
                >
                  <el-input
                    v-model="userForm.password"
                    autocomplete="off"
                    size="mini"
                  ></el-input>
                </el-form-item>
              </el-col>
              <el-col :span="24">
                <el-form-item
                  ><span style="font-weight: bold">个人信息</span></el-form-item
                >
              </el-col>
              <el-col :span="12" :xs="24" :sm="12" :md="12" :lg="12" :xl="12">
                <el-form-item
                  :label-width="formLabelWidth"
                  label="姓名"
                  prop="name"
                >
                  <el-input
                    v-model="userForm.name"
                    autocomplete="off"
                    size="mini"
                  ></el-input>
                </el-form-item>
              </el-col>
              <el-col :span="4" :xs="12" :sm="4" :md="4" :lg="4" :xl="4">
                <el-form-item
                  required
                  label="性别"
                  prop="gender"
                  :label-width="formLabelWidth"
                >
                  <el-select
                    v-model="userForm.gender"
                    placeholder="请选择"
                    clearable
                    size="mini"
                  >
                    <el-option
                      v-for="g in genders"
                      :key="g"
                      :value="g"
                      :label="g"
                    />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="8" :xs="12" :sm="8" :md="8" :lg="8" :xl="8">
                <el-form-item label="联系电话" :label-width="formLabelWidth">
                  <el-input
                    v-model="userForm.phone"
                    autocomplete="off"
                    size="mini"
                  ></el-input>
                </el-form-item>
              </el-col>
              <el-col :span="24">
                <el-form-item
                  ><span style="font-weight: bold">职业信息</span></el-form-item
                >
              </el-col>
              <el-col :span="12" :xs="12" :sm="8" :md="8" :lg="8" :xl="8">
                <el-form-item
                  required
                  label="专业类别"
                  prop="major"
                  :label-width="formLabelWidth"
                >
                  <el-select
                    v-model="userForm.major"
                    style="width:100%"
                    clearable
                    filterable
                    size="mini"
                    @change="majorsChange"
                  >
                    <el-option
                      v-for="h in majors"
                      :key="h.name"
                      :label="h.name"
                      :value="h.name"
                    ></el-option>
                  </el-select> </el-form-item
              ></el-col>
              <el-col :span="12" :xs="12" :sm="8" :md="8" :lg="8" :xl="8">
                <el-form-item
                  required
                  label="职称名称"
                  prop="title"
                  :label-width="formLabelWidth"
                >
                  <el-select
                    ref="titleSelector"
                    v-model="userForm.title"
                    style="width:100%"
                    clearable
                    filterable
                    size="mini"
                  >
                    <el-option
                      v-for="p in titles"
                      :key="p.name"
                      :label="p.name"
                      :value="p.name"
                    ></el-option>
                  </el-select> </el-form-item
              ></el-col>
              <el-col :span="12" :xs="12" :sm="8" :md="8" :lg="8" :xl="8">
                <el-form-item
                  required
                  label="学历"
                  prop="education"
                  :label-width="formLabelWidth"
                >
                  <el-select
                    v-model="userForm.education"
                    style="width:100%"
                    clearable
                    filterable
                    size="mini"
                  >
                    <el-option
                      v-for="e in educations"
                      :key="e"
                      :label="e"
                      :value="e"
                    ></el-option>
                  </el-select> </el-form-item
              ></el-col>
              <el-col :span="24">
                <el-form-item style="margin-top: 10px" prop="isGP">
                  <el-switch
                    v-model="userForm.isGP"
                    inactive-text="是否为全科医师"
                    size="mini"
                  >
                  </el-switch>
                  <span>(是否注册为全科医学专业或取得全科医生培训合格证)</span>
                </el-form-item>
              </el-col>
            </el-row>
          </el-form>
          <div style="padding: 20px 10px;float: right">
            <div slot="footer" class="dialog-footer">
              <el-button @click="cancelRegister">取 消</el-button>
              <el-button type="primary" @click="registerUser">
                确 定
              </el-button>
            </div>
          </div>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script>
import {setToken} from '../../utils/cache';
import {Gender, Occupation, Education} from '../../../../common/his.ts';

export default {
  name: 'Index',
  data() {
    let checkAccount = (rule, value, callback) => {
      if (!value) {
        callback(new Error('账户不能为空'));
      } else {
        callback();
      }
    };
    let validatePass = (rule, value, callback) => {
      if (value === '') {
        callback(new Error('请输入密码'));
      } else {
        callback();
      }
    };
    return {
      title: '说明书',
      inputType: 'password',
      btnLoading: false,
      loginForm: {pass: '', account: ''},
      rules: {
        pass: [{validator: validatePass, trigger: 'blur'}],
        account: [{validator: checkAccount, trigger: 'blur'}]
      },
      formLabelWidth: '100px',
      isRegister: false,
      educations: Education,
      genders: Gender,
      majors: Occupation,
      userForm: {
        account: '',
        password: '',
        name: '',
        gender: '',
        phone: '',
        isGP: false,
        education: '',
        major: '',
        title: '',
        remark: null
      },
      rulesAdd: {
        account: [{required: true, message: '请输入登录名', trigger: 'change'}],
        name: [{required: true, message: '请输入姓名', trigger: 'change'}],
        password: [{required: true, message: '请输入密码', trigger: 'change'}],
        major: [{required: true, message: '请选择专业类别', trigger: 'change'}],
        gender: [{required: true, message: '请选择性别', trigger: 'change'}],
        education: [{required: true, message: '请选择学历', trigger: 'change'}],
        title: [{required: true, message: '请选择职称名称', trigger: 'change'}]
      }
    };
  },
  async created() {},
  computed: {
    //职称名称
    titles() {
      const occ = this.majors.find(oc => oc.name === this.userForm.major);
      if (occ) return occ.children;
      return [];
    }
  },
  methods: {
    submitForm() {
      if (this.btnLoading) return;
      this.btnLoading = true;
      this.$refs.loginForm.validate(async valid => {
        if (valid) {
          try {
            const result = await this.$api.User.login(
              this.loginForm.account,
              this.loginForm.pass
            );
            this.$message({
              message: '登录成功',
              type: 'success',
              duration: 1000
            });
            setToken(result.id);
            //TODO: 临时存下用户类型
            localStorage.setItem('user-type', result.type);
            await this.$router.push('/');
            this.btnLoading = false;
          } catch (e) {
            this.btnLoading = false;
            this.$message.error({
              message: e.message,
              duration: 1000
            });
            return false;
          }
        } else {
          this.btnLoading = false;
          console.log('error submit!!');
          return false;
        }
      });
    },
    majorsChange() {
      const titleSelector = this.$refs.titleSelector;
      titleSelector.$emit('input', '');
      titleSelector.emitChange('');
      titleSelector.visible = false;
      titleSelector.$emit('clear');
    },
    isShowPwd() {
      this.inputType = this.inputType === 'password' ? '' : 'password';
    },
    cancelRegister() {
      this.$refs.userFormAdd.resetFields();
      this.isRegister = false;
    },
    async registerUser() {
      try {
        const valid = await this.$refs.userFormAdd.validate();
        if (valid) {
          if (!this.userForm.phone) this.userForm.phone = null; //手机号没填就设置为null
          await this.$api.HisStaff.register(this.userForm);
          this.$message.success('注册成功');
          this.$refs.userFormAdd.resetFields();
          this.isRegister = false;
        }
      } catch (e) {
        console.log(e);
      }
    }
  }
};
</script>

<style lang="scss" scoped>
.container-full {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  overflow-x: hidden;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  background-color: #263238;
  background-size: 100% 100%;
}

.page-container {
  width: 100vw;
}

.clearfix {
  text-align: center;
  font-size: 18px;
}

.page-container h1 {
  text-align: center;
  font-size: 35px;
  color: #fff;
  margin: 35px 0;
}

.login-card {
  text-align: center;
  padding: 20% 5% 0 5%;
}

.register-card {
  padding: 10% 5% 0 5%;
}

.item {
  padding-bottom: 18px;
}

.clearfix:before,
.clearfix:after {
  display: table;
  content: '';
}

.clearfix:after {
  clear: both;
}

.box-card {
  margin-left: auto;
  margin-right: auto;
  width: 480px;
  max-width: 100%;
}

.box-register-card {
  margin-left: auto;
  margin-right: auto;
  width: 60%;
  max-width: 100%;
}
::v-deep .staff-form {
  .el-form-item__label {
    margin-bottom: -10px;
    padding: 0;
    line-height: 25px;
  }
}
</style>
<style lang="scss">
.staff-form {
  .el-col {
    padding: 0 8px;
  }
  .el-form-item {
    margin-bottom: 0;
  }
}
</style>
