import Vue from 'vue';
const tableBodyClass = 'el-table__body-wrapper';
let targetComp = null;
let timer = null;

Vue.directive('hidden-scroll', {
  inserted(el, binding, vnode) {
    //默认获取element-table的body元素,因为项目中table滚动条居多
    targetComp = vnode.elm.parentElement.getElementsByClassName(
      tableBodyClass
    )[0];
    //如果不是table则监听当前组件本身dom
    if (!targetComp) targetComp = el;
    //开始监听滚动
    if (targetComp) {
      //没滚动时也监测一下滚动条
      scrollHandler(targetComp);
      targetComp.addEventListener('scroll', scrollHandler);
    }
  },
  unbind() {
    if (targetComp) {
      //清理定时器
      clearTimeout(timer);
      //解除监听事件
      targetComp.removeEventListener('scroll', scrollHandler);
    }
  }
});

function scrollHandler() {
  if (targetComp) {
    //显示滚动条
    targetComp.classList.remove('hidden-scroll-bar');
    //滚动条开始的位置
    const start = targetComp.scrollTop;
    //清理定时器
    clearTimeout(timer);
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
