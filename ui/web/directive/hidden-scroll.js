import Vue from 'vue';
const tableBodyClass = 'el-table__body-wrapper';
let timers = []; //用来存各个组件的timer

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
      //随机生成的id
      const tagId = 'tag_' + Math.floor(Math.random() * 1000);
      let timerObj = {timer: null};
      //给组件打上tag标记
      targetComp.id = tagId;
      //放入timer存放数组中
      timers.push({id: tagId, timerObj: timerObj});
      //没滚动时也监测一下滚动条
      scrollHandler(targetComp);
      targetComp.addEventListener('scroll', () => scrollHandler(targetComp));
    }
  }
});

function scrollHandler(targetComp) {
  if (targetComp) {
    //取出目标组件的timer对象
    let timerObj = timers.find(it => it.id === targetComp.id)?.timerObj;
    if (timerObj) {
      //显示滚动条
      targetComp.classList.remove('hidden-scroll-bar');
      //滚动条开始的位置
      const start = targetComp.scrollTop;
      //清理定时器
      timerObj.timer && clearTimeout(timerObj.timer);
      //隔一秒检查一下是否还在滚动
      timerObj.timer = setTimeout(() => {
        const end = targetComp.scrollTop;
        if (end === start) {
          //添加隐藏滚动条的样式
          targetComp.classList.add('hidden-scroll-bar');
        }
      }, 1000);
    }
  }
}
export default Vue.directive('hidden-scroll');
