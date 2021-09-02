<template>
  <div v-loading="isLoading" class="flex-column-layout">
    <div class="jx-header">
      <div>
        <span class="header-title">{{ query.name }}</span>
        <el-date-picker
          v-model="query.month"
          style="margin: 0 20px"
          size="mini"
          type="month"
          placeholder="选择月"
          :clearable="false"
          @change="monthChanged"
        >
        </el-date-picker>
        <el-select
          v-if="query.input === MD.LOG"
          v-model="searchForm.member"
          size="mini"
          clearable
          filterable
          placeholder="请选择考核员工"
          @change="monthChanged"
        >
          <el-option
            v-for="item in members"
            :key="item.id"
            :label="item.name"
            :value="item.id"
          >
          </el-option>
        </el-select>
      </div>
      <div>
        <el-button
          style="margin: -4px 0 0 20px;"
          size="small"
          type="primary"
          @click="$message.warning('此功能正在开发中。。。')"
          >导入
        </el-button>
        <el-button
          v-if="query.input === MD.LOG"
          style="margin: -4px 0 0 20px;"
          size="small"
          type="primary"
          @click="dialogFormVisible = true"
          >添加
        </el-button>
        <el-button
          style="margin: -4px 0 0 20px;"
          size="small"
          type="primary"
          plain
          @click="
            $router.push({
              name: 'manual'
            })
          "
          >返回
        </el-button>
      </div>
    </div>
    <el-table
      v-if="query.input === MD.PROP"
      :data="list"
      empty-text="没有筛选到符合条件的数据"
      height="100%"
      style="flex-grow: 1;"
      :row-class-name="getRowClass"
    >
      <el-table-column type="expand">
        <template slot-scope="scope">
          <el-tabs v-model="activeName">
            <el-tab-pane
              :label="scope.row.staff.name + ' 的修改记录：'"
              name="first"
            ></el-tab-pane>
          </el-tabs>
          <el-table
            :data="scope.row.children"
            stripe
            border
            size="small"
            height="100%"
          >
            <el-table-column type="index" width="50" label="序号">
            </el-table-column>
            <el-table-column prop="value" label="数值"> </el-table-column>
            <el-table-column prop="files" label="附件">
              <template slot-scope="scope">
                <el-image
                  v-if="scope.row.hasFile"
                  style="width: 20px; height: 20px"
                  :src="scope.row.files[0]"
                  :preview-src-list="scope.row.files"
                >
                </el-image>
              </template>
            </el-table-column>
            <el-table-column prop="remark" label="备注"> </el-table-column>
            <el-table-column prop="date" label="时间"> </el-table-column>
            <el-table-column label="操作">
              <template slot-scope="scope">
                <el-tooltip content="清除" :enterable="false">
                  <el-button
                    type="danger"
                    icon="el-icon-delete"
                    circle
                    size="mini"
                    @click="delManual(scope)"
                  >
                  </el-button>
                </el-tooltip>
              </template>
            </el-table-column>
          </el-table>
        </template>
      </el-table-column>
      <el-table-column align="center" width="50" label="序号">
        <template slot-scope="scope">
          {{ scope.$index + 1 }}
        </template>
      </el-table-column>
      <el-table-column prop="members" label="考核员工">
        <template slot-scope="scope">
          {{ scope.row.staff.name }}
        </template>
      </el-table-column>
      <el-table-column prop="value" label="数值" align="center">
      </el-table-column>
      <el-table-column
        prop="size"
        label="次数"
        align="center"
      ></el-table-column>
      <el-table-column label="操作" align="center">
        <template slot-scope="scope">
          <div v-if="!editable">
            <el-tooltip content="修改" :enterable="false">
              <el-button
                type="primary"
                icon="el-icon-edit"
                circle
                size="mini"
                @click="editManual(scope)"
              >
              </el-button>
            </el-tooltip>
            <el-tooltip content="清除" :enterable="false">
              <el-button
                type="danger"
                icon="el-icon-delete"
                circle
                size="mini"
                @click="delManual(scope)"
              >
              </el-button>
            </el-tooltip>
          </div>
          <div v-else>
            已结算
          </div>
        </template>
      </el-table-column>
    </el-table>
    <el-table
      v-if="query.input === MD.LOG"
      :data="list"
      empty-text="没有筛选到符合条件的数据"
      height="100%"
      style="flex-grow: 1;"
    >
      <el-table-column type="index" width="50" label="序号"> </el-table-column>
      <el-table-column prop="members" label="考核员工">
        <template slot-scope="scope">
          {{ scope.row.staff.name }}
        </template>
      </el-table-column>
      <el-table-column prop="value" label="数值" align="center">
      </el-table-column>
      <el-table-column prop="files" label="附件" align="center">
        <template slot-scope="scope">
          <el-image
            v-if="scope.row.hasFile"
            style="width: 20px; height: 20px"
            :src="scope.row.files[0]"
            :preview-src-list="scope.row.files"
          >
          </el-image>
        </template>
      </el-table-column>
      <el-table-column prop="remark" label="备注"></el-table-column>
      <el-table-column
        prop="createdAt"
        label="时间"
        align="center"
      ></el-table-column>
      <el-table-column label="操作" align="center">
        <template slot-scope="scope">
          <div v-if="!editable">
            <el-tooltip content="清除" :enterable="false">
              <el-button
                type="danger"
                icon="el-icon-delete"
                circle
                size="mini"
                @click="delManual(scope)"
              >
              </el-button>
            </el-tooltip>
          </div>
          <div v-else>
            已结算
          </div>
        </template>
      </el-table-column>
    </el-table>
    <el-dialog
      :title="query.input === MD.LOG ? '新增信息' : '修改信息'"
      :visible.sync="dialogFormVisible"
      :before-close="handleClose"
      :width="$settings.isMobile ? '99%' : '50%'"
    >
      <el-form
        :model="curManual"
        :rules="rules"
        ref="manualForm"
        label-position="right"
        label-width="120px"
        size="mini"
      >
        <el-form-item label="考核员工：" prop="staff">
          <div v-if="query.input === MD.PROP">
            {{ curManual.staff.name }}
          </div>
          <el-select
            v-if="query.input === MD.LOG"
            v-model="curManual.staff.id"
            filterable
            size="mini"
            placeholder="请选择"
          >
            <el-option
              v-for="item in members"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            >
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="分值：" prop="value">
          <el-input-number
            v-model="curManual.value"
            size="mini"
          ></el-input-number>
        </el-form-item>
        <el-form-item label="上传文件：">
          <el-upload
            ref="uploadForm"
            accept=".jpg,.jpeg,.gif,.png"
            action="/api/Upload/uploadHisManualAttach.ac"
            :multiple="false"
            :headers="headers"
            :before-upload="handleBeforeUpload"
            :on-success="uploadSuccess"
            :on-error="uploadError"
            :on-remove="handleRemove"
            :file-list="fileList"
          >
            <el-button plain size="small" type="primary">点击上传</el-button>
          </el-upload>
        </el-form-item>
        <el-form-item label="备注：">
          <el-input
            v-model="curManual.remark"
            type="textarea"
            rows="3"
          ></el-input>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button size="small" plain @click="dialogFormVisible = false">
          取 消
        </el-button>
        <el-button
          size="small"
          type="primary"
          :loading="saveLoading"
          @click="saveManual"
          >保存
        </el-button>
      </div>
    </el-dialog>
    <el-dialog
      title="图片预览"
      :visible.sync="dialogImgVisible"
      width="50%"
      :before-close="handleImgClose"
    >
      <div style="text-align: center;">
        <el-image :src="imgUrl" fit="cover"></el-image>
      </div>
      <span slot="footer" class="dialog-footer">
        <el-button @click="handleImgClose">关闭</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import {HisManualDataInput as MD} from '../../../../common/his.ts';
