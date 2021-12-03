<template>
  <div></div>
</template>

<script>
import {UserType} from '../../../../common/user.ts';
import dayjs from 'dayjs';
import {Permission} from '../../../../common/permission.ts';
import Menus from '../../utils/menus';
export default {
  name: 'Home',
  created() {
    const user = this.$settings.user;
    if (user.type === UserType.STAFF) {
      //进入该员工的考核结果详情页
      this.$router.replace(
        `/personal-appraisal-results?id=${user.id}&date=${JSON.stringify(
          dayjs()
            .startOf('M')
            .toDate()
        )}`
      );
      return;
    }
    if (user.type === UserType.ADMIN) {
      if (user.permissions.includes(Permission.APPRAISAL_RESULT)) {
        //进入考核结果页
        this.$router.replace({path: 'appraisal-result'});
        return;
      } else if (user.permissions.includes(Permission.MEDICAL_PERFORMANCE)) {
        this.$router.replace({path: 'medical-performance'});
        return;
      }
    }
    //以上都没有,则判断当前用户拥有权限的第一个菜单
    const filterMenu = Menus.find(
      //没有配置permission谁都可以访问的菜单或者当前用户拥有权限的菜单
      c => !c.permission || c.permission.some(p => user.permissions.includes(p))
    );
    if (filterMenu) {
      this.$router.replace(filterMenu.router || filterMenu.children[0].router);
    }
  }
};
</script>

<style scoped></style>
