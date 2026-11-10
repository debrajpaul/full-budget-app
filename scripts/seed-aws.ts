/**
 * Seed a deployed full-budget-app backend with enough data for the entire
 * frontend to render meaningfully end-to-end:
 *
 *   1.  Register a dev user (idempotent — skips if already exists)
 *   2.  Log in and obtain a JWT
 *   3.  Upload two months of sample HDFC CSV statements
 *       (current month + previous month, so charts have history)
 *   4.  Set budgets for all main spending categories
 *   5.  Create five recurring transactions
 *       (salary, rent, SIP, mobile, streaming)
 *   6.  Generate recurring transactions for the current month
 *   7.  Create savings goals with initial contributions
 *       (Emergency Fund, Vacation, Car Down Payment)
 *   8.  Create sinking funds with initial contributions
 *       (Annual Insurance, Laptop Upgrade)
 *   9.  Seed keyword-based category rules for the tenant
 *
 * The script talks to GraphQL over HTTP only — no AWS SDK calls, no
 * direct DynamoDB writes — so it exercises the real resolver/service
 * stack and works against any environment.
 *
 * Usage
 * ─────
 *   # Full seed (first run):
 *   pnpm seed:aws
 *
 *   # Override endpoint:
 *   pnpm seed:aws --api https://abc123.execute-api.ap-south-1.amazonaws.com/dev/graphql
 *
 *   # Re-run safely (skip non-idempotent steps):
 *   pnpm seed:aws --skip-upload --skip-recurring --skip-goals --skip-sinking
 *
 * Flags
 * ─────
 *   --api <url>          GraphQL endpoint (else $GRAPHQL_ENDPOINT,
 *                        else http://localhost:4005/graphql)
 *   --email <addr>       Seed user email      (default dev@local.test)
 *   --password <pwd>     Seed user password   (default password123)
 *   --tenant <id>        TenantType PERSONAL|CLIENT|DEFAULT (default PERSONAL)
 *   --skip-upload        Skip CSV uploads (avoids duplicate transactions)
 *   --skip-budget        Skip budget seeding
 *   --skip-recurring     Skip recurring transaction creation + generation
 *   --skip-goals         Skip savings goal creation
 *   --skip-sinking       Skip sinking fund creation
 *   --skip-rules         Skip category rule seeding
 *   --quiet              Suppress per-step banners
 *
 * Exit codes
 * ──────────
 *   0  All steps completed (or skipped by flag)
 *   1  A required step failed (register, login)
 *   2  One or more optional steps failed — others still ran; check logs
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
  "PERSONAL" | "CLIENT" | "DEFAULT";

const SKIP_UPLOAD = hasFlag("--skip-upload");
const SKIP_BUDGET = hasFlag("--skip-budget");
const SKIP_RECURRING = hasFlag("--skip-recurring");
const SKIP_GOALS = hasFlag("--skip-goals");
const SKIP_SINKING = hasFlag("--skip-sinking");
const SKIP_RULES = hasFlag("--skip-rules");
const QUIET = hasFlag("--quiet");

// ─────────────────────────────────────────────────────────────────────────────
// Sample HDFC CSV builder
//
// monthsAgo=0 → current month, monthsAgo=1 → previous month.
// Transactions are realistic (salary + common expenses) and land in the
// correct calendar month so monthly-review charts display two data points.
// ─────────────────────────────────────────────────────────────────────────────

function buildSampleCsv(monthsAgo = 0): string {
  const ref = new Date();
  ref.setMonth(ref.getMonth() - monthsAgo);
  const yy = String(ref.getFullYear()).slice(2);
  const mm = String(ref.getMonth() + 1).padStart(2, "0");

  const row = (
    day: string,
    narration: string,
    withdrawal: string,
    deposit: string,
    balance: string
  ) => `${day}/${mm}/${yy},${narration},${withdrawal},${deposit},${balance}`;

  return [
    "Date,Narration,Withdrawal Amt.,Deposit Amt.,Closing Balance",
    row("01", "Salary Credit EMPLOYER", "", "75000", "75000"),
    row("02", "Rent Payment", "18000", "", "57000"),
    row("03", "BigBasket Grocery", "3450", "", "53550"),
    row("05", "Electricity Bill BESCOM", "1820", "", "51730"),
    row("07", "Swiggy Order", "640", "", "51090"),
    row("08", "Uber Ride", "280", "", "50810"),
    row("10", "Amazon Shopping", "2199", "", "48611"),
    row("12", "Zomato Order", "890", "", "47721"),
    row("15", "Mutual Fund SIP HDFC", "10000", "", "37721"),
    row("18", "Restaurant Cafe Coffee Day", "1250", "", "36471"),
    row("20", "Mobile Recharge Airtel", "299", "", "36172"),
    row("22", "Interest Credited", "", "120", "36292"),
    row("25", "Petrol BPCL", "2000", "", "34292"),
    row("26", "Health Insurance Premium", "1450", "", "32842"),
    row("27", "Netflix Subscription", "649", "", "32193"),
    row("28", "Pharmacy MedPlus", "850", "", "31343"),
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

  const body = (await res.json()) as { data?: T; errors?: GqlErrorEntry[] };

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
  console.log(
    `── Step ${n}: ${title} ${"─".repeat(Math.max(0, 48 - title.length))}`
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Steps
// ─────────────────────────────────────────────────────────────────────────────

async function healthCheck(): Promise<void> {
  step(0, "Health check");
  const data = await gql<{
    healthCheck: string | null;
    apiVersion: string | null;
  }>(`query { healthCheck apiVersion }`);
  log(
    `  healthCheck=${data.healthCheck ?? "—"}  apiVersion=${data.apiVersion ?? "—"}`
  );
}

async function registerUser(): Promise<void> {
  step(1, "Register user");
  try {
    const data = await gql<{ register: { success: boolean; message: string } }>(
      `mutation Register($input: RegisterInput!) {
         register(input: $input) { success message }
       }`,
      {
        input: {
          email: EMAIL,
          name: NAME,
          tenantId: TENANT,
          password: PASSWORD,
        },
      }
    );
    if (data.register.success) {
      log(`  ✓ Created ${EMAIL} (${TENANT})`);
    } else {
      log(`  ↻ Skipped — server says: ${data.register.message}`);
    }
  } catch (err) {
    const msg = (err as Error).message.toLowerCase();
    if (
      msg.includes("exist") ||
      msg.includes("duplicate") ||
      msg.includes("already") ||
      msg.includes("conditional request failed")
    ) {
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
  log(
    `  ✓ Logged in as ${data.login.user.email} (${data.login.user.tenantId})`
  );
  return data.login.token;
}

// ── Step 3: Upload two months of statements ───────────────────────────────────

async function uploadStatements(token: string): Promise<void> {
  step(3, "Upload sample statements (current + previous month)");

  for (const monthsAgo of [1, 0]) {
    const ref = new Date();
    ref.setMonth(ref.getMonth() - monthsAgo);
    const label = ref.toLocaleString("default", {
      month: "long",
      year: "numeric",
    });
    const csv = buildSampleCsv(monthsAgo);
    const contentBase64 = Buffer.from(csv, "utf-8").toString("base64");
    const dateSlug = ref.toISOString().slice(0, 7);

    await gql<{
      uploadStatement: { jobId: string; accepted: boolean; warnings: string[] };
    }>(
      `mutation Upload($input: StatementInput!) {
         uploadStatement(input: $input) { jobId accepted warnings }
       }`,
      {
        input: {
          bankName: "HDFC",
          bankType: "SAVINGS",
          fileName: `seed-${dateSlug}.csv`,
          contentBase64,
        },
      },
      token
    );
    log(`  ✓ Enqueued ${label} (16 transactions)`);
  }

  log(`  ⓘ Allow 30–60s for txn-loaders to ingest both statements`);
}

// ── Step 4: Budgets ───────────────────────────────────────────────────────────

const SEED_BUDGETS: { category: string; amount: number }[] = [
  { category: "Housing", amount: 20000 },
  { category: "Groceries", amount: 6000 },
  { category: "Food", amount: 4000 },
  { category: "Transport", amount: 3500 },
  { category: "Utilities", amount: 3000 },
  { category: "Shopping", amount: 5000 },
  { category: "Insurance", amount: 2000 },
  { category: "Healthcare", amount: 2000 },
  { category: "Entertainment", amount: 1500 },
  { category: "Investments", amount: 12000 },
];

async function setBudgets(token: string): Promise<void> {
  step(4, "Set monthly budgets");
  const now = new Date();
  const period = { month: now.getMonth() + 1, year: now.getFullYear() };

  for (const { category, amount } of SEED_BUDGETS) {
    await gql<{ setBudget: { id: string } }>(
      `mutation SetBudget($period: PeriodInput!, $category: String!, $amount: Float!) {
         setBudget(period: $period, category: $category, amount: $amount) { id }
       }`,
      { period, category, amount },
      token
    );
  }
  log(
    `  ✓ ${SEED_BUDGETS.length} budgets set for ${now.toLocaleString("default", { month: "long", year: "numeric" })}`
  );
}

// ── Step 5: Recurring transactions ───────────────────────────────────────────

interface RecurringDef {
  description: string;
  amount: number;
  category: string;
  type: "CREDIT" | "DEBIT";
  frequency: string;
  dayOfMonth: number;
}

const SEED_RECURRING: RecurringDef[] = [
  {
    description: "Salary Credit",
    amount: 75000,
    category: "Salary",
    type: "CREDIT",
    frequency: "monthly",
    dayOfMonth: 1,
  },
  {
    description: "Monthly Rent",
    amount: 18000,
    category: "Housing",
    type: "DEBIT",
    frequency: "monthly",
    dayOfMonth: 2,
  },
  {
    description: "Mutual Fund SIP",
    amount: 10000,
    category: "Investments",
    type: "DEBIT",
    frequency: "monthly",
    dayOfMonth: 15,
  },
  {
    description: "Mobile Recharge Airtel",
    amount: 299,
    category: "Utilities",
    type: "DEBIT",
    frequency: "monthly",
    dayOfMonth: 5,
  },
  {
    description: "Netflix Subscription",
    amount: 649,
    category: "Entertainment",
    type: "DEBIT",
    frequency: "monthly",
    dayOfMonth: 10,
  },
];

async function createRecurring(token: string): Promise<void> {
  step(5, "Create recurring transactions");

  const existing = await gql<{
    recurringTransactions: { id: string; description: string }[];
  }>(`query { recurringTransactions { id description } }`, {}, token).catch(
    () => ({ recurringTransactions: [] })
  );
  const existingSet = new Set(
    existing.recurringTransactions.map((r) => r.description)
  );

  const today = new Date();
  const startDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;

  let created = 0;
  for (const def of SEED_RECURRING) {
    if (existingSet.has(def.description)) {
      log(`  ↻ "${def.description}" already exists, skipping`);
      continue;
    }
    await gql(
      `mutation CreateRecurring($input: CreateRecurringTransactionInput!) {
         createRecurringTransaction(input: $input) { id description }
       }`,
      { input: { ...def, startDate } },
      token
    );
    created++;
  }
  log(
    `  ✓ ${created} created, ${SEED_RECURRING.length - created} already existed`
  );
}

// ── Step 6: Generate recurring transactions for current month ─────────────────

async function generateRecurring(token: string): Promise<void> {
  step(6, "Generate recurring transactions (current month)");
  const now = new Date();
  const data = await gql<{ generateRecurringTransactions: number }>(
    `mutation GenerateRecurring($month: Int!, $year: Int!) {
       generateRecurringTransactions(month: $month, year: $year)
     }`,
    { month: now.getMonth() + 1, year: now.getFullYear() },
    token
  );
  log(`  ✓ ${data.generateRecurringTransactions} transaction(s) materialized`);
}

// ── Step 7: Savings goals ─────────────────────────────────────────────────────

interface GoalDef {
  name: string;
  target: number;
  deadlineMonths: number; // months from today
  initialAmount?: number;
  contribution: number; // amount to contribute after creation
}

const SEED_GOALS: GoalDef[] = [
  {
    name: "Emergency Fund",
    target: 200000,
    deadlineMonths: 12,
    initialAmount: 15000,
    contribution: 10000,
  },
  {
    name: "Europe Vacation",
    target: 150000,
    deadlineMonths: 8,
    contribution: 20000,
  },
  {
    name: "Car Down Payment",
    target: 300000,
    deadlineMonths: 18,
    initialAmount: 5000,
    contribution: 15000,
  },
];

function futureDate(monthsFromNow: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + monthsFromNow);
  return d.toISOString().slice(0, 10);
}

async function createGoals(token: string): Promise<void> {
  step(7, "Create savings goals");

  for (const goal of SEED_GOALS) {
    let goalId: string;
    try {
      const data = await gql<{
        createSavingsGoal: { id: string; name: string };
      }>(
        `mutation CreateGoal($input: CreateSavingsGoalInput!) {
           createSavingsGoal(input: $input) { id name }
         }`,
        {
          input: {
            name: goal.name,
            target: goal.target,
            deadline: futureDate(goal.deadlineMonths),
            ...(goal.initialAmount
              ? { initialAmount: goal.initialAmount }
              : {}),
          },
        },
        token
      );
      goalId = data.createSavingsGoal.id;
      log(`  ✓ Goal created: "${goal.name}" → ₹${goal.target}`);
    } catch (err) {
      const msg = (err as Error).message.toLowerCase();
      if (msg.includes("exist") || msg.includes("duplicate")) {
        log(`  ↻ "${goal.name}" already exists, skipping contribution`);
        continue;
      }
      throw err;
    }

    // Contribute to show progress in the UI
    await gql(
      `mutation Contribute($input: ContributeSavingsGoalInput!) {
         contributeSavingsGoal(input: $input) { id currentAmount }
       }`,
      { input: { id: goalId, amount: goal.contribution } },
      token
    );
    log(`     └─ contributed ₹${goal.contribution}`);
  }
}

// ── Step 8: Sinking funds ─────────────────────────────────────────────────────

interface SinkingDef {
  name: string;
  target: number;
  monthlyContribution: number;
  deadlineMonths?: number;
  contribution: number;
}

const SEED_SINKING: SinkingDef[] = [
  {
    name: "Annual Car Insurance",
    target: 25000,
    monthlyContribution: 2100,
    deadlineMonths: 12,
    contribution: 5000,
  },
  {
    name: "Laptop Upgrade",
    target: 80000,
    monthlyContribution: 3000,
    deadlineMonths: 24,
    contribution: 10000,
  },
];

async function createSinkingFunds(token: string): Promise<void> {
  step(8, "Create sinking funds");

  for (const sf of SEED_SINKING) {
    let fundId: string;
    try {
      const data = await gql<{
        createSinkingFund: { id: string; name: string };
      }>(
        `mutation CreateSinkingFund($input: CreateSinkingFundInput!) {
           createSinkingFund(input: $input) { id name }
         }`,
        {
          input: {
            name: sf.name,
            target: sf.target,
            monthlyContribution: sf.monthlyContribution,
            ...(sf.deadlineMonths
              ? { deadline: futureDate(sf.deadlineMonths) }
              : {}),
          },
        },
        token
      );
      fundId = data.createSinkingFund.id;
      log(`  ✓ Fund created: "${sf.name}" → ₹${sf.target}`);
    } catch (err) {
      const msg = (err as Error).message.toLowerCase();
      if (msg.includes("exist") || msg.includes("duplicate")) {
        log(`  ↻ "${sf.name}" already exists, skipping contribution`);
        continue;
      }
      throw err;
    }

    await gql(
      `mutation ContributeFund($input: ContributeSinkingFundInput!) {
         contributeSinkingFund(input: $input) { id currentAmount }
       }`,
      { input: { id: fundId, amount: sf.contribution } },
      token
    );
    log(`     └─ contributed ₹${sf.contribution}`);
  }
}

// ── Step 9: Category rules ────────────────────────────────────────────────────

interface CategoryRule {
  keyword: string;
  category: "INCOME" | "EXPENSES" | "SAVINGS" | "DEFAULT";
  subCategory?: string;
  when?: "CREDIT" | "DEBIT" | "ANY";
  confidence?: number;
  reason?: string;
}

const SEED_RULES: CategoryRule[] = [
  // ── Income ─────────────────────────────────────────────────────────────────
  {
    keyword: "salary",
    category: "INCOME",
    subCategory: "Salary",
    when: "CREDIT",
    confidence: 0.98,
    reason: "Salary credit",
  },
  {
    keyword: "interest credited",
    category: "INCOME",
    subCategory: "Interest",
    when: "CREDIT",
    confidence: 0.95,
    reason: "Interest credit",
  },
  {
    keyword: "credit interest",
    category: "INCOME",
    subCategory: "Interest",
    when: "CREDIT",
    confidence: 0.85,
    reason: "Interest credit (alt)",
  },
  {
    keyword: "int cr",
    category: "INCOME",
    subCategory: "Interest",
    when: "CREDIT",
    confidence: 0.85,
    reason: "Interest credit (short)",
  },
  {
    keyword: "dividend",
    category: "INCOME",
    subCategory: "Dividend",
    when: "CREDIT",
    confidence: 0.98,
    reason: "Dividend credit",
  },
  {
    keyword: "interim dividend",
    category: "INCOME",
    subCategory: "Dividend",
    when: "CREDIT",
    confidence: 0.98,
    reason: "Interim dividend",
  },
  {
    keyword: "refund",
    category: "INCOME",
    subCategory: "Refund",
    when: "CREDIT",
    confidence: 0.85,
    reason: "Refund credit",
  },
  {
    keyword: "cashback",
    category: "INCOME",
    subCategory: "Cashback",
    when: "CREDIT",
    confidence: 0.9,
    reason: "Cashback credit",
  },
  {
    keyword: "achcr",
    category: "INCOME",
    subCategory: "Salary",
    when: "CREDIT",
    confidence: 0.7,
    reason: "ACH credit / payroll",
  },
  {
    keyword: "payroll",
    category: "INCOME",
    subCategory: "Salary",
    when: "CREDIT",
    confidence: 0.7,
    reason: "Payroll credit",
  },
  {
    keyword: "cashfree",
    category: "INCOME",
    subCategory: "Business",
    when: "CREDIT",
    confidence: 0.8,
    reason: "Payment gateway payout",
  },
  {
    keyword: "razorpay",
    category: "INCOME",
    subCategory: "Business",
    when: "CREDIT",
    confidence: 0.8,
    reason: "Payment gateway payout",
  },
  {
    keyword: "upi credit",
    category: "INCOME",
    subCategory: "Transfer",
    when: "CREDIT",
    confidence: 0.6,
    reason: "Incoming UPI transfer",
  },
  {
    keyword: "imps credit",
    category: "INCOME",
    subCategory: "Transfer",
    when: "CREDIT",
    confidence: 0.6,
    reason: "Incoming IMPS transfer",
  },
  {
    keyword: "neft credit",
    category: "INCOME",
    subCategory: "Transfer",
    when: "CREDIT",
    confidence: 0.6,
    reason: "Incoming NEFT transfer",
  },
  {
    keyword: "robosoft",
    category: "INCOME",
    subCategory: "Salary",
    when: "CREDIT",
    confidence: 0.9,
    reason: "Salary credit (Robosoft)",
  },

  // ── Savings / Investments ──────────────────────────────────────────────────
  // BaseCategory.INVESTMENT maps to SAVINGS here — GraphQL enum only has
  // SAVINGS | EXPENSES | INCOME | DEFAULT.
  {
    keyword: "mutual fund",
    category: "SAVINGS",
    subCategory: "Investments",
    when: "ANY",
    confidence: 0.97,
    reason: "MF/SIP",
  },
  {
    keyword: "sip",
    category: "SAVINGS",
    subCategory: "Investments",
    when: "ANY",
    confidence: 0.97,
    reason: "MF SIP",
  },
  {
    keyword: "indian clearing",
    category: "SAVINGS",
    subCategory: "Investments",
    when: "DEBIT",
    confidence: 0.9,
    reason: "MF/SIP via Indian Clearing",
  },
  {
    keyword: "ppf",
    category: "SAVINGS",
    subCategory: "PPF",
    when: "DEBIT",
    confidence: 0.98,
    reason: "PPF contribution",
  },
  {
    keyword: "nps",
    category: "SAVINGS",
    subCategory: "NPS",
    when: "ANY",
    confidence: 0.98,
    reason: "NPS contribution",
  },
  {
    keyword: "nsc",
    category: "SAVINGS",
    subCategory: "NPS",
    when: "DEBIT",
    confidence: 0.9,
    reason: "NSC investment",
  },
  {
    keyword: "national pension",
    category: "SAVINGS",
    subCategory: "NPS",
    when: "DEBIT",
    confidence: 0.9,
    reason: "National Pension Scheme",
  },
  {
    keyword: "rd installment",
    category: "SAVINGS",
    subCategory: "Emergency",
    when: "DEBIT",
    confidence: 0.9,
    reason: "Recurring Deposit installment",
  },
  {
    keyword: "recurring deposit",
    category: "SAVINGS",
    subCategory: "Emergency",
    when: "DEBIT",
    confidence: 0.9,
    reason: "Recurring Deposit",
  },
  {
    keyword: "zerodha",
    category: "SAVINGS",
    subCategory: "Stocks",
    when: "DEBIT",
    confidence: 0.95,
    reason: "Broker/Zerodha debit",
  },
  {
    keyword: "cdsl",
    category: "SAVINGS",
    subCategory: "Stocks",
    when: "DEBIT",
    confidence: 0.95,
    reason: "CDSL depository debit",
  },
  {
    keyword: "hdfcsec",
    category: "SAVINGS",
    subCategory: "Stocks",
    when: "DEBIT",
    confidence: 0.95,
    reason: "HDFC Securities debit",
  },
  {
    keyword: "icici direct",
    category: "SAVINGS",
    subCategory: "Stocks",
    when: "DEBIT",
    confidence: 0.95,
    reason: "ICICI Direct debit",
  },

  // ── Housing ────────────────────────────────────────────────────────────────
  {
    keyword: "rent",
    category: "EXPENSES",
    subCategory: "Housing",
    when: "DEBIT",
    confidence: 0.97,
    reason: "Rent payment",
  },
  {
    keyword: "maintenance",
    category: "EXPENSES",
    subCategory: "Housing",
    when: "DEBIT",
    confidence: 0.85,
    reason: "Society/maintenance charge",
  },
  {
    keyword: "maid salary",
    category: "EXPENSES",
    subCategory: "Housing",
    when: "DEBIT",
    confidence: 0.9,
    reason: "Maid salary",
  },

  // ── Food & Dining ──────────────────────────────────────────────────────────
  {
    keyword: "swiggy",
    category: "EXPENSES",
    subCategory: "Food",
    when: "DEBIT",
    confidence: 0.99,
    reason: "Food delivery",
  },
  {
    keyword: "zomato",
    category: "EXPENSES",
    subCategory: "Food",
    when: "DEBIT",
    confidence: 0.99,
    reason: "Food delivery",
  },
  {
    keyword: "restaurant",
    category: "EXPENSES",
    subCategory: "Food",
    when: "DEBIT",
    confidence: 0.92,
    reason: "Restaurant dining",
  },
  {
    keyword: "cafe",
    category: "EXPENSES",
    subCategory: "Food",
    when: "DEBIT",
    confidence: 0.9,
    reason: "Cafe / coffee shop",
  },

  // ── Groceries ─────────────────────────────────────────────────────────────
  {
    keyword: "grocery",
    category: "EXPENSES",
    subCategory: "Groceries",
    when: "DEBIT",
    confidence: 0.95,
    reason: "Grocery purchase",
  },
  {
    keyword: "bigbasket",
    category: "EXPENSES",
    subCategory: "Groceries",
    when: "DEBIT",
    confidence: 0.99,
    reason: "BigBasket grocery",
  },
  {
    keyword: "blinkit",
    category: "EXPENSES",
    subCategory: "Groceries",
    when: "DEBIT",
    confidence: 0.99,
    reason: "Blinkit quick commerce",
  },
  {
    keyword: "grofers",
    category: "EXPENSES",
    subCategory: "Groceries",
    when: "DEBIT",
    confidence: 0.99,
    reason: "Grofers grocery",
  },

  // ── Transport ─────────────────────────────────────────────────────────────
  {
    keyword: "uber",
    category: "EXPENSES",
    subCategory: "Transport",
    when: "DEBIT",
    confidence: 0.99,
    reason: "Uber ride",
  },
  {
    keyword: "ola",
    category: "EXPENSES",
    subCategory: "Transport",
    when: "DEBIT",
    confidence: 0.99,
    reason: "Ola ride",
  },
  {
    keyword: "petrol",
    category: "EXPENSES",
    subCategory: "Transport",
    when: "DEBIT",
    confidence: 0.97,
    reason: "Petrol/fuel",
  },
  {
    keyword: "fuel",
    category: "EXPENSES",
    subCategory: "Transport",
    when: "DEBIT",
    confidence: 0.95,
    reason: "Fuel",
  },
  {
    keyword: "diesel",
    category: "EXPENSES",
    subCategory: "Transport",
    when: "DEBIT",
    confidence: 0.95,
    reason: "Diesel",
  },
  {
    keyword: "bmrcl",
    category: "EXPENSES",
    subCategory: "Transport",
    when: "DEBIT",
    confidence: 0.95,
    reason: "Bangalore Metro (BMRCL)",
  },
  {
    keyword: "irctc",
    category: "EXPENSES",
    subCategory: "Transport",
    when: "DEBIT",
    confidence: 0.97,
    reason: "Train booking (IRCTC)",
  },
  {
    keyword: "railway",
    category: "EXPENSES",
    subCategory: "Transport",
    when: "DEBIT",
    confidence: 0.9,
    reason: "Railway ticket",
  },
  {
    keyword: "metro",
    category: "EXPENSES",
    subCategory: "Transport",
    when: "DEBIT",
    confidence: 0.9,
    reason: "Metro fare",
  },
  {
    keyword: "flight",
    category: "EXPENSES",
    subCategory: "Transport",
    when: "DEBIT",
    confidence: 0.9,
    reason: "Flight booking",
  },
  {
    keyword: "airways",
    category: "EXPENSES",
    subCategory: "Transport",
    when: "DEBIT",
    confidence: 0.9,
    reason: "Airline ticket",
  },

  // ── Utilities ─────────────────────────────────────────────────────────────
  {
    keyword: "electricity",
    category: "EXPENSES",
    subCategory: "Utilities",
    when: "DEBIT",
    confidence: 0.97,
    reason: "Electricity bill",
  },
  {
    keyword: "bescom",
    category: "EXPENSES",
    subCategory: "Utilities",
    when: "DEBIT",
    confidence: 0.97,
    reason: "BESCOM electricity (Bangalore)",
  },
  {
    keyword: "torrent power",
    category: "EXPENSES",
    subCategory: "Utilities",
    when: "DEBIT",
    confidence: 0.97,
    reason: "Torrent Power electricity",
  },
  {
    keyword: "water bill",
    category: "EXPENSES",
    subCategory: "Utilities",
    when: "DEBIT",
    confidence: 0.97,
    reason: "Water bill",
  },
  {
    keyword: "internet",
    category: "EXPENSES",
    subCategory: "Utilities",
    when: "DEBIT",
    confidence: 0.95,
    reason: "Internet bill",
  },
  {
    keyword: "broadband",
    category: "EXPENSES",
    subCategory: "Utilities",
    when: "DEBIT",
    confidence: 0.95,
    reason: "Broadband bill",
  },
  {
    keyword: "mobile recharge",
    category: "EXPENSES",
    subCategory: "Utilities",
    when: "DEBIT",
    confidence: 0.95,
    reason: "Mobile recharge",
  },
  {
    keyword: "airtel",
    category: "EXPENSES",
    subCategory: "Utilities",
    when: "DEBIT",
    confidence: 0.93,
    reason: "Airtel telecom",
  },
  {
    keyword: "jio",
    category: "EXPENSES",
    subCategory: "Utilities",
    when: "DEBIT",
    confidence: 0.93,
    reason: "Jio telecom",
  },
  {
    keyword: "bsnl",
    category: "EXPENSES",
    subCategory: "Utilities",
    when: "DEBIT",
    confidence: 0.93,
    reason: "BSNL telecom",
  },
  {
    keyword: "billpay",
    category: "EXPENSES",
    subCategory: "Utilities",
    when: "DEBIT",
    confidence: 0.8,
    reason: "Bill payment",
  },
  {
    keyword: "gst",
    category: "EXPENSES",
    subCategory: "Utilities",
    when: "DEBIT",
    confidence: 0.75,
    reason: "GST/tax payment",
  },

  // ── Shopping ──────────────────────────────────────────────────────────────
  {
    keyword: "amazon",
    category: "EXPENSES",
    subCategory: "Shopping",
    when: "DEBIT",
    confidence: 0.92,
    reason: "Amazon purchase",
  },
  {
    keyword: "flipkart",
    category: "EXPENSES",
    subCategory: "Shopping",
    when: "DEBIT",
    confidence: 0.92,
    reason: "Flipkart purchase",
  },
  {
    keyword: "myntra",
    category: "EXPENSES",
    subCategory: "Shopping",
    when: "DEBIT",
    confidence: 0.92,
    reason: "Myntra purchase",
  },

  // ── Insurance ─────────────────────────────────────────────────────────────
  {
    keyword: "insurance",
    category: "EXPENSES",
    subCategory: "Insurance",
    when: "DEBIT",
    confidence: 0.95,
    reason: "Insurance premium",
  },
  {
    keyword: "lic",
    category: "EXPENSES",
    subCategory: "Insurance",
    when: "DEBIT",
    confidence: 0.97,
    reason: "LIC premium",
  },
  {
    keyword: "tata aia",
    category: "EXPENSES",
    subCategory: "Insurance",
    when: "DEBIT",
    confidence: 0.95,
    reason: "Tata AIA insurance premium",
  },
  {
    keyword: "policybazaar",
    category: "EXPENSES",
    subCategory: "Insurance",
    when: "DEBIT",
    confidence: 0.95,
    reason: "PolicyBazaar premium",
  },
  {
    keyword: "mediclaim",
    category: "EXPENSES",
    subCategory: "Healthcare",
    when: "DEBIT",
    confidence: 0.9,
    reason: "Mediclaim premium",
  },

  // ── Healthcare ────────────────────────────────────────────────────────────
  {
    keyword: "pharmacy",
    category: "EXPENSES",
    subCategory: "Healthcare",
    when: "DEBIT",
    confidence: 0.93,
    reason: "Pharmacy purchase",
  },
  {
    keyword: "medplus",
    category: "EXPENSES",
    subCategory: "Healthcare",
    when: "DEBIT",
    confidence: 0.97,
    reason: "MedPlus pharmacy",
  },
  {
    keyword: "hospital",
    category: "EXPENSES",
    subCategory: "Healthcare",
    when: "DEBIT",
    confidence: 0.95,
    reason: "Hospital payment",
  },

  // ── Entertainment ─────────────────────────────────────────────────────────
  {
    keyword: "netflix",
    category: "EXPENSES",
    subCategory: "Entertainment",
    when: "DEBIT",
    confidence: 0.99,
    reason: "Netflix subscription",
  },
  {
    keyword: "spotify",
    category: "EXPENSES",
    subCategory: "Entertainment",
    when: "DEBIT",
    confidence: 0.99,
    reason: "Spotify subscription",
  },
  {
    keyword: "prime video",
    category: "EXPENSES",
    subCategory: "Entertainment",
    when: "DEBIT",
    confidence: 0.99,
    reason: "Amazon Prime Video",
  },

  // ── Bank fees & charges ────────────────────────────────────────────────────
  {
    keyword: "charge",
    category: "EXPENSES",
    subCategory: "Fees",
    when: "DEBIT",
    confidence: 0.65,
    reason: "Bank charge",
  },
  {
    keyword: "annual fee",
    category: "EXPENSES",
    subCategory: "Fees",
    when: "DEBIT",
    confidence: 0.8,
    reason: "Annual fee",
  },
  {
    keyword: "atm withdrawal",
    category: "EXPENSES",
    subCategory: "Cash",
    when: "DEBIT",
    confidence: 0.85,
    reason: "ATM cash withdrawal",
  },
  {
    keyword: "penalty",
    category: "EXPENSES",
    subCategory: "Fees",
    when: "DEBIT",
    confidence: 0.7,
    reason: "Penalty charge",
  },
];

async function addRulesByTenant(token: string): Promise<void> {
  step(9, "Seed category rules");
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
        console.error(
          `    ✗ Rule "${rule.keyword}" failed: ${(err as Error).message.slice(0, 120)}`
        );
      }
    }
  }
  log(
    `  ✓ ${added} rules seeded${failed > 0 ? `, ${failed} failed (see above)` : ""}`
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log(
    "╔══════════════════════════════════════════════════════════════╗"
  );
  console.log(
    "║  seed-aws — full frontend flow seed                          ║"
  );
  console.log(
    "╚══════════════════════════════════════════════════════════════╝"
  );
  console.log(`  endpoint : ${API}`);
  console.log(`  user     : ${EMAIL} (tenant=${TENANT})`);
  console.log(
    `  steps    : register, login` +
      (SKIP_UPLOAD ? "" : ", upload×2") +
      (SKIP_BUDGET ? "" : ", budgets×10") +
      (SKIP_RECURRING ? "" : ", recurring×5, generate") +
      (SKIP_GOALS ? "" : ", goals×3") +
      (SKIP_SINKING ? "" : ", sinking×2") +
      (SKIP_RULES ? "" : ", rules×81")
  );

  let optionalFailed = false;

  await healthCheck();
  await registerUser();
  const token = await login();

  const optional: { skip: boolean; name: string; fn: () => Promise<void> }[] = [
    { skip: SKIP_UPLOAD, name: "upload", fn: () => uploadStatements(token) },
    { skip: SKIP_BUDGET, name: "budgets", fn: () => setBudgets(token) },
    {
      skip: SKIP_RECURRING,
      name: "recurring",
      fn: async () => {
        await createRecurring(token);
        await generateRecurring(token);
      },
    },
    { skip: SKIP_GOALS, name: "goals", fn: () => createGoals(token) },
    {
      skip: SKIP_SINKING,
      name: "sinking",
      fn: () => createSinkingFunds(token),
    },
    { skip: SKIP_RULES, name: "rules", fn: () => addRulesByTenant(token) },
  ];

  for (const job of optional) {
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
  console.log(
    "── Summary ────────────────────────────────────────────────────"
  );
  console.log(`  user     : ${EMAIL}`);
  console.log(`  password : ${PASSWORD}`);
  console.log(`  tenant   : ${TENANT}`);
  console.log(`  api      : ${API}`);
  console.log(`  failures : ${optionalFailed ? "yes (see above)" : "none"}`);
  console.log("");
  console.log("  Pages now seeded:");
  console.log("  /dashboard     → 2 months of KPI data + budget actuals");
  console.log("  /transactions  → 32 categorised transactions (2 months)");
  console.log("  /budgets       → 10 category budgets with actuals");
  console.log("  /recurring     → 5 recurring templates + generated entries");
  console.log("  /forecast      → will run against seeded transactions");
  console.log("  /goals         → 3 savings goals with contributions");
  console.log("  /sinking-funds → 2 sinking funds with contributions");
  console.log("");
  console.log("  ⓘ If you uploaded, allow 30–60s for txn-loaders to ingest");
  console.log("    before opening /dashboard or /transactions.");

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
