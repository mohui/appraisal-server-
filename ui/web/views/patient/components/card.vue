<template>
  <el-card shadow="never" style="margin-bottom:20px;">
    <div slot="header" class="clearfix">
      <span>患者信息</span>
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
      <p>户籍地址: {{ patient.census }}</p>
      <p>联系电话: {{ patient.phone }}</p>
      <p>建档机构: {{ patient.operateOrganization.name }}</p>
      <p>建档日期: {{ patient.fileDate.toLocaleString() }}</p>
      <p>管理机构: {{ patient.organization.name }}</p>
    </div>

    <div class="patient-tag">
      <div class="patient-tag-header">
        <span>患者标签</span>
      </div>
      <div class="patient-tag-body">
        <el-tag type="warning">慢病患者</el-tag>
        <el-tag type="warning">高血压</el-tag>
      </div>
    </div>

    <div class="patient-medicine">
      <div class="patient-medicine-header">
        <span>常用药物</span>
      </div>
      <div class="patient-medicine-body">
        <div class="patient-medicine-item">
          <span>非洛地平（波一定）</span>
        </div>
        <div class="patient-medicine-item">
          <span>氨氯地平（络活喜、施慧达）尼群、尼莫地平</span>
        </div>
        <div class="patient-medicine-item">
          <span>拉西地平</span>
        </div>
        <div class="patient-medicine-item">
          <span>硝苯地平（心痛定）</span>
        </div>
      </div>
    </div>
  </el-card>
</template>

<script>
export default {
  props: {
    patient: {
      type: Object,
      default: () => {
        return {
          id: '',
          avatar:
            'https://pic4.zhimg.com/80/v2-3cdfb5a464dc931630dd359b71a10587_1440w.jpg',
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
  }
};
</script>

<style lang="scss" scoped>
.box-center {
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
