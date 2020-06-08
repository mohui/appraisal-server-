<template>
  <el-submenu
    v-if="
      menu.children &&
        menu.children.length > 0 &&
        (!menu.permission || findPermission(menu.permission))
    "
    :index="menu.index"
  >
    <template slot="title">
      <i :class="menu.icon"></i>
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
  >
    <i :class="menu.icon"></i>
    <span>{{ menu.label }}</span>
  </el-menu-item>
</template>

<script>
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
      return !!permission.find(p => this.$settings.permissions.includes(p));
    }
  }
};
</script>

<style scoped></style>
