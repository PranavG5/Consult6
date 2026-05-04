export interface DedupResult {
  rows: Record<string, string>[];
  removedExact: number;
  removedNearDupe: number;
  removedSummary: number;
}

function toNum(v: string): number | null {
  if (!v || v.trim() === "") return null;
  const n = parseFloat(v.replace(/[,$% ]/g, ""));
  return isNaN(n) ? null : n;
}

function isNumericColumn(colName: string, rows: Record<string, string>[]): boolean {
  const vals = rows.map(r => r[colName] ?? "").filter(v => v !== "");
  if (!vals.length) return false;
  const numCount = vals.filter(v => toNum(v) !== null).length;
  return numCount > vals.length / 2;
}

function withinPercent(a: number, b: number, pct: number): boolean {
  if (a === 0 && b === 0) return true;
  const avg = (Math.abs(a) + Math.abs(b)) / 2;
  if (avg === 0) return true;
  return Math.abs(a - b) / avg <= pct / 100;
}

export function deduplicateCSV(
  rows: Record<string, string>[],
  headers: string[]
): DedupResult {
  let removedExact = 0;
  let removedNearDupe = 0;
  let removedSummary = 0;

  // Step 1: Exact duplicate removal
  const seen = new Set<string>();
  const afterExact: Record<string, string>[] = [];
  for (const row of rows) {
    const key = headers.map(h => (row[h] ?? "").trim().toLowerCase()).join("|");
    if (seen.has(key)) {
      removedExact++;
    } else {
      seen.add(key);
      afterExact.push(row);
    }
  }

  // Step 2: Near-duplicate detection
  // Find a period column
  const periodKeywords = ["month", "year", "period", "quarter", "date"];
  let periodCol: string | null = null;
  for (const h of headers) {
    if (periodKeywords.some(kw => h.toLowerCase().includes(kw))) {
      periodCol = h;
      break;
    }
  }

  let afterNearDupe: Record<string, string>[];

  if (periodCol) {
    const numericCols = headers.filter(h => h !== periodCol && isNumericColumn(h, afterExact));
    // Group by period value
    const groups = new Map<string, Record<string, string>[]>();
    for (const row of afterExact) {
      const periodVal = (row[periodCol] ?? "").trim().toLowerCase();
      if (!groups.has(periodVal)) groups.set(periodVal, []);
      groups.get(periodVal)!.push(row);
    }

    afterNearDupe = [];
    for (const [, group] of groups) {
      if (group.length <= 1) {
        afterNearDupe.push(...group);
        continue;
      }
      // Check if all rows in the group are near-dupes of each other
      // Compare each row to the last row
      const last = group[group.length - 1];
      const toKeep: Record<string, string>[] = [last];
      for (let i = 0; i < group.length - 1; i++) {
        const row = group[i];
        const isNearDupe = numericCols.every(col => {
          const aVal = toNum(row[col] ?? "");
          const bVal = toNum(last[col] ?? "");
          if (aVal === null || bVal === null) return true; // treat missing as same
          return withinPercent(aVal, bVal, 2);
        });
        if (isNearDupe) {
          removedNearDupe++;
        } else {
          toKeep.unshift(row); // keep earlier rows that differ significantly
        }
      }
      afterNearDupe.push(...toKeep);
    }
  } else {
    afterNearDupe = afterExact;
  }

  // Step 3: Summary row removal
  const SUMMARY_TERMS = ["full year", "annual", "total", "summary", "ytd"];
  const textCols = headers.filter(h => !isNumericColumn(h, afterNearDupe));

  const afterSummary: Record<string, string>[] = [];
  for (const row of afterNearDupe) {
    let isSummary = false;
    for (const col of textCols) {
      const val = (row[col] ?? "").toLowerCase().trim();
      if (SUMMARY_TERMS.some(term => val === term || val.includes(term))) {
        isSummary = true;
        break;
      }
    }
    if (isSummary) {
      removedSummary++;
    } else {
      afterSummary.push(row);
    }
  }

  return {
    rows: afterSummary,
    removedExact,
    removedNearDupe,
    removedSummary,
  };
}
