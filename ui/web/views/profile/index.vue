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
      <el-form
        v-if="staff.type"
        :model="staff"
        class="staff-form"
        ref="staffForm"
        :rules="rulesStaff"
        label-position="top"
      >
        <el-row :gutter="20">
          <el-col :span="24">
            <el-form-item>
              <span style="font-weight: bold">账户信息</span>
            </el-form-item>
          </el-col>
          <el-col :span="12" :xs="24" :sm="12" :md="12" :lg="12" :xl="12">
            <el-form-item
              label="登录名"
              prop="account"
              :label-width="formLabelWidth"
            >
              <el-input
                v-model="staff.account"
                autocomplete="off"
                size="mini"
                disabled
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
                v-model="staff.password"
                autocomplete="off"
                size="mini"
              ></el-input>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item>
              <span style="font-weight: bold">
                个人信息
              </span>
            </el-form-item>
          </el-col>
          <el-col :span="12" :xs="24" :sm="12" :md="12" :lg="12" :xl="12">
            <el-form-item
              :label-width="formLabelWidth"
              label="姓名"
              prop="name"
            >
              <el-input
                v-model="staff.name"
                autocomplete="off"
                size="mini"
              ></el-input>
            </el-form-item>
          </el-col>
          <el-col :span="12" :xs="12" :sm="12" :md="12" :lg="12" :xl="12">
            <el-form-item
              required
              label="性别"
              prop="gender"
              :label-width="formLabelWidth"
            >
              <el-select
                v-model="staff.gender"
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
          <el-col :span="24">
            <el-form-item
              ><span style="font-weight: bold">职业信息</span></el-form-item
            >
          </el-col>
          <el-col :span="12" :xs="12" :sm="6" :md="6" :lg="6" :xl="6">
            <el-form-item
              required
              label="专业类别"
              prop="major"
              :label-width="formLabelWidth"
            >
              <el-select
                v-model="staff.major"
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
          <el-col :span="12" :xs="12" :sm="6" :md="6" :lg="6" :xl="6">
            <el-form-item
              required
              label="职称名称"
              prop="title"
              :label-width="formLabelWidth"
            >
              <el-select
                ref="titleSelector"
                v-model="staff.title"
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
          <el-col :span="12" :xs="12" :sm="6" :md="6" :lg="6" :xl="6">
            <el-form-item
              required
              label="学历"
              prop="education"
              :label-width="formLabelWidth"
            >
              <el-select
                v-model="staff.education"
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
                v-model="staff.isGP"
                inactive-text="是否为全科医师"
                size="mini"
              >
              </el-switch>
              <span>(是否注册为全科医学专业或取得全科医生培训合格证)</span>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <p style="border-bottom: 1px solid #eee;">&nbsp;</p>
          </el-col>
          <el-col :span="24" v-if="staff.hospital">
            <el-form-item>
              <span style="font-weight: bold">主机构</span>
            </el-form-item>
          </el-col>
          <el-col
            :span="12"
            :xs="24"
            :sm="12"
            :md="12"
            :lg="12"
            :xl="12"
            v-if="staff.hospital"
          >
            <el-form-item
              label="机构"
              prop="hospital"
              :label-width="formLabelWidth"
            >
              <el-select
                v-model="staff.hospital.id"
                style="width:100%"
                filterable
                size="mini"
              >
                <el-option
                  v-for="h in staff.hospitals"
                  :key="h.id"
                  :label="h.name"
                  :value="h.id"
                ></el-option>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col
            :span="12"
            :xs="12"
            :sm="6"
            :md="6"
            :lg="6"
            :xl="6"
            v-if="staff.hospital"
          >
            <el-form-item
              label="科室"
              prop="department"
              :label-width="formLabelWidth"
            >
              <el-input
                v-model="staff.department.name"
                autocomplete="off"
                size="mini"
                disabled
              ></el-input>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <p>&nbsp;</p>
            <el-button
              v-loading="saveStaffLoading"
              type="primary"
              @click="saveStaff"
            >
              保存个人信息
            </el-button>
          </el-col>
        </el-row>
      </el-form>
      <el-tabs
        v-if="!staff.type"
        :tab-position="$settings.isMobile ? 'top' : 'left'"
      >
        <el-tab-pane label="基本设置">
          <el-row :gutter="20">
            <el-col :span="16" :xs="24" style="padding-left: 40px;">
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
              <el-button type="primary" @click="saveUser">
                保存个人信息
              </el-button>
            </el-col>
          </el-row>
        </el-tab-pane>
        <el-tab-pane label="安全设置">
          <el-row :gutter="20">
            <el-col :span="16" :xs="24" style="padding-left: 40px;">
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
import {Education, Gender, Occupation} from '../../../../common/his.ts';

