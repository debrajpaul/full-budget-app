import { syncFromCsv } from '@sheet-service/syncFromCsv';
import fs from 'node:fs'
import path from 'node:path'
import { BudgetItem } from '@db/models';

export const budgetResolvers = {
  Query: {
    getAllBudgets: async () => {
      return await BudgetItem.find().sort({ createdAt: -1 });
    }
  },
  Mutation: {
    syncBudgetFromCsv: async (_: any, { data }: any) => {
      const result = await syncFromCsv(data);
      return result;
    },
    uploadBudgetCsv: async (_: any, { file }: { file: File }) => {
      try {
        const fileArrayBuffer = await file.arrayBuffer()
        await fs.promises.writeFile(
          path.join(__dirname, file.name),
          Buffer.from(fileArrayBuffer)
        )
        return true
      } catch {
        return false
      }
    }
  }
};
