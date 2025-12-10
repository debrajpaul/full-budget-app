import js from "@eslint/js";
import pluginTs from "@typescript-eslint/eslint-plugin";
import parserTs from "@typescript-eslint/parser";
import pluginJest from "eslint-plugin-jest";
import globals from "globals";
import eslintConfigPrettier from "eslint-config-prettier";

/** @type {import("eslint").FlatConfig[]} */
export default [
  {
    ignores: ["**/data/**", "**/dist/**", "**/node_modules/**", "infra/**"],
  },
  js.configs.recommended,
  {
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: parserTs,
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: process.cwd(),
        sourceType: "module",
      },
      globals: globals.node,
    },
    plugins: {
      "@typescript-eslint": pluginTs,
    },
    rules: {
      ...pluginTs.configs.recommended.rules,
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  {
    files: ["**/*.spec.ts", "**/*.test.ts"],
    plugins: {
      jest: pluginJest,
    },
    languageOptions: {
      globals: { ...globals.jest, ...globals.node },
    },
    rules: {
      ...pluginJest.configs.recommended.rules,
      "jest/no-disabled-tests": "warn",
      "jest/no-focused-tests": "error",
    },
  },
  eslintConfigPrettier,
];
