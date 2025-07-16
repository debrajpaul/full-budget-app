import csv from 'csv-parser';
import { BudgetItem } from '@db/models';
import { Readable } from 'node:stream';

export interface BudgetRow {
  title: string;
  duration: number | null;
  monthly: number;
  annual: number | null;
  assign?: number | null;
  flag?: string | null;
  source?: string | null;
  note?: string | null;
}

export const syncFromCsv = async (rows: BudgetRow[]) => {
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    if (!row.title || row.monthly == null) {
      skipped++;
      continue;
    }

    const existing = await BudgetItem.findOne({ title: row.title });

    if (existing) {
      await BudgetItem.updateOne({ title: row.title }, row);
      updated++;
    } else {
      await BudgetItem.create(row);
      created++;
    }
  }

  return {
    created,
    updated,
    skipped,
    total: rows.length,
  };
};

export const parseCsvStream = (stream: Readable): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const results: any[] = [];

    stream
      .pipe(csv())
      .on('data', (data: any) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

export const normalizeRow = (row: any): any => {
  const parseMoney = (val: string) =>
    val ? parseFloat(val.replace(/[₹,]/g, '').trim()) : null;

  return {
    title: row.title?.trim(),
    duration: row.duration ? parseInt(row.duration) : null,
    monthly: parseMoney(row.monthly_revenue),
    annual: parseMoney(row.annual_revenue),
    assign: parseMoney(row.money_assign),
    flag: row.flag?.trim(),
    source: row.source_of_money?.trim(),
    note: row.note?.trim()
  };
}