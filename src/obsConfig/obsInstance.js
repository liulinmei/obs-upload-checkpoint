/*
 * @Descripttion: obs鉴权以及obs实例
 */
import ObsClient from 'esdk-obs-browserjs'
let obsInstanceMap = {}
function getObsType(Bucket) {
  return Bucket && obsInstanceMap[Bucket]
}
// 新建实例并缓存实例,以便下次使用时直接获取
function createAndSaveClient({ ak, sk, endPoint, obsType }) {
  // 如果调用函数的时候没有传入ak、sk、endPoint,则取缓存的值，如果缓存也没有则抛出异常
  ak = ak || obsType.ak
  sk = sk || obsType.sk
  endPoint = endPoint || obsType.endPoint
  if (!ak || !sk || !endPoint) {
    throw new Error(
      `请传入${!ak ? 'ak' : ''}${!sk ? 'sk' : ''}${
        !endPoint ? 'endPoint' : ''
      }值`
    )
  }
  let instance = new ObsClient({
    access_key_id: ak,
    secret_access_key: sk,
    server: `https://${endPoint}`,
    timeout: 30, //HTTP/HTTPS请求的总超时时间（单位：秒）。默认为300秒
  })
  // 将ak、sk、endPoint、生成的obs实例缓存起来，以备下次直接使用
  obsType.ak = ak
  obsType.sk = sk
  obsType.endPoint = endPoint
  obsType.instance = instance
  return instance
}
/*
 * @Descripttion: 获取ObsClient实例
 * @Bucket: 需要上传的桶名（音/视频点播转码上传时需要上传到vod-jyb桶中鉴权等需要单独获取）
 * @isRefresh: 是否需要重新初始化（token过期时需要重新获取后端接口并生成新的ObsClient实例）
 */
export default function getObsClient({ ak, sk, endPoint, Bucket, isRefresh }) {
  let obsType = getObsType(Bucket)
  if (obsType && obsType.instance && !isRefresh) {
    //已有缓存，且允许直接读取缓存的情况下直接读取缓存的实例
    return obsType.instance
  }
  if (!obsType) {
    //初次创建Bucket对应的实例
    obsType = obsInstanceMap[Bucket] = {}
  }
  let instance = createAndSaveClient({
    ak: ak,
    sk: sk,
    endPoint: endPoint,
    obsType,
  })
  return instance
}
