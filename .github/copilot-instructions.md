# full-budget-app Development Guidelines

Last updated: 2026-10-27

These instructions apply to every AI assistant working in this repo (GitHub Copilot, Claude Code, Cursor).
`CLAUDE.md` and `docs/CODING_STYLE.md` carry the same rules in more detail. If they conflict with this file, this file wins.

## Overview

Multi-tenant, serverless budgeting platform. It ingests bank and credit-card statements, auto-categorises transactions (rule engine first, Bedrock fallback), and exposes a GraphQL API for dashboards, budgets, forecasts, recurring transactions, savings goals and sinking funds. The Next.js web app in `apps/web` consumes that API through a BFF route.

Phase 1 scope: compare actual spend against an ideal budget rule (50/30/20, 60/20/20) by segmenting spend into Needs, Wants and Savings.

## Tech Stack

- _Runtime_: Node.js 24+ (`.nvmrc`), TypeScript 5.8 (strict mode), ES2022 target, CommonJS modules
- _API_: Apollo Server (GraphQL, SDL-first) on AWS Lambda
- _AWS Services_: Lambda, DynamoDB, S3, SQS, Bedrock, SSM, X-Ray, CloudWatch
- _Frontend_: Next.js 15 App Router, React 19, Tailwind v4, shadcn/ui, Apollo Client, react-hook-form + Zod, Recharts
- _Infrastructure_: AWS CDK (`infra/`), esbuild bundling
- _Package Manager_: pnpm 12 workspaces
- _Testing_: Jest (backend), Vitest (web unit), Playwright (web E2E)
- _Code Quality_: ESLint 9 flat config, Prettier, Commitlint (Conventional Commits), Husky + lint-staged

## Project Structure

```text
apps/
  graphql-api/            # Apollo GraphQL Lambda (resolvers, typeDefs, setup-services.ts)
  txn-loaders/            # SQS-triggered Lambda: statement -> normalised transactions
  tag-loaders/            # DynamoDB-stream Lambda: rules + Bedrock categorisation
  web/                    # Next.js 15 frontend
packages/
  common/                 # Shared interfaces, enums, config (I* and E* types)
  services/               # Business logic (one service per domain)
  db/                     # DynamoDB stores - the only data-access layer
  auth/                   # JWT sign/verify, refresh tokens
  logger/                 # Structured logger
  parser/                 # Bank statement CSV parsers (HDFC, SBI, Axis)
  nlp-tagger/             # Keyword rule engine and category rules
  client/                 # S3 and SQS wrappers
  api-client/             # Apollo client and GraphQL codegen output
infra/                    # CDK stacks (excluded from root tsconfig and ESLint)
docs/                     # SDL, ADRs, architecture, frontend plans, Postman
```

TypeScript path aliases (from root tsconfig.json):

- `@app/common/*` -> `packages/common/src/*`
- `@app/services/*` -> `packages/services/src/*`
- `@app/db/*` -> `packages/db/src/*`
- `@app/auth/*` -> `packages/auth/src/*`
- `@app/logger/*` -> `packages/logger/src/*`
- `@app/parser/*` -> `packages/parser/src/*`
- `@app/client/*` -> `packages/client/src/*`
- `@app/nlp-tagger/*` -> `packages/nlp-tagger/src/*`
- `@app/api-client/*` -> `packages/api-client/src/*`

## Architecture Rules

### Layering

Resolver -> Service -> Store.

- _Resolvers are thin_: check `ctx.userId` and `ctx.tenantId`, delegate to `ctx.dataSources.<service>`, return the result. No business logic, no mapping beyond field renames.
- _Services hold business logic_ and take `logger` first, then stores, through the constructor. They are wired in one place: `apps/graphql-api/src/setup-services.ts`.
- _Stores are the only code that touches DynamoDB_ (`@aws-sdk/lib-dynamodb` commands).
- Services and stores implement `I*` interfaces declared in `@app/common`.

### Multi-tenancy

- Every store and service method takes `(tenantId: ETenantType, userId: string, ...)` as its first two parameters.
- Take identity from the JWT context only, never from client-supplied arguments.
- Item keys are `${userId}#${id}` under the `tenantId` partition key.

### GraphQL SDL-first

`docs/finance-budget.sdl.graphql` is the source of truth. Change order:

1. SDL
2. typeDefs
3. resolvers
4. services (and stores if persistence changes)
5. frontend codegen (`pnpm codegen`)

Never hand-write GraphQL response types in `apps/web`. Codegen owns them.

### Frontend

- Server components by default. Add `"use client"` only on the leaf that needs interactivity.
- Auth is an httpOnly cookie set by a Route Handler. Never use `localStorage` for tokens.
- Browser code calls `/api/graphql` (BFF) only, never the backend directly.
- shadcn/ui and Tailwind only. No other UI libraries.
- Each route gets `page.tsx`, a `<feature>-view.tsx`, `loading.tsx`, `error.tsx` and a Vitest spec.

