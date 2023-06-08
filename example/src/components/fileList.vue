<template>
  <div class="file-item">
    <img
      :src="imgsrc[getEnd(fileName.toLocaleLowerCase())]"
      alt=""
      class="fileType"
    />
    <div class="file-content">
      <span class="file-name">{{ fileName }}</span>
      <div class="option">
        <span class="size">{{ toKBOrMB(file.size || file.length) }}</span>
        <div>
          <span
            v-if="isPreview(fileName) && file[urlKey]"
            @click="previewHandler(file[urlKey])"
            class="preview"
            >预览</span
          >
          <span
            v-if="file[urlKey]"
            class="ml10 preview"
            @click="
              obsDownloadFile({
                fileUrl: file[urlKey],
                fileName: file[nameField],
              })
            "
            >下载</span
          >
        </div>
      </div>
    </div>
    <img
      src="@/assets/delete.png"
      alt=""
      class="del"
      title="删除"
      @click="$emit('delFile')"
    />
    <div v-if="[-1, 1, 2].includes(file.status)" class="mask">
      <div class="progressBox" v-show="file.status === -1 || file.status === 1">
        <div class="progressNum">
          <span>{{ file.percentage }}%</span>
          <img
            src="@/assets/uploadLoading.gif"
            alt=""
            class="uploadLoading"
            v-show="file.status === -1"
          />
        </div>
        <el-progress
          :percentage="file.percentage"
          color="#78C06E"
          :show-text="false"
        ></el-progress>
      </div>
      <div class="uploadFail" v-show="file.status === 2">
        <img src="@/assets/uploadFail.png" alt="" />
        <p>上传失败</p>
      </div>
      <img
        :src="operationIconObj[file.status].imgSrc"
        alt=""
        class="operationIcon"
        @click="breakpointResume(file.Key)"
        :title="operationIconObj[file.status].tips"
      />
    </div>
    <el-image-viewer
      v-show="showPreview"
      :on-close="
        () => {
          showPreview = false
        }
      "
      :url-list="[file[urlKey]]"
      :z-index="3000"
    ></el-image-viewer>
  </div>
