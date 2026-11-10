# ADR-0002: Receipt → Transaction Ingestion (Camera/Screenshot)

**Status:** Deferred (blocked by ADR-0001)
**Date:** 2026-06-11
**Deciders:** Debraj Paul

## Context

Capture a receipt — phone camera or screenshot (incl. UPI/app payment confirmations) — and turn it into a categorized transaction. Deferred until the MCP server (ADR-0001) ships; this then becomes "one new service + one new tool" on that foundation.

## Decision (provisional)

New **`ReceiptIngestionService`** in `packages/services`, consumed by both the MCP server (new `ingest_receipt` tool) and GraphQL (web camera UI later). Extraction via **Bedrock multimodal (Claude)** — one call for extraction + reasoning, reuses existing `@app/client/bedrock-client.ts` wiring, handles UPI screenshots that Textract `AnalyzeExpense` handles poorly. Swappable behind `IReceiptExtractor` if accuracy on paper receipts disappoints.

### Flow

```
create_receipt_upload_url (extend UploadUrlService: receipts/ prefix, jpg/png/heic, 5 MB cap)
        ▼  client PUTs image to S3
ingest_receipt(jobId)
  → fetch image → BedrockVisionClient.invokeModelWithImage → {merchant, amount, date, currency, isReceipt}
  → RuleEngine → BedrockClassifierService fallback
  → TransactionStore.write (taggedBy: "RECEIPT_AGENT", confidence)
```

### Key design points (carried from original ADR-0001 draft)

- **SDL first** (repo rule): `createReceiptUploadUrl` + `ingestReceipt(jobId)` mutations, `taggedBy: RECEIPT_AGENT`.
- **Idempotency:** `transactionId = hash(tenantId, userId, s3Key)` — reruns never duplicate; same receipt under new jobId → soft-match warning on `(merchant, amount, txnDate)`.
- **Non-receipt image** → `{isReceipt: false}`, clean error, no write.
- **Low confidence (< 0.6)** → write as `UNCLASSIFIED`, user confirms via existing `reclassifyTransaction`.
- **Amount ambiguity** → prompt for "grand total paid"; store extraction reason for audit.
- **HEIC** → reject with clear error in v1 (leaner than sharp conversion); revisit.

### Security

- Tenant/user only from JWT claims.
- Receipt images are PII-adjacent: `receipts/{tenantId}/{userId}/` prefix, SSE-S3, 90-day lifecycle expiry (transaction record is the system of record).
- Prompt-injection defense: extraction output zod-validated against closed schema; extracted strings are data, never instructions; category must be a known enum.
- Presigned PUT: 300 s TTL, content-type allowlist, size cap, UUID job key (existing pattern).

## Revisit when activating

- Bedrock vision vs Textract accuracy on real samples (golden-file tests: paper, UPI screenshot, blurry, non-receipt, foreign currency).
- Whether MCP tool accepts base64 inline (small images) in addition to S3 jobId.
- Web camera UI in `apps/web` (`<input capture>`), behind the same service.
