# Coding Style Guide

This document captures the conventions used throughout this project so they can
be reproduced consistently in other codebases. It reflects what's *actually*
enforced (via ESLint/Prettier/CI) and what's followed by convention in the code.

---

## 1. Monorepo layout

```
apps/*       — deployable units (graphql-api, web, loaders/workers)
packages/*   — shared libraries, consumed via workspace protocol
infra/*      — IaC (CDK), kept isolated from app TS project
docs/*       — SDL, ADRs, architecture notes
```

- pnpm workspaces (`pnpm-workspace.yaml` / `workspaces` field).
- Every package has its own `tsconfig.json` that **extends the root**
  `tsconfig.json` and overrides only what it needs (paths, outDir, include).
- Shared packages are imported via short workspace aliases configured once in
  the root `tsconfig.json` `paths` map (e.g. `@app/common/*`, `@app/db/*`, `@app/services/*`,
  `@app/logger/*`), not relative `../../` imports across packages.
- `infra/` is deliberately excluded from the root TS project and from ESLint —
  it has its own `tsconfig.json` with an explicit `include` (`["lib", "bin"]`)
  so it never accidentally pulls in app source via inherited `include` globs.

## 2. TypeScript conventions

- **Strict mode everywhere** (`"strict": true` in the root tsconfig).
- **Target**: all packages compile to `ES2022` — set once at the root and
  inherited; per-package overrides are avoided unless there's a real reason.
- **Naming convention for shared types** (all defined in `@app/common/abstractions`,
  grouped by domain folder — `users/`, `budgets/`, `sinking-funds/`, etc.):
  - Interfaces prefixed with `I`: `ISinkingFund`, `ILogger`, `ISinkingFundStore`,
    `ICreateSinkingFundInput`.
  - Enums prefixed with `E`: `ETenantType`.
  - Service/store contracts are interfaces (`ISinkingFundService`,
    `ISinkingFundStore`) — concrete classes implement them so they can be
    mocked in tests.
- Avoid `any`. ESLint sets `@typescript-eslint/no-explicit-any` to `warn` (not
  error, but treated as a smell to clean up).
- No barrel-export sprawl beyond one `index.ts` per package re-exporting its
  public surface.

## 3. Backend layering (strict, enforced by review)

```
Resolver  →  Service  →  Store
(thin)       (business     (DynamoDB access
              logic)        only, via DI)
```

- **Resolvers are thin.** They only:
  1. Auth-check (`ctx.userId`, `ctx.tenantId`) and throw `CustomError` with a
     stable error code if missing.
  2. Delegate to `ctx.dataSources.<xxxService>.<method>(...)`.
  3. Return the result directly — no mapping/business logic in the resolver.

  ```ts
  export const sinkingFundResolvers = {
    Query: {
      sinkingFunds: async (_: unknown, __: unknown, ctx: IGraphQLContext) => {
        if (!ctx.userId) throw new CustomError("Unauthorized", "UNAUTHORIZED");
        if (!ctx.tenantId)
          throw new CustomError("Tenant ID is required", "TENANT_ID_REQUIRED");
        return ctx.dataSources.sinkingFundService.getSinkingFunds(
          ctx.tenantId,
          ctx.userId
        );
      },
    },
  };
  ```

- **Services hold business logic** and are constructed with **dependency
  injection** — always `logger` first, then store(s):

  ```ts
  export class SinkingFundService implements ISinkingFundService {
    private readonly logger: ILogger;
    private readonly store: ISinkingFundStore;

    constructor(logger: ILogger, store: ISinkingFundStore) {
      this.logger = logger;
      this.store = store;
    }

    public async updateSinkingFund(...) {
      this.logger.debug("Updating sinking fund", { tenantId, userId, id });
      const fund = await this.store.getSinkingFund(tenantId, userId, id);
      if (!fund) throw new CustomError("Sinking fund not found", "NOT_FOUND");
      return this.store.updateSinkingFund(tenantId, userId, id, input);
    }
  }
  ```

  Wiring happens in one central `setup-services.ts` that constructs every
  service with its logger + stores — no service reaches for a singleton or
  constructs its own dependencies.

