/*
 * @Descripttion: 获取文件相关信息
 */

/*
 * @Descripttion: 文件路径
 */
export function getFileKey(module, file) {
  const suffix = getFileSuffix(file)
  const date = new Date()
  const year = date.getFullYear()
  let month = date.getMonth() + 1
  month = `${month < 10 ? 0 : ''}${month}`
  let day = date.getDate() + 1
  day = `${day < 10 ? 0 : ''}${day}`
  const times = date.getTime()
  const random = Math.floor(Math.random() * 1000000 + 1) //1到1000000的随机整数
  return `${module}/${year}-${month}-${day}/${times}${random}.${suffix}`
}
/*
 * @Descripttion: 获取文件后缀名
 */
export function getFileSuffix(file) {
  if (file instanceof File) {
    const fileName = file.name
    return fileName.substring(fileName.lastIndexOf('.') + 1).toLowerCase()
  }
  throw new Error('传入的文件须是File对象')
}

/*
 * @Descripttion: 获取已经上传的文件地址
 */
export function getUploadFileUrl({ Bucket, Key, fileInstance, endPoint }) {
  let bucketName = Bucket || fileInstance.Bucket
  let fileKey = Key || fileInstance.fileInfo.Key
  endPoint = endPoint || 'obs.cn-east-3.myhuaweicloud.com'
  return `https://${bucketName}.${endPoint}/${fileKey}`
}

/*
 * @Descripttion: 根据文件地址获取Bucket和Key以及endPoint
 */
export function getBucketAndKeyByUrl(fileUrl) {
  const fileUrlArr = fileUrl.split('://')
  const urlPath = fileUrlArr[1] || ''
  let splitIndex = urlPath.indexOf('/') //第一次出现/的位置
  // 以第一个/划分。前后分别为ip和key
  let Key = urlPath.substring(splitIndex + 1, urlPath.length)
  let ip = urlPath.substring(0, splitIndex) //第一次出现.的位置
  let firstPointIndex = ip.indexOf('.')
  // 以第一个.划分。前后分别为Bucket和endPoint
  let Bucket = ip.substring(0, firstPointIndex)
  let endPoint = ip.substring(firstPointIndex + 1, ip.length)
  return {
    Bucket,
    Key,
    endPoint,
  }
}

// 根据url获取文件名称
export function getFileNameByUrl(fileUrl) {
  let keyArr = fileUrl.split('/')
  let keyArrLen = keyArr.length
  let fileName = keyArrLen > 0 ? keyArr[keyArrLen - 1] : ''
  return fileName
}
// 保存文件到本地
export function saveFile({ blob, fileName, fileUrl }) {
  try {
    //获取下载文件的名称
    fileName = fileName || getFileNameByUrl(fileUrl) || '附件'
    if (blob && window.navigator.msSaveOrOpenBlob) {
      navigator.msSaveOrOpenBlob(blob, fileName)
      return
    }
    const link = document.createElement('a')
    link.href = blob ? window.URL.createObjectURL(new Blob([blob])) : fileUrl
    link.download = fileName
    link.click()
    window.URL.revokeObjectURL(link.href)
  } catch (error) {
    console.log('error', error)
  }
}

// 将Bucket相同的key聚合在一起
export function mergeSameBucketOfKey(urlList) {
  let urlMap = {} //将同一Bucket的文件聚合到一起
  urlList.map((item) => {
    const { Bucket, Key, endPoint } = getBucketAndKeyByUrl(item)
    let mapKey = `${Bucket}-${endPoint}`
    if (
      urlMap[mapKey] &&
      urlMap[mapKey].objects &&
      urlMap[mapKey].objects.length > 0
    ) {
      urlMap[mapKey].objects.push({ Key })
    } else {
      urlMap[mapKey] = { Bucket, endPoint, objects: [{ Key }] }
    }
  })
  return urlMap
}
