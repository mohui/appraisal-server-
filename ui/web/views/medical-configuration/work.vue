<template>
  <div style="height: 100%;">
    <el-card
      class="box-card"
      style="height: 100%;"
      shadow="never"
      :body-style="{
        height: 'calc(100% - 110px)',
        display: 'flex',
        'flex-direction': 'column',
        padding: $settings.isMobile ? '10px 0' : '20px'
      }"
    >
      <div slot="header" class="work-header">
        <span>工分项管理</span>
        <div>
          <el-button size="mini" type="primary" @click="addWorkVisible = true"
            >新增工分项</el-button
          >
        </div>
      </div>
      <el-table
        v-loading="tableLoading"
        stripe
        size="small"
        :data="tableData"
        height="100%"
        style="flex-grow: 1;"
        :header-cell-style="{background: '#F3F4F7', color: '#555'}"
      >
        <el-table-column type="index" label="序号"></el-table-column>
        <el-table-column prop="work" align="center" label="工分项">
        </el-table-column>
        <el-table-column prop="scoreMethod" label="打分方式" align="center">
        </el-table-column>
        <el-table-column
          prop="project"
          label="关联项目"
          align="center"
          width="300"
        >
          <template slot-scope="{row}">
            <el-tooltip
              v-if="$widthCompute([row.projects.join(',')]) >= 300"
              effect="dark"
              placement="top"
              :content="row.projects.join(',')"
            >
              <div
                slot="content"
                v-html="toBreak(row.projects.join(','))"
              ></div>
              <span class="cell-long-span">{{ row.projects.join(',') }}</span>
            </el-tooltip>
            <div v-else>{{ row.projects.join(',') }}</div>
          </template>
        </el-table-column>
        <el-table-column prop="" label="操作" align="center">
          <template slot-scope="{row}">
            <el-tooltip content="编辑" :enterable="false">
              <el-button
                type="primary"
                icon="el-icon-edit"
                circle
                size="mini"
                @click="editRow(row)"
              >
              </el-button>
            </el-tooltip>
            <el-tooltip content="删除" :enterable="false">
              <el-button
                type="danger"
                :disabled="row.removeLoading"
                circle
                :icon="row.removeLoading ? 'el-icon-loading' : 'el-icon-delete'"
                size="mini"
                @click="removeRow(row)"
              >
              </el-button>
            </el-tooltip>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
    <el-dialog
      title="配置弹窗"
      :visible.sync="addWorkVisible"
      :width="$settings.isMobile ? '99%' : '50%'"
      :before-close="() => resetConfig('workForm')"
      :close-on-press-escape="false"
      :close-on-click-modal="false"
    >
      <el-form
        ref="workForm"
        :model="newWork"
        :rules="workRules"
        label-position="right"
        label-width="120px"
      >
        <el-form-item label="工分项" prop="work">
          <el-input v-model="newWork.work"> </el-input>
        </el-form-item>
        <el-form-item label="关联项目" prop="projectsSelected">
          <el-input
            size="mini"
            placeholder="输入关键字进行过滤"
            v-model="filterText"
          >
          </el-input>
          <div class="long-tree">
            <el-tree
              ref="tree"
              :data="treeData"
              :props="treeProps"
              :default-checked-keys="newWork.projectsSelected.map(it => it.id)"
              node-key="id"
              :filter-node-method="filterNode"
              show-checkbox
              @check-change="treeCheck"
            ></el-tree>
          </div>
        </el-form-item>
        <el-form-item label="打分方式" prop="scoreMethod">
          <el-button-group>
            <el-button
              :class="{
                'el-button--primary': newWork.scoreMethod === HisWorkMethod.SUM
              }"
              size="small"
              @click="newWork.scoreMethod = HisWorkMethod.SUM"
            >
              {{ HisWorkMethod.SUM }}
            </el-button>
            <el-button
              :class="{
                'el-button--primary':
                  newWork.scoreMethod === HisWorkMethod.AMOUNT
              }"
              size="small"
              @click="newWork.scoreMethod = HisWorkMethod.AMOUNT"
            >
              {{ HisWorkMethod.AMOUNT }}
            </el-button>
          </el-button-group>
        </el-form-item>
        <el-form-item
          v-show="newWork.projectsSelected.length > 0"
          label="已有工分项"
        >
          <el-tag
            v-for="old in newWork.projectsSelected"
            :key="old.id"
            closable
            @close="closeTag(old)"
            style="margin: 0 5px"
            >{{ old.name }}</el-tag
          >
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="resetConfig('workForm')">取 消</el-button>
        <el-button v-loading="addBtnLoading" type="primary" @click="submit()">
          确 定
        </el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import {Permission} from '../../../../common/permission.ts';
import {HisWorkMethod, HisWorkSource} from '../../../../common/his.ts';
import {strToPinyin} from '../../utils/pinyin';