export default {
  name: 'Profile',
  data() {
    return {
      formLabelWidth: '100px',
      genders: Gender,
      majors: Occupation,
      educations: Education,
      saveStaffLoading: false,
      rulesStaff: {
        account: [{required: true, message: '请输入登录名', trigger: 'change'}],
        name: [{required: true, message: '请输入姓名', trigger: 'change'}],
        password: [{required: true, message: '请输入密码', trigger: 'change'}],
        major: [{required: true, message: '请选择专业类别', trigger: 'change'}],
        gender: [{required: true, message: '请选择性别', trigger: 'change'}],
        education: [{required: true, message: '请选择学历', trigger: 'change'}],
        title: [{required: true, message: '请选择职称名称', trigger: 'change'}]
      },
      staff: {
        type: '',
        id: '',
        name: '',
        hospital: null,
        hospitals: [],
        department: {
          id: '',
          name: ''
        },
        permissions: [],
        account: '',
        password: '',
        gender: '',
        isGP: false,
        education: '',
        major: '',
        title: '',
        remark: null
      },
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
  computed: {
    //职称名称
    titles() {
      const occ = this.majors.find(oc => oc.name === this.staff.major);
      if (occ) return occ.children;
      return [];
    }
  },
  watch: {
    ['staff.hospital']: {
      handler() {
        this.staff.department = this.staff.hospitals.filter(
          it => it.id === this.staff.hospital.id
        )[0]?.department || {id: '', name: '未分配科室'};
      },
      deep: true
    }
  },
  async created() {
    const user = this.$settings.user;
    if (user.type === 'STAFF') {
      this.staff = user;
      if (!user.hospital && user.hospitals.length) {
        this.staff.hospital = user.hospitals[0];
        this.staff.department = user.hospitals[0].department;
      }
    } else {
      this.userForm = user;
    }
  },
  methods: {
    majorsChange() {
      const titleSelector = this.$refs.titleSelector;
      titleSelector.$emit('input', '');
      titleSelector.emitChange('');
      titleSelector.visible = false;
      titleSelector.$emit('clear');
    },
    //保存医生信息
    async saveStaff() {
      if (this.saveStaffLoading) return;
      this.saveStaffLoading = true;
      const staff = this.staff;
      this.$refs.staffForm.validate(async valid => {
        if (valid) {
          try {
            await this.$api.HisStaff.update({
              id: staff.id,
              name: staff.name.trim(),
              password: staff.password.trim(),
              remark: staff.remark?.trim() || null,
              hospital: staff.hospital?.id || null,
              department: staff.department?.id || null,
              gender: staff.gender?.trim() || null,
              major: staff.major?.trim() || null,
              title: staff.title?.trim() || null,
              education: staff.education?.trim() || null,
              isGP: staff.isGP || false
            });
            this.$message({
              type: 'success',
              message: '保存成功!'
            });
          } catch (e) {
            this.$message.error(e.message);
          } finally {
            this.saveStaffLoading = false;
          }
        } else {
          this.saveStaffLoading = false;
          return false;
        }
      });
    },
    async saveUser() {
      const {name} = this.userForm;
      try {
        await this.$api.User.updateProfile({name});
        this.$message({
          type: 'success',
          message: '修改用户成功!'
        });
        await this.$settings.load();
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

<style lang="scss" scoped>
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

  ::v-deep .staff-form {
    .el-form-item__label {
      margin-bottom: -5px;
      padding: 0;
      line-height: 25px;
    }
    .el-form-item {
      margin-bottom: 10px;
    }
  }
}
</style>
