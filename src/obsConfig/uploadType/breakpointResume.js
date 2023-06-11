// 断点续传;
import { getFileInfoKey, changeStatus } from '../../fileConfig/fileInstance'
import {
  progressCB,
  handleUploadError,
  handleUploadSuccess,
  vertifyUpload,
} from '../obsUtils'
import getObsClient from '../obsInstance'
//上传文件到obs服务器
async function uploadFileObsServe({
  fileParams = {},
  fileInstance,
  Key,
  upFileArrInstance,
  beforeSuccess,
}) {
  fileInstance =
    fileInstance || upFileArrInstance.getFileInstance(Key || fileParams.Key)
  beforeSuccess ? (fileInstance.beforeSuccess = beforeSuccess) : ''
  try {
    if (fileInstance.obsInited && !vertifyUpload(fileInstance).createInterf)
      return //初始化过
    var cp
    fileInstance.uploadStatus = true
    const { Bucket, ak, sk, endPoint } = fileInstance
    const obsInstance = await getObsClient({
      ak,
      sk,
      endPoint,
      Bucket,
      isRefresh: true,
    })
    fileInstance.uploadStatus = false //没有获取到obs实例
    // if (!obsInstance) return;
    if (!vertifyUpload(fileInstance, true).createInterf) {
      if (!fileInstance.obsInited && fileInstance.toStatusVal === -1) {
        console.log('进入-没有初始化成功过')
        //没有初始化成功过
        changeStatus(fileInstance)
      }
      return
    }
    fileInstance.uploadStatus = true
    obsInstance.uploadFile(
      {
        ProgressCallback: (transferredAmount, totalAmount, totalSeconds) => {
          fileInstance.fileInfo[
            getFileInfoKey('status', fileInstance.resFileKey)
          ] = 1
          progressCB(transferredAmount, totalAmount, totalSeconds, fileInstance)
        },
        EventCallback: (eventType, eventParam, eventResult) => {
          if (eventResult instanceof Error) {
            // 处理网络连接失败的情况
            console.log('errMsg', eventResult.message)
            let errMsg = eventResult.message
            errMsg.indexOf('Network Error') !== -1 &&
              handleUploadError(errMsg, fileInstance)
          }
        },
        ResumeCallback: (resumeHook, uploadCheckpoint) => {
          fileInstance.resumeHook = resumeHook // 获取取消断点续传上传任务控制参数
          fileInstance.uploadCheckpoint = uploadCheckpoint // 记录断点
          cp = uploadCheckpoint
          // fileInstance.changingStatus &&
          //   fileInstance.toStatusVal &&
          //   changeStatus(fileInstance); //解决重复点击触发多次上传接口
          if (fileInstance.toStatusVal === -1) {
            //主要为了解决在还没有拿到resumeHook值时，用户就点击了暂停按钮，导致状态为暂停状态，但是文件依旧在上传
            resumeHook.cancel()
            // fileInstance.uploadStatus = false;
          } else {
            fileInstance.changingStatus &&
              fileInstance.toStatusVal &&
              changeStatus(fileInstance) //解决重复点击触发多次上传接口
            fileInstance.toStatusVal = undefined
          }

          fileInstance.obsInited = true //obs初始化完成
          // fileInstance.uploadCount = 1;
        },
        TaskNum: 6, //分段上传时的最大并发数，默认为1。
        PartSize: 9 * 1024 * 1024, //分段大小，单位字节，取值范围是100KB~5GB，默认为9MB
        ...fileParams,
      },
      (err, result) => {
        fileInstance.changingStatus = false
        fileInstance.uploadStatus = false //接口请求状态结束
        if (err) {
          let newfileInstance = JSON.parse(
            JSON.stringify(
              upFileArrInstance.getFileInstance(Key || fileParams.Key)
            )
          )
          if (!newfileInstance || !newfileInstance.fileInfo) {
            console.log('进入解决被删除的情况')
            return //解决被删除的情况
          }
          if (newfileInstance.toStatusVal === -1) {
            //手动暂停
            changeStatus(fileInstance)
            fileInstance.uploadStatus = false
            fileInstance.toStatusVal = undefined
            return
          }
          let fileStatus = Number(
            fileInstance.fileInfo[
              getFileInfoKey('status', fileInstance.resFileKey)
            ]
          )
          if (fileStatus === 3) return //已经上传完成
          // 出现错误，再次调用断点续传接口，继续上传任务,连续调用三次依旧失败，文件上传状态改为error
          let uploadCount = Number(fileInstance.uploadCount)
          if (uploadCount < 3) {
            uploadFileObsServe({
              fileParams: {
                UploadCheckpoint: cp,
              },
              fileInstance,
              Key,
              upFileArrInstance,
            })
            fileInstance.uploadCount = uploadCount + 1
          } else {
            // fileInstance.status = 2;
            // fileInstance.fileInfo[
            //   getFileInfoKey("status", fileInstance.resFileKey)
            // ] = 2;
            handleUploadError(err, fileInstance)
            // fileInstance.uploadCount = 1;
          }
        } else {
          if (result && result.CommonMsg && result.CommonMsg.Status == 200) {
            handleUploadSuccess({
              fileInstance,
              upFileArrInstance,
              endPoint: obsInstance.util.server,
            })
          }
        }
      }
    )
  } catch (error) {
    // fileInstance.fileInfo[
    //   getFileInfoKey("status", fileInstance.resFileKey)
    // ] = 2;
    handleUploadError(error, fileInstance)
  } finally {
    // fileInstance.obsInited = true;
    // fileInstance.toStatusVal = undefined;
    // fileInstance.changingStatus = false;
    // fileInstance.uploadStatus = false; //接口请求状态结束
  }
}

