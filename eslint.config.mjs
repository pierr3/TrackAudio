import pluginJs from '@eslint/js';
import pluginReactConfig from 'eslint-plugin-react/configs/recommended.js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default [
  {
    files: ['src/**/*.{tsx,ts,js,jsx}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node }
    }
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
      '*-config.js',
      'eslint.config.mjs'
    ]
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
        project: ['./tsconfig.web.json', './tsconfig.node.json']
      }
    }
  },
  pluginReactConfig,
  {
    settings: { react: { version: 'detect' } },
    rules: {
      'react/react-in-jsx-scope': 'off'
    }
  }
];
