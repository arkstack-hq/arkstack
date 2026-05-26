export const TSConfig = {
    compilerOptions: {
        // baseUrl: '..',
        // ignoreDeprecations: '6.0',
        module: 'es2022',
        target: 'es2022',
        lib: ['es2022', 'DOM'],
        moduleResolution: 'bundler',
        esModuleInterop: true,
        forceConsistentCasingInFileNames: true,
        strict: true,
        skipLibCheck: true,
        skipDefaultLibCheck: true,
        strictFunctionTypes: true,
        strictPropertyInitialization: true,
        strictBindCallApply: true,
        noImplicitAny: true,
        removeComments: true,
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
        paths: {
            '@': ['../src'],
            'src/*': ['../src/*'],
            '@app/*': ['../src/app/*'],
            '@core/*': ['../src/core/*'],
            '@controllers/*': ['../src/app/http/controllers/*'],
            '@models/*': ['../src/app/models/*']
        }
    },
    include: ['./*.d.ts', '../src', '../tests']
}

export const BaseTCConfig = {
    extends: './.arkstack/tsconfig.json'
}
