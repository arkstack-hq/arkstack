import { defineConfig } from 'eslint/config'
import { globalIgnores } from 'eslint/config'
import js from '@eslint/js'
import markdown from '@eslint/markdown'
import tseslint from 'typescript-eslint'

export default defineConfig(
    {
        languageOptions: {
            globals: {
                console: 'readonly',
                process: 'readonly',
            },
            parserOptions: {
                tsconfigRootDir: process.cwd()
            }
        },
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ['docs/**/*.md', 'README.md'],
        plugins: {
            markdown,
        },
        extends: ['markdown/recommended'],
        rules: {
            'no-irregular-whitespace': 'off',
            'markdown/no-missing-label-refs': 'off',
        }
    },
    [
        globalIgnores([
            'docs/.vitepress/**',
            'bin/**',
            'dist/**',
            'build/**',
            '.arkstack/**',
            'node_modules/**',
        ])
    ],
    {
        rules: {
            'brace-style': [
                'error',
                '1tbs',
                { 'allowSingleLine': false },
            ],
            'no-console': 'off',
            'no-thenable': 'off',
            // 'no-ternary': 'error',
            'newline-before-return': 'error',
            'semi': ['error', 'never'],
            'quotes': ['error', 'single'],
            'no-unused-vars': 'off',
            '@typescript-eslint/no-unused-vars': [
                'warn', {
                    'argsIgnorePattern': '^_|_',
                    'vars': 'all',
                    'args': 'after-used',
                    'ignoreRestSiblings': false,
                    'varsIgnorePattern': '^I[A-Z]|^_',
                }
            ],
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/triple-slash-reference': ['error', {
                'path': 'always'
            }]
        }
    },
)