<template>
  <editor
    id="tinymce"
    v-model="editValue"
    :init="initOption"
    @onClick="click"
  ></editor>
</template>

<script>
//tinymce
import tinymce from 'tinymce/tinymce';
import TinyEditor from '@tinymce/tinymce-vue';
import 'tinymce/icons/default/icons';
import 'tinymce/themes/silver/theme';
import 'tinymce/plugins/image';
import 'tinymce/plugins/link';
import 'tinymce/plugins/media';
import 'tinymce/plugins/table';
import 'tinymce/plugins/lists';
import 'tinymce/plugins/wordcount';
import 'tinymce/plugins/hr';
import 'tinymce/plugins/searchreplace';
import 'tinymce/plugins/paste';
import 'tinymce/plugins/charmap';
import {getToken} from '../utils/cache';

export default {
  name: 'tiny-editor',
  components: {
    editor: TinyEditor
  },
  props: {
    value: {type: String},
    api: {type: String, required: true},
    name: {type: String, default: 'file'}
  },
  data() {
    return {
      initOption: {
        language_url: '/tinymce/langs/zh_CN.js',
        language: 'zh_CN',
        skin_url: '/skins/ui/oxide',
        height: 300,
        plugins: [
          'hr image link lists charmap paste searchreplace table wordcount'
        ],
        toolbar: [
          'searchreplace fontselect formatselect fontsizeselect bold italic underline strikethrough alignleft aligncenter alignright outdent indent blockquote undo redo removeformat subscript superscript hr bullist numlist link image charmap preview pagebreak media table forecolor backcolor fullscreen'
        ],
        font_formats:
          "Arial='arial',helvetica,sans-serif; Arial Black=arial black,avant garde; Book Antiqua=book antiqua,palatino; Comic Sans MS=comic sans ms,sans-serif; Courier New=courier new,courier; Georgia=georgia,palatino;" +
          "微软雅黑='Microsoft YaHei';宋体='SimSun';新宋体='NSimsun';黑体='SimHei';" +
          "仿宋='FangSong';兰亭黑-简='Lantinghei SC';",
        relative_urls: false,
        remove_script_host: false,
        branding: false,
        menubar: false,
        //此处为图片上传处理函数
        images_upload_handler: async (blobInfo, success, failure) => {
          let format = new FormData();
          let xhr = new XMLHttpRequest();
          xhr.withCredentials = false;
          xhr.open('POST', `${this.api}`);
          xhr.setRequestHeader('token', getToken());

          xhr.onload = async () => {
            let res;
            if (xhr.status !== 200) {
              failure('HTTP Error: ' + xhr.status);
              return;
            }
            res = xhr.responseText;
            success(await this.$api.Upload.sign(res.split('"')[1]));
          };
          format.append(this.name, blobInfo.blob());
          xhr.send(format);
        }
      },
      editValue: this.value
    };
  },
  mounted() {
    tinymce.init({});
  },
  watch: {
    value(newValue) {
      this.editValue = newValue;
    },
    editValue(newValue) {
      this.$emit('input', newValue);
    }
  },
  methods: {
    click(e) {
      this.$emit('onClick', e);
    }
  }
};
</script>

<style scoped></style>
