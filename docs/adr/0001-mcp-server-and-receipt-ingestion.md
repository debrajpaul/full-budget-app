# ADR (superseded): MCP Server with Receipt → Transaction Agent Workflow

**Status:** Superseded by [ADR-0001](./0001-mcp-server.md) and [ADR-0002](./0002-receipt-ingestion.md)
**Date:** 2026-06-11

This combined ADR was split:

- **ADR-0001 — MCP server** (active): production-grade MCP server over existing services; auth, rate limits, observability; three tools; "review and fix my month" workflow.
- **ADR-0002 — Receipt ingestion** (deferred): camera/screenshot → categorized transaction, to be built as one new service + one new MCP tool once 0001 ships.

This file is kept only because deletion was declined; it can be removed safely.
