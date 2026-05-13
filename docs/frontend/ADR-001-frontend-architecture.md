# ADR-001: Frontend Architecture for full-budget-app

**Status:** Proposed
**Date:** 2026-04-21
**Deciders:** Debraj Paul (sole maintainer / architect)
**Supersedes:** —

---

## Context

`full-budget-app` today is a backend-only pnpm monorepo:

- `apps/graphql-api` — Apollo Server on AWS Lambda (with Express for local), JWT-secured, multi-tenant.
- `apps/txn-loaders` + `apps/tag-loaders` — SQS and DynamoDB-stream-driven Lambdas.
- Infra as code via **AWS CDK** (`infra/lib`), region `ap-south-1`.
- TypeScript, pnpm workspaces, esbuild, Jest, Husky + commitlint.

We now need a **browser frontend** to expose the 11 queries / 8 mutations defined in `docs/finance-budget.sdl.graphql` to end users (primarily PERSONAL tenants, soon CLIENT tenants).

### Constraints & forces

- **Team size:** 1 (solo dev; optimise for maintainability over bleeding edge).
- **Existing stack gravity:** TypeScript + AWS + pnpm. FE should land in the same monorepo under `apps/web`.
- **API style:** GraphQL — rules out REST-first frameworks like Remix data loaders without adaptation.
- **Hosting constraint:** Backend is in AWS. FE should deploy to AWS (CloudFront + S3, or Lambda@Edge via OpenNext) to stay under one CDK pipeline and one observability surface.
- **SEO:** Low importance — authenticated SaaS dashboard, no marketing pages in v1.
- **SSR need:** Low — no SEO, but SSR is useful for auth-gated initial render and secure cookie handling.
- **Mobile:** Responsive web first; React Native / Expo is a later decision.
- **Design system:** No inherited UI library. Free to pick.

---

## Decision

**Adopt Next.js 15 (App Router) + TypeScript as the frontend framework**, placed at `apps/web` inside the existing pnpm monorepo. Deploy via **OpenNext → CloudFront + Lambda@Edge**, wired into the existing CDK project as `apps/web-infra`.

Supporting picks (rationale in §4):

| Concern | Choice |
|---|---|
| UI library | **shadcn/ui** (Radix + Tailwind v4) |
| Styling | **Tailwind CSS v4** |
| GraphQL client | **Apollo Client v3** with persisted queries + **GraphQL Code Generator** for typed ops/hooks |
| Charts | **Recharts** |
| Forms + validation | **React Hook Form + Zod** (Zod already in `graphql-api` deps — shared schemas via `@common`) |
| State (client) | **React Context + Apollo cache** (no Redux/Zustand unless needed) |
| Auth storage | **httpOnly cookie** set by Next.js Route Handlers; access token never touches `window` |
| Testing | **Vitest** (unit), **Playwright** (E2E), **Storybook 8** (component) |
| CI | Extend existing `.github/workflows/ci.yml`; add FE build/typecheck/test gates |
| Deployment | **OpenNext + CDK** into `apps/web-infra`; promoted alongside backend on `cdk:deploy:all` |

---

## Options Considered

### Option A — Next.js 15 App Router + TS (RECOMMENDED)

| Dimension | Assessment |
|---|---|
| Complexity | Medium — App Router + RSC has learning curve but maturing fast |
| Cost (AWS) | Low — OpenNext → CloudFront + small Lambda@Edge for SSR shell (~$5–20/mo at v1 traffic) |
| Scalability | High — edge caching + ISR; GraphQL queries still hit backend but shell is cacheable |
| Team familiarity | High — you're a senior TS engineer; Next.js is industry default |
| DX | Excellent — hot reload, route co-location, server actions, typed params |
| Auth story | Strong — Route Handlers can set/read httpOnly cookies; JWT never exposed to JS |
| Future-proof | Strong — RSC reduces bundle size; migration to server actions for mutations optional |
| Bundle size | Medium — larger than Vite SPA but per-route code-split |

