/**
 * Seed a deployed full-budget-app backend with the minimum data needed
 * for the frontend to render meaningfully on first load:
 *
 *   1. Register a dev user (idempotent — skips if user already exists)
 *   2. Log in and obtain a JWT
 *   3. Upload a small sample HDFC CSV via uploadStatement mutation
 *   4. Set a budget for the current month
 *   5. Create one recurring transaction (rent)
 *   6. Seed keyword-based category rules for the tenant
 *
 * The script talks to GraphQL over HTTP only — no AWS SDK calls, no
 * direct DynamoDB writes — so it exercises the real resolver/service
 * stack and works against any environment (local Express, LocalStack,
 * or AWS API Gateway).
 *
 * Usage
 * ─────
 *   # Default — reads GRAPHQL_ENDPOINT from .env / shell:
 *   pnpm exec ts-node -r tsconfig-paths/register scripts/seed-aws.ts
 *
 *   # Override the endpoint explicitly:
 *   pnpm exec ts-node -r tsconfig-paths/register scripts/seed-aws.ts \
 *     --api https://abc123.execute-api.ap-south-1.amazonaws.com/dev/graphql
 *
 *   # Re-run safely after first seed (skip non-idempotent steps):
 *   pnpm exec ts-node -r tsconfig-paths/register scripts/seed-aws.ts \
 *     --skip-upload --skip-recurring
 *
 * Flags
 * ─────
 *   --api <url>          GraphQL endpoint (else $GRAPHQL_ENDPOINT, else
 *                        http://localhost:4005/graphql)
 *   --email <addr>       Seed user email (default dev@local.test)
 *   --password <pwd>     Seed user password (default password123)
 *   --tenant <id>        TenantType (PERSONAL | CLIENT | DEFAULT)
 *                        default PERSONAL
 *   --skip-upload        Don't upload the sample statement (re-runs would
 *                        otherwise create duplicate transactions)
 *   --skip-budget        Don't set the current-month budget
 *   --skip-recurring     Don't create the recurring transaction
 *   --skip-rules         Don't seed category rules (addTransactionCategory is
 *                        idempotent, but skip if you've customised rules)
 *   --quiet              Suppress per-step banners
 *
 * Exit codes
 * ──────────
 *   0  All requested steps completed
 *   1  A required step failed (register, login)
 *   2  An optional step failed (upload / budget / recurring) — the
 *      others still ran; check logs above
 */

import * as dotenv from "dotenv";

dotenv.config();

// ─────────────────────────────────────────────────────────────────────────────
// CLI args
// ─────────────────────────────────────────────────────────────────────────────

function getArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  return idx >= 0 ? process.argv[idx + 1] : undefined;
}
function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

const API =
  getArg("--api") ??
  process.env.GRAPHQL_ENDPOINT ??
  "http://localhost:4005/graphql";

const EMAIL = getArg("--email") ?? "dev@local.test";
const NAME = "Dev User";
const PASSWORD = getArg("--password") ?? "password123";
const TENANT = (getArg("--tenant") ?? "PERSONAL") as
  | "PERSONAL"
  | "CLIENT"
  | "DEFAULT";

const SKIP_UPLOAD = hasFlag("--skip-upload");
const SKIP_BUDGET = hasFlag("--skip-budget");
const SKIP_RECURRING = hasFlag("--skip-recurring");
const SKIP_RULES = hasFlag("--skip-rules");
const QUIET = hasFlag("--quiet");

// ─────────────────────────────────────────────────────────────────────────────
// Sample HDFC savings statement — header format matches HdfcBankParser
// (see packages/parser/src/hdfc.ts). Tweak rows as needed; dates are
// recomputed at run time so transactions land in the current month.
// ─────────────────────────────────────────────────────────────────────────────

