import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  schema: "../../docs/finance-budget.sdl.graphql",
  documents: ["src/**/*.graphql", "../../apps/web/lib/graphql/**/*.graphql"],
  ignoreNoDocuments: true,
  generates: {
    "src/generated/": {
      preset: "client",
      config: { useTypeImports: true },
    },
  },
};

export default config;
