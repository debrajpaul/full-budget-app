// const path = require("path")
// const { pathsToModuleNameMapper } = require("ts-jest");
// const { compilerOptions } = require("./tsconfig.json"); 

// export default {
//   preset: "ts-jest",
//   testEnvironment: "node",
//   testMatch: ["**/?(*.)+(spec|test).ts"],
//   moduleFileExtensions: ["ts", "js", "json"],
//   collectCoverage: false,
//   coverageDirectory: path.resolve(__dirname,'./coverage'),
//   coverageReporters: ["text", "lcov"],
//   reporters: ["default"],
//   moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, {
//     prefix: __dirname,
//   }),
// };

import path from "path";
import { pathsToModuleNameMapper } from "ts-jest";
import { fileURLToPath } from "url";
import { readFileSync } from "fs";

// __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read and parse tsconfig
const tsconfig = JSON.parse(
  readFileSync(new URL("./tsconfig.json", import.meta.url), "utf-8")
);

export default {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/?(*.)+(spec|test).ts"],
  moduleFileExtensions: ["ts", "js", "json"],
  collectCoverage: false,
  coverageDirectory: path.resolve(__dirname, "./coverage"),
  coverageReporters: ["text", "lcov"],
  reporters: ["default"],
  moduleNameMapper: pathsToModuleNameMapper(tsconfig.compilerOptions.paths, {
    prefix: "<rootDir>/",
  }),
};
