<template>
  <el-card shadow="never" class="resident">
    <div slot="header" class="title">
      <img
        class="icon"
        :src="require('../../../../assets/residentInformation.png').default"
        alt="居民信息"
      />
      <span>居民信息</span>
    </div>

    <div class="patient-profile">
      <div>
        <img class="avatar" :src="patient.avatar" />
      </div>
      <div class="box-center">
        <div class="patient-name text-center">{{ patient.name }}</div>
        <div class="patient-address text-center text-muted">
          {{ patient.address }}
        </div>
      </div>
    </div>
    <div class="patient-info">
      <p><span>户籍地址: </span>{{ patient.census }}</p>
      <p><span>联系电话: </span>{{ patient.phone }}</p>
      <p>
        <span>建档机构: </span
        ><span v-if="patient.operateOrganization">{{
          patient.operateOrganization.name
        }}</span>
      </p>
      <p><span>建档日期: </span>{{ patient.fileDate.toLocaleString() }}</p>
      <p><span>管理机构: </span>{{ patient.organization.name }}</p>
    </div>

    <div class="patient-tag">
      <div class="patient-tag-header">
        <img
          class="icon"
          :src="require('../../../../assets/crowdClassification.png').default"
          alt="人群分类"
        />
        <span>人群分类</span>
      </div>
      <div class="patient-tag-body">
        <el-tag
          v-for="tag of patient.personTags"
          :key="tag.label"
          style="margin:0 5px 5px 0"
          size="mini"
          :type="tag.type ? 'primary' : 'danger'"
          >{{ tag.label }}
        </el-tag>
      </div>
    </div>
    <div class="patient-tag" style="margin-bottom: 40px;">
      <div class="patient-tag-header">
        <img
          class="icon"
          :src="require('../../../../assets/residentLabel.png').default"
          alt="居民标签"
        />
        <span>居民标签</span>
      </div>
      <div class="patient-tag-body">
        <el-tag
          v-for="tag of patient.tags"
          :key="tag.label"
          style="margin:0 5px 5px 0"
          size="mini"
          :type="tag.type ? 'primary' : 'danger'"
        >
          <el-popover
            :ref="tag.code"
            @show="code = tag.code"
            :disabled="
              tag.type ||
                !$settings.permissions.includes(permission.TAGS_DETAIL)
            "
            :popper-options="{
              boundariesElement: 'viewport',
              removeOnDestroy: true
            }"
            placement="top"
            width="200"
            trigger="click"
          >
            <div
              v-loading="
                code === tag.code &&
                  $asyncComputed.nonstandardCausesSeverData.updating
              "
              v-html="nonstandardCauses"
            ></div>
            <i
              :style="{
                cursor:
                  !tag.type &&
                  $settings.permissions.includes(permission.TAGS_DETAIL)
                    ? 'pointer'
                    : 'auto',
                'font-style': 'normal'
              }"
              slot="reference"
              >{{ tag.label }}</i
            >
          </el-popover>
        </el-tag>
      </div>
    </div>
    <el-alert
      title="注意: 档案内容为最近一次同步数据, 与年度无关!"
      type="warning"
      center
      :closable="false"
      show-icon
    >
    </el-alert>
  </el-card>
</template>

<script>
import {Permission} from '../../../../../common/permission.ts';

export default {
  data() {
    return {
      code: '',
      permission: Permission
    };
  },
  props: {
    patient: {
      type: Object,
      default: () => {
        return {
          id: '',
          avatar: '',
          name: '',
          address: '',
          census: '', //户籍地址
          phone: '', //联系电话
          operateOrganization: {
            //建档机构
            id: '',
            name: ''
          },
          organization: {
            id: '',
            name: ''
          },
          fileDate: '' //建档日期
        };
      }
    }
  },
  computed: {
    //居民标签不规范的具体原因
    nonstandardCauses() {
      if (!this.nonstandardCausesSeverData) return '数据出错了';
      return this.nonstandardCausesSeverData
        .map(it => {
          return it.content;
        })
        .join('<br>');
    }
  },
  asyncComputed: {
    nonstandardCausesSeverData: {
      async get() {
        let result = await this.$api.Person.markContent(
          this.patient.id,
          this.code
        );
        if (result.length === 0) {
          result = [{content: '暂无数据'}];
        }
        return result;
      },
      shouldUpdate() {
        return this.code;
      },
      default() {
        return [];
      }
    }
  },
  watch: {
    //指标得分解读详情数据
    nonstandardCauses() {
      if (this.$refs[this.code]) {
        console.log('card fa', this.$refs);

        //数据返回后更新popper，重新修正定位
        this.$nextTick(() => {
          this.$refs[this.code][0].updatePopper();
        });
      }
    }
  }
};
</script>

<style lang="scss" scoped>
.resident {
  margin-bottom: 20px;
  .icon {
    width: 26px;
    margin-right: 10px;
  }
  ::v-deep .el-card__header {
    border: none;
  }
  .title {
    display: flex;
    align-items: center;
  }
}
.box-center {
  text-align: center;
  margin: 0 auto;
  display: table;
}
.text-muted {
  color: #777;
}
.patient-profile {
  .patient-name {
    font-weight: bold;
  }
  .avatar {
    max-width: 300px;
    border-radius: 50%;
    margin: 0 auto;
    display: block;
  }
  .box-center {
    padding-top: 10px;
  }
}
.patient-info {
  font-size: 14px;
  p {
    span {
      font-size: 12px;
      color: #666;
    }
  }
}
.patient-medicine,
.patient-tag {
  margin-top: 20px;
  color: #606266;
  padding: 15px 0;
  .patient-medicine-header,
  .patient-tag-header {
    padding-bottom: 10px;
    margin-bottom: 10px;
    display: flex;
    align-items: center;
  }
}
</style>