**Pros**
- SSR for authenticated initial render avoids FOUC and enables proper auth redirects.
- Route Handlers keep JWT server-side (fixes common SPA XSS risks around `localStorage`).
- Built-in image optimisation, metadata, middleware.
- Same mental model you can reuse for SaaS side projects and interviews — aligns with your career goals.
- First-class TypeScript, first-class shadcn/ui integration.
- OpenNext is a clean path to AWS — no Vercel lock-in, deployed via your existing CDK.

**Cons**
- App Router + RSC has edges (streaming, cache directives, `use client` boundaries).
- OpenNext adds a moving part vs pure SPA → S3.
- Server components can't use Apollo hooks directly (minor; pass data as props).

---

### Option B — Vite + React 19 + TS (SPA)

| Dimension | Assessment |
|---|---|
| Complexity | Low — single-file router, no SSR, clean mental model |
| Cost (AWS) | Lowest — S3 + CloudFront, static assets only (~$1–5/mo) |
| Scalability | High for static; all auth'd routes live in the browser |
| Team familiarity | High |
| DX | Fastest cold-dev in the industry |
| Auth story | Weaker — JWT in memory or `localStorage`; refresh token flow more fiddly |
| Future-proof | Medium — no RSC; harder to add SSR later |
| Bundle size | Small initial, then grows |

**Pros**
- Simplest possible deployment (S3 + CloudFront invalidation).
- Zero server-side infra for FE.
- Fastest iteration — cold dev server in < 500 ms.
- No hidden SSR bugs to debug.

**Cons**
- All routing happens after JS loads → blank screen until bundle parses.
- JWT must live in the browser (either `httpOnly` cookies require a backend endpoint anyway, defeating pure-static model; or `localStorage` with XSS risk).
- Can't do server redirects for auth — requires client-side `useEffect` + flicker.
- Harder to justify as "scales to staff+" architecture in interviews.

---

### Option C — Remix (React Router v7 in framework mode)

| Dimension | Assessment |
|---|---|
| Complexity | Medium |
| Cost (AWS) | Similar to Next.js via OpenNext/Remix adapter |
| Scalability | High |
| Team familiarity | Medium — you'd be learning on the job |
| DX | Strong — loaders/actions model is elegant |
| Auth story | Strong — session storage pattern built in |
| Future-proof | Good — recent merge with React Router v7 is stable |
| Bundle size | Smaller than Next.js |

**Pros**
- Loader/action model is arguably cleaner than App Router for data-driven apps.
- Built-in form-first UX patterns fit budget-entry flows.
- Lower bundle than Next.js.

**Cons**
- Loader model is REST-biased; doubling up with Apollo/GraphQL feels redundant.
- Smaller ecosystem for AWS-native deployment.
- Fewer TS engineers at scale know Remix → worse for hiring later.
- Your career goal is Staff/Architect for international roles — Next.js experience weights heavier on CVs.

---

### Option D — React Native / Expo first

Rejected for v1 on the basis that:
- Personal finance launches still happen on web first for power users (CSV uploads, large tables, charts).
- Solo dev bandwidth — adding mobile multiplies surface area.
- Revisit after FE v1 ships; wrap the GraphQL layer in a React Native app that reuses `@common` DTOs and codegen output.

---

## Trade-off Analysis

| Axis | Next.js (A) | Vite SPA (B) | Remix (C) |
|---|---|---|---|
| Auth security (httpOnly cookie) | ✅ Natural | ⚠️ Requires extra BFF | ✅ Natural |
| AWS deployment cohesion | ✅ OpenNext + CDK | ✅ S3 + CF | ⚠️ Adapter friction |
| RSC / partial rendering | ✅ | ❌ | ⚠️ Partial |
| GraphQL fit | ✅ Apollo + RSC shell | ✅ Apollo | ⚠️ Loader overlap |
| Learning cost | Medium | Low | Medium-high |
| Staff-level signal on CV | ✅ High | Medium | Medium |
| Iteration speed today | Medium | High | Medium |
| Iteration speed at month 6 | ✅ High | ⚠️ Slowing | ✅ High |

