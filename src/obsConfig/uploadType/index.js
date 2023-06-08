import uploadFileObsServe from './breakpointResume.js'

const uploadTypeMap = {
  //不同的上传类型对应的不同的配置
  breakpointResume: {
    uploadFun: function ({
      Bucket,
      fileObj,
      Key,
      obsInstance,
      upFileArrInstance,
    }) {
      uploadFileObsServe({
        fileParams: {
          Bucket,
          Key,
          SourceFile: fileObj,
        },
        Key,
        obsInstance,
        upFileArrInstance,
      })
    }, //断点续传上传函数
  },
  // video: {
  //   //视频上传（需要转码的视频可用此上传，其他普通视频可直接使用breakpointResume类型）
  //   uploadFun: function ({
  //     Bucket,
  //     fileObj,
  //     Key,
  //     obsInstance,
  //     upFileArrInstance,
  //   }) {
  //     uploadFileObsServe({
  //       fileParams: {
  //         Bucket,
  //         Key,
  //         SourceFile: fileObj,
  //       },
  //       Key,
  //       obsInstance,
  //       upFileArrInstance,
  //       beforeSuccess: fileToVod,//调用成功回调函数之前
  //     });
  //   },
  // },
}
// 获取对应的上传函数
function getUploadFunction({
  uploadType,
  Bucket,
  Key,
  fileObj,
  upFileArrInstance,
}) {
  uploadType = uploadType || 'breakpointResume'
  let uploadTypeItem =
    uploadTypeMap[uploadType] || uploadTypeMap.breakpointResume || {}
  const uploadFun = uploadTypeItem.uploadFun
  uploadFun({
    Bucket,
    fileObj,
    Key,
    upFileArrInstance,
  })
}

export { getUploadFunction }