export default {
  name: 'Work',
  data() {
    const validaProjects = (rule, value, callback) => {
      if (value?.length < 1 && this.newWork.projectsSelected.length < 1) {
        callback(new Error('选择关联项目!'));
      }
      callback();
    };
    return {
      permission: Permission,
      newWork: {
        work: '',
        source: HisWorkSource.CHECK,
        scoreMethod: HisWorkMethod.SUM,
        projects: [],
        projectsSelected: []
      },
      addWorkVisible: false,
      workRules: {
        work: [{required: true, message: '填写工分项', trigger: 'change'}],
        projectsSelected: [{validator: validaProjects, trigger: 'change'}]
      },
      tableLoading: false,
      addBtnLoading: false,
      searchLoading: false,
      HisWorkMethod: HisWorkMethod,
      HisWorkSource: Object.keys(HisWorkSource).map(it => ({
        value: HisWorkSource[it],
        key: it
      })),
      treeProps: {
        label: 'name',
        disabled: data => {
          return (
            data.id === '公卫数据' ||
            data.id === '手工数据' ||
            data.id === '其他'
          );
        }
      },
      filterText: ''
    };
  },
  computed: {
    tableData() {
      return this.serverData.map(d => ({
        id: d.id,
        work: d.name,
        scoreMethod: d.method,
        projects: d.mappings.map(it => it.name),
        mappings: d.mappings,
        removeLoading: false
      }));
    },
    treeData() {
      return this.addPinyin(this.workTreeData);
    }
  },
  watch: {
    filterText(value) {
      this.$refs.tree.filter(value);
    }
  },
  asyncComputed: {
    serverData: {
      async get() {
        this.tableLoading = true;
        try {
          return await this.$api.HisWorkItem.list();
        } catch (e) {
          console.error(e.message);
          this.$message.error(e.message);
          return [];
        } finally {
          this.tableLoading = false;
        }
      },
      default: []
    },
    workTreeData: {
      async get() {
        return await this.$api.HisWorkItem.sources(null, null);
      },
      default() {
        return [];
      }
    }
  },
  methods: {
    async submit() {
      try {
        const valid = await this.$refs['workForm'].validate();
        if (valid) {
          this.addBtnLoading = true;
          const paramsArr = [
            this.newWork.work,
            this.newWork.scoreMethod,
            this.newWork.projectsSelected.map(it => it.id) //被选中的项目id
          ];
          if (this.newWork.id) {
            paramsArr.splice(0, 0, this.newWork.id);
            await this.$api.HisWorkItem.update(...paramsArr);
          } else {
            await this.$api.HisWorkItem.add(...paramsArr);
          }
          this.$message.success('操作成功');
          this.$asyncComputed.serverData.update();
          this.resetConfig('workForm');
        }
      } catch (e) {
        console.error(e);
        if (e) this.$message.error(e.message);
      } finally {
        this.addBtnLoading = false;
      }
    },
    async editRow(row) {
      this.newWork = JSON.parse(
        JSON.stringify({
          id: row.id,
          work: row.work,
          scoreMethod: row.scoreMethod,
          projectsSelected: row.mappings.map(m => ({
            name: m.name,
            id: m.id
          })),
          projects: []
        })
      );
      this.addWorkVisible = true;
    },
    async removeRow(row) {
      try {
        await this.$confirm('此操作将永久删除该工分项, 是否继续?', '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        });
        row.removeLoading = true;
        await this.$api.HisWorkItem.delete(row.id);
        this.$message.success('删除成功');
        this.$asyncComputed.serverData.update();
      } catch (e) {
        e !== 'cancel' ? this.$message.error(e?.message) : '';
      } finally {
        row.removeLoading = false;
      }
    },
    resetConfig(ref) {
      this.$refs[ref].resetFields();
      this.$refs.tree.setCheckedKeys([]);
      //将树形结构全部折叠
      for (let i = 0; i < this.workTreeData.length; i++) {
        this.$refs.tree.store.nodesMap[
          this.workTreeData[i].id
        ].expanded = false;
      }
      //重置默认选中项
      this.newWork = {
        work: '',
        source: HisWorkSource.CHECK,
        scoreMethod: HisWorkMethod.SUM,
        projects: [],
        projectsSelected: []
      };
      this.addWorkVisible = false;
    },
    toBreak(content) {
      let contentStr = '';
      for (let index in content) {
        if (index !== '0' && index % 20 === 0) contentStr += '<br/>';
        contentStr += content[index];
      }
      return contentStr;
    },
    addPinyin(arr) {
      arr = arr.map(it => ({...it, pinyin: strToPinyin(it.name)}));
      for (let current of arr) {
        if (current?.children?.length > 0) {
          current.children = this.addPinyin(current.children);
        }
      }
      return arr;
    },
    filterNode(query, data) {
      try {
        if (!query) return true;
        //模糊匹配字符
        if (data.name.indexOf(query) > -1) return true;
        //模糊匹配拼音首字母
        return data.pinyin.indexOf(query.toLowerCase()) > -1;
      } catch (e) {
        console.error(e);
      } finally {
        this.searchLoading = false;
      }
    },
    treeCheck() {
      let checkedNodes = this.$refs.tree.getCheckedNodes();
      for (let c of checkedNodes) {
        if (c?.children?.length > 0) {
          //children内的元素一定都是选上的,所以只保留它们共同的父项
          checkedNodes = checkedNodes.filter(it => it.parent !== c.id);
        }
      }
      this.newWork.projectsSelected = checkedNodes;
    },
    closeTag(tag) {
      //如果原有的工分项有该项目,则删除
      const index = this.newWork.projectsSelected.findIndex(
        old => old.id === tag.id
      );
      if (index > -1) this.newWork.projectsSelected.splice(index, 1);
      this.$refs.tree.setCheckedKeys(
        this.newWork.projectsSelected.map(it => it.id)
      );
    }
  }
};
</script>

<style scoped>
.work-header {
  display: flex;
  justify-content: space-between;
}
.long-tree {
  height: 40vh;
  overflow-y: auto;
  overflow-x: hidden;
}
.cell-long-span {
  width: 100%;
  display: block;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
}
</style>