import {getToken} from '../../utils/cache';

export default {
  name: 'Update',
  data() {
    return {
      activeName: 'first',
      searchForm: {
        member: ''
      },
      saveLoading: false,
      dialogImgVisible: false,
      imgUrl: '',
      dialogFormVisible: false,
      curManual: {
        files: [],
        staff: {
          id: '',
          name: ''
        },
        value: '',
        remark: ''
      },
      rules: {
        staff: [{required: true, message: '请选择考核员工', trigger: 'change'}],
        value: [{required: true, message: '请输入分值', trigger: 'change'}]
      },
      headers: {token: getToken()},
      maxSize: 5,
      fileList: [],
      MD: MD,
      isLoading: true,
      editable: false,
      query: {
        id: '',
        name: '',
        type: '',
        input: '',
        month: new Date()
      },
      members: [],
      list: []
    };
  },
  async created() {
    const {id} = this.$route.query;
    this.query.id = id;
    await this.monthChanged();
    this.getMembers();
  },
  methods: {
    //保存图片预览窗口
    handleImgClose() {
      this.dialogImgVisible = false;
      this.imgUrl = '';
    },
    //关闭编辑窗口
    handleClose() {
      this.fileList = [];
      this.dialogFormVisible = false;
      this.curManual = {
        files: [],
        staff: {
          id: '',
          name: ''
        },
        value: '',
        remark: ''
      };
    },
    //删除上传图片
    async handleRemove(file) {
      const index = this.curManual.files.findIndex(it => it === file.response);
      try {
        await this.$api.Upload.remove(file.response);
        this.curManual.files.splice(index, 1);
      } catch (e) {
        this.$message.error(e.message);
      }
    },
    //上传前验证
    handleBeforeUpload(file) {
      const fType = ['jpg', 'jpeg', 'gif', 'png'];
      const fName = file.name
        .split('.')
        .pop()
        .toLowerCase();
      const hasType = fType.some(it => it === fName);
      const isLt5M = file.size / 1024 / 1024 < this.maxSize;

      if (!hasType) {
        this.$message.error("仅允许上传'jpg', 'jpeg', 'gif', 'png' 格式文件！");
        return false;
      }
      if (!isLt5M) {
        this.$message.error(`文件大小不能超过${this.maxSize}M!`);
        return false;
      }
      return true;
    },
    //上传成功
    uploadSuccess(res) {
      if (res._KatoErrorCode_) {
        this.$message.error('文件上传失败');
        return;
      }
      this.curManual.files.push(res);
    },
    //上传失败
    uploadError(e) {
      this.$message.error(e.message);
    },
    //表格行是否有展开图标
    getRowClass({row}) {
      if (!row.children.length) {
        return 'row-expand-cover';
      }
    },
    //获取结算状态
    async getSettle() {
      const {name, input, settle} = await this.$api.HisManualData.get(
        this.query.id,
        this.query.month
      );
      this.editable = settle;
      this.query = Object.assign({}, this.query, {name, input});
    },
    //切换月份
    async monthChanged() {
      this.isLoading = true;
      await this.getSettle();
      const {id, input, month} = this.query;
      const {member} = this.searchForm;
      this.list =
        input === MD.PROP
          ? await this.getListData(id, month)
          : await this.getListLogData(id, month, member);
      this.isLoading = false;
    },
    //获取员工列表
    async getMembers() {
      this.members = await this.$api.HisStaff.list();
    },
    //获取属性数据列表
    async getListData(id, month) {
      const result = await this.$api.HisManualData.listData(id, month);
      return await Promise.all(
        result.map(async it => ({
          ...it,
          children: await Promise.all(
            it.children.map(async i => {
              const files = await Promise.all(
                (i?.files ?? []).map(url => this.$api.Upload.sign(url))
              );
              return {
                ...i,
                hasFile: !!i.files?.length,
                files,
                date: i.date.$format()
              };
            })
          )
        }))
      );
    },
    //获取日志数据列表
    async getListLogData(id, month, member) {
      const result = await this.$api.HisManualData.listLogData(
        id,
        month,
        member || null
      );
      return await Promise.all(
        result.map(async it => {
          const files = await Promise.all(
            (it?.files ?? []).map(url => this.$api.Upload.sign(url))
          );

          return {
            ...it,
            hasFile: !!it.files?.length,
            files,
            createdAt: it.date?.$format()
          };
        })
      );
    },
    editManual({row}) {
      this.dialogFormVisible = true;
      this.curManual = Object.assign({files: []}, row);
    },
    //保存数据
    async saveManual() {
      const {id, input, month} = this.query;
      const API = input === MD.PROP ? 'setData' : 'addLogData';
      const {staff, value, files, remark} = this.curManual;
      const valid = await this.$refs['manualForm'].validate();
      if (!valid) return;
      if (!staff.id) {
        this.$message.warning('请选择要考核的员工');
        return;
      }
      this.saveLoading = true;
      try {
        await this.$api.HisManualData[API](
          staff.id,
          id,
          value,
          month,
          files,
          remark || null
        );
        await this.monthChanged();
        this.$message.success(input === MD.PROP ? '更新成功!' : '添加成功！');
      } catch (e) {
        this.$message.error(e.message);
      } finally {
        this.handleClose();
        this.saveLoading = false;
      }
    },
    //清除数据记录
    delManual({$index, row}) {
      this.$confirm('确定要清除此记录?', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
        .then(async () => {
          try {
            this.query.input === MD.PROP && row.staff
              ? await this.$api.HisManualData.delData(
                  row.staff.id,
                  row.item,
                  this.query.month
                )
              : await this.$api.HisManualData.delLogData(row.id);
            if (this.query.input === MD.LOG) {
              this.list.splice($index, 1);
            } else {
              await this.monthChanged();
            }
            this.$message({
              type: 'success',
              message: '清除成功!'
            });
          } catch (e) {
            this.$message.error(e.message);
          }
        })
        .catch(() => {
          this.$message({
            type: 'info',
            message: '已取消清除'
          });
        });
    }
  }
};
</script>

<style lang="scss">
.manual-card {
  .row-expand-cover {
    .el-table__expand-icon {
      visibility: hidden;
    }
  }
  .el-icon-picture-outline {
    cursor: pointer;
    color: #409eff;
    font-size: 20px;
    margin: 0 5px;
  }
}
</style>
