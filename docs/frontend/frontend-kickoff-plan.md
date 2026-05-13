# Frontend Kickoff Plan — full-budget-app `apps/web`

**Status:** Ready to execute
**Date:** 2026-04-21
**Target:** Ship functional Next.js 15 App Router FE wired to GraphQL API in 5 weeks
**Assumes:** ADR-001 approved (Next.js + TS + Apollo + OpenNext on AWS)

Follows the 6-phase structure: Architecture → Setup → Implementation → Testing → Deployment → Monitoring.

---

## 1. Architecture (recap)

```
full-budget-app/
├── apps/
│   ├── graphql-api/         (existing)
│   ├── txn-loaders/         (existing)
│   ├── tag-loaders/         (existing)
│   └── web/                 (NEW — Next.js 15)
├── packages/
│   ├── api-client/          (NEW — Apollo Client + codegen output)
│   ├── ui/                  (NEW — shadcn primitives + design tokens; optional week 3)
│   └── ...existing...
└── infra/
    └── lib/
        └── web-infra.stack.ts  (NEW — OpenNext + CloudFront)
```

**Rendering model**
- RSC by default; opt in to `"use client"` for interactive widgets (charts, forms, Apollo hooks).
- Auth-gated routes live under `(app)/...` route group with a layout that checks cookie → redirects to `/login` server-side.
- Public pages under `(auth)/login`, `(auth)/register`.

**Auth flow**
- `/login` posts to a Next.js Route Handler → calls GraphQL `login` mutation → sets `__Host-session` httpOnly Secure SameSite=Lax cookie containing the JWT → redirects to `/dashboard`.
- Middleware (`middleware.ts`) reads cookie, attaches `Authorization: Bearer <jwt>` to Apollo fetch via a server-side GraphQL proxy route at `/api/graphql`.
- Logout clears cookie and redirects to `/login`.
- Client-side Apollo never sees the raw JWT — it calls same-origin `/api/graphql`.

**GraphQL layer**
- Schema source of truth: `docs/finance-budget.sdl.graphql`
- Codegen config generates types + typed hooks into `packages/api-client/generated/`
- Single `ApolloClient` factory; split: `makeServerClient()` for RSC, `makeBrowserClient()` for `"use client"` components via `@apollo/experimental-nextjs-app-support`

---

## 2. Setup (Day 1–2)

### 2.1 Add workspace

```bash
# pnpm-workspace.yaml already has apps/* and packages/*, so no edit needed
cd apps
pnpm create next-app@latest web --typescript --tailwind --app --no-src-dir --import-alias "@/*" --eslint
```

Edit `apps/web/package.json` — align with monorepo style:

```json
{
  "name": "@app/web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3000",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "format": "prettier --write .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "e2e": "playwright test",
    "codegen": "graphql-codegen --config codegen.ts",
    "codegen:watch": "graphql-codegen --config codegen.ts --watch"
  },
  "dependencies": {
    "@api-client": "workspace:*",
    "@common": "workspace:*",
    "@apollo/client": "^3.11.0",
    "@apollo/experimental-nextjs-app-support": "^0.11.0",
    "graphql": "^16.11.0",
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-hook-form": "^7.53.0",
    "zod": "^4.0.15",
    "@hookform/resolvers": "^3.9.0",
    "recharts": "^2.13.0",
    "lucide-react": "^0.441.0",
    "date-fns": "^4.1.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.5.0"
  },
  "devDependencies": {
    "@graphql-codegen/cli": "^5.0.2",
    "@graphql-codegen/client-preset": "^4.3.0",
    "@playwright/test": "^1.47.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/user-event": "^14.5.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.8.3",
    "vitest": "^2.1.0",
    "@vitejs/plugin-react": "^4.3.0",
    "jsdom": "^25.0.0"
  }
}
```

### 2.2 Add `packages/api-client`

```bash
mkdir -p packages/api-client/src
cd packages/api-client
```

`packages/api-client/package.json`:
```json
{
  "name": "@api-client",
  "version": "0.1.0",
  "private": true,
  "main": "src/index.ts",
  "types": "src/index.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "codegen": "graphql-codegen --config codegen.ts",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@apollo/client": "^3.11.0",
    "graphql": "^16.11.0"
  },
  "devDependencies": {
    "@graphql-codegen/cli": "^5.0.2",
    "@graphql-codegen/client-preset": "^4.3.0",
    "typescript": "^5.8.3"
  }
}
```

