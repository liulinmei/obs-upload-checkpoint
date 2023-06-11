import {
  uploadFile,
  breakpointResume,
  delFile,
  multiDelFile,
  downloadFile,
  getSignedFileUrl,
} from 'obs-upload-checkpoint'
const defualBucket = 'your Bucket'
async function getAuth() {
  return {
    ak: 'your ak',
    sk: 'your sk',
  }
}

function obsUploadFile(params) {
  const Bucket = params.Bucket || defualBucket
  return uploadFile({
    ...params,
    getAuth,
    endPoint: 'your endPoint',
    Bucket,
  })
}
async function obsDelFile({ Key, fileUrl }) {
  return await delFile({
    Key,
    fileUrl,
    ...(await getAuth()),
  })
}

async function multiObsDelFile({ KeyList, urlList }) {
  return await multiDelFile({
    KeyList,
    urlList,
    ...(await getAuth()),
  })
}
// 下载文件
async function obsDownloadFile({ fileUrl, fileName }) {
  return await downloadFile({
    fileUrl,
    fileName,
    ...(await getAuth()),
  })
}
async function getSignedUrl(fileUrl) {
  return await getSignedFileUrl({
    fileUrl,
    ...(await getAuth()),
  })
}
export {
  obsUploadFile,
  breakpointResume,
  obsDelFile,
  multiObsDelFile,
  obsDownloadFile,
  getSignedUrl,
}
