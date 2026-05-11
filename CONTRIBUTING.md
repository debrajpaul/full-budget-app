# Contributing

Thanks for helping improve `full-budget-app`. This guide covers setup, conventions, and what we expect in a pull request.

## Quickstart

1. Fork `debrajpaul/full-budget-app` and clone your fork:
   ```bash
   git clone https://github.com/<your-user>/full-budget-app.git
   cd full-budget-app
   ```
2. Ensure you are on **Node.js 24+** (use `.nvmrc` with `nvm use`):
   ```bash
   nvm use
   node --version   # should print v24.x.x
   ```
3. Install dependencies (all devDependencies are at the workspace root):
   ```bash
   pnpm install
   ```
4. Create a feature branch:
   ```bash
   git checkout -b feat/<short-description>
   ```
5. Copy `.env.example` or create a `.env` with the variables listed in `README.md`. The three new DynamoDB table names are required for auth and goal features:
   ```
   DYNAMO_REFRESH_TOKENS_TABLE=refresh-tokens
   DYNAMO_SAVINGS_GOAL_TABLE=savings-goals
   DYNAMO_SINKING_FUND_TABLE=sinking-funds
   ```
6. For local emulation set `USE_LOCALSTACK=true`, run `./scripts/create_localstack_resources.sh`, and deploy CDK locally:
   ```bash
   pnpm --filter ./infra cdklocal:deploy:all
   ```
7. Make your changes, write matching tests, and run all quality gates before committing (see below).
8. Commit using Conventional Commits and open a pull request describing what changed, why, and any setup steps.

Minor edits (docs, comments) can be made via the GitHub web editor — open the file, click the pencil icon, and submit a PR.

---

## Project Conventions

### SDL is the source of truth

`docs/finance-budget.sdl.graphql` owns the GraphQL schema. The change order is always:

```
SDL → typeDefs → resolvers → service → store → *.spec.ts
```

Never hand-write TypeScript types that duplicate what the SDL already defines. Never add business logic to a resolver — delegate to `packages/services`.

### Layering rules

| Layer | Location | Rule |
|-------|----------|------|
| GraphQL resolver | `apps/graphql-api/src/schemas/resolvers/` | Thin: validate input, call a service method, return the result |
| Domain service | `packages/services/src/` | All business logic lives here; receives `(logger, ...stores)` via constructor injection |
| DynamoDB store | `packages/db/src/models/` | Data access only; every method takes `(tenantId, userId)` |
| Shared contracts | `packages/common/src/` | Interfaces and enums consumed by all other packages |

### File naming

- Test files: always `*.spec.ts`, never `*.test.ts`.
- Store implementations: `<resource>-store.ts` (e.g., `savings-goal-store.ts`).
- Service implementations: `<resource>-service.ts`.
- CDK stacks: `<resource>.stack.ts` (e.g., `savings-goals-table.stack.ts`).

### Dependency management

- **Runtime dependencies** belong in the individual package's `dependencies` block.
- **Dev dependencies** (type stubs, test tooling, build tools) belong in the **root `package.json`** only — do not add a `devDependencies` block to individual packages.
- Pin AWS SDK packages to `^3.873.0`. Do not introduce a new major version without updating all consumers and the root `pnpm.overrides`.
- The `pnpm.overrides` block at the root is reserved for `@smithy/*` conflict resolution caused by `aws-cdk-lib` transitive deps — do not add other overrides without a documented reason.

### Authentication & refresh tokens

The refresh-token store persists SHA-256 hashes, never raw tokens. Family revocation is automatic on reuse. When adding auth-related logic:

- Never store a raw refresh token value.
- Always pass through `hashRefreshToken(raw)` from `packages/auth` before writing to DynamoDB.
- Revoked-family checks must call `refreshTokenStore.revokeFamily(family)` before throwing `REFRESH_TOKEN_REUSED`.

### Upload flow

New upload work should use the two-step flow: `createUploadUrl` → direct S3 PUT by client → `notifyUploadComplete`. The deprecated single-step `uploadStatement` mutation will be removed in a future release.

### Date handling

All date fields in the schema use the custom `scalar Date` (ISO-8601 `YYYY-MM-DD`). The scalar validates with a V8-safe calendar round-trip — do not bypass this by casting strings directly to the Date type. Return plain strings from service/store methods; the scalar handles serialization.

### Pagination

`TransactionsPage` uses cursor-based pagination (`items: [...], cursor: String`). Use `PAGE_SIZE = 20` and encode the cursor as `txnDate|id`. Do not return unbounded arrays for collections that can grow with transaction history.

---

## Quality Gates

Run all of these before pushing:

```bash
pnpm typecheck              # tsc --noEmit from root
pnpm lint                   # ESLint across all packages
pnpm --filter <pkg> test    # Jest for the affected package(s)
pnpm build                  # esbuild bundle (catches runtime-only issues)
```

