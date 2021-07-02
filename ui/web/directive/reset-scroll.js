import Vue from 'vue';
const tableBodyClass = 'el-table__body-wrapper';

Vue.directive('reset-scroll', {
  bind(el, binding, vnode) {
    el.addEventListener('click', () => resetScroll(vnode, binding.value));
  }
});
function resetScroll(ele, className) {
  let tableBody = {scrollTop: 0};
  const tableDiv = ele.elm.parentElement.getElementsByClassName(className)[0];

  //如果有指定的div类,先获取该div,再获取div里面的table-body元素
  if (tableDiv) tableBody = tableDiv.getElementsByClassName(tableBodyClass)[0];

  //如果没有指定的div,默认获取element-table的body元素
  if (!tableDiv)
    tableBody = ele.elm.parentElement.getElementsByClassName(tableBodyClass)[0];

  if (tableBody?.scrollTop >= 0) {
    tableBody.scrollTop = 0;
  }
}
export default Vue.directive('reset-scroll');
