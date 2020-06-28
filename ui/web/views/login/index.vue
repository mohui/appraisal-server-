<template>
  <div class="container-full">
    <div class="page-container bg-blue-grey-900">
      <div class="login-card">
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
        </el-card>
      </div>
    </div>
  </div>
</template>

<script>
import {setToken} from '../../utils/cache';

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
      }
    };
  },
  async created() {},
  methods: {
    submitForm() {
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
            this.btnLoading = false;
            await this.$router.push('/');
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

    isShowPwd() {
      this.inputType = this.inputType === 'password' ? '' : 'password';
    }
  }
};
</script>

<style scoped>
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
</style>
