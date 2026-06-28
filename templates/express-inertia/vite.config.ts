import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    build: {
        manifest: true,
        outDir: 'build',
        rolldownOptions: { input: 'resources/js/app.tsx' },
    },
})