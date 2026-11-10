# full-budget-app — Project Guide for Claude Code

## Read first

- Before writing any code or taking any other action, read `.github/copilot-instructions.md` in full and follow it. It applies to every AI assistant in this repo.
- If it conflicts with this file, follow `.github/copilot-instructions.md`.

## Stack & conventions

- pnpm 12 workspaces: apps/_, packages/_, infra/*; internal packages are named `@app/*`
- Node 24 everywhere (`.nvmrc`, CI, Lambda `nodejs24.x` via `infra/lib/lambda-runtime.ts`, esbuild `node24`)
- This repo is backend only. The frontend lives in the separate `full-budget-app-dashboard` repo. Backend tsconfig extends `tsconfig.json`.
- TS strict, esbuild bundling, Jest for unit tests
- Conventional Commits enforced by commitlint + Husky
- GraphQL SDL is the source of truth: docs/finance-budget.sdl.graphql
  Any schema change MUST update this file first, then typeDefs, then resolvers, then services.

## Definition of done for any change

1. `pnpm typecheck` passes
2. `pnpm lint` passes
3. `pnpm --filter <affected-pkg> test` passes
4. If SDL changed: copy `docs/finance-budget.sdl.graphql` to the dashboard repo's `schema/` folder and regenerate its codegen
5. New/changed public APIs have a Jest spec next to them

## Layering rules

- Resolvers = thin; no business logic. Delegate to packages/services.
- Services take logger + stores via DI (see setup-services.ts pattern).
- DynamoDB access only through packages/db stores.
- Multi-tenant: every store method takes (tenantId, userId); never trust args alone.

## Do NOT

- Put secrets in code — use SSM stack + env
- Skip Husky hooks (--no-verify)
- Introduce new AWS SDK versions outside root package.json

## Preferred commands

- pnpm --filter @app/graphql-api dev
- pnpm --filter @app/services test
- pnpm deploy:qa # QA; prod deploys from CI on main

## Frontend

- The frontend (Next.js 15, `apps/web` and `packages/api-client`) lives in the `full-budget-app-dashboard` repo. Its own conventions and Definition of Done are documented there.
