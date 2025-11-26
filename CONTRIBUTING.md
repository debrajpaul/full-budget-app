# Contributing

Thanks for helping improve `full-budget-app`. This guide outlines how to get set up and what we expect when you open a pull request.

## Quickstart
1. Fork `debrajpaul/full-budget-app` and clone your fork:
   ```bash
   git clone https://github.com/<your-user>/full-budget-app.git
   cd full-budget-app
   ```
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Create a feature branch:
   ```bash
   git checkout -b feat/<short-description>
   ```
4. Copy `.env.example` (if present) or create a `.env` with the variables listed in `README.md` (JWT secret, table/bucket names, Bedrock model ID, etc.).
5. For local emulation set `USE_LOCALSTACK=true` (plus `LOCALSTACK_HOST` and `LOCALSTACK_EDGE_PORT`), then run `./scripts/create_localstack_resources.sh` to seed S3/SQS/Dynamo/SSM; deploy CDK locally with `pnpm --filter ./infra cdklocal:deploy:all`.
6. Make your changes with matching tests where possible (`apps/*` or `packages/*`).
7. Run `pnpm lint`, `pnpm test`, `pnpm typecheck`, and optionally `pnpm build` before committing.
8. Commit using Conventional Commits and open a pull request describing behaviour changes and any setup steps.

Minor improvements can be made directly from the GitHub web editor—open the file, click the pencil icon, and submit a pull request with your edits.
Postman collection/environment files for manual testing live in `docs/postman/`.

## Pull Request Checklist
- Include context in the description: what changed, why, any rollout concerns, and whether LocalStack was exercised.
- Add or update tests when you change logic or behaviour (unit specs live beside implementations).
- Keep commits focused; avoid bundling unrelated changes.
- Confirm quality gates: `pnpm lint`, `pnpm test`, `pnpm typecheck`, and (for runtime changes) `pnpm build`.
- Mention any follow-up tasks or TODOs so they can be tracked.
- Update docs when behaviour or topology shifts (e.g., `docs/ARCHITECTURE.md`, GraphQL SDL).
- For infrastructure edits, note affected stacks/constructs and whether Bedrock/X-Ray permissions are impacted.
