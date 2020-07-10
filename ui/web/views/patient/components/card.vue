<template>
  <el-card shadow="never" style="margin-bottom:20px;">
    <div slot="header" class="clearfix">
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
      <p><span>建档机构: </span>{{ patient.operateOrganization.name }}</p>
      <p><span>建档日期: </span>{{ patient.fileDate.toLocaleString() }}</p>
      <p><span>管理机构: </span>{{ patient.organization.name }}</p>
    </div>

    <div class="patient-tag">
      <div class="patient-tag-header">
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
    <div class="patient-tag">
      <div class="patient-tag-header">
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
            v-loading="
              code === tag.code &&
                $asyncComputed.nonstandardCauseListSeverData.updating
            "
            :ref="tag.code"
            @show="code = tag.code"
            :disabled="tag.type"
            :popper-options="{
              boundariesElement: 'viewport',
              removeOnDestroy: true
            }"
            placement="top-start"
            width="200"
            trigger="hover"
          >
            <div v-html="nonstandardCauseList"></div>
            <i style="font-style: normal" slot="reference">{{ tag.label }}</i>
          </el-popover>
        </el-tag>
      </div>
    </div>
  </el-card>
</template>

<script>
export default {
  data() {
    return {
      code: ''
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
    nonstandardCauseList() {
      if (!this.nonstandardCauseListSeverData) return [];
      return this.nonstandardCauseListSeverData
        .map(it => {
          return it.content;
        })
        .join('<br>');
    }
  },
  asyncComputed: {
    nonstandardCauseListSeverData: {
      async get() {
        return await this.$api.Person.markContent(this.patient.id, this.code);
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
    nonstandardCauseList() {
      if (this.$refs[this.code]) {
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
  font-size: 14px;
  padding: 15px 0;
  span {
    padding-left: 4px;
  }
  .patient-medicine-header,
  .patient-tag-header {
    border-bottom: 1px solid #dfe6ec;
    padding-bottom: 10px;
    margin-bottom: 10px;
    font-weight: bold;
  }
}
</style>
