<template>
  <div class="flex-column-layout">
    <div class="jx-header">
      <div>
        <span class="header-title">金额列表</span>
        <el-select
          v-model="params.year"
          size="small"
          placeholder="请选择考核年度"
          style="margin: 0 20px;"
          @change="handleYearChange(params.year)"
        >
          <el-option
            v-for="item in yearList"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          >
          </el-option>
        </el-select>
        <el-button-group>
          <el-button
            size="small"
            :class="{'el-button--primary': params.flag === 'real'}"
            @click="tagTypeChanged('real')"
          >
            实时金额
          </el-button>
          <el-button
            size="small"
            :class="{'el-button--primary': params.flag === 'total'}"
            @click="tagTypeChanged('total')"
          >
            年度结算
          </el-button>
        </el-button-group>
      </div>
      <span v-show="params.flag === 'real'">
        <el-button
          v-loading="loadingAreaBudget"
          :disabled="loadingAreaBudget"
          size="small"
          type="primary"
          @click="openAreaBudgetVoucherDialog()"
        >
          结算
        </el-button>
      </span>
    </div>
    <el-table
      v-show="params.flag === 'real'"
      v-hidden-scroll
      v-loading="$asyncComputed.hospitalListServerData.updating"
      :data="hospitalListData"
      height="100%"
      style="flex-grow: 1;"
      row-key="uuid"
      lazy
      :load="load"
      :tree-props="{children: 'children', hasChildren: 'hasChildren'}"
      :cell-class-name="cellClassHover"
      @row-click="handleCellClick"
    >
      <el-table-column align="center" label="序号" width="160px" prop="uuid">
      </el-table-column>
      <el-table-column align="center" label="名称" prop="name">
      </el-table-column>
      <el-table-column
        align="center"
        label="校正后总工分值"
        prop="correctWorkPointFormat"
      >
      </el-table-column>
      <el-table-column align="center" label="质量系数" prop="rateFormat">
      </el-table-column>
      <el-table-column align="center" label="金额" prop="budgetFormat">
      </el-table-column>
    </el-table>
    <el-table
      v-show="params.flag === 'total'"
      v-loading="$asyncComputed.areaBudgetService.updating"
      :data="areaBudgetData"
      height="100%"
      style="flex-grow: 1;"
      row-key="uuid"
      lazy
      :load="loadAreaBudget"
      :tree-props="{children: 'children', hasChildren: 'hasChildren'}"
      :cell-class-name="cellClassHover"
      @row-click="handleCellClick"
    >
      <el-table-column align="center" label="序号" width="160px" prop="uuid">
      </el-table-column>
      <el-table-column align="center" label="名称" prop="name">
      </el-table-column>
      <el-table-column
        align="center"
        label="校正后总工分值"
        prop="correctWorkPointFormat"
      >
      </el-table-column>
      <el-table-column align="center" label="质量系数" prop="rateFormat">
      </el-table-column>
      <el-table-column align="center" label="结算金额" prop="budgetFormat">
      </el-table-column>
      <el-table-column align="center" label="结算时间" prop="dateFormat">
      </el-table-column>
      <el-table-column align="center" label="付款金额" prop="moneyFormat">
      </el-table-column>
      <el-table-column align="center" label="操作" prop="">
        <template slot-scope="{row}">
          <el-button
            size="mini"
            :type="row.vouchers.length > 0 ? 'success' : 'primary'"
            @click="openVoucherDialog(row)"
            >{{ row.vouchers.length > 0 ? '修改凭证' : '上传凭证' }}
          </el-button>
        </template>
      </el-table-column>
    </el-table>
    <!--上传凭证窗口-->
    <el-dialog
      title="上传考核资料"
      :visible.sync="voucherUploadVisible"
      width="50%"
    >
      <el-form>
        <el-form-item label="组织名称">
          {{ currentHospital.name }}
        </el-form-item>
        <el-form-item label="付款金额">
          <el-input-number
            v-model="currentHospital.money"
            :min="0"
            size="mini"
          ></el-input-number>
        </el-form-item>
        <el-form-item label="上传文件">
          <el-upload
            ref="uploadForm"
            name="vouchers"
            accept=".jpg,.jpeg,.gif,.png,.doc"
            :headers="headers"
            multiple
            :file-list="fileList"
            :auto-upload="false"
            :on-success="voucherUploadVisibleSuccess"
            :on-error="voucherUploadVisibleError"
            :on-change="onChange"
            action="/api/SystemArea/vouchers.ac"
            :data="{
              area: JSON.stringify(currentHospital.code),
              year: JSON.stringify(this.params.year),
              money: currentHospital.money
            }"
          >
            <el-button slot="trigger" plain size="small" type="primary"
              >选取文件
            </el-button>
          </el-upload>
        </el-form-item>
        <div
          v-show="currentHospital.vouchers.length > 0"
          style="height: 300px; display: flex;"
        >
          <div
            v-for="image of currentHospital.vouchers"
            :key="image.key"
            style="height: 200px;width: 200px;margin: 5px"
          >
            <el-image
              style="height: 100%;width: 100%;cursor: pointer"
              :src="image.url"
              fit="fill"
              @click="viewImage(image.url)"
            />
            <div style="text-align: center;">
              <el-button
                style="margin: 0"
                type="text"
                size="mini"
                @click="removeVoucher(image)"
                >删除
              </el-button>
            </div>
          </div>
        </div>
      </el-form>

      <div slot="footer" class="dialog-footer">
        <el-button plain @click="voucherUploadVisible = false"
          >取 消
        </el-button>
        <el-button plain type="primary" @click="handleSaveUploadFile"
          >确 定
        </el-button>
      </div>
    </el-dialog>
    <!--结算窗口-->
    <el-dialog title="结算操作" :visible.sync="areaBudgetVisible" width="30%">
      <span>
        确定结算{{ params.year }}的金额分配吗?
        <p style="color: red">
          注意！重复结算可能覆盖本年度之前结算结果，请确认后操作。
        </p>
      </span>
      <span slot="footer" class="dialog-footer">
        <el-button @click="areaBudgetVisible = false">取 消</el-button>
        <el-button type="primary" @click="upsertAreaBudget">
          确 定
        </el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import {getToken} from '../../utils/cache';