- **Stores are the only thing that touches DynamoDB**, via
  `@aws-sdk/lib-dynamodb` document client commands (`PutCommand`,
  `GetCommand`, `QueryCommand`, `UpdateCommand`, `DeleteCommand`). Same
  constructor shape: `logger`, `tableName`, `DynamoDBDocumentClient`.

- **Multi-tenancy is load-bearing, not decorative**: every store/service
  method takes `(tenantId: ETenantType, userId: string, ...)` as its first two
  params — never trust IDs embedded only in the payload. Item keys are
  composed as `${userId}#${id}` under a `tenantId` partition key.

- **Errors** use a shared `CustomError(message, code)` — the `code` is a
  stable string (`"NOT_FOUND"`, `"UNAUTHORIZED"`, `"TENANT_ID_REQUIRED"`) the
  frontend/resolvers can branch on.

## 4. GraphQL SDL-first workflow

- `docs/finance-budget.sdl.graphql` is the **single source of truth**.
- Order of changes for any schema change:
  1. Edit the SDL file.
  2. Update `typeDefs`.
  3. Update/add resolvers.
  4. Update/add services (and stores if persistence changes).
  5. Regenerate frontend codegen (`pnpm --filter @app/api-client codegen`) — CI
     has a dedicated `fe-codegen-drift` job that re-runs codegen and asserts
     `git diff --exit-code` to catch anything hand-edited or stale.
- **Never hand-write GraphQL response types** on the frontend — codegen owns
  them. Each `.graphql` document lives under `apps/web/lib/graphql/<domain>.ts`
  before it's used in a component.

## 5. Frontend conventions (Next.js App Router)

- **Server components by default.** `"use client"` is added only to the leaf
  component that needs interactivity (hooks, event handlers), not to whole
  page trees.
- **Page anatomy** — every route under `app/(app)/<feature>/` gets:
  - `page.tsx` — server component, fetches via `getClient()` from
    `@/lib/apollo/server-client`, passes data to a `<FeatureView />`.
  - `<feature>-view.tsx` under `components/<feature>/` — `"use client"`,
    receives initial data as props, owns local state/interactivity.
  - `loading.tsx` — skeleton matching the page's card layout.
  - `error.tsx` — error boundary with a retry button.
  - `page.spec.tsx` — Vitest happy-path render test.
- **Auth**: session is an httpOnly cookie set by a Route Handler; decoded
  server-side via `getSessionUser()` (`@/lib/auth/session`). Never read auth
  state from `localStorage`.
- **All GraphQL traffic goes through `/api/graphql`** (BFF route) — browser
  code never calls the backend GraphQL endpoint directly.
- **UI library**: shadcn/ui primitives (`@/components/ui/*`) + Tailwind v4
  only — no competing UI libraries. Compose primitives (`Card`,
  `CardHeader`/`CardTitle`/`CardDescription`/`CardContent`, `Separator`,
  `Badge`, `Button`) rather than writing raw `div`s with ad-hoc styling for
  structural elements.
- **Forms**: `react-hook-form` + `Zod`, sharing schemas with `@app/common` where
  the shape overlaps a backend input type.
- **Testability**: interactive elements that tests need to target get a
  `data-testid="<kebab-purpose>"` (e.g. `profile-email`, `theme-dark`,
  `sign-out-btn`) plus correct ARIA attributes (`aria-pressed`, `role="group"`,
  `aria-label`) — testid and accessibility together, not one instead of the
  other.
- **Constants over repetition**: option lists (theme choices, nav items) are
  declared as a single `as const` array and `.map()`'d, not duplicated JSX
  blocks.

## 6. Testing conventions

- **Naming**: spec files are always `*.spec.ts` / `*.spec.tsx` — never
  `*.test.ts`. This is enforced by convention (not yet by lint), so keep it
  consistent when adding new specs.
