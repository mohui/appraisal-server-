<template>
  <div ref="sliders" class="sliders">
    <span
      :class="['el-tabs__nav-prev', scrollable.prev ? 'is-disabled' : '']"
      @click="scrollPrev"
    >
      <i class="el-icon-arrow-left"></i>
    </span>
    <span
      :class="['el-tabs__nav-next', scrollable.next ? 'is-disabled' : '']"
      @click="scrollNext"
    >
      <i class="el-icon-arrow-right"></i>
    </span>
    <div class="wrapper">
      <div
        class="list"
        :style="{transform: 'translate3d(' + distance + 'px, 0px, 0px)'}"
      >
        <slot></slot>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Sliders',
  data() {
    return {
      currentIndex: 0,
      itemLength: 0,
      distance: 0, //滑动距离
      itemWidth: 0,
      scrollable: {
        prev: true,
        next: true
      }
    };
  },
  mounted() {
    this.itemLength = this.$slots?.default?.length;
    if (this.itemLength) {
      this.itemWidth = this.$slots.default[0].elm.offsetWidth;
      if (this.$el.offsetWidth < this.itemLength * this.itemWidth) {
        this.scrollable.next = false;
      }
    }
  },
  methods: {
    scrollPrev() {
      if (this.currentIndex === 0) {
        this.scrollable.prev = true;
        return;
      }
      this.scrollable.next = false;
      this.currentIndex -= 1;
      this.distance = -this.currentIndex * (this.itemWidth + 20);
    },
    scrollNext() {
      if (this.currentIndex === this.itemLength) {
        this.scrollable.next = true;
        return;
      }
      this.scrollable.prev = false;
      this.currentIndex += 1;
      this.distance = -this.currentIndex * (this.itemWidth + 20);
      console.log(this.distance);
    }
  }
};
</script>

<style scoped lang="scss">
.sliders {
  position: relative;
}
.el-tabs__nav-prev,
.el-tabs__nav-next {
  font-size: 30px;
  top: calc(50% - 15px);
  &.is-disabled {
    cursor: not-allowed;
  }
}
.wrapper {
  margin: 0 40px;
  overflow: hidden;
  .list {
    width: 100%;
    display: flex;
    & > div {
      flex-shrink: 0;
    }
  }
}
</style>
