import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    publicDir: false,
    build: {
        manifest: true,
        outDir: 'public/build',
        rolldownOptions: { input: ['resources/css/app.css', 'resources/js/app.tsx'] },
    },
})