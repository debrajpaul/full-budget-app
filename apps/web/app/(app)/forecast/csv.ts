import type { ForecastMonthQuery } from "@api-client";

type ForecastDay = ForecastMonthQuery["forecastMonth"]["days"][number];

export function buildForecastCsv(days: ForecastDay[]): string {
  const header = "date,inflow,outflow,net,runningBalance";
  const rows = days.map(
    (d) =>
      `${d.date},${d.inflow},${d.outflow},${d.net},${d.runningBalance ?? ""}`
  );
  return [header, ...rows].join("\n");
}

export function triggerCsvDownload(
  days: ForecastDay[],
  year: number,
  month: number
) {
  const csv = buildForecastCsv(days);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `forecast-${year}-${String(month).padStart(2, "0")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
