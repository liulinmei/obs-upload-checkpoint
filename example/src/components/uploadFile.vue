<template>
  <div class="upload-container">
    <el-upload
      class="upload-demo"
      drag
      action=""
      multiple
      :http-request="uploadFile"
      :show-file-list="false"
    >
      <i class="el-icon-upload"></i>
      <div class="el-upload__text">将文件拖到此处，或<em>点击上传</em></div>
      <div class="el-upload__tip" slot="tip">
        只能上传jpg/png文件，且不超过500kb
      </div>
    </el-upload>
    <div class="file-list">
      <FileList
        v-for="(item, index) in uploadingFile"
        :key="item.url || item.Key"
        :file="item"
        @delFile="delFile(item, index)"
      >
      </FileList>
    </div>
  </div>
</template>

<script>
import { Message } from 'element-ui'
import {
  obsUploadFile,
  obsDelFile,
  multiBreakpointResume,
} from '@/utils/uploadFile/index'
import FileList from './fileList'
export default {
  name: 'HelloWorld',
  components: {
    FileList,
  },
  data() {
    return {
      uploadingFile: [],
    }
  },
  beforeDestroy(){
    this.stopAllUpload()
  },
  methods: {
    // 文件上传
    uploadFile(param) {
      console.log('文件上传', param)
      let file = param.file
      // this.uploadingFile.push(file);
      let fileInfo = obsUploadFile({
        file,
        resFileKey: {
          name: 'fileName',
          url: 'fileUrl',
          size: 'size',
          percentage: 'percentage',
          status: 'status',
          Key: 'Key',
          id: 'vodId',
        }, //上传成功后想要保留的字段，未配置的字段将不会保留(可配置项有 name、size、type、percentage、Key、url、status)
        module: 'material_pc/inquiry', //文件上传后所处的文件夹（建议格式：项目名/模块名）（文件夹名默认member_center，很不推荐使用默认值）
        onBeforeUpload: (fileInfo) => {
          // 如果此回调函数返回false则文件不会被上传到obs服务，功能类似element上传组件的的before-upload
          console.log('文件上传前回调', fileInfo)
        },
        uploadProgress: (percentage) => {
          // this.$set(fileInfo, "percentage", percentage);
          console.log('上传进度', percentage)
          // this.$forceUpdate();
        },
        uploadSuccess: (fileUrl, status) => {
          console.log('文件上传成功回调', fileUrl, status)
          Message.success('上传成功')
        },
        uploadError: (err, status) => {
          console.log('文件上传失败回调', err, status)
        },
      })
      this.uploadingFile.push(fileInfo)
      console.log('文件上传-fileInfo', JSON.parse(JSON.stringify(fileInfo)))
    },
    // 删除文件
    async delFile(item, index) {
      const { url, Key } = item
      let code = await obsDelFile({
        fileUrl: url,
        Key,
      })
      console.log('删除文件', code)
      if (code === 200 || code === 204) {
        this.uploadingFile.splice(index, 1)
      }
      console.log('删除成功', code)
    },
    // 暂停所有正在上传的文件
    stopAllUpload() {
      let uploadingFiles = []
      this.uploadingFile.map((item) => {
        if (item.status === 1) {
          uploadingFiles.push(item.Key)
        }
      })
      multiBreakpointResume(uploadingFiles)
    },
  },
}
</script>
<style scoped>
.upload-container {
  padding: 20px;
}
.upload-demo {
  margin-bottom: 20px;
}
.file-list {
  display: flex;
  flex-wrap: wrap;
}
</style>
