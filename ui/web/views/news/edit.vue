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
          <el-input v-model="formData.source"> </el-input>
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
            :show-all-levels="false"
            :placeholder="'请选择地区'"
            style="width: 100%"
            :options="areasTree"
            :props="areasOption"
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
      <el-button size="mini" type="danger" @click="previewHtml">预览</el-button>
    </div>
    <el-dialog :visible.sync="preview" width="440px">
      <div
        v-hidden-scroll
        style="border: #333 1px solid;padding: 10px;border-radius:10px;overflow: scroll;width: 375px;height: 667px"
        v-html="html"
      ></div>
    </el-dialog>
  </div>
</template>

<script>
import {getToken} from '../../utils/cache';
import TinyEditor from '../../components/tiny-editor';
import {apiUrl} from '../../plugins/api';
import {newsStatus} from '../../../../common/news.ts';
import newsHtml from '../../../../common/news-html.ts';

export default {
  name: 'edit',
  components: {
    'tiny-editor': TinyEditor
  },
  data() {
    return {
      fileList: [],
      token: {token: getToken()},
      maxSize: 5,
      preview: false,
      html: '',
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
        source: [{required: true, message: '请填写来源', trigger: 'blur'}]
      },
      upsertLoading: false,
      areasTree: [],
      areasOption: {
        multiple: true,
        emitPath: false,
        value: 'code',
        label: 'name',
        children: 'children'
      },
      apiUrl: apiUrl,
      newsStatus: newsStatus
    };
  },
  async created() {
    //获取地区选项
    let areas = await this.region();
    this.areasTree = await this.getChildrenArea(areas);
    if (this.$route.query.id) {
      //请求新闻详情
      const result = await this.$api.News.detail(this.$route.query.id);
      if (result) {
        for (let c in this.formData) {
          if (c === 'top') {
            this.formData['top'] = !!result['toped_at'];
          } else if (c === 'areas') {
            this.formData.areas = result['areas'];
            const total = this.formData.areas.length;
            //如果该节点下有子集,则要勾选上它的所有子集
            for (let i = 0; i < total; i++) {
              await this.findChildrenCode(this.formData.areas[i]);
            }
          } else this.formData[c] = result[c];
        }
      }
    }
  },
  methods: {
    //为了自动勾选子集地区的递归方法
    async findChildrenCode(code) {
      const children = await this.region(code);
      if (children.length > 0)
        //子集的所有code合并到绑定的areas参数里
        this.formData.areas = this.formData.areas.concat(
          children.map(it => it.code)
        );
      for (let k = 0; k < children.length; k++) {
        //如果子集内还有市,区级别的数据,继续递归
        if (['province', 'city'].includes(children[k].label)) {
          await this.findChildrenCode(children[k].code);
        }
      }
    },

    //获取各级别的子地区
    async getChildrenArea(areas) {
      for (let i = 0; i < areas.length; i++) {
        //如果top地区包含省和市级别的选项
        if (['province', 'city'].includes(areas[i].label)) {
          //则补充它的子集
          const children = await this.region(areas[i].code);
          if (children.length > 0) areas[i].children = children;
          else areas[i].leaf = true;
          //如果子集还有市和区级别的元素,继续递归
          if (
            areas[i].children &&
            areas[i].children.find(it =>
              ['province', 'city'].includes(it.label)
            )
          ) {
            await this.getChildrenArea(areas[i].children);
          } else if (areas[i].children) {
            areas[i].children.forEach(it => (it.leaf = true));
          }
        }
      }
      return areas;
    },
    //异步加载地区列表
    async region(code) {
      return await this.$api.Group.children(code);
    },
    async saveNews(data, status) {
      const validate = await this.$refs.newsForm.validate();
      if (validate) {
        //包含被选中的父节点和叶子节点的所有集合
        const parentSelected = this.$refs.areas.getCheckedNodes();
        //按业务需求过滤一下
        data.areas = parentSelected
          .filter(
            p =>
              p.children.find(c => parentSelected.includes(c)) || //过滤出包含在某个节点children内的节点.
              (p.data.leaf && //或者叶子节点,但不属于任何一个节点的children内
                !parentSelected.find(
                  it => it.children && it.children.includes(p)
                ))
          )
          .map(it => it.data.code);
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
    },
    previewHtml() {
      this.preview = true;
      const data = {
        title: this.formData.title,
        source: this.formData.source,
        author: this.formData.author,
        date: this.$dayjs().format('YYYY-MM-DD'),
        content: this.formData.content,
        virtual_pv: this.formData.virtual_pv
      };
      this.html = newsHtml(data);
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