**Why A wins:** It uniquely combines (1) secure server-managed auth via Route Handlers, (2) AWS-native deployment through OpenNext that stays under a single CDK pipeline, and (3) the same stack that will make your CV competitive for global roles. The complexity premium is paid back within week 2.

**Why not B:** Pure SPA would ship faster in week 1 but accumulates security debt (token storage) and deployment-sprawl debt once we need server redirects for auth.

**Why not C:** Remix's loader/action paradigm competes with Apollo instead of complementing it, and the ecosystem pull for AWS-first shops is weaker.

---

## Consequences

**What becomes easier**
- Server-side auth redirects — no flash-of-login page.
- Image optimisation, SEO for future public pages (marketing, docs).
- Incrementally adopting Server Actions for mutations if desired.
- Sharing Zod schemas between BE (`@common`) and FE via a new `packages/ui-types` workspace.

**What becomes harder**
- OpenNext deploys add a Lambda + CloudFront Functions surface — more IAM, more cold-start awareness.
- "Use client" boundaries require discipline; lint rules + Storybook help.
- Caching strategy (`dynamic`, `revalidate`, `no-store`) must be explicit per route.

**What we'll need to revisit**
- When user base crosses ~10k MAU, evaluate edge caching of GraphQL (persisted queries + CloudFront TTL for read-heavy ops like `monthlyReview`).
- If React Native becomes a priority, extract the Apollo layer + codegen into `packages/api-client` so mobile can reuse.
- Server Actions vs Apollo mutations — today stick with Apollo for type-safety and codegen; revisit in 6 months.

---

## Security Notes

- JWT **never** in `localStorage`. Next.js Route Handler sets httpOnly + Secure + SameSite=Lax cookie on login; middleware forwards to GraphQL `Authorization` header.
- CSP: default-src 'self'; strict nonces for inline scripts (Next.js supports this natively).
- Refresh flow: depends on GAP-4 in backend. Interim — 24h token with forced re-login (acceptable for v1).
- All mutations rate-limited via API Gateway; FE surfaces retriable errors with exponential backoff.
- Secrets in env vars: `NEXT_PUBLIC_GRAPHQL_ENDPOINT` for client; `GRAPHQL_ENDPOINT`, `JWT_COOKIE_DOMAIN` for server.

---

## Action Items

1. [ ] Add `apps/web` workspace to `pnpm-workspace.yaml`
2. [ ] Scaffold Next.js 15 App Router + TS in `apps/web` (see kickoff plan)
3. [ ] Add `packages/api-client` — Apollo Client factory + codegen output, consumable from `apps/web` and future RN shell
4. [ ] Add `apps/web-infra` CDK stack for CloudFront + OpenNext Lambda (or add to existing `infra/lib`)
5. [ ] Extend `.github/workflows/ci.yml` with FE jobs: `typecheck`, `lint`, `test`, `build`, `e2e` (Playwright optional in CI initially)
6. [ ] Open GitHub issues for GAP-1..4 from `requirements-alignment.md` — blocking for v1
7. [ ] Pick a brand + primitives (shadcn/ui baseline), create Storybook
8. [ ] Write ADR-002 after Week 2 to record state-management decision once real usage emerges

---

## References

- [Next.js App Router docs](https://nextjs.org/docs/app)
- [OpenNext](https://open-next.js.org/) — Next.js adapter for AWS
- [shadcn/ui](https://ui.shadcn.com/)
- [GraphQL Code Generator](https://the-guild.dev/graphql/codegen)
- Related: `docs/ARCHITECTURE.md`, `docs/frontend/requirements-alignment.md`, `docs/frontend/frontend-kickoff-plan.md`