- **Backend (Jest)**:
  - Mock dependencies with `jest-mock-extended`'s `mock<T>()` against the
    `I*` interfaces — never mock concrete classes.
  - Structure: `describe(ServiceName)` → `describe(methodName)` →
    `it("delegates to store.x and returns the result", ...)`.
  - Build test fixtures with a small `makeX(overrides = {}) => ({...defaults,
    ...overrides})` factory at the top of the spec file instead of repeating
    literals.
  - Assert both the delegation (`expect(store.method).toHaveBeenCalledWith(...)`)
    and any logging (`expect(logger.debug).toHaveBeenCalledWith(...)`).
- **Frontend (Vitest)**:
  - `environment: "jsdom"`, native DOM/Vitest matchers (`.textContent`,
    `.getAttribute()`, `.disabled`, `.toBeDefined()`) — `@testing-library/jest-dom`
    is **not** installed, so don't reach for `.toBeInTheDocument()` /
    `.toHaveTextContent()`.
  - Mock `next/navigation` and `next-themes` at the top of page/component specs.
  - `vitest.config.ts` excludes `**/e2e/**` so Playwright spec files (which use
    `test.describe` from `@playwright/test`) are never picked up by Vitest.
- **E2E (Playwright)**: separate `playwright.config.ts`, multi-project setup —
  a `setup` project logs in once and saves `storageState`; dependent projects
  reuse that state. Gated to run only on `push` to `main` in CI (not on every
  PR) to keep the fast feedback loop fast.

## 7. Formatting & linting

- **Prettier** (`prettier.config.cjs`) — explicit, not default-implicit:
  ```js
  { singleQuote: false, trailingComma: "es5", printWidth: 80,
    tabWidth: 2, useTabs: false, semi: true, endOfLine: "lf" }
  ```
- **ESLint** flat config (`eslint.config.*`):
  - `infra/**`, `**/dist/**`, `**/src/generated/**` (codegen output),
    `**/codegen.ts` are globally ignored.
  - TS files use `@typescript-eslint` recommended rules +
    `no-explicit-any: warn`.
  - `*.spec.ts` files get `eslint-plugin-jest` recommended rules, with
    `no-focused-tests: error` (an `.only` can't land) and
    `no-disabled-tests: warn`.
- **Husky + lint-staged**: pre-commit runs ESLint `--fix` + Prettier on staged
  `.ts/.tsx/.js/.jsx` (with a bumped `NODE_OPTIONS` memory limit for large
  diffs) and Prettier on `.md`/`.json`. Hooks are never skipped with
  `--no-verify`.

## 8. Commits & CI

- **Conventional Commits**, enforced by `commitlint` +
  `@commitlint/config-conventional` via a Husky `commit-msg` hook
  (`feat:`, `fix:`, `chore:`, etc.).
- **CI mirrors local DoD**: a matrix job runs `tsc --noEmit`, ESLint,
  Prettier `--check`, and `pnpm run --if-present test` per package (so
  packages without a `test` script don't fail the matrix). Frontend has its
  own dedicated `fe-typecheck` / `fe-lint` / `fe-test` / `fe-build` /
  `fe-codegen-drift` jobs, and `infra` has a dedicated `infra-typecheck` job
  kept out of the main matrix.
- **Definition of done** for any change:
  1. `pnpm typecheck` (root) passes.
  2. `pnpm lint` passes.
  3. `pnpm --filter <affected-pkg> test` passes.
  4. SDL changes → regenerate frontend codegen with no diff.
  5. New/changed public APIs ship with a `.spec.ts` alongside them.

## 9. Dependency hygiene

- AWS SDK v3 packages are pinned to the **same version** across every package
  that uses them (bump centrally, not per-package).
- `aws-cdk` (CLI, root devDependency) and `aws-cdk-lib` (library, in `infra/`)
  follow **different version numbering** — don't assume they're the same
  number; check npm for each independently when bumping.
- New AWS SDK versions are only introduced via the root `package.json`, never
  pinned ad hoc inside a single package.
