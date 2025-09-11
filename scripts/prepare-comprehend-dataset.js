#!/usr/bin/env node
/*
 Prepares Amazon Comprehend training/test CSVs from DynamoDB transactions.

 Usage examples:
  node scripts/prepare-comprehend-dataset.js \
    --tenant DEFAULT \
    --bucket $AWS_S3_BUCKET \
    --prefix comprehend/datasets/txns \
    --test-split 0.15

 Environment variables loaded from .env at repo root when present:
  - AWS_REGION
  - AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY (or rely on default AWS chain)
  - DYNAMO_TRANSACTION_TABLE (default: transactions)
  - AWS_S3_BUCKET (used if --bucket omitted)
*/

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const dotenv = require('dotenv');
const { S3 } = require('@aws-sdk/client-s3');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand } = require('@aws-sdk/lib-dynamodb');

// Load .env if present
try {
  dotenv.config({ path: path.join(__dirname, '..', '.env') });
} catch {}

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith('--')) {
      const key = a.replace(/^--/, '');
      const next = args[i + 1];
      if (!next || next.startsWith('--')) {
        out[key] = true;
      } else {
        out[key] = next;
        i++;
      }
    }
  }
  return out;
}

function csvEscape(value) {
  if (value == null) return '';
  const s = String(value).replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
  if (s === '') return '';
  const needsQuotes = /[",\n]/.test(s) || s.includes(',');
  const escaped = s.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

function shuffleInPlace(arr, seed) {
  // Deterministic shuffle for reproducibility when seed provided
  let rand = Math.random;
  if (seed) {
    let h = crypto.createHash('sha256').update(seed).digest();
    let idx = 0;
    rand = () => {
      if (idx + 4 > h.length) h = crypto.createHash('sha256').update(h).digest(), idx = 0;
      const x = h.readUInt32LE(idx) / 0xffffffff; idx += 4; return x;
    };
  }
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

async function fetchAllTransactionsByTenant({ ddbDoc, tableName, tenantId, pageLimit }) {
  const items = [];
  let ExclusiveStartKey;
  do {
    const res = await ddbDoc.send(new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: 'tenantId = :tenantId',
      FilterExpression: 'attribute_exists(description) AND attribute_exists(category) AND #cat <> :def AND description <> :none',
      ExpressionAttributeNames: { '#cat': 'category' },
      // DEFAULT and NONE are app-level sentinels
      // NOTE: description is kept short downstream
      ProjectionExpression: 'tenantId, transactionId, description, category',
      ExpressionAttributeValues: {
        ':tenantId': tenantId,
        ':def': 'DEFAULT',
        ':none': 'NONE',
      },
      ExclusiveStartKey,
      Limit: pageLimit && Number.isFinite(pageLimit) ? pageLimit : undefined,
    }));
    if (res.Items) items.push(...res.Items);
    ExclusiveStartKey = res.LastEvaluatedKey;
    if (pageLimit) break; // pageLimit acts as per-page quick sample when set
  } while (ExclusiveStartKey);
  return items;
}

async function fetchTransactionsWithDescriptions({ ddbDoc, tableName, tenantId, pageLimit }) {
  const items = [];
  let ExclusiveStartKey;
  do {
    const res = await ddbDoc.send(new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: 'tenantId = :tenantId',
      FilterExpression: 'attribute_exists(description) AND description <> :none',
      ProjectionExpression: 'tenantId, transactionId, description',
      ExpressionAttributeValues: {
        ':tenantId': tenantId,
        ':none': 'NONE',
      },
      ExclusiveStartKey,
      Limit: pageLimit && Number.isFinite(pageLimit) ? pageLimit : undefined,
    }));
    if (res.Items) items.push(...res.Items);
    ExclusiveStartKey = res.LastEvaluatedKey;
    if (pageLimit) break;
  } while (ExclusiveStartKey);
  return items;
}

