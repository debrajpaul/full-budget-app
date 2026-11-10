# ADR-0001: Production-Grade MCP Server over Existing Services

**Status:** Proposed
**Date:** 2026-06-11
**Deciders:** Debraj Paul

## Context

full-budget-app is a multi-tenant budgeting SaaS (pnpm workspaces, GraphQL API on Lambda, DynamoDB, S3, SQS, Bedrock). Goal: build and open-source a **production-grade MCP server in TypeScript** — auth, rate limiting, observability — shipping **one agent workflow end-to-end, kept lean**. No new domain logic; the server exposes what already exists.

Receipt ingestion (camera/screenshot → transaction) is **explicitly out of scope** — see ADR-0002 (deferred).

Reusable assets:

- `@app/auth` — JWT sign/verify, refresh tokens
- `TransactionService`, `BudgetService`, `TransactionCategoryService` (`@app/services`)
- `TransactionStore` etc. (`@app/db`) — multi-tenant `(tenantId, userId)`
- `@app/logger`, `xray.stack.ts`, `lambda-alarms-construct.ts` — observability baseline

## Decision

Add **`apps/mcp-server`**: TypeScript MCP server (official `@modelcontextprotocol/sdk`, Streamable HTTP transport on Express, Lambda Function URL) as a **thin layer over `packages/services`** — same layering rule as `apps/graphql-api`. Resolver-equivalent tool handlers contain zero business logic.

### The one end-to-end agent workflow

**"Review and fix my month":** agent lists transactions → spots uncategorized/miscategorized ones → reclassifies them → reports category totals. Exercises read + write + auth + rate limits + metrics through one coherent loop, using only existing services.

### MCP tools (lean — exactly three)

| Tool | Wraps | Notes |
|------|-------|-------|
| `list_transactions` | `TransactionService` | filters: year, month, bankName, category; cursor pagination |
| `reclassify_transaction` | `TransactionCategoryService` | the single write tool; mirrors `reclassifyTransaction` mutation |
| `get_category_breakdown` | `TransactionService`/`BudgetService` | transactions grouped by category with totals (mirrors existing SDL type) |

No more tools in v1. Upload, budgets CRUD, forecasts, goals: out of scope.

### Cross-cutting (the "production-grade" part)

- **Auth:** Bearer JWT (issued by existing `login` mutation) verified via `@app/auth` middleware on every request. `tenantId`/`userId` come **only from token claims, never tool args** (repo multi-tenant rule). README documents the OAuth 2.1 resource-server upgrade path.
- **Rate limiting:** token bucket per `(tenantId, userId)` Express middleware behind an `IRateLimiter` interface. v1 in-memory (per Lambda container); DynamoDB impl is the documented upgrade. MCP-compliant error + `Retry-After`.
- **Observability:** `@app/logger` child loggers keyed by `requestId`/`toolName`; CloudWatch EMF metrics (`ToolInvocations`, `ToolErrors`, `ToolLatencyMs`); X-Ray via existing stack; alarms via `lambda-alarms-construct`.
- **Errors:** structured MCP tool errors (`isError: true`), safe messages only — internals never leak to the client.

## Options Considered

### Option A: MCP server wraps `packages/services` directly (chosen)

| Dimension | Assessment |
|-----------|------------|
| Complexity | Low — same DI pattern as `setup-services.ts` |
| Cost | One extra Lambda (Function URL), pennies |
| Scalability | Same as existing API |
| Consistency | Matches repo layering rules exactly |

**Pros:** no double-hop, shares stores/services, easy unit testing with the SDK's in-memory transport, clean open-source story.
**Cons:** two deployables sharing service code — version drift risk (mitigated: monorepo, one pipeline).

### Option B: MCP server proxies the GraphQL API

**Pros:** single enforcement point. **Cons:** double auth hop, added latency, MCP errors wrapping GraphQL errors, weak showcase (just a proxy). Rejected.

### Option C: stdio-only local MCP server

**Pros:** simplest transport. **Cons:** no auth/rate-limit story — defeats the "production-grade" goal. Streamable HTTP chosen; stdio kept for local dev only.

## Architecture

```
Claude / any MCP client
        │ Streamable HTTP + Bearer JWT
        ▼
apps/mcp-server (Express + @modelcontextprotocol/sdk, Lambda Function URL)
  ├─ middleware: auth (@app/auth) → rate limit (IRateLimiter) → logging/metrics
  └─ tools (thin handlers) → packages/services
       ├─ TransactionService
       ├─ TransactionCategoryService
       └─ BudgetService
              └─ @app/db stores (tenantId, userId always passed)
```

## Implementation Plan (phased)

### Phase 1 — Architecture & contracts
1. This ADR.
2. No SDL change needed — v1 tools map to existing SDL operations (source-of-truth rule satisfied; tool schemas reference the SDL in doc comments).
3. Define `IRateLimiter` and MCP tool input/output zod schemas in `@app/common`.

### Phase 2 — Setup
4. Scaffold `apps/mcp-server` (esbuild, Jest, tsconfig refs, Dockerfile for local dev, stdio transport flag for local testing).
5. `infra/lib/mcp-server.stack.ts` — Lambda + Function URL, SSM-sourced env, reuse alarms + X-Ray constructs.

### Phase 3 — Implementation
6. `setup-services.ts`-style DI bootstrap (only the three needed services).
7. Auth + rate-limit + metrics middleware.
8. Three tools with zod-validated inputs; structured errors.

### Phase 4 — Testing
9. Jest specs next to every new public API (repo DoD).
10. Integration tests via SDK in-memory client transport: full auth-fail, rate-limit-hit, happy-path workflow.

### Phase 5 — Deployment
11. `pnpm --filter ./infra cdk:deploy:all`; README quickstart with `claude mcp add` snippet; LICENSE/CONTRIBUTING already exist.

### Phase 6 — Monitoring
12. CloudWatch dashboard: invocations, p95 latency, error rate per tool; alarm on error rate > 5% / 5 min.

## Edge Cases

- **Expired/invalid JWT** → 401 before any tool dispatch; never a tool-level error.
- **Rate limit mid-session** → MCP error with `Retry-After`; agent can back off and resume.
- **Pagination abuse** (agent loops cursors forever) → server-side page cap + rate limiter bounds total cost.
- **Reclassify with unknown category** → zod enum validation rejects before service call.
- **Cold start** → Function URL + esbuild-bundled handler keeps it small; note p99 in dashboard.

## Security Notes

- Tenant/user **only** from JWT claims; every store call passes `(tenantId, userId)`.
- Tool inputs zod-validated against closed schemas; category constrained to known enum.
- No secrets in code — SSM stack (existing rule).
- Function URL with auth in-app: acceptable for v1; CloudFront/WAF in front is the documented hardening step.
- Single write tool (`reclassify_transaction`) limits blast radius of a misbehaving agent.

## Consequences

- **Easier:** any MCP client can drive the budget app; ADR-0002 (receipt ingestion) later becomes "add one tool + one service" on this foundation; strong standalone open-source artifact.
- **Harder:** two deployables to keep in sync.
- **Revisit:** OAuth 2.1 auth, distributed rate limiting, tool expansion (budgets, forecasts) once v1 is stable.

## Action Items

1. [ ] Approve this ADR
2. [ ] `IRateLimiter` + tool schemas in `@app/common`
3. [ ] Scaffold `apps/mcp-server` + `mcp-server.stack.ts`
4. [ ] Middleware (auth, rate limit, metrics) + specs
5. [ ] Three tools + integration tests
6. [ ] Deploy, README, dashboard
