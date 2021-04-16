<template>
  <div style="height: 100%;">
    <el-card
      class="box-card"
      style="height: 100%;"
      shadow="never"
      :body-style="{
        height: 'calc(100% - 120px)',
        display: 'flex',
        'flex-direction': 'column'
      }"
    >
      <div slot="header" class="clearfix">
        <span>金额列表</span>
        <!--年度选择-->
        <span style="margin: 0 10px">
          <el-select
            v-model="year"
            placeholder="请选择考核年度"
            @change="handleYearChange(year)"
          >
            <el-option
              v-for="item in yearList"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            >
            </el-option>
          </el-select>
        </span>
        <!--年度结算-->
        <span style="margin-right: 20px">
          <el-button
            size="small"
            type="primary"
            @click="tagTypeChanged('moneyList')"
          >
            金额列表
          </el-button>
          <el-button
            size="small"
            type="primary"
            @click="tagTypeChanged('upsertMoney')"
          >
            年度结算
          </el-button>
        </span>
        <span v-show="selFlag === 'upsertMoney'">
          <el-button size="small" type="primary" @click="upsertAreaBudget()">
            年度结算
          </el-button>
        </span>
      </div>
      <el-table
        v-show="selFlag === 'moneyList'"
        v-loading="$asyncComputed.hospitalListServerData.updating"
        size="mini"
        border
        :data="hospitalListData"
        height="100%"
        style="flex-grow: 1;"
        row-key="uuid"
        lazy
        :load="load"
        :tree-props="{children: 'children', hasChildren: 'hasChildren'}"
        :header-cell-style="{
          background: '#F3F4F7',
          color: '#555',
          textAlign: 'center'
        }"
        @row-click="handleCellClick"
        :cell-class-name="cellClassHover"
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
      <div v-show="selFlag === 'upsertMoney'">
        {{ selFlag }}
        <template>
          <el-table
            v-loading="$asyncComputed.areaBudgetService.updating"
            size="mini"
            border
            :data="areaBudgetData"
            height="100%"
            style="flex-grow: 1;"
            row-key="uuid"
            lazy
            :load="load"
            :tree-props="{children: 'children', hasChildren: 'hasChildren'}"
            :header-cell-style="{
              background: '#F3F4F7',
              color: '#555',
              textAlign: 'center'
            }"
            :cell-class-name="cellClassHover"
            @row-click="handleCellClick"
          >
            <el-table-column
              align="center"
              label="序号"
              width="160px"
              prop="uuid"
            >
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
        </template>
      </div>
    </el-card>

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
              year: JSON.stringify(this.year),
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
            style="height: 200px;width: 200px;margin: 5px"
            :key="image.key"
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
                >删除</el-button
              >
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
  </div>
</template>

<script>
import {getToken} from '../../utils/cache';
import dayjs from 'dayjs';

export default {
  name: 'hospital',
  data() {
    return {
      year: dayjs().year(),
      yearList: [
        {value: 2020, label: '2020年度'},
        {value: 2021, label: '2021年度'}
      ],
      selFlag: 'moneyList', // upsertMoney: 结算, moneyList: 金额列表

      fileList: [],
      voucherUploadVisible: false,
      currentHospital: {vouchers: []},
      headers: {token: getToken()}
    };
  },
  watch: {
    year() {
      // 年度改变时先将数据清空再重新在异步计算属性中加载
      this.hospitalListServerData = [];
      this.areaBudgetService = [];
    }
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
      return areaBudgetList.map((item, index) => {
        //添加格式化数据
        item.correctWorkPointFormat = item.correctWorkPoint
          ? Math.round(item.correctWorkPoint)
          : '-';
        item.rateFormat = item.rate ? (item.rate * 100).toFixed(2) + '%' : '-';
        item.budgetFormat = item.budget ? item.budget.toFixed(2) : '-';
        item.uuid = index + 1;
        return item;
      });
    }
  },
  asyncComputed: {
    hospitalListServerData: {
      async get() {
        let code = this.$settings.user.code;
        return await Promise.all(
          (await this.$api.SystemArea.rank(code, this.year)).map(async item => {
            item.hasChildren =
              (await this.$api.SystemArea.rank(item.code, this.year)).length >
              0;
            return item;
          })
        );
      },
      default() {
        return [];
      }
    },
    areaBudgetService: {
      async get() {
        let code = this.$settings.user.code;
        return await Promise.all(
          (await this.$api.SystemArea.areaBudgetList(code, this.year)).map(
            async item => {
              item.hasChildren =
                (
                  await this.$api.SystemArea.areaBudgetList(
                    item.code,
                    this.year
                  )
                ).length > 0;
              return item;
            }
          )
        );
      },
      default() {
        return [];
      },
      shouldUpdate() {
        return this.selFlag === 'upsertMoney';
      }
    }
  },
  methods: {
    async load(tree, treeNode, resolve) {
      let result = await Promise.all(
        (await this.$api.SystemArea.rank(tree.code, this.year))
          //根据金额排序
          .sort((a, b) => b.budget - a.budget)
          .map(async (item, index) => {
            item.correctWorkPointFormat = Math.round(item.correctWorkPoint);
            item.rateFormat = (item.rate * 100).toFixed(2) + '%';
            item.budgetFormat = item.budget.toFixed(2);
            item.uuid = `${tree.uuid}-${index + 1}`;
            item.hasChildren =
              item.code !== tree.code &&
              (await this.$api.SystemArea.rank(item.code, this.year)).length >
                0;
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
            year: this.year
          }
        });
      }
    },
    //年度选择
    handleYearChange(value) {
      console.log(value);
      this.year = value;
    },
    async openVoucherDialog(row) {
      this.currentHospital = row;
      this.fileList = [];
      const result =
        (await this.$api.SystemArea.getVouchers(row.code, this.year))
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
          this.year,
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
        this.year,
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
        return await this.$api.Report.sign(url);
      } catch (e) {
        console.log(e);
      }
    },
    tagTypeChanged(tag) {
      this.selFlag = tag;
    },
    async upsertAreaBudget() {
      if (this.selFlag === 'upsertMoney') {
        try {
          const code = this.$settings.user.code.toString();
          await this.$api.CheckAreaEdit.upsertMoney(code, this.year);
        } catch (e) {
          this.$message.error(e.message);
        }
      }
    }
  }
};
</script>

<style lang="scss">
.hospital-name {
  cursor: pointer;

  :hover {
    color: #1a95d7;
  }
}
</style>