async function fetchRules({ ddbDoc, tableName, tenantId }) {
  if (!tableName) return {};
  async function queryTenant(tid) {
    const res = await ddbDoc.send(new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: 'tenantId = :tid',
      ProjectionExpression: 'keyword, category',
      ExpressionAttributeValues: { ':tid': tid },
    }));
    const map = {};
    for (const it of res.Items || []) {
      if (!it.keyword || !it.category) continue;
      map[String(it.keyword).toLowerCase()] = String(it.category);
    }
    return map;
  }
  const specific = await queryTenant(tenantId);
  const global = await queryTenant('DEFAULT');
  return { ...global, ...specific }; // tenant overrides default
}

// Minimal built-in defaults mirroring @nlp-tagger rules
const builtinKeywordRules = {
  zerodha: 'SAVINGS',
  rtgs: 'INCOME',
  neft: 'INCOME',
  imps: 'EXPENSES',
  upi: 'EXPENSES',
  achdr: 'EXPENSES',
  achcr: 'INCOME',
  ach: 'EXPENSES',
  billpay: 'EXPENSES',
  bill: 'EXPENSES',
  credit: 'INCOME',
  debit: 'EXPENSES',
  salary: 'INCOME',
  bulk: 'INCOME',
  interest: 'INCOME',
  rd: 'SAVINGS',
  installment: 'SAVINGS',
  funds: 'EXPENSES',
  transfer: 'EXPENSES',
  tpt: 'EXPENSES',
  gst: 'EXPENSES',
  rent: 'EXPENSES',
  investment: 'SAVINGS',
  utilities: 'EXPENSES',
};

function categorizeByRules(description, rules) {
  const text = (description || '').toLowerCase();
  if (!text) return 'DEFAULT';
  // Special case
  if (/zerodha/i.test(text)) return 'SAVINGS';
  // UPI income nuance
  const upiMentioned = /(\bupi\b|upi:\/\/)/i.test(text);
  if (upiMentioned) {
    const splitOrSettle = /(splitwise|\bsplit\b|settle|settled|settlement|settling)/i.test(text);
    if (splitOrSettle) {
      const creditSignals = /(\b(received|credit|cr)\b|\bto\s+account\b)/i.test(text);
      if (creditSignals) return 'INCOME';
    }
  }
  const keys = Object.keys(rules || {});
  if (keys.length) {
    const pattern = new RegExp(`(${keys.map((k) => k.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")).join('|')})`, 'i');
    const m = text.match(pattern);
    if (m && m[1]) {
      const found = m[1].toLowerCase();
      const cat = rules[found];
      if (cat) return cat;
    }
  }
  // Fallbacks
  if (/(refund|reversal|cashback|reimb(ursement)?)/i.test(text)) return 'INCOME';
  if (/(mutual\s*fund|\bmf\b|\bsip\b|\bnps\b|\bppf\b|\bfd\b|\brd\b|investment|invest\b)/i.test(text)) return 'SAVINGS';
  if (/(charge|fee|penalty|fine|purchase|payment|\bpos\b|card\b|\batm\b|uber|ola|swiggy|zomato|amazon|flipkart|myntra|electricity|\bpower\b|\bgas\b|\bwater\b|broadband|internet|dth|mobile\s*recharge)/i.test(text)) return 'EXPENSES';
  return 'DEFAULT';
}

