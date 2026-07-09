import { defineConfig } from 'tsdown'

export default defineConfig({
    entry: [
        'src/index.ts',
        'src/setup.ts',
        'src/commands/ScheduleRunCommand.ts',
        'src/commands/ScheduleWorkCommand.ts',
        'src/commands/ScheduleListCommand.ts',
    ],
    exports: true,
    format: 'esm',
    sourcemap: false,
    dts: true,
    clean: true,
    outDir: 'dist',
    outExtensions() {
        return {
            js: '.js',
            dts: '.d.ts',
        }
    },
})
