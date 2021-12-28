<template>
  <el-dialog
    :visible.sync="visible"
    :width="$settings.isMobile ? '99%' : '40%'"
    :before-close="() => reset()"
  >
    <el-form :model="itemType" label-position="left" label-width="100px">
      <el-row>
        <el-col :span="24">
          <el-form-item label="分类名称" prop="work">
            <el-input style="width: 50%" v-model="itemType.name" size="mini">
            </el-input>
          </el-form-item>
        </el-col>

        <el-col :span="24">
          <el-form-item label="排序" props="remark">
            <el-input-number
              v-model="itemType.sort"
              :min="0"
              size="mini"
            ></el-input-number>
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>
    <div slot="footer" class="dialog-footer">
      <el-button size="mini" @click="reset()">取 消</el-button>
      <el-button
        v-loading="btnLoading"
        class="work-submit-loading"
        size="mini"
        type="primary"
        :disabled="!itemType.name"
        @click="submit()"
      >
        确 定
      </el-button>
    </div>
  </el-dialog>
</template>

<script>
export default {
  name: 'WorkTypeDialog',
  data() {
    return {
      btnLoading: false
    };
  },
  props: {
    visible: {
      type: Boolean,
      required: true,
      default: false
    },
    itemType: {
      type: Object,
      required: false
    }
  },
  methods: {
    reset() {
      this.$parent.resetItemType();
    },
    async submit() {
      try {
        this.btnLoading = true;
        await this.$api.HisWorkItem.workItemTypeUpsert(
          this.itemType.id || null,
          this.itemType.name,
          this.itemType.sort
        );
        this.$parent.$asyncComputed.itemTypeData.update();
        this.$parent.$asyncComputed.serverData.update();
        this.$parent.resetItemType();
      } catch (e) {
        this.$message.error(e.message);
      } finally {
        this.btnLoading = false;
      }
    }
  }
};
</script>

<style scoped></style>
