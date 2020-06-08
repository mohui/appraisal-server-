<template>
  <el-container class="container-full">
    <el-header class="header">
      <span style="color: #fff; padding-left: 20px;">绩效管理系统</span>
      <el-dropdown
        class="dropdown"
        @command="handCommand"
        @visible-change="v => (dropdownVisible = v)"
      >
        <div>
          <i style="padding: 0 6px" class="el-icon-user"></i>
          {{ $settings.user.name }}
          <i
            :class="dropdownVisible ? 'el-icon-arrow-up' : 'el-icon-arrow-down'"
          ></i>
        </div>
        <el-dropdown-menu slot="dropdown">
          <el-dropdown-item command="profile">个人中心</el-dropdown-item>
          <el-dropdown-item command="logout">退出</el-dropdown-item>
        </el-dropdown-menu>
      </el-dropdown>
    </el-header>
    <el-container>
      <el-aside width="200px">
        <el-menu class="layout-side-menu" :default-active="activeMenu" router>
          <multi-menu
            v-for="menu of menus"
            :key="menu.router"
            :menu="menu"
          ></multi-menu>
        </el-menu>
      </el-aside>

      <el-main>
        <transition name="fade" mode="out-in">
          <router-view></router-view>
        </transition>
      </el-main>
    </el-container>
  </el-container>
</template>

<script>
import {removeToken} from '../../utils/cache';
import MultiMenu from '../../components/multi-menu.vue';

export default {
  name: 'Layout',
  components: {MultiMenu},
  data() {
    return {
      menus: require('../../utils/menus'),
      dropdownVisible: false
    };
  },
  computed: {
    activeMenu() {
      const {meta} = this.$route;
      //返回router配置里指定的菜单激活项,若没有默认使用路由名
      return meta?.activeMenu || this.$route.name;
    }
  },
  async created() {
    //获取当前需要缓存的信息
    await this.$settings.load();
  },
  methods: {
    handCommand(command) {
      if (command === 'profile') this.profile();
      if (command === 'logout') this.logout();
    },
    logout() {
      removeToken();
      window.location.href = '/login';
    },
    profile() {
      this.$router.push({
        path: 'profile'
      });
    }
  }
};
</script>

<style lang="scss" scoped>
@import '../../styles/vars';

.container-full {
  height: 100%;
}

.header {
  height: $header-height !important;
  padding: 0;
  border-bottom: solid 1px #e6e6e6;
  display: flex;
  background: $color-primary;
  box-sizing: content-box;
  align-items: center;
  justify-content: space-between;
}

.dropdown {
  line-height: $header-height;
  padding: 0 25px;
  color: #fff;
  cursor: pointer;
}
</style>
