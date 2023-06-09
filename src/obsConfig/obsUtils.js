// obs上传公共配置
import axios from 'axios'
import { getFileInfoKey, handleResKey } from '../fileConfig/fileInstance'
import {
  getUploadFileUrl,
  getBucketAndKeyByUrl,
  mergeSameBucketOfKey,
  saveFile,
} from '../fileConfig/fileUtil'
import getObsClient from './obsInstance'
// 上传之前数据处理以及回调函数绑定
function handleBeforeUpload({
  // fileInstance,
  file,
  onBeforeUpload,
  uploadSuccess,
  uploadError,
  uploadProgress,
  upFileArrInstance,
  ...params
}) {
  let fileInstance = upFileArrInstance.addUploadingFile({
    file,
    ...params,
  })
  fileInstance.uploadSuccess = uploadSuccess //绑定文件上传成功回调
  fileInstance.uploadError = uploadError //绑定文件上传失败回调
  fileInstance.uploadProgress = uploadProgress //绑定文件上传进度回调
  const { Bucket, module } = fileInstance
  if (onBeforeUpload && onBeforeUpload(fileInstance.row) === false)
    handleUploadError(
      '文件上传前的回调函数（onBeforeUpload）返回了false则不进行文件上传'
    )
  return fileInstance
}

// 上传失败处理函数
function handleUploadError(err, fileInstance) {
  // fileInstance.obsInited = true; //obs初始化结束
  if (fileInstance) {
    fileInstance.fileInfo[getFileInfoKey('status', fileInstance.resFileKey)] = 2
    fileInstance.uploadCount = 1
    fileInstance.changingStatus = false
    fileInstance.uploadStatus = false //接口请求状态结束
    fileInstance.statusChange && fileInstance.statusChange(2)
    fileInstance.uploadError &&
      fileInstance.uploadError(
        err,
        fileInstance.fileInfo[getFileInfoKey('status', fileInstance.resFileKey)]
      )
  }
  throw new Error(err)
}

// 上传成功处理函数
async function handleUploadSuccess({
  fileInstance,
  upFileArrInstance,
  endPoint,
}) {
  try {
    const { beforeSuccess } = fileInstance
    let res = beforeSuccess && (await beforeSuccess(fileInstance))
    fileInstance.fileInfo.percentage = 100
    fileInstance.uploadProgress && fileInstance.uploadProgress(100) //文件上传进度回调
    fileInstance.fileInfo[getFileInfoKey('status', fileInstance.resFileKey)] = 3
    let fileUrl = getUploadFileUrl({ fileInstance, endPoint })
    fileInstance.fileInfo[getFileInfoKey('url', fileInstance.resFileKey)] =
      fileUrl
    fileInstance.uploadSuccess &&
      fileInstance.uploadSuccess(
        fileUrl,
        fileInstance.fileInfo[
          getFileInfoKey('status', fileInstance.resFileKey)
        ],
        res
      ) //文件上传成功回调
    fileInstance.statusChange && fileInstance.statusChange(3)
    handleResKey(fileInstance)
    // 上传回调之后，删除本地的文件实例
    upFileArrInstance && upFileArrInstance.delFileInstance(fileInstance.Key)
  } catch (error) {
    console.log('上传成功处理函数error', error)
  }
}
// 获取文件上传进度
function progressCB(
  transferredAmount,
  totalAmount,
  totalSeconds,
  fileInstance
) {
  let percentage = Math.floor((transferredAmount / totalAmount) * 100) //使用向下取整是为了避免进度在百分之九十多的时候显示已经百分百但实际文件尚未上传完整
  const prevPercent = fileInstance.fileInfo.percentage //文件之前的上传进度
  console.log('prevPercent,percentage', prevPercent, percentage)
  fileInstance.uploadCount = 1
  percentage > prevPercent ? (fileInstance.uploadCount = 1) : '' //当前进度在变化，说明在上传，错误上传次数重置
  let newPercentage = prevPercent > percentage ? prevPercent : percentage
  newPercentage = newPercentage > 99 ? 99 : newPercentage //解决最后一片段在上传到100%时，网络异常，片段被抛弃，下次再上传时一直卡在100%问题
  // fileInstance.percentage = newPercentage; //记录上传进度(如果上一次的)
  fileInstance.fileInfo.percentage = newPercentage
  fileInstance.uploadProgress && fileInstance.uploadProgress(newPercentage) //文件上传进度回调
}

/*
 * @Descripttion: 单个删除已经上传obs的文件
 * @param {String} fileUrl - 文件地址
 */
async function singleDelObsServeFile({ ak, sk, fileUrl }) {
  return new Promise(async (resolve, reject) => {
    if (!fileUrl) return
    //删除已经上传成功的文件
    const { Bucket, Key, endPoint } = getBucketAndKeyByUrl(fileUrl)
    const obsInstance = await getObsClient({ Bucket, ak, sk, endPoint })
    obsInstance.deleteObject(
      {
        Bucket,
        Key,
      },
      (err, result) => {
        if (err) {
          reject(err)
        }
        resolve(result.CommonMsg.Status)
      }
    )
  })
}

