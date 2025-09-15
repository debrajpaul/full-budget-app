Comprehend Dataset Preparation

This repo includes a helper script to export categorized transactions from DynamoDB into CSV files compatible with Amazon Comprehend custom classification.

CSV format
- Header: `CLASS,TEXT`
- Each row: `<CATEGORY>,<DESCRIPTION>`

Usage
1) Ensure environment is configured in `.env` with at least:
   - `AWS_REGION`
   - `DYNAMO_TRANSACTION_TABLE`
   - `AWS_S3_BUCKET` (unless using `--no-upload`)

2) Run the script:

```
pnpm prepare:comprehend -- \
  --tenant DEFAULT \
  --bucket $AWS_S3_BUCKET \
  --prefix comprehend/datasets/txns \
  --test-split 0.15
```

Options
- `--tenant`: tenantId partition to export (default: `DEFAULT`).
- `--bucket`: S3 bucket for upload (falls back to `AWS_S3_BUCKET`).
- `--prefix`: S3 prefix for outputs (default: `comprehend/datasets/txns`).
- `--train-key`: full S3 key for training CSV (overrides prefix path).
- `--test-key`: full S3 key for test CSV.
- `--test-split`: fraction of rows for test set (0..0.9, default: 0).
- `--out-dir`: local output directory (default: `artifacts`).
- `--no-upload`: skip S3 upload and only write local files.
- `--limit`: fetch only first N items (quick sampling).
- `--region`: override AWS region.
- `--use-rules`: when no labeled rows exist, use category rules to derive labels (default: true). Set to `false` to disable.
- `--rules-table`: override rules table name; defaults to `DYNAMO_CATEGORY_RULES_TABLE` or `DYNAMO_TRANSACTION_CATEGORY_TABLE`.

Notes
- Only transactions with a `category` not equal to `DEFAULT` and a non-empty `description` are included.
- If none are found, the script will attempt a rules-based fallback using your rules table (tenant + DEFAULT) and a small built-in keyword map.
- Descriptions are truncated to 5000 chars to meet Comprehend limits.
- The script writes local CSVs under `artifacts/` even when uploading to S3.
