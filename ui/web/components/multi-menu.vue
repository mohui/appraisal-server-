<template>
  <el-submenu
    v-if="
      menu.children &&
        menu.children.length > 0 &&
        (!menu.permission || findPermission(menu.permission))
    "
    :index="menu.index"
    :style="{
      display: $settings.isMobile && menu.sign !== 'show' ? 'none' : 'block'
    }"
  >
    <template slot="title">
      <img
        v-if="menu.iconActive"
        class="menu-img"
        :style="{
          '--icon': `url(${menu.icon})`,
          '--iconActive': `url(${menu.iconActive})`
        }"
      />
      <span>{{ menu.label }}</span>
    </template>
    <multi-menu
      v-for="subMenu of menu.children"
      :key="subMenu.router"
      :menu="subMenu"
    >
    </multi-menu>
  </el-submenu>
  <el-menu-item
    v-else-if="!menu.permission || findPermission(menu.permission)"
    :route="menu.router"
    :index="menu.index"
    :class="menu.icon ? 'parent-menu' : ''"
    :style="{
      display: $settings.isMobile && menu.sign !== 'show' ? 'none' : 'block'
    }"
  >
    <img
      v-if="menu.iconActive"
      :style="{
        '--icon': `url(${menu.icon})`,
        '--iconActive': `url(${menu.iconActive})`
      }"
      class="menu-img"
    />
    <span>{{ menu.label }}</span>
  </el-menu-item>
</template>

<script>
import {Permission} from '../../../common/permission.ts';

export default {
  name: 'MultiMenu',
  props: {
    menu: {
      type: Object,
      required: true
    }
  },
  methods: {
    findPermission(permission) {
      if (this.$settings.permissions.includes(Permission.SUPER_ADMIN))
        return true;
      return !!permission.find(p => this.$settings.permissions.includes(p));
    }
  }
};
</script>

<style lang="scss" scoped>
.menu-img {
  width: 16px;
  height: 16px;
  content: var(--icon);
}

.is-active {
  .menu-img {
    content: var(--iconActive);
  }
}
</style>