`packages/api-client/codegen.ts`:
```ts
import type { CodegenConfig } from '@graphql-codegen/cli';
const config: CodegenConfig = {
  schema: '../../docs/finance-budget.sdl.graphql',
  documents: ['src/**/*.graphql', '../../apps/web/**/*.graphql'],
  generates: {
    'src/generated/': {
      preset: 'client',
      config: { useTypeImports: true }
    }
  }
};
export default config;
```

### 2.3 shadcn/ui bootstrap

```bash
cd apps/web
pnpm dlx shadcn@latest init        # choose: New York, neutral, CSS variables on
pnpm dlx shadcn@latest add button input label card form select table toast dialog sheet badge separator skeleton tabs dropdown-menu
```

### 2.4 Environment variables

`apps/web/.env.example`:
```
# Client-side (exposed)
NEXT_PUBLIC_APP_NAME=full-budget-app

# Server-side only
GRAPHQL_ENDPOINT=https://api.your-domain.com/graphql   # or http://localhost:4005/graphql in dev
SESSION_COOKIE_NAME=__Host-session
SESSION_COOKIE_DOMAIN=                                 # empty for __Host- prefix
NODE_ENV=development
```

### 2.5 Folder structure (target)

```
apps/web/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (app)/
│   │   ├── layout.tsx                 # auth gate + sidebar
│   │   ├── dashboard/page.tsx
│   │   ├── transactions/page.tsx
│   │   ├── upload/page.tsx
│   │   ├── budgets/page.tsx
│   │   ├── forecast/page.tsx
│   │   ├── recurring/page.tsx
│   │   ├── goals/page.tsx
│   │   ├── sinking-funds/page.tsx
│   │   └── settings/page.tsx
│   ├── api/
│   │   ├── graphql/route.ts           # BFF proxy — attaches JWT, forwards to backend
│   │   └── auth/
│   │       ├── login/route.ts         # calls login mutation, sets cookie
│   │       └── logout/route.ts        # clears cookie
│   ├── layout.tsx
│   └── page.tsx                       # redirects → /dashboard or /login
├── components/
│   ├── ui/                            # shadcn primitives
│   ├── charts/                        # Recharts wrappers
│   ├── forms/                         # react-hook-form composites
│   ├── layout/                        # sidebar, topbar, page shell
│   └── features/                      # per-domain components
│       ├── transactions/
│       ├── budgets/
│       ├── forecast/
│       └── ...
├── lib/
│   ├── apollo/
│   │   ├── server-client.ts
│   │   └── client-provider.tsx
│   ├── auth/
│   │   ├── session.ts                 # cookie read/write helpers
│   │   └── require-user.ts            # server helper for auth gate
│   ├── graphql/
│   │   └── *.graphql                  # query/mutation documents
│   └── utils/
│       ├── format-currency.ts
│       ├── format-date.ts
│       └── cn.ts
├── middleware.ts                      # route protection
├── tailwind.config.ts
├── tsconfig.json
├── next.config.ts
├── codegen.ts
└── vitest.config.ts
```

---

## 3. Implementation (Week 1–5)

### Week 1 — Foundations

**Day 1–2: Scaffolding**
- [ ] Initialize `apps/web` and `packages/api-client`
- [ ] Add both to root `pnpm install`
- [ ] First Apollo Client factories (server + browser)
- [ ] `/api/graphql` BFF route that reads session cookie, calls backend, returns JSON

**Day 3: Auth shell**
- [ ] `/api/auth/login` Route Handler → calls backend `login` mutation → sets httpOnly cookie
- [ ] `/api/auth/logout` Route Handler
- [ ] `middleware.ts` — redirect unauthenticated → `/login`; authenticated → `/dashboard`
- [ ] `/login` page with react-hook-form + Zod schema matching `LoginInput`
- [ ] `/register` page with `RegisterInput` schema (tenant picker uses `Query.tenants`)

**Day 4: App shell**
- [ ] `(app)/layout.tsx` with sidebar nav + topbar + user menu (logout)
- [ ] `/dashboard` placeholder with loading skeleton
- [ ] 404 + error pages

**Day 5: Codegen + CI**
- [ ] Write first 3 `.graphql` docs: `login.graphql`, `register.graphql`, `tenants.graphql`
- [ ] Wire `pnpm codegen` into root scripts
- [ ] Extend `.github/workflows/ci.yml` with FE typecheck + build jobs
- [ ] Add Husky hook to run `pnpm codegen` on pre-commit if `*.graphql` changed

