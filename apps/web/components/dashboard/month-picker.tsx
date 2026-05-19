"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { formatMonthYear, stepMonth, type MonthYear } from "@/lib/utils";

interface MonthPickerProps {
  current: MonthYear;
}

function hrefFor({ month, year }: MonthYear) {
  return `/dashboard?m=${month}&y=${year}`;
}

export function MonthPicker({ current }: MonthPickerProps) {
  const router = useRouter();
  const prev = stepMonth(current, -1);
  const next = stepMonth(current, +1);
  const thisMonth = (() => {
    const d = new Date();
    return { month: d.getMonth() + 1, year: d.getFullYear() };
  })();
  const isCurrent =
    current.month === thisMonth.month && current.year === thisMonth.year;

  return (
    <div className="flex items-center gap-1">
      <Button asChild variant="ghost" size="icon" aria-label="Previous month">
        <Link href={hrefFor(prev)} prefetch={false}>
          <ChevronLeft />
        </Link>
      </Button>

      <div className="min-w-[10rem] text-center text-sm font-medium tabular-nums">
        {formatMonthYear(current.month, current.year)}
      </div>

      <Button asChild variant="ghost" size="icon" aria-label="Next month">
        <Link href={hrefFor(next)} prefetch={false}>
          <ChevronRight />
        </Link>
      </Button>

      {!isCurrent && (
        <Button
          variant="outline"
          size="sm"
          className="ml-2"
          onClick={() => router.push(hrefFor(thisMonth))}
        >
          Today
        </Button>
      )}
    </div>
  );
}
