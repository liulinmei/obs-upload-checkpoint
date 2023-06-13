### 插件简介

基于javaScript、esdk-obs-browserjs封装的华为云obs文件上传组件。

支持以下基础功能：

**普通文件上传**

前端文件直传到obs资源管理平台，无需经过后端接口处理，上传速度相对更快，且支持实时获取上传进度

**大文件断点续传：**

1. 对上传的文件进行分片上传；
2. 对上传中的文件进行暂停上传操作；
3. 对上传失败的文件进行重新上传操作。

**其他附加功能**

1. 单个、批量删除服务器已经上传的文件
2. 下载已经上传到服务器的文件
3. 获取服务器文件临时授权访问URL（用于预览、或者下载文件时会报跨域等问题的情况）
4. 根据文件url获取已经上传文件的Bucket、key、endPoint信息
5. 批量暂停/续传文件

**demo**

demo地址：[https://github.com/liulinmei/obs-upload-checkpoint/tree/master/example](https://)

![截图](attachment:a7b096ac6e72d5cb354f8c5ae32a0455)

### 基础使用

1. 项目下载 obs-upload-checkpoint 
   > npm install obs-upload-checkpoint
2. 引入obs-upload-checkpoint
   > import { uploadFile, breakpointResume, delFile, multiDelFile, downloadFile, getSignedFileUrl} from 'obs-upload-checkpoint'

### uploadFile上传函数

**基础使用**

```
<script>
import { uploadFile } from "obs-upload-checkpoint";
export default {
  name: "obsDemo",
  data() {
    return {
      uploadingFile: [],
    };
  },
  created() {},
  methods: {
    // 文件上传
    uploadFile(param) {
      let file = param.file;
      let fileInfo = uploadFile({
        file,
        getAuth:async (){
          return {
            ak:'your ak',
            sk:'your sk'
          }
        },
        endPoint:'your endPoint',
        resFileKey: {
          name: "fileName",
          url: "url",
          size: "size",
        },
        module: "material_pc/inquiry", 
        onBeforeUpload: (fileInfo) => {
          console.log("文件上传前回调", fileInfo);
        },
        uploadProgress: (percentage) => {
          console.log("上传进度", percentage, fileInfo);
        },
        uploadSuccess: (fileUrl, status) => {
          console.log("文件上传成功回调", fileUrl, status);
        },
        uploadError: (err, status) => {
          console.log("文件上传失败回调", err, status);
        },
      });
      this.uploadingFile.push(fileInfo);
    },
  },
};
</script>
```

**Options**

|参数|说明|类型|是否必传|可选值|默认值|
|:--|:--|:--|--|:--|:--|
|file|需要上传的文件|File|必传|—|—|
|resFileKey|上传成功后想要保留的字段(可直接上传至后端接口的字段，不需要在调用接口前再次转化为后端想要的字段名。主要是为了适配不同的后端接口所需要的字段名不一致。)|object|—|详细见resFileKey配置表|详细见resFileKey配置表|
|Bucket|桶名（华为云obs桶名，可理解为电脑的c、d、e、f盘，需要obs管理员预先创建）|string|必传|—|shigongbang|
|endPoint|endPoint|string|必传|—|—|
|module|文件上传后所处的文件夹，当文件夹在储存服务器中不存在时文件上传成功后会自动新建（建议格式：项目名/模块名）|string|—|—|member_center|
|getAuth|获取ak、sk函数，一般为调用后端接口获取，返回值需要为Promise对象|function|必传|—|—|
|onBeforeUpload|文件上传前回调，如果此回调函数返回false则文件不会被上传到obs服务，功能类似element上传组件的的before-upload,回调函数fileInfo参数：文件基本信息|function(fileInfo)|—|—|—|
|uploadProgress|文件上传进度回调|function(percentage)|—|—|—|
|uploadSuccess|文件上传成功回调，fileUrl：上传成功后文件的访问地址，status：文件上传状态；|function(fileUrl, status)|—|—|—|
|uploadError|文件上传失败回调|function(err, status)|—|—|—|
|statusChange|文件上传状态改变，status：当前文件的上传状态；|function(status)|—|—|—|

**返回值-Object**

上传成功后仅保留了resFileKey中配置的字段，文件上传成功前的字段如下表：

|属性名|说明|
|:--|:--|
|id|默认为选择的文件对象里面的uuid（即Options-file对象里面的uuid）|
|name|对应选择的文件对象（即Options-file对象）里面的name|
|size|上传文件大小，对应选择的文件对象（即Options-file对象）里面的size|
|type|上传文件类型，对应选择的文件对象（即Options-file对象）里面的type|
|percentage|文件已经上传的百分比|
|Key|文件唯一Key，组件内部自动生成|
|url|文件上传成功后，对应obs的访问地址|
|status|文件上传状态：-1 - 上传被暂停； 1 - 上传中； 2 - 上传失败; 3 - 上传完成|

<br/>

### breakpointResume暂停/续传文件

**基础使用：**

```
<script>
import { breakpointResume } from "obs-upload-checkpoint";
export default {
  name: "obsDemo",
  data() {
    return {
      uploadingFile: [],
    };
  },
  created() {},
  methods: {
    // 文件上传
    uploadFile(fileInfo) {
      const { Key } = fileInfo
      breakpointResume(Key)
    },
  },
};
</script>
```

**Options**

|参数|说明|类型|是否必传|可选值|默认值|
|:--|:--|:--|--|:--|:--|
|key|文件唯一Key,对应上传函数返回的fileInfo对象里面的Key字段值|String|必传|—|—|

### delFile 删除文件

**基础使用：**

```
<script>
import { delFile } from "obs-upload-checkpoint";
export default {
  name: "obsDemo",
  data() {
    return {
      uploadingFile: [],
    };
  },
  created() {},
  methods: {
    // 文件上传
    handleDelFile(fileUrl) {
      delFile({fileUrl,ak:'your ak',sk:'your sk'})
    },
  },
};
</script>
```

**Options-Object**

入参为object对象，对象中可传属性值如下表：

|参数|说明|类型|是否必传|可选值|默认值|
|:--|:--|:--|--|:--|:--|
|Key|如果删除文件为为上传到服务器的文件时，此值必传，否则可不传，对应上传函数返回的fileInfo对象里面的Key字段值（无特殊情况下，没有上传到服务器的文件可不用做删除处理）|String|与fileUrl二选一|—|—|
|fileUrl|删除已上传到服务器的文件时，此值必传，对应文件访问地址|String|与Key二选一|—|—|
|ak|授权所需ak|String|必传|—|—|
|sk|授权所需sk|String|必传|—|—|

### multiDelFile批量删除文件

**基础使用：**

```
<script>
import { multiDelFile } from "obs-upload-checkpoint";
export default {
  name: "obsDemo",
  data() {
    return {
      uploadingFile: [],
    };
  },
  created() {},
  methods: {
    // 文件上传
    handleDelFile(fileUrl) {
      multiDelFile({urlList:[fileUrl,'fileUrl2','fileUrl3'],ak:'your ak',sk:'your sk'})
    },
  },
};
</script>
```

**Options-Object**

入参为object对象，对象中可传属性值如下表：

|参数|说明|类型|是否必传|可选值|默认值|
|:--|:--|:--|--|:--|:--|
|KeyList|如果删除文件为为上传到服务器的文件时，此值必传，否则可不传，对应上传函数返回的fileInfo对象里面的Key字段值（无特殊情况下，没有上传到服务器的文件可不用做删除处理）|Array|与urlList二选一|—|—|
|urlList|删除已上传到服务器的文件时，此值必传，对应文件访问地址|Array|与KeyList二选一|—|—|
|ak|授权所需ak|String|必传|—|—|
|sk|授权所需sk|String|必传|—|—|

### downloadFile下载文件

**基础使用：**

```
<script>
import { downloadFile } from "obs-upload-checkpoint";
export default {
  name: "obsDemo",
  data() {
    return {
      uploadingFile: [],
    };
  },
  created() {
    downloadFile({fileUrl:'fileUrl',ak:'your ak',sk:'your sk'})
  },
  methods: {
  },
};
</script>
```

**Options-Object**

入参为object对象，对象中可传属性值如下表：

|参数|说明|类型|是否必传|可选值|默认值|
|:--|:--|:--|--|:--|:--|
|fileUrl|对应文件访问地址|String|必传|—|—|
|fileName|文件保存到本地的文件名称|String|—|—|fileUrl地址后缀名前面的名称|
|ak|授权所需ak|String|必传|—|—|
|sk|授权所需sk|String|必传|—|—|

### getSignedFileUrl获取obs文件临时授权访问地址

主要用于解决直接使用文件地址预览、下载文件时会报跨域问题

**基础使用：**

```
<!--根据文件地址在线预览txt内容-->
<template>
  <div
    v-html="txtValue"
    class="common-txt-preview"
    v-loading="loading"
    element-loading-text="数据加载中"
    element-loading-spinner="el-icon-loading"
  ></div>
</template>

<script>
import { getSignedFileUrl } from "obs-upload-checkpoint";
export default {
  name: "txtPreview",
  data() {
    return {
      txtValue: "",
      loading: true,
    };
  },
  created() {
    let { url } = this.$route.query;
    if (url) {
      let endStr = this.getEnd(url)?.toLowerCase();
      if (endStr === "txt") {
        this.getTxtContent(url);
      } else {
        this.loading = false;
        this.$message.error("只支持预览txt文件");
      }
    } else {
      this.loading = false;
      this.$message.error("文件url获取失败");
    }
  },
  methods: {
    async getTxtContent(url) {
      let { SignedUrl } = await getSignedFileUrl(url);
      // 获取到文件临时访问地址进行请求解析文件内容
      if (SignedUrl) {
        let self = this;
        let xhr = new XMLHttpRequest();
        xhr.open("get", SignedUrl, true);
        xhr.onload = function () {
          if (this.status == 200) {
            // 当遇到内容内有html标签时先进行替换，防止v-html进行解析。将空格和换行给替换为html标签进行解析
            self.txtValue = this.responseText
              .replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")
              .replace(/ /g, "&nbsp;")
              .replace(/\n/g, "<br>");
            self.loading = false;
          } else {
            self.loading = false;
            this.$message.error("获取文件内容失败");
          }
        };
        xhr.send();
      } else {
        this.loading = false;
        this.$message.error("获取文件临时访问地址失败");
      }
    },
    // 正则匹配文件后缀
    getEnd(file) {
      return file && file.replace(/.+\./, "");
    },
  },
};
</script>

<style lang="scss" scoped>
.common-txt-preview {
  box-sizing: border-box;
  height: 100vh;
  padding: 30px;
  font-size: 16px;
  word-break: break-all;
}
</style>
```

**Options-Object**

入参为object对象，对象中可传属性值如下表：

|参数|说明|类型|是否必传|可选值|默认值|
|:--|:--|:--|--|:--|:--|
|fileUrl|对应文件访问地址|String|必传|—|—|
|ak|授权所需ak|String|必传|—|—|
|sk|授权所需sk|String|必传|—|—|

### getBucketAndKeyByUrl根据文件url获取Bucket、key、endPoint

**基础使用：**

```
<script>
import { getBucketAndKeyByUrl } from "obs-upload-checkpoint";
export default {
  data() {
    return {
  
    };
  },
  created() {
    const { Bucket, Key, endPoint } = getBucketAndKeyByUrl(fileUrl);
  },
  methods: {
  
  },
};
</script>
```

**Options**

|参数|说明|类型|是否必传|可选值|默认值|
|:--|:--|:--|--|:--|:--|
|fileUrl|对应文件访问地址|String|必传|—|—|

### multiBreakpointResume批量暂停/续传文件操作

**基础使用：**

```
<script>
import { multiBreakpointResume } from "obs-upload-checkpoint";
export default {
  data() {
    return {
  
    };
  },
  created() {
  },
  methods: {
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
};
</script>
```

**Options**

|参数|说明|类型|是否必传|可选值|默认值|
|:--|:--|:--|--|:--|:--|
|keyList|对应文件Key集合|Array|必传|—|—|
