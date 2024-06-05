import pluginJs from '@eslint/js';
import pluginReactConfig from 'eslint-plugin-react/configs/recommended.js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

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
      'docs/**/*',
      '*-config.js'
    ]
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  pluginReactConfig,
  { settings: { react: { version: 'detect' } } }
];
