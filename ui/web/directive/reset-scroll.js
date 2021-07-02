import Vue from 'vue';
const tableBodyClass = 'el-table__body-wrapper';

Vue.directive('reset-scroll', {
  bind(el, binding, vnode) {
    el.addEventListener('click', () => {
      const refId = binding.value;
      if (refId) {
        //指定了ref,则只获取该ref的table-body
        const tableComp = vnode.context.$refs[binding.value];
        if (tableComp) {
          let bodyWrapper;
          if (tableComp instanceof Array)
            bodyWrapper = tableComp[0].$refs.bodyWrapper;
          else bodyWrapper = tableComp.$refs.bodyWrapper;
          //将table的滚动条置顶
          if (bodyWrapper) bodyWrapper.scrollTop = 0;
        }
      }
      if (!refId) {
        //没有指定ref,默认获取element-table的body元素
        const tableBody = vnode.elm.parentElement.getElementsByClassName(
          tableBodyClass
        )[0];
        if (tableBody?.scrollTop >= 0) tableBody.scrollTop = 0; //将table的滚动条置顶
      }
    });
  }
});

export default Vue.directive('reset-scroll');
