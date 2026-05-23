"use client";
import { useRouter, usePathname } from "next/navigation";
import { useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MonthPicker } from "@/components/dashboard/month-picker";
import type { MonthYear } from "@/lib/utils";

interface CategoriesByBaseItem {
  base: string;
  categories: string[];
}

interface TransactionFiltersProps {
  period: MonthYear;
  bankFilter?: string;
  categoryFilter?: string;
  categoriesByBase: CategoriesByBaseItem[];
}

const BANKS = [
  { value: "HDFC",  label: "HDFC" },
  { value: "SBI",   label: "SBI" },
  { value: "AXIS",  label: "Axis" },
  { value: "OTHER", label: "Other" },
];

export function TransactionFilters({
  period,
  bankFilter,
  categoryFilter,
  categoriesByBase,
}: TransactionFiltersProps) {
  const router   = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  const allCategories = categoriesByBase.flatMap((g) => g.categories).sort();

  function update(key: string, value: string | null) {
    const sp = new URLSearchParams();
    sp.set("m", String(period.month));
    sp.set("y", String(period.year));
    if (key !== "bank"     && bankFilter)     sp.set("bank",     bankFilter);
    if (key !== "category" && categoryFilter) sp.set("category", categoryFilter);
    if (value) sp.set(key, value);
    startTransition(() => router.push(`${pathname}?${sp.toString()}`));
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <MonthPicker current={period} />

      <Select
        value={bankFilter ?? "__all__"}
        onValueChange={(v) => update("bank", v === "__all__" ? null : v)}
      >
        <SelectTrigger className="h-9 w-36">
          <SelectValue placeholder="All banks" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">All banks</SelectItem>
          {BANKS.map((b) => (
            <SelectItem key={b.value} value={b.value}>
              {b.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={categoryFilter ?? "__all__"}
        onValueChange={(v) => update("category", v === "__all__" ? null : v)}
      >
        <SelectTrigger className="h-9 w-44">
          <SelectValue placeholder="All categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">All categories</SelectItem>
          {allCategories.map((c) => (
            <SelectItem key={c} value={c}>
              {c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
