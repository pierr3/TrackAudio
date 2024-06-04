import globals from 'globals'
import pluginJs from '@eslint/js'
import tseslint from 'typescript-eslint'
import pluginReactConfig from 'eslint-plugin-react/configs/recommended.js'

export default [
  {
    files: ['src/**/*.{tsx,ts,js,jsx}'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } }
  },
  {
    ignores: [
      'node_modules/**/*',
      'resources/**/*',
      'dist/**/*',
      'build/**/*',
      'backend/**/*',
      'old/**/*',
      'out/**/*',
      'scripts/**/*',
      'public/**/*',
      'coverage/**/*',
      'test/**/*',
      'tests/**/*',
      'mocks/**/*',
      'docs/**/*'
    ]
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  pluginReactConfig,
  { settings: { react: { version: 'detect' } } }
]
