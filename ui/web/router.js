import Vue from 'vue';
import Router from 'vue-router';
import Layout from './views/layout/layout';
import {getToken, setToken, cleanCache} from './utils/cache';

Vue.use(Router);
const router = new Router({
  mode: 'history',
  routes: [
    {
      path: '/',
      component: Layout,
      redirect: '/home',
      children: [
        {
          path: 'home',
          name: 'home',
          component: () => import('./views/home/index')
        },
        {
          path: 'test',
          name: 'test',
          component: () => import('./views/test/test')
        },
        {
          path: 'role',
          name: 'role',
          component: () => import('./views/role/index')
        },
        {
          path: 'user',
          name: 'user',
          component: () => import('./views/user/index')
        },
        {
          path: 'appraisal-indicators',
          name: 'appraisal-indicators',
          component: () => import('./views/appraisal-indicators/index')
        },
        {
          path: 'check',
          name: 'check',
          component: () => import('./views/check/index')
        },
        {
          path: 'rule',
          name: 'rule',
          meta: {activeMenu: 'check'},
          component: () => import('./views/check/rule')
        },
        {
          path: 'basic-data',
          name: 'basic-data',
          component: () => import('./views/check/basic-data')
        },
        {
          path: 'basic-data-detail',
          name: 'basic-data-detail',
          meta: {activeMenu: 'basic-data'},
          component: () => import('./views/check/basic-data-detail')
        }
      ]
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('./views/login/index')
    }
  ]
});
router.beforeEach((to, from, next) => {
  if (to.name === 'login') {
    cleanCache();
    next();
    return;
  }
  if (!getToken()) {
    cleanCache();
    from.path === '/' || Vue.prototype.$message.info('登录超时,请重新登录~');
    next('/login');
    return;
  }
  setToken(getToken());
  next();
});
export default router;