// 暂停/续传文件 statusCB状态改变成功回调
function pauseOrStartUpload({ Key, upFileArrInstance }) {
  if (!Key) return
  let fileInstance = upFileArrInstance.getFileInstance(Key)
  let { fileInfo, uploadCheckpoint, resumeHook, Bucket, row } = fileInstance
  let status = Number(fileInfo.status)
  if (status === 3 || !status || fileInstance.changingStatus) return status //已经上传成功的文件不做处理
  //必须等待状态转完成才能进行下一步操作
  fileInstance.changingStatus = true
  if (status === -1 || status === 2) {
    fileInstance.toStatusVal = 1
    fileInstance.uploadCount = 1
    //当前状态为暂停/失败，改为续传
    if (uploadCheckpoint)
      return payUpload({
        uploadCheckpoint,
        fileInstance,
        upFileArrInstance,
        Key,
      })
    // console.log("当前状态为失败，改为续传");
    // 没有记录的断点，则重新发起新的上传请求
    return uploadFileObsServe({
      fileParams: {
        Bucket,
        Key,
        SourceFile: row,
      },
      Key,
      upFileArrInstance,
      // fileInstance: this,
    })
    // fileInstance.fileInfo[
    //   getFileInfoKey("status", fileInstance.resFileKey)
    // ] = 1;
  }
  // 暂停文件上传
  return pauseUpload(resumeHook, fileInstance)
}

// 暂停上传
function pauseUpload(hook, fileInstance) {
  if (fileInstance.toStatusVal == -1) return
  // fileInstance.fileInfo[getFileInfoKey("status", fileInstance.resFileKey)] = -1;
  fileInstance.toStatusVal = -1
  // if (hook) {
  hook && hook.cancel()
  // changeStatus(fileInstance);
  // fileInstance.uploadStatus = false;
  // fileInstance.changingStatus = false; //判断取消成功了再重置改变状态
  // fileInstance.fileInfo[getFileInfoKey("status", fileInstance.resFileKey)] =
  //   -1;
  // fileInstance.toStatusVal = undefined;
  // }
}

// 恢复上传
function payUpload({ uploadCheckpoint, fileInstance, upFileArrInstance, Key }) {
  if (!uploadCheckpoint) return
  // fileInstance.changingStatus = true;
  uploadFileObsServe({
    fileParams: {
      UploadCheckpoint: uploadCheckpoint,
    },
    Key,
    fileInstance,
    upFileArrInstance,
  })
}

export { pauseOrStartUpload }
export default uploadFileObsServe