For schema changes, also verify the SDL change is consistent with the updated `typeDefs` file in `apps/graphql-api/src/schemas/typeDefs/`.

---

## Adding Features

### New GraphQL operation

1. Update `docs/finance-budget.sdl.graphql`.
2. Update the matching `typeDefs` file in `apps/graphql-api/src/schemas/typeDefs/`.
3. Add or update the resolver in `apps/graphql-api/src/schemas/resolvers/` — keep it thin.
4. Add or update the service method in `packages/services/src/`.
5. If a new store method is needed, add it to `packages/db/src/models/` and the matching interface in `packages/common/src/`.
6. Write a `*.spec.ts` beside the service file.

### New DynamoDB table

1. Create a store in `packages/db/src/models/<resource>-store.ts` implementing the interface from `packages/common`.
2. Add a CDK stack in `infra/lib/<resource>-table.stack.ts`.
3. Export the stack from `infra/lib/index.ts` and wire it into the CDK app in `infra/bin/infra.ts`.
4. Add the new table env var to `apps/graphql-api/src/environment.ts` and `setup-services.ts`.
5. Document the new env var in `README.md` and the stack in `docs/ARCHITECTURE.md`.

### New bank parser

1. Implement `IStatementParser` in `packages/parser/src/`.
2. Export the parser from `packages/parser/src/index.ts`.
3. Add the corresponding `BankName` enum value to `packages/common` and the SDL.
4. Register the parser in the bank-selector switch inside `apps/txn-loaders`.
5. Add a `*.spec.ts` with representative statement fixtures.

### New CDK stack or construct

1. Author the stack in `infra/lib/`.
2. Export it from `infra/lib/index.ts`.
3. Wire it in `infra/bin/infra.ts` with explicit stack dependencies.
4. Note whether the change requires new IAM permissions (Bedrock, X-Ray, SSM, etc.) and document in the PR.

---

## Merge Policy

**All pull requests require an approving review from [@debrajpaul](https://github.com/debrajpaul) before they can be merged — no exceptions.**

This is enforced at two levels:

1. **`.github/CODEOWNERS`** — `* @debrajpaul` auto-assigns the repo owner as a required reviewer on every PR.
2. **Branch protection on `main`** — the `main` branch requires at least one approving review from a Code Owner before merging is permitted. Direct pushes to `main` are disabled.

Do not attempt to merge your own PR. Once your branch is ready and all CI checks pass, request a review. The PR will be merged by the repo owner after approval.

## Pull Request Checklist

- [ ] Branch is off `main` and is up to date.
- [ ] If SDL changed: `typeDefs`, resolver, service, and store are all updated consistently.
- [ ] New or changed business logic has a `*.spec.ts` beside the implementation.
- [ ] `pnpm typecheck`, `pnpm lint`, and `pnpm --filter <pkg> test` all pass.
- [ ] `pnpm build` succeeds (no esbuild errors).
- [ ] New `devDependencies` are added to the **root `package.json`** only.
- [ ] New AWS SDK packages use `^3.873.0`.
- [ ] New DynamoDB tables have a matching CDK stack and env var documented in `README.md`.
- [ ] `docs/ARCHITECTURE.md` updated if topology, security model, or data flow changed.
- [ ] PR description explains what changed, why, any rollout concerns, and whether LocalStack was exercised.
- [ ] Commits follow Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, etc.).
- [ ] Review requested from **@debrajpaul** (auto-assigned via CODEOWNERS, but confirm it appears in the Reviewers panel).

---

## Commit Style

This repo enforces [Conventional Commits](https://www.conventionalcommits.org/) via commitlint + Husky. Examples:

```
feat(auth): add refresh-token rotation with family revocation
fix(parser): handle missing balance column in HDFC CC export
chore(deps): align AWS SDK to ^3.873.0 across all packages
docs(architecture): document new savings-goal and sinking-fund stores
test(services): add parametric tests for EForecastAlertType enum
```

Husky hooks run `pnpm lint` and `pnpm typecheck` on commit. Do not bypass them with `--no-verify`.

---

## Postman & Manual Testing

Postman collection and environment files live in `docs/postman/`. Import both, set your `baseUrl` and `authToken`, and use the saved requests to exercise the full mutation flow:

1. `register` → `login` (capture `token` and `refreshToken`)
2. `createUploadUrl` → PUT file directly to the signed S3 URL → `notifyUploadComplete`
3. `refreshToken` to rotate the session
4. Query `annualReview`, `budgets`, `savingsGoals`, `sinkingFunds` to verify data

---

## Getting Help

- Review `docs/ARCHITECTURE.md` for a deep dive into data flow, security model, and the layering rules.
- Check existing `*.spec.ts` files in `packages/services/src/` for patterns on mocking stores with `jest-mock-extended`.
- Open an issue on GitHub if something in the setup or conventions is unclear.
