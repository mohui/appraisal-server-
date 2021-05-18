import Vue from 'vue';
import Router from 'vue-router';
import Layout from './views/layout/layout';
import {getToken, setToken, cleanCache} from './utils/cache';
import {Permission} from '../../common/permission.ts';

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
          meta: {permission: [Permission.HOME, Permission.APPRAISAL_RESULT]},
          component: () => import('./views/home/index')
        },
        {
          path: 'role',
          name: 'role',
          meta: {permission: [Permission.ROLE_INDEX]},
          component: () => import('./views/role/index')
        },
        {
          path: 'user',
          name: 'user',
          meta: {permission: [Permission.USER_INDEX]},
          component: () => import('./views/user/index')
        },
        {
          path: 'appraisal-result',
          name: 'appraisal-result',
          meta: {permission: [Permission.APPRAISAL_RESULT]},
          component: () => import('./views/appraisal-result/index')
        },
        {
          path: 'check',
          name: 'check',
          meta: {permission: [Permission.APPRAISAL_CONFIGURATION_MANAGEMENT]},
          component: () => import('./views/check/index')
        },
        {
          path: 'rule',
          name: 'rule',
          meta: {
            activeMenu: 'check',
            permission: [Permission.APPRAISAL_CONFIGURATION_MANAGEMENT]
          },
          component: () => import('./views/check/rule')
        },
        {
          path: 'basic-data',
          name: 'basic-data',
          meta: {permission: [Permission.APPRAISAL_BASIC_DATA]},
          component: () => import('./views/check/basic-data')
        },
        {
          path: 'basic-data-detail',
          name: 'basic-data-detail',
          meta: {
            activeMenu: 'basic-data',
            permission: [Permission.APPRAISAL_BASIC_DATA]
          },
          component: () => import('./views/check/basic-data-detail')
        },
        {
          path: 'hospital',
          name: 'hospital',
          meta: {permission: [Permission.HOSPITAL]},
          component: () => import('./views/hospital/index')
        },
        {
          path: 'score',
          name: 'score',
          meta: {permission: [Permission.SCORE]},
          component: () => import('./views/score/index')
        },
        {
          path: 'profile',
          name: 'profile',
          component: () => import('./views/profile/index')
        },
        {
          path: 'patient',
          name: 'patient',
          meta: {activeMenu: 'person', permission: [Permission.PROFILE]},
          component: () => import('./views/patient/index')
        },
        {
          path: 'record-healthy',
          name: 'record-healthy',
          meta: {activeMenu: 'person', permission: [Permission.PROFILE]},
          component: () => import('./views/patient/record-healthy')
        },
        {
          path: 'record-diabetes',
          name: 'record-diabetes',
          meta: {activeMenu: 'person', permission: [Permission.PROFILE]},
          component: () => import('./views/patient/record-diabetes')
        },
        {
          path: 'record-hypertension',
          name: 'record-hypertension',
          meta: {activeMenu: 'person', permission: [Permission.PROFILE]},
          component: () => import('./views/patient/record-hypertension')
        },
        {
          path: 'record-old-constitution',
          name: 'record-old-constitution',
          meta: {activeMenu: 'person', permission: [Permission.PROFILE]},
          component: () => import('./views/patient/record-old-constitution')
        },
        {
          path: 'record-oldManSelfCare',
          name: 'record-oldManSelfCare',
          meta: {activeMenu: 'person', permission: [Permission.PROFILE]},
          component: () => import('./views/patient/record-old-man-self-care')
        },
        {
          path: 'record-first-prenatal-check',
          name: 'record-first-prenatal-check',
          meta: {activeMenu: 'person', permission: [Permission.PROFILE]},
          component: () => import('./views/patient/record-first-prenatal-check')
        },
        {
          path: 'record-prenatal-follow-up',
          name: 'record-prenatal-follow-up',
          meta: {activeMenu: 'person', permission: [Permission.PROFILE]},
          component: () => import('./views/patient/record-prenatal-follow-up')
        },
        {
          path: 'record-postpartum-visit',
          name: 'record-postpartum-visit',
          meta: {activeMenu: 'person', permission: [Permission.PROFILE]},
          component: () => import('./views/patient/record-postpartum-visit')
        },
        {
          path: 'record-postpartum-42-days-check',
          name: 'record-postpartum-42-days-check',
          meta: {activeMenu: 'person', permission: [Permission.PROFILE]},
          component: () =>
            import('./views/patient/record-postpartum-42-days-check')
        },
        {
          path: 'record-newborn-visit',
          name: 'record-newborn-visit',
          meta: {activeMenu: 'person', permission: [Permission.PROFILE]},
          component: () => import('./views/patient/record-newborn-visit')
        },
        {
          path: 'record-infant-health-check',
          name: 'record-infant-health-check',
          meta: {activeMenu: 'person', permission: [Permission.PROFILE]},
          component: () => import('./views/patient/record-infant-health-check')
        },
        {
          path: 'record-toddler-health-check',
          name: 'record-toddler-health-check',
          meta: {activeMenu: 'person', permission: [Permission.PROFILE]},
          component: () => import('./views/patient/record-toddler-health-check')
        },
        {
          path: 'record-child-health-check',
          name: 'record-child-health-check',
          meta: {activeMenu: 'person', permission: [Permission.PROFILE]},
          component: () => import('./views/patient/record-child-health-check')
        },
        {
          path: 'development-monitoring-chart',
          name: 'development-monitoring-chart',
          meta: {activeMenu: 'person', permission: [Permission.PROFILE]},
          component: () =>
            import('./views/patient/development-monitoring-chart')
        },
        {
          path: 'person',
          name: 'person',
          meta: {activeMenu: 'person', permission: [Permission.PROFILE]},
          component: () => import('./views/person/list')
        },
        {
          path: '401',
          name: 'page401',
          component: () => import('./views/error/page401')
        },
        {
          path: 'etl',
          name: 'hospital-elt',
          meta: {
            permission: [Permission.ETL_HOSPITAL],
            activeMenu: 'etl-hospital'
          },
          component: () => import('./views/etl/index')
        },
        {
          path: 'audit-log',
          name: 'audit-log',
          meta: {permission: [Permission.AUDIT_LOG]},
          component: () => import('./views/audit/index')
        },
        {
          path: 'medical-performance',
          name: 'medical-performance',
          meta: {
            permission: [
              Permission.APPRAISAL_RESULT,
              Permission.APPRAISAL_CONFIGURATION_MANAGEMENT,
              Permission.APPRAISAL_BASIC_DATA
            ]
          },
          component: () => import('./views/medical-performance/index')
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
router.beforeEach(async (to, from, next) => {
  if (to.name === 'login') {
    cleanCache();
    next();
    return;
  }
  if (!getToken()) {
    cleanCache();
    const {path, query, params} = to;
    from.path === '/' || Vue.prototype.$message.info('登录超时,请重新登录~');
    next({
      path: '/login',
      query: {
        oauth_callback: JSON.stringify({
          path,
          query,
          params
        })
      }
    });
    return;
  }
  //TODO 先解决在刷新时子页面的created周期获取不到$settings缓存的问题
  if (!Vue.prototype.$settings.user || !Vue.prototype.$settings.permissions)
    await Vue.prototype.$settings.load();

  //没有该用户,则跳转登录页
  if (!Vue.prototype.$settings.user) {
    next('/login');
    return;
  }
  //当前用户角色拥有的权限
  const rolePermissions = Vue.prototype.$settings.user.permissions;
  //如果用户是超级管理员权限,则不需要进行权限判断
  if (!rolePermissions.includes(Permission.SUPER_ADMIN)) {
    //如果路由配置了permission,且不为空,则需要进行权限判断
    if (to.meta.permission && to.meta.permission?.length > 0) {
      //判断是否有to的权限
      if (
        !to.meta.permission.some(mp => rolePermissions.some(rp => rp === mp))
      ) {
        next('/401');
        return;
      }
    }
  }

  setToken(getToken());
  next();
});
export default router;
