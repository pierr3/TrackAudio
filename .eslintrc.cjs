/* eslint-env node */

module.exports = {
    env: { browser: true, es6: true, node: true },
    extends: [
      "eslint:recommended",
      "plugin:@typescript-eslint/strict-type-checked",
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