function buildSampleCsv(): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");

  const row = (
    day: string,
    narration: string,
    withdrawal: string,
    deposit: string,
    balance: string
  ) => `${day}/${mm}/${yy},${narration},${withdrawal},${deposit},${balance}`;

  return [
    "Date,Narration,Withdrawal Amt.,Deposit Amt.,Closing Balance",
    row("01", "Salary Credit", "", "75000", "75000"),
    row("02", "Rent Payment", "18000", "", "57000"),
    row("03", "Grocery - BigBasket", "3450", "", "53550"),
    row("05", "Electricity Bill", "1820", "", "51730"),
    row("07", "Swiggy Order", "640", "", "51090"),
    row("10", "Uber Ride", "280", "", "50810"),
    row("12", "Amazon Shopping", "2199", "", "48611"),
    row("15", "Mutual Fund SIP", "10000", "", "38611"),
    row("18", "Restaurant - Cafe", "1250", "", "37361"),
    row("22", "Interest Credited", "", "120", "37481"),
    row("25", "Petrol", "2000", "", "35481"),
    row("28", "Health Insurance", "1450", "", "34031"),
  ].join("\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// GraphQL helpers
// ─────────────────────────────────────────────────────────────────────────────

type GqlErrorEntry = { message: string; extensions?: Record<string, unknown> };

class GqlError extends Error {
  constructor(
    message: string,
    public readonly entries: GqlErrorEntry[]
  ) {
    super(message);
  }
}

async function gql<T>(
  query: string,
  variables: Record<string, unknown> = {},
  token?: string
): Promise<T> {
  const res = await fetch(API, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status} from ${API}: ${text.slice(0, 400)}`);
  }

  const body = (await res.json()) as {
    data?: T;
    errors?: GqlErrorEntry[];
  };

  if (body.errors?.length) {
    throw new GqlError(
      body.errors.map((e) => e.message).join("; "),
      body.errors
    );
  }
  if (!body.data) {
    throw new Error(`Empty GraphQL response from ${API}`);
  }
  return body.data;
}

const log = (msg: string) => {
  if (!QUIET) console.log(msg);
};
const step = (n: number, title: string) => {
  if (QUIET) return;
  console.log("");
  console.log(`── Step ${n}: ${title} ${"─".repeat(Math.max(0, 48 - title.length))}`);
};

// ─────────────────────────────────────────────────────────────────────────────
// Steps
// ─────────────────────────────────────────────────────────────────────────────

async function healthCheck(): Promise<void> {
  step(0, "Health check");
  const data = await gql<{ healthCheck: string | null; apiVersion: string | null }>(
    `query { healthCheck apiVersion }`
  );
  log(`  healthCheck=${data.healthCheck ?? "—"}  apiVersion=${data.apiVersion ?? "—"}`);
}

async function registerUser(): Promise<void> {
  step(1, "Register user");
  try {
    const data = await gql<{
      register: { success: boolean; message: string };
    }>(
      `mutation Register($input: RegisterInput!) {
         register(input: $input) { success message }
       }`,
      {
        input: { email: EMAIL, name: NAME, tenantId: TENANT, password: PASSWORD },
      }
    );

    if (data.register.success) {
      log(`  ✓ Created ${EMAIL} (${TENANT})`);
    } else {
      // Most backends treat "already exists" as success=false + a message.
      log(`  ↻ Skipped — server says: ${data.register.message}`);
    }
  } catch (err) {
    const msg = (err as Error).message.toLowerCase();
    if (msg.includes("exist") || msg.includes("duplicate") || msg.includes("already")) {
      log(`  ↻ User already exists, continuing`);
      return;
    }
    throw err;
  }
}

async function login(): Promise<string> {
  step(2, "Login");
  const data = await gql<{
    login: { token: string; user: { email: string; tenantId: string } };
  }>(
    `mutation Login($input: LoginInput!) {
       login(input: $input) { token user { email tenantId } }
     }`,
    { input: { email: EMAIL, tenantId: TENANT, password: PASSWORD } }
  );
  log(`  ✓ Logged in as ${data.login.user.email} (${data.login.user.tenantId})`);
  return data.login.token;
}

async function uploadStatement(token: string): Promise<void> {
  step(3, "Upload sample statement");
  const csv = buildSampleCsv();
  const contentBase64 = Buffer.from(csv, "utf-8").toString("base64");

  await gql<{ uploadStatement: boolean }>(
    `mutation Upload($input: StatementInput!) {
       uploadStatement(input: $input)
     }`,
    {
      input: {
        bankName: "HDFC",
        bankType: "SAVINGS",
        fileName: `seed-${new Date().toISOString().slice(0, 10)}.csv`,
        contentBase64,
      },
    },
    token
  );

  log(`  ✓ Enqueued (12 sample transactions; txn-loaders picks up via SQS)`);
  log(`  ⓘ Allow 30–60s for ingest + categorisation before opening the FE`);
}

async function setBudget(token: string): Promise<void> {
  step(4, "Set monthly budget");
  const now = new Date();
  const data = await gql<{
    setBudget: { id: string; category: string; amount: number };
  }>(
    `mutation SetBudget($period: PeriodInput!, $category: String!, $amount: Float!) {
       setBudget(period: $period, category: $category, amount: $amount) {
         id category amount month year
       }
     }`,
    {
      period: { month: now.getMonth() + 1, year: now.getFullYear() },
      category: "Food",
      amount: 8000,
    },
    token
  );
  log(`  ✓ Budget set: ${data.setBudget.category} = ₹${data.setBudget.amount}`);
}

async function createRecurring(token: string): Promise<void> {
  step(5, "Create recurring transaction");

  // Check if one already exists so re-runs are idempotent-ish.
  const existing = await gql<{
    recurringTransactions: { id: string; description: string }[];
  }>(`query { recurringTransactions { id description } }`, {}, token).catch(
    () => ({ recurringTransactions: [] })
  );

  if (existing.recurringTransactions.some((r) => r.description === "Monthly Rent")) {
    log(`  ↻ "Monthly Rent" already exists, skipping`);
    return;
  }

  const today = new Date();
  const startDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;

  const data = await gql<{
    createRecurringTransaction: {
      id: string;
      description: string;
      amount: number;
      frequency: string;
    };
  }>(
    `mutation CreateRecurring($input: CreateRecurringTransactionInput!) {
       createRecurringTransaction(input: $input) {
         id description amount frequency
       }
     }`,
    {
      input: {
        description: "Monthly Rent",
        amount: 18000,
        category: "Housing",
        frequency: "monthly",
        dayOfMonth: 2,
        startDate,
      },
    },
    token
  );
  log(
    `  ✓ Recurring: ${data.createRecurringTransaction.description} ₹${data.createRecurringTransaction.amount} ${data.createRecurringTransaction.frequency}`
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Category rules — keyword → BaseCategory mappings seeded per tenant.
// Mirrors the narrations in buildSampleCsv() plus common variants so the
// tag-loaders rule engine can classify transactions without Bedrock.
// addTransactionCategory is an upsert, so re-running is safe.
// ─────────────────────────────────────────────────────────────────────────────

interface CategoryRule {
  keyword: string;
  category: "INCOME" | "EXPENSES" | "SAVINGS" | "DEFAULT";
  subCategory?: string;
  confidence?: number;
}

const SEED_RULES: CategoryRule[] = [
  // ── Income ─────────────────────────────────────────────────────────────
  { keyword: "salary",           category: "INCOME",   subCategory: "Salary",      confidence: 0.98 },
  { keyword: "interest credited",category: "INCOME",   subCategory: "Interest",    confidence: 0.95 },
  { keyword: "dividend",         category: "INCOME",   subCategory: "Dividend",    confidence: 0.95 },
  { keyword: "refund",           category: "INCOME",   subCategory: "Refund",      confidence: 0.85 },
  { keyword: "cashback",         category: "INCOME",   subCategory: "Cashback",    confidence: 0.90 },
  // ── Savings ────────────────────────────────────────────────────────────
  { keyword: "mutual fund",      category: "SAVINGS",  subCategory: "Investments", confidence: 0.97 },
  { keyword: "sip",              category: "SAVINGS",  subCategory: "Investments", confidence: 0.97 },
  { keyword: "fd",               category: "SAVINGS",  subCategory: "Fixed Deposit", confidence: 0.95 },
  { keyword: "ppf",              category: "SAVINGS",  subCategory: "PPF",         confidence: 0.98 },
  { keyword: "nps",              category: "SAVINGS",  subCategory: "NPS",         confidence: 0.98 },
  // ── Housing ────────────────────────────────────────────────────────────
  { keyword: "rent",             category: "EXPENSES", subCategory: "Housing",     confidence: 0.97 },
  { keyword: "maintenance",      category: "EXPENSES", subCategory: "Housing",     confidence: 0.85 },
  // ── Food ───────────────────────────────────────────────────────────────
  { keyword: "swiggy",           category: "EXPENSES", subCategory: "Food",        confidence: 0.99 },
  { keyword: "zomato",           category: "EXPENSES", subCategory: "Food",        confidence: 0.99 },
  { keyword: "grocery",          category: "EXPENSES", subCategory: "Groceries",   confidence: 0.95 },
  { keyword: "bigbasket",        category: "EXPENSES", subCategory: "Groceries",   confidence: 0.99 },
  { keyword: "blinkit",          category: "EXPENSES", subCategory: "Groceries",   confidence: 0.99 },
  { keyword: "restaurant",       category: "EXPENSES", subCategory: "Food",        confidence: 0.92 },
  { keyword: "cafe",             category: "EXPENSES", subCategory: "Food",        confidence: 0.90 },
  // ── Transport ──────────────────────────────────────────────────────────
  { keyword: "uber",             category: "EXPENSES", subCategory: "Transport",   confidence: 0.99 },
  { keyword: "ola",              category: "EXPENSES", subCategory: "Transport",   confidence: 0.99 },
  { keyword: "petrol",           category: "EXPENSES", subCategory: "Transport",   confidence: 0.97 },
  { keyword: "fuel",             category: "EXPENSES", subCategory: "Transport",   confidence: 0.95 },
  { keyword: "metro",            category: "EXPENSES", subCategory: "Transport",   confidence: 0.95 },
  // ── Utilities ──────────────────────────────────────────────────────────
  { keyword: "electricity",      category: "EXPENSES", subCategory: "Utilities",   confidence: 0.97 },
  { keyword: "water bill",       category: "EXPENSES", subCategory: "Utilities",   confidence: 0.97 },
  { keyword: "gas bill",         category: "EXPENSES", subCategory: "Utilities",   confidence: 0.95 },
  { keyword: "internet",         category: "EXPENSES", subCategory: "Utilities",   confidence: 0.95 },
  { keyword: "mobile recharge",  category: "EXPENSES", subCategory: "Utilities",   confidence: 0.95 },
  // ── Shopping ───────────────────────────────────────────────────────────
  { keyword: "amazon",           category: "EXPENSES", subCategory: "Shopping",    confidence: 0.92 },
  { keyword: "flipkart",         category: "EXPENSES", subCategory: "Shopping",    confidence: 0.92 },
  { keyword: "myntra",           category: "EXPENSES", subCategory: "Shopping",    confidence: 0.92 },
  // ── Insurance ──────────────────────────────────────────────────────────
  { keyword: "insurance",        category: "EXPENSES", subCategory: "Insurance",   confidence: 0.95 },
  { keyword: "lic",              category: "EXPENSES", subCategory: "Insurance",   confidence: 0.97 },
  // ── Healthcare ─────────────────────────────────────────────────────────
  { keyword: "pharmacy",         category: "EXPENSES", subCategory: "Healthcare",  confidence: 0.93 },
  { keyword: "hospital",         category: "EXPENSES", subCategory: "Healthcare",  confidence: 0.95 },
  { keyword: "doctor",           category: "EXPENSES", subCategory: "Healthcare",  confidence: 0.92 },
];

async function addRulesByTenant(token: string): Promise<void> {
  step(6, "Seed category rules");

  let added = 0;
  let failed = 0;

  for (const rule of SEED_RULES) {
    try {
      await gql<{ addTransactionCategory: boolean }>(
        `mutation AddRule($input: AddTransactionCategoryInput!) {
           addTransactionCategory(input: $input)
         }`,
        { input: rule },
        token
      );
      added++;
    } catch (err) {
      failed++;
      if (!QUIET) {
        console.error(`    ✗ Rule "${rule.keyword}" failed: ${(err as Error).message.slice(0, 120)}`);
      }
    }
  }

  log(`  ✓ ${added} rules seeded${failed > 0 ? `, ${failed} failed (see above)` : ""}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  seed-aws — seed full-budget-app with dev data               ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log(`  endpoint : ${API}`);
  console.log(`  user     : ${EMAIL} (tenant=${TENANT})`);
  console.log(
    `  steps    : register, login` +
      (SKIP_UPLOAD ? "" : ", upload") +
      (SKIP_BUDGET ? "" : ", budget") +
      (SKIP_RECURRING ? "" : ", recurring") +
      (SKIP_RULES ? "" : ", rules")
  );

  let optionalFailed = false;

  await healthCheck();
  await registerUser();
  const token = await login();

  for (const job of [
    { skip: SKIP_UPLOAD,    name: "upload",    fn: () => uploadStatement(token) },
    { skip: SKIP_BUDGET,    name: "budget",    fn: () => setBudget(token) },
    { skip: SKIP_RECURRING, name: "recurring", fn: () => createRecurring(token) },
    { skip: SKIP_RULES,     name: "rules",     fn: () => addRulesByTenant(token) },
  ]) {
    if (job.skip) {
      log(`  ⊝ Skipped ${job.name} (flag)`);
      continue;
    }
    try {
      await job.fn();
    } catch (err) {
      optionalFailed = true;
      console.error(
        `  ✗ ${job.name} failed: ${(err as Error).message.slice(0, 300)}`
      );
    }
  }

  console.log("");
  console.log("── Summary ────────────────────────────────────────────────────");
  console.log(`  user           : ${EMAIL}`);
  console.log(`  password       : ${PASSWORD}`);
  console.log(`  tenant         : ${TENANT}`);
  console.log(`  api            : ${API}`);
  console.log(`  optional fails : ${optionalFailed ? "yes (see above)" : "none"}`);
  console.log("");
  console.log("  Next: open the FE and log in with the credentials above.");
  console.log("  If you uploaded a statement, give txn-loaders ~30–60s before");
  console.log("  expecting transactions on /transactions.");

  process.exit(optionalFailed ? 2 : 0);
}

main().catch((err: unknown) => {
  const e = err as Error;
  console.error("");
  console.error("Seed aborted (required step failed):");
  console.error(`  ${e.message}`);
  if (err instanceof GqlError) {
    for (const entry of err.entries) {
      console.error(`    • ${entry.message}`);
    }
  }
  process.exit(1);
});