## Code Style

- TypeScript strict mode everywhere. Avoid `any` (ESLint warns).
- Interfaces are prefixed `I` (`IBudgetService`), enums are prefixed `E` (`EBaseCategories`).
- Import shared code through the path aliases, never `../../` across packages.
- Prettier: double quotes, semicolons, trailing commas `es5`, 80 columns, 2 spaces, LF.
- _Unit tests_: co-locate as `*.spec.ts` / `*.spec.tsx` next to the source. Never use `*.test.ts`.
- Errors: throw `CustomError(message, code)` with a stable code (`NOT_FOUND`, `UNAUTHORIZED`, `TENANT_ID_REQUIRED`). Never throw strings.

## Clean Code Standards

Based on [clean-code-typescript](https://github.com/labs42io/clean-code-typescript).

### Variables

- Use meaningful, pronounceable, searchable names
- Use one vocabulary per concept (`getBudgets`, not `getBudgetList` and `fetchBudgets`)
- Don't add redundant context (`budget.amount`, not `budget.budgetAmount`)
- Use default parameters instead of short-circuiting
- Use enums to document intent

### Functions

- Limit to 2 arguments ideally; use an options object for more
- One thing per function, one level of abstraction
- No boolean flag parameters; split into separate functions
- Avoid side effects; prefer pure functions for calculations (percentages, segment mapping, rule comparison)
- Prefer map, filter and reduce over imperative loops
- Encapsulate conditionals in well-named functions; avoid negative conditionals
- Remove dead code. Git has the history

### Objects & Classes

- Prefer immutability (`readonly`, `as const`, `ReadonlyArray<T>`)
- Keep classes small with a single responsibility
- Prefer composition over inheritance
- Depend on abstractions, not concretions (DIP)

### Error Handling

- Always throw or reject with Error objects
- Never swallow a caught error. Log it with context
- Never leave a rejected promise unhandled

### Testing

- Follow F.I.R.S.T.: Fast, Independent, Repeatable, Self-Validating, Timely
- One concept per test; test names reveal intent
- Mock against the `I*` interfaces with `jest-mock-extended` `mock<T>()`, never concrete classes
- Structure: `describe(ServiceName)` -> `describe(methodName)` -> `it("does X when Y")`
- Build fixtures with a `makeX(overrides = {})` factory at the top of the spec
- Assert delegation (`toHaveBeenCalledWith`) and logging where relevant
- Frontend: `@testing-library/jest-dom` is not installed. Use native DOM assertions
- Interactive elements that tests target get `data-testid="<kebab-purpose>"` plus correct ARIA attributes

### File Naming

- kebab-case file names that match the primary export: `BudgetService` -> `budget-service.ts`, `segmentTransaction` -> `segment-transaction.ts`
- Test files: `budget-service.spec.ts`

### Formatting & Comments

- PascalCase for types and classes, camelCase for variables and functions, SNAKE_CASE for constants
- Organise imports: builtins, external, `@` aliases, relative
- Prefer self-documenting code over comments
- No commented-out code, no journal comments
- Comment only: non-obvious constraints, domain context the name can't carry, and why something exists

## Code Quality Gates

### Definition of Done

1. `pnpm typecheck` passes
2. `pnpm lint` passes
3. `pnpm --filter <affected-pkg> test` passes
4. If the SDL changed: `pnpm codegen` produces no diff
5. New or changed public APIs ship with a spec next to them

### Functional and Structural Correctness

- Code compiles, lint and tests pass, existing behaviour is not broken
- Edge cases are handled: zero income, empty month, unclassified transactions, last day of the month, timezone boundaries
- No duplicated logic; reuse existing services and helpers
- New dependencies are needed and worthwhile

### Non-Functional Requirements

- _PR size_: target 300 lines of business logic or less, one task per PR
- _Git history_: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`)
- _Never_ skip Husky hooks (`--no-verify`)
- _Security_: no secrets in code (use SSM and env), validate all input, never log tokens or full statement contents
- _No hardcoded values_: no environment-specific details; budget rule percentages live in config, not inline
- _AWS SDK_: new versions are introduced only in the root `package.json`
- _Money_: amounts are INR by default. Round at the presentation boundary, not mid-calculation
- _No hidden behaviours_: no surprising side effects

## Logging Pattern

Use `@app/logger`. Log a short action name, then a context object. Use `debug` for method entry and payloads, `info` for operational markers, `error` with the error object for failures.

```ts
this.logger.debug("Analyzing spend vs. budget", {
  tenantId,
  userId,
  month,
  year,
});
```

## Preferred Commands

- `pnpm --filter @app/graphql-api dev`
- `pnpm --filter @app/services test`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm codegen`
- `pnpm --filter ./infra cdk:deploy:all`
