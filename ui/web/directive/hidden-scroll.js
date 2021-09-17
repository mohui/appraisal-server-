import Vue from 'vue';
const tableBodyClass = 'el-table__body-wrapper';

Vue.directive('hidden-scroll', {
  inserted(el, binding, vnode) {
    let targetComp = null;
    //如果是el-table,则要获取下面一层的table-body
    if (vnode.elm.classList.contains('el-table')) {
      targetComp = vnode.elm.getElementsByClassName(tableBodyClass)[0];
    }
    if (!targetComp) targetComp = vnode.elm;
    //开始监听滚动
    if (targetComp) {
      //没滚动时也监测一下滚动条
      scrollHandler(targetComp);
      targetComp.addEventListener('scroll', () => scrollHandler(targetComp));
    }
  }
});

function scrollHandler(targetComp) {
  if (targetComp) {
    let timer = null;
    //显示滚动条
    targetComp.classList.remove('hidden-scroll-bar');
    //滚动条开始的位置
    const start = targetComp.scrollTop;
    //清理定时器
    timer && clearTimeout(timer);
    //隔一秒检查一下是否还在滚动
    timer = setTimeout(() => {
      const end = targetComp.scrollTop;
      if (end === start) {
        //添加隐藏滚动条的样式
        targetComp.classList.add('hidden-scroll-bar');
      }
    }, 1000);
  }
}
export default Vue.directive('hidden-scroll');