async function main() {
  const args = parseArgs();

  const tenant = args.tenant || process.env.TENANT_ID || 'DEFAULT';
  const region = process.env.AWS_REGION || args.region || 'us-east-1';
  const tableName = process.env.DYNAMO_TRANSACTION_TABLE || args.table || 'transactions';
  const bucket = args.bucket || process.env.AWS_S3_BUCKET;
  const prefix = args.prefix || 'comprehend/datasets/txns';
  const trainKey = args['train-key'] || `${prefix}/training.csv`;
  const testKey = args['test-key'] || `${prefix}/test.csv`;
  const testSplit = Math.max(0, Math.min(0.9, parseFloat(args['test-split'] ?? '0'))); // 0..0.9
  const localOutDir = args['out-dir'] || 'artifacts';
  const noUpload = !!args['no-upload'];
  const seed = args.seed || 'seed';
  const sampleLimit = args.limit ? parseInt(args.limit, 10) : undefined;
  const useRules = args['use-rules'] !== 'false'; // default true
  const rulesTable = args['rules-table'] || process.env.DYNAMO_CATEGORY_RULES_TABLE || process.env.DYNAMO_TRANSACTION_CATEGORY_TABLE;

  if (!noUpload && !bucket) {
    console.error('Error: --bucket or AWS_S3_BUCKET is required unless --no-upload is set');
    process.exit(1);
  }

  console.log('Preparing dataset with config:', {
    tenant, region, tableName, bucket: bucket || '(no-upload)', prefix, testSplit,
  });

  const ddb = new DynamoDBClient({ region });
  const ddbDoc = DynamoDBDocumentClient.from(ddb);

  const s3 = new S3({ region });

  // 1) Load labeled data first
  const raw = await fetchAllTransactionsByTenant({
    ddbDoc,
    tableName,
    tenantId: tenant,
    pageLimit: sampleLimit,
  });
  console.log(`Fetched ${raw.length} labeled transactions for tenant ${tenant}`);

  // 2) Transform into [label, text]
  let rows = raw
    .map((it) => ({
      label: String(it.category || '').trim(),
      text: String(it.description || '').trim(),
    }))
    .filter((r) => r.label && r.label !== 'DEFAULT' && r.text && r.text !== 'NONE')
    .map((r) => ({
      label: r.label,
      text: r.text.length > 5000 ? r.text.slice(0, 5000) : r.text,
    }));

  // 2b) Fallback: build labels from rules if none found
  if (rows.length === 0 && useRules) {
    console.log('No labeled rows found; falling back to rules-based labeling...');
    const [txns, ruleMapFromTable] = await Promise.all([
      fetchTransactionsWithDescriptions({ ddbDoc, tableName, tenantId: tenant, pageLimit: sampleLimit }),
      fetchRules({ ddbDoc, tableName: rulesTable, tenantId: tenant }),
    ]);
    const rules = { ...builtinKeywordRules, ...ruleMapFromTable };
    console.log(`Fetched ${txns.length} transactions with descriptions; rules loaded: ${Object.keys(rules).length}`);
    rows = txns
      .map((it) => ({
        label: categorizeByRules(it.description, rules),
        text: String(it.description || '').trim(),
      }))
      .filter((r) => r.label && r.label !== 'DEFAULT' && r.text && r.text !== 'NONE')
      .map((r) => ({ label: r.label, text: r.text.length > 5000 ? r.text.slice(0, 5000) : r.text }));
  }

  if (rows.length === 0) {
    console.error('No eligible rows found after rules fallback. Ensure transactions exist and/or add rules.');
    process.exit(1);
  }

  // 3) Shuffle and split
  shuffleInPlace(rows, seed);
  const testCount = Math.floor(rows.length * testSplit);
  const test = rows.slice(0, testCount);
  const train = rows.slice(testCount);

  // 4) Build CSV content (CLASS,TEXT)
  const buildCsv = (arr) => {
    const header = 'CLASS,TEXT\n';
    const lines = arr.map(({ label, text }) => `${csvEscape(label)},${csvEscape(text)}`).join('\n');
    return header + lines + '\n';
  };
  const trainCsv = buildCsv(train);
  const testCsv = buildCsv(test);

  // 5) Write local artifacts
  fs.mkdirSync(localOutDir, { recursive: true });
  const localTrain = path.join(localOutDir, 'training.csv');
  fs.writeFileSync(localTrain, trainCsv, 'utf8');
  console.log(`Wrote ${train.length} rows to ${localTrain}`);
  let localTest;
  if (test.length > 0) {
    localTest = path.join(localOutDir, 'test.csv');
    fs.writeFileSync(localTest, testCsv, 'utf8');
    console.log(`Wrote ${test.length} rows to ${localTest}`);
  }

  // 6) Upload to S3 if requested
  if (!noUpload && bucket) {
    await s3.putObject({ Bucket: bucket, Key: trainKey, Body: trainCsv, ContentType: 'text/csv' });
    console.log(`Uploaded training CSV to s3://${bucket}/${trainKey}`);
    if (test.length > 0) {
      await s3.putObject({ Bucket: bucket, Key: testKey, Body: testCsv, ContentType: 'text/csv' });
      console.log(`Uploaded test CSV to s3://${bucket}/${testKey}`);
    }
  }

  console.log('Done.');
}

main().catch((err) => {
  console.error('Failed to prepare dataset:', err);
  process.exit(1);
});
