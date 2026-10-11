// utils/exportCsv.ts — download an array of flat objects as a CSV file

function cell(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function exportCsv(rows: object[], filename = "export.csv"): void {
  if (!rows.length) return;
  const cols = Object.keys(rows[0]);
  const lines = [
    cols.join(","),
    ...rows.map((row) => cols.map((c) => cell((row as Record<string, unknown>)[c])).join(",")),
  ];
  // BOM so Excel opens Amharic market names correctly
  const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