**Milestone:** Authenticated shell working end-to-end against `http://localhost:4005/graphql`.

---

### Week 2 — Core reads

**Dashboard (`/dashboard`)**
- [ ] KPI row: `aggregateSummary` (server component)
- [ ] Category donut (client component using Recharts + `monthlyReview.categoryBreakdown`)
- [ ] Budget-vs-actual line chart (`monthlyReview.series`)
- [ ] Month picker (URL query param `?m=4&y=2026`)

**Transactions (`/transactions`)**
- [ ] Server-rendered table with SSR first page
- [ ] Client-side filter bar (bank, category) → URL params
- [ ] Cursor-based "Load more" using Apollo `fetchMore`
- [ ] Row → `Sheet` drawer with reclassify action

**Milestone:** User can log in, see dashboard for current month, and browse transactions.

---

### Week 3 — Core writes

**Upload (`/upload`)**
- [ ] React-hook-form: bank, bankType, fileName, file input
- [ ] Client-side file size check (warn > 6 MB, block > 8 MB — Apollo default body limit)
- [ ] Base64 encode → `uploadStatement` mutation → toast + redirect to `/transactions`
- [ ] Link to roadmap for presigned URL flow (GAP-3)

**Reclassify**
- [ ] Inline category dropdown in transactions drawer
- [ ] Optimistic update via Apollo cache

**Recurring (`/recurring`)**
- [ ] List view with frequency badges
- [ ] Create form (frequency-dependent fields using conditional Zod schema)
- [ ] "Generate for this month" button → `generateRecurringTransactions`

**Milestone:** Happy path: upload → ingest → list → reclassify → set recurring.

---

### Week 4 — Planning features

**Budgets (`/budgets`)** — depends on backend GAP-1 (`budgets(period)` query)
- [ ] Month picker
- [ ] Table of categories with budget amount editor (setBudget on blur)
- [ ] Progress bar per row: actual (from `monthlyReview`) vs budget
- [ ] Total budgeted vs total spent summary

**Forecast (`/forecast`)**
- [ ] Month picker, optional starting balance + thresholds
- [ ] Daily line chart (inflow, outflow, net, running balance)
- [ ] Alert list with severity-coloured badges
- [ ] CSV export of forecast days (client-side)

**Milestone:** Full planning loop — set budgets, see forecast, receive alerts.

---

### Week 5 — Goals, polish, E2E

**Savings goals & sinking funds**
- [ ] Card grid with progress bars + history sparkline (mini Recharts LineChart)
- [ ] Read-only in v1 (CRUD blocked on GAP-2)

**Settings (`/settings`)**
- [ ] Profile view (from JWT decode + `me` query if added)
- [ ] Theme toggle (next-themes)
- [ ] Dangerous actions: logout, delete account (future)

**Polish**
- [ ] Empty states for every list
- [ ] Skeleton loaders on all server components with streaming
- [ ] Mobile nav (Sheet drawer)
- [ ] Lighthouse pass — perf/accessibility/best-practices ≥ 85

**E2E**
- [ ] Playwright tests for: register → upload → list → reclassify → budget → forecast

**Milestone:** v1 shipped to staging.

---

## 4. Testing

| Layer | Tool | Coverage target | Notes |
|---|---|---|---|
| Unit | Vitest + Testing Library | 70% lines on `lib/` and `components/features/` | Mock Apollo via `MockedProvider` |
| Integration | Vitest + MSW | Critical flows (auth, upload, reclassify) | Mock `/api/graphql` at HTTP layer |
| E2E | Playwright | Smoke suite run on PR; full suite nightly | Seed via `graphql-api` dev instance |
| Visual regression | Storybook + Chromatic (optional) | Key components | Defer to month 2 |
| Type safety | `tsc --noEmit` | 100% | Non-negotiable in CI |
| Schema drift | `pnpm codegen` in CI must produce no diff | 100% | Fail PR if stale |

---

## 5. Deployment

### 5.1 Local
- `pnpm --filter @app/graphql-api dev` (backend at :4005)
- `pnpm --filter @app/web dev` (frontend at :3000)
- `NEXT_PUBLIC_APP_NAME` + `GRAPHQL_ENDPOINT=http://localhost:4005/graphql` in `.env.local`

### 5.2 Staging / Prod on AWS (via OpenNext + CDK)