</template>
<script>
import ElImageViewer from 'element-ui/packages/image/src/image-viewer'
import { breakpointResume,obsDownloadFile } from '@/utils/uploadFile/index'
import Big from 'big.js'
export default {
  components: {
    ElImageViewer,
  },
  props: {
    file: {
      type: Object,
      default: () => ({}),
    },
    // 循环遍历使用的key和附件下载、预览时需要取的图片地址字段，和接口回显字段保持一致即可（新增后显示、回显都会使用该字段）
    urlKey: {
      type: String,
      default: 'url',
    },
    // 附件显示的名字取的字段，和接口回显字段保持一致即可（新增后显示、回显都会使用该字段）
    nameField: {
      type: String,
      default: 'fileName',
    },
  },
  data() {
    return {
      // 是否展示预览遮罩层
      showPreview: false,
      operationIconObj: {
        '-1': {
          imgSrc: require('@/assets/pause.png'),
          tips: '继续上传',
        },
        1: {
          imgSrc: require('@/assets/play.png'),
          tips: '暂停上传',
        },
        2: {
          imgSrc: require('@/assets/reUpload.png'),
          tips: '继续上传',
        },
      },
      // 缩略图
      imgsrc: {
        rar: require('@/assets/zip.png'),
        zip: require('@/assets/zip.png'),
        pdf: require('@/assets/pdf.png'),
        jpg: require('@/assets/img.png'),
        doc: require('@/assets/word.png'),
        docx: require('@/assets/word.png'),
        jpeg: require('@/assets/img.png'),
        png: require('@/assets/img.png'),
        txt: require('@/assets/txt.png'),
        xls: require('@/assets/xls.png'),
        xlsx: require('@/assets/xls.png'),
      },
    }
  },
  computed: {
    fileName() {
      return this.file[this.nameField]
    },
  },
  created() {},
  methods: {
    breakpointResume,
    obsDownloadFile,
    // 展示KB还是MB
    toKBOrMB(val) {
      // 主要解决val为undefined时，文件大小显示NaN
      val = val || 0
      let numMB = new Big(Number(val)).div(new Big(1048576)).toString()
      // 大于等于1MB时展示MB否则展示KB
      if (numMB >= 1) {
        // 小数 四舍五入保留两位小数
        if (numMB.includes('.')) {
          return new Big(numMB).toFixed(2) + 'MB'
        } else {
          // 整数
          return numMB + 'MB'
        }
      } else {
        // kb时小于1kb向上取整，大于1时四舍五入保留整数
        let numKB = new Big(Number(val)).div(new Big(1024)).toString()
        if (numKB < 1) {
          return Math.ceil(numKB) + 'KB'
        } else {
          return new Big(numKB).toFixed(0) + 'KB'
        }
      }
    },
    // 点击暂停、继续、重新上传图标
    operation(item) {
      const { Key } = item
      breakpointResume(Key)
    },
    // 预览pdf附件
    previewPdf(url) {
      const pdfWindow = window.open('')
      window.URL = window.URL || window.webkitURL
      let xhr = new XMLHttpRequest()
      xhr.open('get', url, true)
      xhr.responseType = 'blob'
      xhr.onload = function () {
        if (this.status == 200) {
          let blob = this.response
          let oFileReader = new FileReader()
          oFileReader.onloadend = function (e) {
            //此处拿到base64格式
            let fileBase64 = e.target.result
            pdfWindow.document.write(
              `<embed src="${fileBase64}" type="application/pdf;chartset=UTF-8;" style="width: 100%;height: 100%"/>`
            )
            pdfWindow.document.title = '附件'
          }
          oFileReader.readAsDataURL(blob)
        }
      }
      xhr.send()
    },
    // 预览
    previewHandler(data) {
      if (data) {
        const addTypeArray = data.split('.')
        const addType = addTypeArray[addTypeArray.length - 1].toLowerCase()
        if (addType === 'pdf') {
          //之前做法未将pdf地址转base64格式
          this.previewPdf(data)
        } else if (['doc', 'docx', 'xls', 'xlsx'].includes(addType)) {
          window.open(
            `https://view.officeapps.live.com/op/view.aspx?src=${data}`
          )
        } else if (['jpg', 'jpeg', 'png'].includes(addType)) {
          this.showPreview = true
        }
      }
    },
    // 是否可预览
    isPreview(fileName) {
      if (!fileName) return false
      fileName = fileName.toLowerCase()
      return (
        fileName.endsWith('pdf') ||
        fileName.endsWith('jpg') ||
        fileName.endsWith('jpeg') ||
        fileName.endsWith('png') ||
        fileName.endsWith('doc') ||
        fileName.endsWith('docx') ||
        fileName.endsWith('xls') ||
        fileName.endsWith('xlsx')
      )
    },
    // 正则匹配文件后缀
    getEnd(file) {
      return file && file.replace(/.+\./, '')
    },
  },
}
</script>
<style scoped>
.file-item {
  position: relative;
  background: #fafafa;
  border-radius: 4px;
  padding: 0 10px;
  display: flex;
  font-size: 14px;
  width: 236px;
  height: 60px;
  margin-right: 20px;
  margin-bottom: 15px;
  box-sizing: border-box;
}
.fileType {
  margin: 10px 0;
  margin-right: 10px;
  width: 32px;
  height: 40px;
}
.file-content {
  width: 174px;
  line-height: 19px;
  margin: 8px 0;
}
.file-name {
  width: 100%;
  cursor: pointer;
}
.option {
  display: flex;
  align-items: center;
  margin-top: 6px;
  justify-content: space-between;
}
.size {
  color: #969696;
}
.del {
  width: 16px;
  height: 16px;
  position: absolute;
  z-index: 10;
  top: -8px;
  right: -8px;
  cursor: pointer;
}
.mask {
  border-radius: 4px;
  position: absolute;
  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 9;
  color: #fff;
}
.operationIcon {
  position: absolute;
  top: 50%;
  margin-top: -12px;
  right: 15px;
  width: 24px;
  height: 24px;
}
.operationIcon:hover {
  cursor: pointer;
}
.uploadFail img {
  width: 24px;
  height: 24px;
}
.arrow {
  position: absolute;
  width: 7px;
  height: 7px;
  transform: rotate(-45deg);
  border-top: 1px solid #e4e7ed;
  border-right: 1px solid #e4e7ed;
  background-color: #fff;
  top: -4px;
  left: 50%;
  margin-left: -4.5px;
}
.preview {
  color: #0286df;
  cursor: pointer;
}
.uploadLoading {
  margin-left: 5px;
  width: 13px;
  margin-top: 3px;
}
.progressNum {
  margin-bottom: 4px;
  font-size: 16px;
}
.progressBox {
  width: 101px;
}
.ml10 {
  margin-left: 10px;
}
</style>
