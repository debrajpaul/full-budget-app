# full-budget-app — Project Guide for Claude Code

## Stack & conventions
- pnpm workspaces: apps/*, packages/*, infra/*
- TS strict, esbuild bundling, Jest for unit tests
- Conventional Commits enforced by commitlint + Husky
- GraphQL SDL is the source of truth: docs/finance-budget.sdl.graphql
  Any schema change MUST update this file first, then typeDefs, then resolvers, then services.

## Definition of done for any change
1. `pnpm typecheck` passes
2. `pnpm lint` passes
3. `pnpm --filter <affected-pkg> test` passes
4. If SDL changed: regenerate FE codegen (once apps/web exists)
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
- pnpm --filter @services test
- pnpm --filter ./infra cdklocal:deploy:all

## Frontend (apps/web)
- Next.js 15 App Router, RSC default; "use client" only for interactivity
- Auth: httpOnly cookie set by Route Handlers; never localStorage
- All GraphQL goes through /api/graphql BFF — never call backend directly from browser
- Codegen owns types: NEVER hand-write GraphQL response types
- shadcn/ui + Tailwind v4; no other UI libraries
- forms: react-hook-form + Zod; share schemas with @common where possible

## Frontend DoD
1. pnpm --filter @app/web typecheck passes
2. pnpm --filter @app/web lint passes
3. pnpm --filter @api-client codegen produces no diff
4. New components have a Storybook story (after week 3) OR a Vitest test
5. Any new GraphQL doc has been added to lib/graphql/ before being used in a component