Add `infra/lib/web-infra.stack.ts`:
- S3 bucket for static assets (managed by OpenNext)
- CloudFront distribution with:
  - Custom cache policies (SSR default TTL 0; `_next/static/*` TTL 1y)
  - Custom domain + ACM cert (Route53)
- Lambda@Edge for SSR (via OpenNext)
- Origin request/response functions for cookie forwarding

Wire into `pnpm --filter ./infra cdk:deploy:all` alongside existing backend stacks.

Env vars via SSM Parameter Store, read at build time by OpenNext (`GRAPHQL_ENDPOINT`, `SESSION_COOKIE_NAME`).

### 5.3 CI/CD Pipeline (extend existing GitHub Actions)

```yaml
# .github/workflows/ci.yml additions
web-ci:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: pnpm/action-setup@v4
    - uses: actions/setup-node@v4
      with: { node-version: 20, cache: pnpm }
    - run: pnpm install --frozen-lockfile
    - run: pnpm --filter @api-client codegen
    - run: git diff --exit-code                 # fail if codegen drifted
    - run: pnpm --filter @app/web typecheck
    - run: pnpm --filter @app/web lint
    - run: pnpm --filter @app/web test
    - run: pnpm --filter @app/web build
```

Promotion: `main` → staging auto; tag `v*` → prod (manual approval).

---

## 6. Monitoring & Observability

| Signal | Tool | Wiring |
|---|---|---|
| Core Web Vitals | Vercel Analytics alt: `web-vitals` → CloudWatch EMF via Lambda logs | Report from `_app` or instrumentation.ts |
| Error tracking | Sentry (free tier OK) | Install `@sentry/nextjs`; sourcemaps uploaded on build |
| GraphQL errors | Apollo link `onError` → Sentry breadcrumb | Redact PII (emails, amounts) |
| Synthetic checks | CloudWatch Synthetics canary hitting `/login` + `/dashboard` mocked | Same cadence as backend alarms |
| SSR cold starts | X-Ray on OpenNext Lambda | Reuse existing `xray.stack.ts` pattern |
| Business events | Backend emits already; FE logs key actions via `/api/log` with correlation ID | Propagate `x-request-id` from cookie session |

Alerts:
- Lighthouse CI on PR — fail if perf score drops > 5 points
- Sentry error budget: < 1% sessions with unhandled errors

---

## 7. Best Practices Checklist

**TypeScript**
- [ ] `strict: true`, `noUncheckedIndexedAccess: true`
- [ ] No `any` — enforce via ESLint
- [ ] Shared types only through `@common` and `@api-client`

**Security**
- [ ] httpOnly Secure SameSite=Lax cookies only
- [ ] CSP headers set via `next.config.ts` (`headers()` block)
- [ ] CSRF: double-submit token pattern on non-GraphQL mutations (e.g. `/api/auth/*`)
- [ ] No secrets in `NEXT_PUBLIC_*`
- [ ] Dependabot / Renovate on `apps/web` + `packages/api-client`

**Accessibility**
- [ ] All forms use shadcn `Form` with labels + aria-invalid
- [ ] Keyboard navigation for tables and drawers
- [ ] Color contrast AA minimum
- [ ] axe-core Playwright integration

**Performance**
- [ ] RSC by default; client components only for interactivity
- [ ] Route-level `revalidate` or `dynamic = 'force-dynamic'` chosen deliberately
- [ ] Preload critical GraphQL data server-side; hydrate Apollo cache
- [ ] Images via `next/image` with `priority` on LCP candidates only
- [ ] Bundle analyzer run at end of each week

