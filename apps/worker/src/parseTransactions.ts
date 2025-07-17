import pdf from 'pdf-parse';
import { parse } from 'csv-parse/sync';

export async function parseTransactions(buffer: Buffer, bank: string, userId: string) {
  switch (bank) {
    case 'sbi': {
      const rows = parse(buffer, { columns: true, skip_empty_lines: true });
      return rows.map((row: any, idx: number) => ({
        userId,
        transactionId: `${userId}-sbi-${idx}`,
        date: row.Date,
        amount: parseFloat(row.Amount),
        description: row.Description,
      }));
    }

    case 'hdfc': {
      const pdfData = await pdf(buffer);
  const text = pdfData.text;
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  console.log(`📄 HDFC PDF contains ${lines.length} lines`);

  const txns = [];
  const txnLineRegex = /^(\d{2}\/\d{2}\/\d{2}).*?([\d,]+\.\d{2}).*?([\d,]+\.\d{2})/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const match = line.match(txnLineRegex);
    if (!match) continue;

    const [, dateRaw, amtRaw, balanceRaw] = match;
    const date = formatDate(dateRaw);
    const amount = parseFloat(amtRaw.replace(/,/g, ''));
    const balance = parseFloat(balanceRaw.replace(/,/g, ''));

    // Skip if parsing failed
    if (isNaN(amount) || isNaN(balance)) continue;

    const isDebit = /DR|debit/i.test(line);
    const signedAmount = isDebit ? -amount : amount;

    txns.push({
      userId,
      transactionId: `${userId}-${date.replace(/-/g, '')}-${txns.length}`,
      date,
      amount: signedAmount,
      balance,
      description: line
        .replace(dateRaw, '')
        .replace(amtRaw, '')
        .replace(balanceRaw, '')
        .replace(/\b(DR|CR)\b/i, '')
        .trim(),
    });
  }

  console.log(`✅ Parsed ${txns.length} transactions from HDFC PDF`);
  if (txns[0]) console.log('✅ Sample transaction:', txns[0]);

  return txns;

    }

    default:
      console.warn(`No parser implemented for bank: ${bank}`);
      return [];
  }
}

function formatDate(d: string): string {
  const [dd, mm, yy] = d.split('/');
  const fullYear = Number(yy) < 50 ? `20${yy}` : `19${yy}`;
  return `${fullYear}-${mm}-${dd}`;
}
