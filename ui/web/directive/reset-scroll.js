import Vue from 'vue';
const tableBodyClass = 'el-table__body-wrapper';
let pageInfo = []; //用来存储分页器信息数组

Vue.directive('reset-scroll', {
  inserted(el, binding, vnode) {
    //随机分配一个id
    const tagId = 'tag_' + Math.floor(Math.random() * 1000);
    //给组件标记id
    el.id = tagId;
    pageInfo.push({id: tagId, pageSize: 0, pageNo: 1});
  },
  update(el, binding, vnode) {
    const componentInstance = vnode.componentInstance;
    const currentPageSize = componentInstance.pageSize;
    const currentPageNo = componentInstance.currentPage;

    const currentPageInfo = pageInfo.find(it => it.id === el.id);
    //仅组件页码和页长有变动时才执行置顶操作
    if (
      currentPageInfo &&
      (currentPageInfo.pageSize !== currentPageSize ||
        currentPageInfo.pageNo !== currentPageNo)
    ) {
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
      //操作完成后刷新分页器信息
      currentPageInfo.pageNo = currentPageNo;
      currentPageInfo.pageSize = currentPageSize;
    }
  }
});

export default Vue.directive('reset-scroll');
