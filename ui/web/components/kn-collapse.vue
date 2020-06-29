<template>
  <div ref="panel">
    <div v-show="!isCollapsed">
      <slot></slot>
    </div>
    <div v-if="isShow" class="trigger" @click="$emit('toggle', !isCollapsed)">
      <i
        :class="{
          'el-icon-caret-bottom': isCollapsed,
          'el-icon-caret-top': !isCollapsed
        }"
      ></i>
      {{ isCollapsed ? '展开' : '收起' }}查询条件
    </div>
  </div>
</template>

<script>
export default {
  name: 'kn-collapse',
  props: {
    isShow: {
      type: Boolean,
      default: false
    },
    isCollapsed: {
      type: Boolean,
      default: false
    }
  }
};
</script>

<style scoped lang="scss">
@import '../styles/vars';

.trigger {
  width: 100%;
  height: 26px;
  margin: 5px 0;
  font-size: 14px;
  line-height: 26px;
  background-color: #f0f0f0;
  display: flex;
  align-content: center;
  justify-content: center;
  transition: all 0.3s;

  i {
    color: $color-primary;
    font-size: 15px;
    position: relative;
    top: 4px;
  }

  &:hover {
    cursor: pointer;
    background-color: #ddd;
  }
}
</style>
