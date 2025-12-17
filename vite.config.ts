import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// https://vite.dev/config/
// For GitHub Pages deployment, set base to '/<repo-name>/' if needed
// The default './' works for most cases
export default defineConfig({
    plugins: [vue()],
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src')
        }
    },
    base: process.env.GITHUB_ACTIONS ? '/BorderCollie/' : './'
})