import dayjs from 'dayjs';
import {getTimeRange} from '../../../../common/ph.ts';

export default {
  name: 'Hospital',
  data() {
    return {
      yearList: new Array(
        this.$dayjs(getTimeRange().end).diff(getTimeRange().start, 'year')
      )
        .fill(this.$dayjs(getTimeRange().start).year())
        .map((it, i) => ({value: it + i, label: `${it + i}年度`})),
      params: {
        flag: 'real', // total: 结算, real: 金额列表
        code: this.$settings.user.code,
        year: dayjs().year()
      },

      fileList: [],
      voucherUploadVisible: false,
      areaBudgetVisible: false,
      currentHospital: {vouchers: []},
      headers: {token: getToken()},
      loadingAreaBudget: false
    };
  },
  computed: {
    hospitalListData() {
      const currentData = this.hospitalListServerData;
      return currentData
        .sort((a, b) => b.budget - a.budget) //根据金额排序
        .map((item, index) => {
          //添加格式化数据
          item.correctWorkPointFormat = Math.round(item.correctWorkPoint);
          item.rateFormat = (item.rate * 100).toFixed(2) + '%';
          item.budgetFormat = item.budget.toFixed(2);
          item.uuid = index + 1;
          return item;
        });
    },
    areaBudgetData() {
      const areaBudgetList = this.areaBudgetService;
      return areaBudgetList
        .sort((a, b) => b.budget - a.budget)
        .map((item, index) => {
          //添加格式化数据
          item.correctWorkPointFormat =
            item.correctWorkPoint || item.correctWorkPoint === 0
              ? Math.round(item.correctWorkPoint)
              : '-';
          item.rateFormat =
            item.rate || item.rate === 0
              ? (item.rate * 100).toFixed(2) + '%'
              : '-';
          item.budgetFormat =
            item.budget || item.budget === 0
              ? Number(item.budget).toFixed(2)
              : '-';
          item.dateFormat = item.date
            ? item.date.$format('YYYY-MM-DD HH:mm:ss')
            : '-';
          item.moneyFormat =
            item.money || item.money === 0
              ? Number(item.money).toFixed(2)
              : '-';
          item.money = item?.money ?? 0;
          item.vouchers = item?.vouchers ?? [];
          item.uuid = index + 1;
          return item;
        });
    }
  },
  watch: {
    year() {
      // 年度改变时先将数据清空再重新在异步计算属性中加载
      this.hospitalListServerData = [];
      this.areaBudgetService = [];
    }
  },
  created() {
    this.initParams(this.$route);
  },
  asyncComputed: {
    hospitalListServerData: {
      async get() {
        let code = this.$settings.user.code;
        return await Promise.all(
          (await this.$api.SystemArea.rank(code, this.params.year)).map(
            async item => {
              item.hasChildren =
                (await this.$api.SystemArea.rank(item.code, this.params.year))
                  .length > 0;
              return item;
            }
          )
        );
      },
      default() {
        return [];
      },
      shouldUpdate() {
        return this.params.flag === 'real';
      }
    },
    areaBudgetService: {
      async get() {
        let code = this.$settings.user.code;
        return await Promise.all(
          (
            await this.$api.SystemArea.areaBudgetList(code, this.params.year)
          ).map(async item => {
            item.hasChildren =
              (
                await this.$api.SystemArea.areaBudgetList(
                  item.code,
                  this.params.year
                )
              ).length > 0;
            return item;
          })
        );
      },
      default() {
        return [];
      },
      shouldUpdate() {
        return this.params.flag === 'total';
      }
    }
  },
  methods: {
    async load(tree, treeNode, resolve) {
      let result = await Promise.all(
        (await this.$api.SystemArea.rank(tree.code, this.params.year))
          //根据金额排序
          .sort((a, b) => b.budget - a.budget)
          .map(async (item, index) => {
            item.correctWorkPointFormat = Math.round(item.correctWorkPoint);
            item.rateFormat = (item.rate * 100).toFixed(2) + '%';
            item.budgetFormat = item.budget.toFixed(2);
            item.uuid = `${tree.uuid}-${index + 1}`;
            item.hasChildren =
              item.code !== tree.code &&
              (await this.$api.SystemArea.rank(item.code, this.params.year))
                .length > 0;
            return item;
          })
      );
      resolve(result);
    },
    //设置标题可点击样式
    cellClassHover({columnIndex}) {
      if (columnIndex === 1) return 'hospital-name';
    },
    //点击标题跳转详情
    handleCellClick(row, column) {
      if (column.property === 'name') {
        return this.$router.push({
          name: 'appraisal-result',
          query: {
            id: row.code,
            listFlag: 'quality',
            year: this.params.year
          }
        });
      }
    },
    //年度选择
    handleYearChange(value) {
      this.params.year = value;
      this.$router.replace({
        query: {
          ...this.params
        }
      });
    },
    async openVoucherDialog(row) {
      this.currentHospital = row;
      this.fileList = [];
      const result =
        (await this.$api.SystemArea.getVouchers(row.code, this.params.year))
          ?.vouchers || [];
      //获取图片url
      if (result.length > 0)
        this.currentHospital.vouchers = await Promise.all(
          result.map(async it => ({key: it, url: await this.getImageUrl(it)}))
        );
      this.voucherUploadVisible = true;
    },
    async handleSaveUploadFile() {
      if (this.$refs.uploadForm.fileList.length === 0) {
        //不传图片只修改金额
        await this.$api.SystemArea.vouchers(
          this.currentHospital.code,
          this.params.year,
          this.currentHospital.money
        );
        this.$message.success('修改成功');
      } else
        this.currentHospital.vouchers.push({
          key: await this.$refs.uploadForm.submit()
        });
      this.voucherUploadVisible = false;
    },
    onChange(file, fileList) {
      this.fileList = fileList;
    },
    viewImage(url) {
      window.open(url);
    },
    async removeVoucher(image) {
      this.currentHospital.vouchers = this.currentHospital.vouchers.filter(
        it => it.key !== image.key
      );
      await this.$api.SystemArea.removeVoucher(
        this.currentHospital.code,
        this.params.year,
        image.key
      );
      this.$message.success('删除成功');
    },
    //文件上传成功
    voucherUploadVisibleSuccess(res) {
      if (res._KatoErrorCode_) {
        this.$message.error('文件上传失败');
      } else {
        this.$message.success('文件上传成功');
      }
      //手动将文件列表清空
      this.fileList = [];
      this.voucherUploadVisible = false;
    },
    //文件上传失败
    voucherUploadVisibleError() {
      this.$message.error('文件上传失败');
      this.voucherUploadVisible = false;
    },
    async getImageUrl(url) {
      try {
        return await this.$api.PHReport.sign(url);
      } catch (e) {
        console.log(e);
      }
    },
    initParams(route) {
      this.params.flag = route.query.flag ?? 'real';
      this.params.year = Number(route.query.year ?? this.$dayjs().year());
      this.params.code = route.query.code ?? this.$settings.user.code;
    },
    tagTypeChanged(tag) {
      this.params.flag = tag;
      this.$router.replace({
        query: {
          ...this.params
        }
      });
    },
    openAreaBudgetVoucherDialog() {
      this.areaBudgetVisible = true;
    },
    async upsertAreaBudget() {
      this.loadingAreaBudget = true;
      if (this.params.flag === 'real') {
        try {
          const code = this.$settings.user.code.toString();
          await this.$api.CheckAreaEdit.upsertMoney(code, this.params.year);
          this.$message({
            type: 'success',
            message: '结算成功!'
          });
          this.loadingAreaBudget = false;
          this.params.flag = 'total';
          this.areaBudgetVisible = false;
        } catch (e) {
          this.$message.error(e.message);
        }
      }
    },
    async loadAreaBudget(tree, treeNode, resolve) {
      let result = await Promise.all(
        (await this.$api.SystemArea.areaBudgetList(tree.code, this.params.year))
          //根据金额排序
          .sort((a, b) => b.budget - a.budget)
          .map(async (item, index) => {
            item.correctWorkPointFormat =
              item.correctWorkPoint || item.correctWorkPoint === 0
                ? Math.round(item.correctWorkPoint)
                : '-';
            item.rateFormat =
              item.rate || item.rate === 0
                ? (item.rate * 100).toFixed(2) + '%'
                : '-';
            item.budgetFormat =
              item.budget || item.budget === 0
                ? Number(item.budget).toFixed(2)
                : '-';
            item.dateFormat = item.date
              ? item.date.$format('YYYY-MM-DD HH:mm:ss')
              : '-';
            item.moneyFormat =
              item.money || item.money === 0
                ? Number(item.money).toFixed(2)
                : '-';
            item.money = item?.money ?? 0;
            item.vouchers = item?.vouchers ?? [];
            item.uuid = `${tree.uuid}-${index + 1}`;
            item.hasChildren =
              item.code !== tree.code &&
              (
                await this.$api.SystemArea.areaBudgetList(
                  item.code,
                  this.params.year
                )
              ).length > 0;
            return item;
          })
      );
      resolve(result);
    }
  }
};
</script>

<style lang="scss">
@import '../../styles/vars';
.hospital-name {
  cursor: pointer;

  :hover {
    color: $color-primary;
  }
}
</style>
