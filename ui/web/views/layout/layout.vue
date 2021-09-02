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
        {{ $settings.user.region.name }}基本公共卫生服务两卡制绩效考核系统</span
      >
      <div>
        <kn-back-job></kn-back-job>
        <el-dropdown
          style="line-height: normal;"
          class="dropdown"
          @command="handCommand"
          @visible-change="v => (dropdownVisible = v)"
        >
          <div>
            <i style="padding: 0 6px" class="el-icon-user"></i>
            <span v-if="!$settings.isMobile">
              {{ $settings.user.name }}
              <i
                :class="
                  dropdownVisible ? 'el-icon-arrow-up' : 'el-icon-arrow-down'
                "
              ></i>
            </span>
          </div>

          <el-dropdown-menu slot="dropdown">
            <el-dropdown-item command="QRImage">绑定码</el-dropdown-item>
            <el-dropdown-item command="profile">个人中心</el-dropdown-item>
            <el-dropdown-item command="logout">退出</el-dropdown-item>
          </el-dropdown-menu>
        </el-dropdown>
      </div>
    </el-header>
    <el-container
      :style="{'flex-direction': $settings.isMobile ? 'column' : 'row'}"
    >
      <el-aside
        :width="$settings.isMobile ? '100%' : '250px'"
        :class="{mobile: device === 'mobile', hiddenMenu: hiddenMenu}"
      >
        <div
          :class="{mask: device === 'mobile'}"
          style="height: 100%;"
          @click.self="toggleMenu"
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
    <el-dialog title="绑定码" :visible.sync="QRDialogVisible" width="30%">
      <div>
        <img
          style="width: 245px;margin: 0 auto;display: block;"
          :src="QRCode"
          alt=""
        />
      </div>
      <span slot="footer" class="dialog-footer">
        <el-button type="primary" @click="QRDialogVisible = false"
          >关 闭</el-button
        >
      </span>
    </el-dialog>
  </el-container>
</template>

<script>
import {removeToken} from '../../utils/cache';
import MultiMenu from '../../components/multi-menu.vue';
import KnBackJob from '../../components/kn-back-job';
const WIDTH = 992;
export default {
  name: 'Layout',
  components: {MultiMenu, KnBackJob},
  data() {
    return {
      menus: require('../../utils/menus'),
      device: 'desktop',
      hiddenMenu: false,
      timer: null,
      dropdownVisible: false,
      QRDialogVisible: false,
      // 二维码
      QRCode: ''
    };
  },
  computed: {
    activeMenu() {
      const {meta} = this.$route;
      //返回router配置里指定的菜单激活项,若没有默认使用路由名
      return meta?.activeMenu || this.$route.name;
    }
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
    async handCommand(command) {
      if (command === 'profile') this.profile();
      if (command === 'logout') this.logout();
      if (command === 'QRImage') {
        const loading = this.$loading({
          lock: true,
          text: '正在生成二维码',
          spinner: 'el-icon-loading',
          background: 'rgba(0, 0, 0, 0.7)'
        });
        try {
          // 打开弹窗
          this.QRCode = (await this.$api.User.getQRCode()).image;
          this.QRDialogVisible = true;
        } catch (e) {
          this.$message.error(e.message);
        } finally {
          loading.close();
        }
      }
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
          this.$settings.isMobile = this.isMobile();
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
  background: $color-header;
  box-sizing: content-box;
  align-items: center;
  justify-content: space-between;
}

.dropdown {
  line-height: $header-height;
  padding: 0 25px 0 5px;
  color: #fff;
  cursor: pointer;
}
.mobile {
  max-height: 100%;
  z-index: 2002;
  transition: max-height 1s ease;
}
.mobile.hiddenMenu {
  max-height: 0;
}
.mask {
  width: 100%;
  height: 100%;
  background-color: rgba(100, 100, 100, 0.5);
  z-index: 9;
}
::v-deep .el-menu {
  & > li {
    border-radius: 30px;

    &.el-menu-item,
    > .el-submenu__title {
      height: 46px !important;
      line-height: 46px !important;
      &:hover {
        background-color: #fff;
      }
    }
    &.is-active.parent-menu.el-menu-item {
      background-image: linear-gradient(to right, $color-left, $color-right);
      color: #fff;
      border-radius: 30px;
    }
    &.is-active.el-menu-item {
      background-color: #fff;
    }
    &.is-active > .el-submenu__title {
      i {
        color: inherit;
      }
      background-image: linear-gradient(to right, $color-left, $color-right);
      color: #fff;
      border-radius: 30px;
    }

    > ul {
      > li {
        padding-left: 54px !important;

        &.is-active {
          color: $color-primary;
        }
        &:after {
          margin-left: 10px !important;
          content: '';
          display: block;
          position: absolute;
          width: 0.3rem;
          height: 0.3rem;
          background-color: rgba(91, 91, 91, 0.2);
          left: 1.8rem;
          top: calc(50% - 0.1rem);
          border: 1px solid rgba(91, 91, 91, 0.7);
          border-radius: 50%;
          z-index: 1;
        }
        &.is-active:after {
          background-color: #409eff;
          width: 0.4rem;
          height: 0.4rem;
          left: 1.75rem;
          top: calc(50% - 0.2rem);
        }
      }
    }
  }
}
</style>
