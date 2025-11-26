import baseConfig from "./eslint.config.js";

export default baseConfig.map((config) => {
  if (config.languageOptions?.parserOptions) {
    delete config.languageOptions.parserOptions.project;
  }
  return config;
});
