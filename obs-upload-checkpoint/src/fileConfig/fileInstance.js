/*
 * @Descripttion: file文件对象添加相关属性
 */
import { getFileKey } from './fileUtil'
const defaultmodule = 'member_center' //默认上传到的文件夹名称

// 获取文件基本信息对应的key
export function getFileInfoKey(key, resFileKey = {}) {
  if (!key && typeof key !== String) {
    throw new Error('请传入你想要查询的字段名，并且参数为字符串')
  }
  return resFileKey[key] || key
}
// 普通单文件上传对象
class BaseFile {
  constructor({ file, Bucket, module, ...extendAttrs }) {
    const Key = getFileKey(module, file)
    this.Key = Key
    this.row = file //File对象
    const { name, size, type, uuid } = file
    const { resFileKey } = extendAttrs
    this.fileInfo = {
      [getFileInfoKey('id', resFileKey)]: uuid,
      [getFileInfoKey('name', resFileKey)]: name,
      [getFileInfoKey('size', resFileKey)]: size,
      [getFileInfoKey('type', resFileKey)]: type,
      [getFileInfoKey('percentage', resFileKey)]: 0,
      [getFileInfoKey('Key', resFileKey)]: Key,
      [getFileInfoKey('url', resFileKey)]: null,
      [getFileInfoKey('status', resFileKey)]: 1, //文件上传状态（-1 - 上传被暂停； 1 - 上传中； 2 - 上传失败; 3 - 上传完成）
    } //文件基本信息
    this.Bucket = Bucket
    this.module = module
    this.resumeHook = null //取消断点续传上传任务控制参数
    this.uploadCheckpoint = null //记录断点位置
    this.changingStatus = false //是否正在切换状态（解决重复点击触发多次上传接口）
    this.obsInited = false //obs是否初始化完成（用于解决文件上传ak\sk未获取完成\obs未初始化完成时就点击了暂停，出现无法暂停的bug）
    this.uploadStatus = false //上传接口是否正在请求中（解决上传时，接口正在请求，用户快速点击暂停、续传，出现接口重复请求问题）
    this.uploadCount = 1 //错误请求次数
    if (extendAttrs) {
      //添加更多扩展属性
      for (let Key in extendAttrs) {
        if (Object.hasOwnProperty.call(extendAttrs, Key)) {
          this[Key] = extendAttrs[Key]
        }
      }
    }
  }
}
// 删除其他属性值，只保留配置的属性值
export function handleResKey(fileInstance) {
  try {
    let { resFileKey = {}, fileInfo = {} } = fileInstance || {}
    let resKeyNum = Object.keys(resFileKey)
    if (resKeyNum === 0) return //没有配置保留属性则默认返回所有的文件基本属性
    for (let key in fileInfo) {
      let saveResKey = null
      for (let resKey in resFileKey) {
        //找到resFileKey中是否有配置key对应的属性
        if (resFileKey[resKey] === key) {
          saveResKey = key
          break
        }
      }
      if (!saveResKey) {
        //删除没有配置的属性
        delete fileInfo[key]
      }
    }
  } catch (error) {
    console.log('handleResKey-error', error)
  }
}
// 获取文件对象
export default function createFileInstance({
  file,
  Bucket,
  module = defaultmodule,
  ...extendAttrs
}) {
  return new BaseFile({
    file,
    Bucket,
    module,
    ...extendAttrs,
  })
}
// 获取授权所需的ak、sk
export async function saveAuth({ fileInstance, getAuth }) {
  const { ak, sk } = (await getAuth()) || {}
  if (ak && sk) {
    fileInstance.ak = ak
    fileInstance.sk = sk
    return { ak, sk }
  }
  return {}
}
// 改变文件上传状态
export function changeStatus(fileInstance) {
  fileInstance.fileInfo[getFileInfoKey('status', fileInstance.resFileKey)] =
    fileInstance.toStatusVal
  fileInstance.changingStatus = false //判断取消成功了再重置改变状态
  fileInstance.statusChange &&
    fileInstance.statusChange(fileInstance.toStatusVal)
}
