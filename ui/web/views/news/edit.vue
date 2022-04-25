<template>
  <div class="flex-div">
    <el-breadcrumb separator="/">
      <el-breadcrumb-item :to="{path: '/news'}">资讯列表</el-breadcrumb-item>
      <el-breadcrumb-item>资讯详情</el-breadcrumb-item>
    </el-breadcrumb>
    <div class="edit-form">
      <el-form
        ref="newsForm"
        class="news-form"
        :model="formData"
        :rules="rules"
        label-position="left"
        label-width="70px"
      >
        <el-form-item label="标题" prop="title">
          <el-input v-model="formData.title"></el-input>
        </el-form-item>

        <el-form-item label="作者" prop="author">
          <el-input v-model="formData.author"></el-input>
        </el-form-item>

        <el-form-item label="置顶" prop="top">
          <el-switch
            v-model="formData.top"
            active-color="#13ce66"
            inactive-color="#ddd"
            :active-value="true"
            :inactive-value="false"
          >
          </el-switch>
        </el-form-item>

        <el-form-item label="来源" prop="source">
          <el-select v-model="formData.source">
            <el-option
              v-for="s of sourceList"
              :key="s.value"
              :value="s.value"
              :label="s.name"
            ></el-option>
          </el-select>
        </el-form-item>

        <el-form-item label="浏览量" prop="virtual_pv">
          <el-input-number
            :min="0"
            v-model="formData.virtual_pv"
          ></el-input-number>
        </el-form-item>

        <el-form-item label="发布地区" prop="areas">
          <el-cascader
            ref="areas"
            v-model="formData.areas"
            :placeholder="'请选择地区'"
            style="width: 100%"
            :props="areasList"
            filterable
          ></el-cascader>
        </el-form-item>

        <el-form-item label="资讯内容" prop="content">
          <tiny-editor
            v-model="formData.content"
            :value="formData.content"
            :api="`${apiUrl}/News/upload.ac`"
          ></tiny-editor>
        </el-form-item>
      </el-form>
    </div>
    <div>
      <el-button
        v-loading="upsertLoading"
        size="mini"
        type="primary"
        @click="saveNews(formData, newsStatus.PUBLISHED)"
        >确认发布</el-button
      >
      <el-button
        v-loading="upsertLoading"
        size="mini"
        type="default"
        @click="saveNews(formData, newsStatus.UNPUBLISHED)"
        >存为草稿</el-button
      >
      <el-button
        size="mini"
        type="warning"
        @click="() => $router.replace({path: '/news'})"
        >返回</el-button
      >
    </div>
  </div>
</template>

<script>
import {getToken} from '../../utils/cache';
import TinyEditor from '../../components/tiny-editor';
import {apiUrl} from '../../plugins/api';
import {newsStatus, sourceList} from '../../../../common/news.ts';

export default {
  name: 'edit',
  components: {
    'tiny-editor': TinyEditor
  },
  data() {
    const that = this;
    return {
      fileList: [],
      token: {token: getToken()},
      maxSize: 5,
      formData: {
        id: null,
        title: '',
        author: '',
        source: '',
        content: '',
        status: 0,
        top: false,
        areas: [],
        virtual_pv: 0
      },
      rules: {
        title: [{required: true, message: '请填写标题', trigger: 'blur'}],
        source: [{required: true, message: '请选择来源', trigger: 'blur'}]
      },
      upsertLoading: false,
      areasList: {
        lazy: true,
        multiple: true,
        emitPath: false,
        async lazyLoad(node, resolve) {
          const {level, value = null} = node;
          if (level <= 2) {
            const region = (await that.region(value)).map(it => ({
              value: it.code,
              label: it.name,
              leaf: level >= 1
            }));
            //自动勾上已经被选中的节点
            const selected = region.filter(r =>
              that.formData.areas.includes(r.value)
            );
            that.formData.areas = [
              ...new Set(that.formData.areas.concat(selected))
            ];
            resolve(region);
          }
        }
      },
      apiUrl: apiUrl,
      sourceList: sourceList,
      newsStatus: newsStatus
    };
  },
  async created() {
    if (this.$route.query.id) {
      //请求新闻详情
      const result = await this.$api.News.detail(this.$route.query.id);
      if (result) {
        for (let c in this.formData) {
          if (c === 'top') {
            this.formData['top'] = !!result['toped_at'];
          } else this.formData[c] = result[c];
        }
      }
    }
  },
  methods: {
    //异步加载地区列表
    async region(code) {
      return await this.$api.Group.children(code);
    },
    async saveNews(data, status) {
      const validate = await this.$refs.newsForm.validate();
      if (validate) {
        //苟且解决地区code和节点对象共存的问题
        data.areas = [
          ...new Set(data.areas.map(it => (it?.value ? it.value : it)))
        ];
        //包含被选中的父节点和叶子节点的所有集合
        const parentSelected = this.$refs.areas.getCheckedNodes();
        //仅包含叶子节点的集合
        const leafSelected = this.$refs.areas.getCheckedNodes(true);
        //比较两者,取差值.
        //差值就是需要上传的父节点;若差值为空则两者相等(仅选了叶子节点);
        const finalSelected = parentSelected.filter(
          p => !leafSelected.includes(p)
        );
        if (finalSelected.length > 0) {
          data.areas = finalSelected.map(it => it.value);
        }
        this.upsertLoading = true;
        if (!this.formData.content) {
          this.$message.error('请填写内容');
          return;
        }
        data.status = status;
        try {
          this.formData.id = await this.$api.News.upsert(data);
          this.upsertLoading = false;
          status === newsStatus.PUBLISHED
            ? this.$message.success('操作成功!')
            : this.$message.success('该条资讯存为草稿，用户端不可见!');
          this.$router.push({path: '/news'});
        } catch (e) {
          this.$message.error(e.message);
          this.upsertLoading = false;
        }
      }
    }
  }
};
</script>

<style scoped>
.flex-div {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.edit-form {
  height: 100%;
  flex-grow: 1;
  margin: 20px;
  position: relative;
}

.news-form {
  position: absolute;
  width: 100%;
  height: 100%;
  overflow: scroll;
}
</style>
