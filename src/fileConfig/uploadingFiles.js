// 对正在上传的文件进行管理
import createFileInstance from "./fileInstance";
import { getFileInfoKey } from "./fileInstance";
export default class UploadingFileArr {
  constructor() {
    this.fileArr = [];
  }
  // 添加正在上传的文件（缓存正在上传文件实例，以便后面断点、续传使用）
  addUploadingFile({ file, ...params }) {
    let fileInstance = createFileInstance({
      file,
      ...params,
    });
    this.fileArr.push(fileInstance);
    return fileInstance;
  }
  getUploadingFiles() {
    return this.fileArr;
  }
  getFileInstance(Key) {
    return this.fileArr.find((item) => item.Key === Key) || {};
  }
  delFileInstance(Key) {
    let delIndex = -1;
    let delItem =
      this.fileArr.find((item, index) => {
        if (item.Key === Key) {
          delIndex = index;
          return item;
        }
      }) || {};
    let uploadStatus =
      delItem.fileInfo[getFileInfoKey("status", delItem.resFileKey)];
    if (Number(uploadStatus) === 1) {
      //被删除的文件处于上传中时暂停文件上传
      delItem.fileInfo[getFileInfoKey("status", delItem.resFileKey)] = -1;
      delItem.resumeHook && delItem.resumeHook.cancel(); //暂停正在上传中的文件
    }
    delIndex >= 0 ? this.fileArr.splice(delIndex, 1) : "";
    return delIndex;
  }
}
