# Architecture

## Directory layout

The repository is organized as a pnpm workspace.

- `apps/` – runtime services.
  - `graphql-api` exposes the GraphQL API and a `/metrics` endpoint.
  - `txn-loaders` consumes SQS messages and persists transactions.
  - `tag-loaders` listens to DynamoDB streams to assign categories.
- `packages/` – shared libraries and business logic.
  - `parser` turns raw bank CSV/PDF statements into transaction objects.
  - `nlp-tagger` contains the tagging rules and serves as the entry point for training or inference.
  - `db`, `auth`, `logger`, `services`, and others provide reusable utilities.
- `infra/` – AWS CDK stacks and constructs.
- `docs/` – project documentation.

## Data flow

1. **CSV ingestion** – Statements uploaded to S3 are parsed by classes in `packages/parser` and converted into canonical transaction records.
2. **Window generation** – Service layer utilities arrange transactions into time windows that form the training dataset.
3. **Training** – Windowed data is fed to the tagging model. Scripts in `packages/nlp-tagger/src/start.ts` orchestrate training and inference.
4. **Testing** – Each package contains Jest specs (`*.spec.ts`). Run `pnpm -r test` to validate parsers, services and models.
5. **Metrics** – During training or API execution, metrics are emitted through the logger and exposed by `apps/graphql-api` at `/metrics` for CloudWatch dashboards.
6. **Run record** – Final metrics and model artefacts are persisted via the database layer in `packages/db`.
7. **Dashboard** – The GraphQL API backs client dashboards that visualize run records and aggregate metrics.

## Customising models

Model topology and optimiser settings live in `packages/nlp-tagger/src/start.ts`. Replace the rule‑based logic with a neural model or adjust optimiser parameters there. Additional model components can be placed in `packages/nlp-tagger/src/module`.

## Extending metrics and datasets

- **Metrics** – Add collectors under `apps/graphql-api` (or a dedicated metrics package) and register them so they appear in the `/metrics` endpoint.
- **Dataset generators** – Implement additional parsers inside `packages/parser/src` and export them from `packages/parser/src/index.ts`. Service-layer helpers can build training windows from these parsers for new datasets.
