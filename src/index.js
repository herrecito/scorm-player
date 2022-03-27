import { createApp } from "vue"

import App from "./App.vue"

navigator.serviceWorker.register("sw.js")

const app = createApp(App)
app.mount("#app")
