import vue from '@vitejs/plugin-vue'

export default {
    plugins: [vue()],
    base: '/',
    build: {
        manifest: true,
        outDir: 'dist',
        emptyOutDir: true,
    },
}
