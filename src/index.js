import _ from 'lodash-es'
import UploadingFileArr from './fileConfig/uploadingFiles'
import { getBucketAndKeyByUrl } from './fileConfig/fileUtil'
import {
  handleBeforeUpload,
  singleDelObsServeFile,
  multiDelObsServeFile,
  downloadFile,
  getSignedFileUrl,
  handleUploadError,
} from './obsConfig/obsUtils'
import { pauseOrStartUpload } from './obsConfig/uploadType/breakpointResume.js'
import { getUploadFunction } from './obsConfig/uploadType/index'
import { saveAuth, changeStatus } from './fileConfig/fileInstance'
const upFileArrInstance = new UploadingFileArr() //初始化正在上传的文件列表
/*
 * @Descripttion: 删除已经上传的文件
 * @param {String} fileUrl - 文件地址
 */
async function delFile({ Key, fileUrl, ak, sk }) {
  try {
    if (Key && !fileUrl) {
      //删除本地正在上传的文件
      let delIndex = upFileArrInstance.delFileInstance(Key)
      if (delIndex === -1) {
        throw new Error('文件不存在')
      }
      return 200
    }
    let res = await singleDelObsServeFile({ ak, sk, fileUrl })
    return res
  } catch (error) {
    throw new Error(error)
  }
}

/*
 * @Descripttion: 批量删除已经上传的文件
 * @param {Array[String]} KeyList - 文件key集合
 * @param {Array[String]} urlList - 文件url集合
 */
async function multiDelFile({ KeyList = [], urlList = [], ak, sk }) {
  try {
    let delSuccess = [] //删除成功的项
    let delError = [] //删除失败的项
    if (KeyList && KeyList.length > 0) {
      //删除本地正在上传的文件
      KeyList.map((item) => {
        let delIndex = upFileArrInstance.delFileInstance(item)
        delIndex === -1
          ? console.log(`删除本地正在上传的文件-Key:${item}不存在`)
          : delSuccess.push({ Key: item })
      })
    }
    //删除已经上传成功的文件
    let res = (await multiDelObsServeFile(urlList, ak, sk)) || []
    //记录上传成功、失败的项并返回给调用者
    res.map((item) => {
      const { Deleteds, Errors } = item
      delSuccess = delSuccess.concat(Deleteds)
      delError = delError.concat(Errors)
    })
    return { delSuccess, delError }
  } catch (error) {
    throw new Error(error)
  }
}

// 上传文件
function uploadFile({
  file,
  onBeforeUpload,
  uploadSuccess,
  uploadError,
  uploadProgress,
  getAuth,
  ...params
}) {
  const fileInstance = handleBeforeUpload({
    file,
    onBeforeUpload,
    uploadSuccess,
    uploadError,
    uploadProgress,
    upFileArrInstance,
    getAuth,
    ...params,
  })
  const { fileInfo } = fileInstance
  initUpload({
    fileInstance,
    getAuth,
    uploadType: params.uploadType,
  })
  return fileInfo
}

export async function initUpload({ fileInstance, getAuth, uploadType }) {
  const { Bucket, Key, row: fileObj, fileInfo } = fileInstance
  fileInstance.obsInited = false
  const { ak, sk } = (await saveAuth({ fileInstance, getAuth })) || {}
  if (fileInfo.toStatusVal === -1) {
    //如果此时用户已经点击了暂停，则不再发起上传，并将文件状态改为暂停状态
    changeStatus(fileInstance)
    return
  }
  if (!ak || !sk) {
    //ak、sk获取失败
    handleUploadError('授权所需的ak或者sk获取失败！', fileInstance)
    return
  }
  // 调用type对应的上传函数
  getUploadFunction({
    uploadType,
    Bucket,
    Key,
    fileObj,
    upFileArrInstance,
  })
}

// 上传类型为断点续传时可用于暂停/续传文件操作
const breakpointResume = _.debounce((Key) => {
  pauseOrStartUpload({ Key, upFileArrInstance })
}, 100)

// 上传类型为断点续传时可用于批量暂停/续传文件操作
function multiBreakpointResume(keyList) {
  keyList.map((item) => {
    pauseOrStartUpload({ Key: item, upFileArrInstance })
  })
}

export {
  uploadFile, //上传文件
  breakpointResume, //暂停/续传文件
  delFile, //删除已经上传的文件
  multiDelFile, //批量删除已经上传的文件
  downloadFile, //下载已经上传的文件
  getSignedFileUrl, //获取临时授权访问URL;
  getBucketAndKeyByUrl, //根据文件url获取Bucket、key、endPoint
  multiBreakpointResume, //批量暂停/续传文件操作
}
