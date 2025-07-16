import mongoose from 'mongoose';

const BudgetItemSchema = new mongoose.Schema({
  title: { type: String, required: true },
  duration: Number,
  monthly: { type: Number, required: true },
  annual: Number,
  assign: Number,
  flag: String,
  source: String,
  note: String,
}, { timestamps: true });

export const BudgetItem = mongoose.models.BudgetItem || mongoose.model('BudgetItem', BudgetItemSchema);