/*
 * @Descripttion: 批量删除已经上传obs的文件
 * @param {Array[String]} urlList - 文件url集合
 */
async function multiDelObsServeFile(urlList, ak, sk) {
  if (urlList.length === 0) return
  //删除已经上传成功的文件
  let urlMap = mergeSameBucketOfKey(urlList)
  let delFuns = []
  for (let mapKey in urlMap) {
    const { Bucket, endPoint, objects } = urlMap[mapKey] || {}
    const obsInstance = await getObsClient({ Bucket, ak, sk, endPoint })
    delFuns.push(delFilesFromServe(obsInstance, Bucket, objects))
  }
  let res = await Promise.all(delFuns)
  return res
}

// 删除服务器资源
function delFilesFromServe(obsInstance, Bucket, Objects) {
  return new Promise((reslove, reject) => {
    obsInstance.deleteObjects(
      {
        Bucket,
        // 设置为verbose模式
        Quiet: false,
        Objects,
      },
      function (err, result) {
        if (err) {
          console.log('删除异常', err)
          reject(err)
        } else {
          if (result.CommonMsg.Status < 300 && result.InterfaceResult) {
            // 获取删除成功、失败的对象
            const { Deleteds, Errors } = result.InterfaceResult || {}
            reslove({ Deleteds, Errors })
          }
        }
      }
    )
  })
}

// 临时授权下载
async function downloadFile({ fileUrl, fileName, ak, sk }) {
  try {
    if (!fileUrl) return
    let { SignedUrl, ActualSignedRequestHeaders } =
      (await getSignedFileUrl({ fileUrl, ak, sk })) || {} //获取临时授权相关信息
    if (!SignedUrl) throw new Error('没有获取到临时授权url') //没有获取到临时授权url
    let res = await axios.request({
      method: 'GET',
      url: SignedUrl,
      withCredentials: false,
      headers: ActualSignedRequestHeaders || {},
      validateStatus: function (status) {
        return status >= 200
      },
      maxRedirects: 0,
      responseType: 'blob',
    })
    if (res.status < 300) {
      saveFile({
        blob: res.data,
        fileUrl,
        fileName,
      })
      return
    }
    throw new Error('临时授权文件下载失败')
  } catch (error) {
    saveFile({
      fileUrl,
      fileName,
    })
  }
}
// 获取临时授权访问URL;
async function getSignedFileUrl({ fileUrl, ak, sk }) {
  const { Bucket, Key, endPoint } = getBucketAndKeyByUrl(fileUrl)
  const obsInstance = await getObsClient({ Bucket, ak, sk, endPoint })
  var res = obsInstance.createSignedUrlSync({
    Method: 'GET',
    Bucket: Bucket,
    Key,
    Expires: 3600,
  })
  return res
}

// 验证是否可以上传
function vertifyUpload(fileInstance, getAkSuccess) {
  console.log(
    '进入uploadFileObsServe',
    JSON.parse(JSON.stringify(fileInstance))
  )
  /*
   *1.文件的上传状态为暂停时，不发起上传请求(用于解决文件上传ak\sk未获取完成\obs未初始化完成时就点击了暂停，出现无法暂停的bug)
   */
  if (fileInstance.toStatusVal === -1) {
    console.log('进入暂停-uploadFileObsServe')
    // fileInstance.obsInited = true;
    getAkSuccess
      ? (fileInstance.fileInfo[
          getFileInfoKey('status', fileInstance.resFileKey)
        ] = fileInstance.toStatusVal)
      : '' //ak获取成功后的二次校验
    fileInstance.toStatusVal = undefined
    fileInstance.changingStatus = false
    return {
      createInterf: false, //是否新建接口调用
      uploadStatus: false, //接口请求状态
    }
  }
  if (fileInstance.toStatusVal == 1 && fileInstance.uploadStatus) {
    //文件处于上传中的状态时，有接口请求尚未结束，不新发起接口请求（解决上传时，接口正在请求，用户快速点击暂停、续传，出现接口重复请求问题）
    console.log(
      '文件处于上传中的状态时，有接口请求尚未结束-uploadFileObsServe',
      JSON.parse(JSON.stringify(fileInstance))
    )
    // fileInstance.toStatusVal = undefined;
    // fileInstance.fileInfo[getFileInfoKey("status", fileInstance.resFileKey)] =
    //   fileInstance.toStatusVal;
    return {
      createInterf: false, //是否新建接口调用
      uploadStatus: true, //接口请求状态
    }
  }
  // fileInstance.obsInited = false;
  // fileInstance.uploadStatus = true;
  return {
    createInterf: true, //是否新建接口调用
    uploadStatus: true, //接口请求状态
  }
}

export {
  handleBeforeUpload,
  handleUploadError,
  handleUploadSuccess,
  progressCB,
  singleDelObsServeFile,
  multiDelObsServeFile,
  downloadFile,
  getSignedFileUrl,
  vertifyUpload,
}
