/* eslint-env node */

module.exports = {
    env: { browser: true, es6: true, node: true },
    extends: [
      "eslint:recommended",
      "plugin:@typescript-eslint/strict-type-checked",
      "plugin:@typescript-eslint/stylistic-type-checked",
      "plugin:react-hooks/recommended",
      "plugin:react/recommended",
      "plugin:react/jsx-runtime",
    ],
    parser: "@typescript-eslint/parser",
    parserOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      project: true,
      tsconfigRootDir: __dirname,
    },
    ignorePatterns: ["webpack.*.ts", "forge.config.ts", ".eslintrc.cjs", "out/**", "backend/**"],
  };