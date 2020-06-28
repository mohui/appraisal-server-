<template>
  <el-container class="container-full">
    <el-header class="header">
      <span style="color: #fff; padding-left: 20px;">
        <i
          class="el-icon-s-fold"
          v-if="device === 'mobile'"
          style="vertical-align: bottom;font-size: 22px;cursor: pointer;"
          @click="toggleMenu"
        ></i>
        绩效管理系统</span
      >
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
      <el-aside
        width="200px"
        :class="{mobile: device === 'mobile', hiddenMenu: hiddenMenu}"
      >
        <div
          :class="{mask: device === 'mobile'}"
          style="height: 100%;"
          @click="toggleMenu"
        >
          <el-menu
            class="layout-side-menu"
            :default-active="activeMenu"
            router
            :unique-opened="true"
          >
            <multi-menu
              v-for="menu of menus"
              :key="menu.router"
              :menu="menu"
            ></multi-menu>
          </el-menu>
        </div>
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
const WIDTH = 992;
export default {
  name: 'Layout',
  components: {MultiMenu},
  data() {
    return {
      menus: [],
      device: 'desktop',
      hiddenMenu: false,
      timer: null,
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
    this.menus = require('../../utils/menus').map(it => {
      if (it.children) {
        it.children = it.children.map(item => {
          if (item.index === 'appraisal-result-institutions') {
            // 根据用户权限判断进入省市地区页还是区、机构页
            if (this.$settings.user.isRegion) {
              if (this.$settings.user.region.level < 3) {
                item.router = '/appraisal-result-area';
              }
            }
          }
          return item;
        });
      }
      return it;
    });
  },
  watch: {
    $route() {
      this.resizeHandler();
    }
  },
  beforeMount() {
    window.addEventListener('resize', this.resizeHandler);
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.resizeHandler);
  },
  mounted() {
    this.resizeHandler();
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
    },
    isMobile() {
      const rect = window.document.body.getBoundingClientRect();
      return rect.width - 1 < WIDTH;
    },
    resizeHandler() {
      this.timer && clearTimeout(this.timer);
      if (!document.hidden) {
        this.timer = setTimeout(() => {
          this.device = this.isMobile() ? 'mobile' : 'desktop';
          this.hiddenMenu = this.isMobile();
          localStorage.setItem('isMobile', this.isMobile());
        }, 300);
      }
    },
    toggleMenu() {
      this.hiddenMenu = !this.hiddenMenu;
    }
  }
};
</script>

<style>
.el-main {
  padding: 10px;
}
</style>
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
.mobile {
  position: absolute;
  height: 100%;
  z-index: 999;
}
.hiddenMenu {
  display: none;
}
.mask {
  position: fixed;
  width: 100%;
  height: 100%;
  background-color: rgba(100, 100, 100, 0.5);
  z-index: 9;
  ul {
    width: 200px;
  }
}
</style>
