import Vue from 'vue'
import App from './App.vue'
import router from './router'
import 'element-ui/lib/theme-chalk/index.css'
import { Upload, Progress, Icon, Tooltip } from 'element-ui'

Vue.config.productionTip = false
Vue.use(Upload)
Vue.use(Progress)
Vue.use(Icon)
Vue.use(Tooltip)


new Vue({
  router,
  render: (h) => h(App),
}).$mount('#app')
