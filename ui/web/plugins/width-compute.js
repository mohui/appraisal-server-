import Vue from 'vue';

function computeWidth(texts) {
  const widths = texts
    .map(it => (!it ? '' : it.toString()))
    .sort((a, b) => (a.length < b.length ? 1 : -1))
    .slice(0, 5)
    .map(text => {
      const UNIT_LENGTH = 12;
      const container = Vue.prototype.$spanElement;
      if (container) {
        container.innerText = text;
        return container.offsetWidth;
      } else {
        return text.length * UNIT_LENGTH + 25;
      }
    });
  return Math.max(...widths);
}

function createSpanElement() {
  const spanContainer = document.createElement('span');
  spanContainer.classList.add('span-compute-container');
  document.body.appendChild(spanContainer);
  return spanContainer;
}

export default {
  install(Vue) {
    Vue.prototype.$spanElement = createSpanElement();
    Vue.prototype.$widthCompute = content => computeWidth(content);
  }
};