**DX**
- [ ] Prettier + ESLint in `lint-staged` (root config already handles apps/*)
- [ ] `pnpm codegen` in pre-commit for `*.graphql` changes
- [ ] Storybook from week 3 for reusable components
- [ ] ADR for every architectural decision (state management, design tokens, etc.)

**Edge cases to cover in v1**
- [ ] Session expiry mid-session → graceful redirect to `/login?next=/dashboard`
- [ ] Statement upload > 8 MB → blocked with clear error
- [ ] Upload of unsupported bank format → server returns error; UI shows retry
- [ ] Zero-state dashboard (new user, no transactions) → empty illustration + CTA to upload
- [ ] Clock skew / TZ — always format using user's locale; store raw ISO from backend
- [ ] Concurrent edits to a budget — last-write-wins with optimistic concurrency OK for v1; revisit

---

## 8. Code Starters (drop-in ready)

### `apps/web/lib/apollo/server-client.ts`
```ts
import { HttpLink } from '@apollo/client';
import {
  ApolloClient,
  InMemoryCache,
  registerApolloClient,
} from '@apollo/experimental-nextjs-app-support';
import { cookies } from 'next/headers';

export const { getClient } = registerApolloClient(async () => {
  const token = (await cookies()).get(process.env.SESSION_COOKIE_NAME!)?.value;
  return new ApolloClient({
    cache: new InMemoryCache(),
    link: new HttpLink({
      uri: process.env.GRAPHQL_ENDPOINT!,
      headers: token ? { authorization: `Bearer ${token}` } : {},
      fetchOptions: { cache: 'no-store' },
    }),
  });
});
```

### `apps/web/app/api/graphql/route.ts` (BFF proxy)
```ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  const token = (await cookies()).get(process.env.SESSION_COOKIE_NAME!)?.value;
  const body = await req.text();
  const res = await fetch(process.env.GRAPHQL_ENDPOINT!, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body,
  });
  return new NextResponse(res.body, {
    status: res.status,
    headers: { 'content-type': 'application/json' },
  });
}
```

### `apps/web/app/api/auth/login/route.ts`
```ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  tenantId: z.enum(['PERSONAL', 'CLIENT', 'DEFAULT']),
});

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: 'invalid' }, { status: 400 });

  const r = await fetch(process.env.GRAPHQL_ENDPOINT!, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      query: `mutation Login($input: LoginInput!) {
        login(input: $input) { token user { email name tenantId isActive } }
      }`,
      variables: { input: parsed.data },
    }),
  });
  const json = await r.json();
  const token = json?.data?.login?.token as string | undefined;
  if (!token) return NextResponse.json({ error: json?.errors ?? 'unauthorized' }, { status: 401 });

  const res = NextResponse.json({ user: json.data.login.user });
  res.cookies.set(process.env.SESSION_COOKIE_NAME!, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24, // 24h (revisit after GAP-4)
  });
  return res;
}
```

### `apps/web/middleware.ts`
```ts
import { NextRequest, NextResponse } from 'next/server';

const PUBLIC = new Set(['/login', '/register']);

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasSession = req.cookies.has(process.env.SESSION_COOKIE_NAME!);
  if (pathname.startsWith('/api') || pathname.startsWith('/_next')) return NextResponse.next();
  if (PUBLIC.has(pathname) && hasSession) return NextResponse.redirect(new URL('/dashboard', req.url));
  if (!PUBLIC.has(pathname) && !hasSession) return NextResponse.redirect(new URL('/login', req.url));
  return NextResponse.next();
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
```

---

## 9. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| OpenNext deploy quirks (Lambda@Edge cold starts, CF invalidation) | Medium | Medium | Start in staging early; fall back to Vercel for v1 if blocking |
| Schema drift between BE SDL and FE codegen | High | Low | CI check: codegen diff fails PR |
| Base64 upload hits payload limits | High | Medium | Block > 8 MB client-side; fast-track GAP-3 |
| Solo-dev burnout trying to hit 5-week timeline | Medium | High | Cut Week 5 polish first; savings/sinking funds can be read-only v1.1 |
| Apollo cache + RSC hydration mismatches | Medium | Medium | Use `@apollo/experimental-nextjs-app-support` strictly as documented; e2e early |

---

## Next Steps

1. [ ] Review + approve this plan and ADR-001
2. [ ] Open GitHub issues: GAP-1, GAP-2, GAP-3, GAP-4 (blocking for v1)
3. [ ] Start Week 1 Day 1–2 scaffolding (target: end of this week)
4. [ ] Schedule a self-checkpoint at end of Week 2 — decide whether to cut scope for Weeks 4–5

---

## Appendix — GraphQL Operations Cheat Sheet

| Screen | Ops used |
|---|---|
| /login | `login` |
| /register | `register`, `tenants` |
| /dashboard | `aggregateSummary`, `monthlyReview`, `forecastMonth`, `transactions` |
| /transactions | `transactions`, `categoriesByBase`, `reclassifyTransaction` |
| /upload | `uploadStatement` (v1); `createUploadUrl` + notify (v2, post-GAP-3) |
| /budgets | `budgets(period)` [blocked GAP-1], `setBudget`, `monthlyReview` (for actuals), `categoriesByBase` |
| /forecast | `forecastMonth` |
| /recurring | `recurringTransactions`, `createRecurringTransaction`, `generateRecurringTransactions` |
| /goals | `savingsGoals` |
| /sinking-funds | `sinkingFunds` |
