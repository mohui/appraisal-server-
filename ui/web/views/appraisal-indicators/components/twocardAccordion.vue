<template>
  <div class="accordion">
    <div class="accordionTitle">
      <div class="accordionTitleL lefttext" v-text="AccordionData"></div>
      <div class="ClickArea" @click="Shrink">
        <div class="accordionTitleR lefttext" v-text="RightContent"></div>
        <div class="accordionTitleR lefttext sizes">
          <slot name="Sizes"></slot>
        </div>
      </div>
    </div>
    <div>
      <slot name="Progress"></slot>
    </div>
    <div class="accordionBody" ref="AccordionBody">
      <slot name="First"></slot>
    </div>
  </div>
</template>
<script>
export default {
  props: ['AccordionData', 'Accordionindex'],
  mounted() {
    this.Shrink();
  },
  data() {
    return {
      RightContent: '收起',
      isshow: this.Accordionindex,
      isShrink: false
    };
  },
  methods: {
    Shrink() {
      let AllHiden = this.$refs.AccordionBody;
      let eleMoreHeight = AllHiden.childNodes[0].offsetHeight;
      AllHiden.style.height = eleMoreHeight + 'px';
      setTimeout(() => {
        if (this.isshow === 0) {
          AllHiden.style.height = '0px';
          this.isshow = 1;
          this.RightContent = '展开';
          this.isShrink = false;
        } else {
          AllHiden.style.height = eleMoreHeight + 32 + 'px';
          this.isshow = 0;
          this.RightContent = '收起';
          this.isShrink = true;
        }
      }, 1);
    }
  }
};
</script>
<style scoped>
.accordion {
  width: 100%;
  height: auto;
}
.accordionTitle {
  height: 30px;
  padding: 0px 20px 0px 20px;
  display: flex;
}
.accordionBody {
  position: relative;
  height: auto;
  overflow: hidden;
  -webkit-transition: height 0.6s;
  -moz-transition: height 0.6s;
  -o-transition: height 0.6s;
  transition: height 0.6s;
}
.accordionTitleL {
  float: left;
  font-size: 14px;
}
.accordionTitleR {
  width: 30px;
  line-height: 30px;
  float: right;
  font-size: 14px;
  color: #518bdc;
  margin-right: 30px;
  cursor: pointer;
}
.lefttext {
  height: 50px;
  line-height: 50px;
}
.sizes {
  margin: 0 10px;
  color: #333;
}
.ClickArea {
  flex: 1;
}
</style>
