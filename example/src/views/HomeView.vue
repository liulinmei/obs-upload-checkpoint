<template>
  <div class="home">
    <h1 class="title">文件上传-断点续传-demo</h1>
    <UploadFile />
  </div>
</template>

<script>
// @ is an alias to /src
import UploadFile from '@/components/uploadFile.vue'

export default {
  name: 'HomeView',
  components: {
    UploadFile,
  },
}
</script>
<style scoped>
.title {
  text-align: center;
}
</style>
