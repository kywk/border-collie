import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './assets/main.css'

const app = createApp(App)
const pinia = createPinia()

// Click-outside directive
app.directive('click-outside', {
    mounted(el, binding) {
        el._clickOutside = (event: MouseEvent) => {
            if (!(el === event.target || el.contains(event.target as Node))) {
                binding.value(event)
            }
        }
        document.addEventListener('click', el._clickOutside)
    },
    unmounted(el) {
        document.removeEventListener('click', el._clickOutside)
    }
})

app.use(pinia)
app.mount('#app')

