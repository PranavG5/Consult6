const PREFIXES = [
  "expenses - ",
  "expenses: ",
  "expense - ",
  "expense: ",
  "revenue - ",
  "revenue: ",
];

const FILLER_WORDS = ["total", "net", "gross", "the", "our", "my"];

export function normalizeColumnName(raw: string): string {
  // Step 1: Lowercase
  let s = raw.toLowerCase();

  // Step 2: Remove known prefixes
  for (const prefix of PREFIXES) {
    if (s.startsWith(prefix)) {
      s = s.slice(prefix.length);
      break;
    }
  }

  // Step 3: Replace separators with space
  s = s.replace(/[_\-/]/g, " ").replace(/ & /g, " ").replace(/ and /g, " ");

  // Step 4: Collapse spaces and trim
  s = s.replace(/\s+/g, " ").trim();

  // Step 5: Remove filler words (only if they're not the entire string)
  for (const word of FILLER_WORDS) {
    const regex = new RegExp(`(?<=^|\\s)${word}(?=\\s|$)`, "g");
    const candidate = s.replace(regex, " ").replace(/\s+/g, " ").trim();
    if (candidate.length > 0) {
      s = candidate;
    }
  }

  // Step 6: Collapse spaces and trim again
  s = s.replace(/\s+/g, " ").trim();

  return s;
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) => {
    const row = new Array(n + 1).fill(0);
    row[0] = i;
    return row;
  });
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function sharedCharRatio(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  const aChars = new Map<string, number>();
  for (const c of a) aChars.set(c, (aChars.get(c) ?? 0) + 1);
  let shared = 0;
  const bChars = new Map<string, number>();
  for (const c of b) bChars.set(c, (bChars.get(c) ?? 0) + 1);
  for (const [c, countA] of aChars) {
    const countB = bChars.get(c) ?? 0;
    shared += Math.min(countA, countB);
  }
  return shared / maxLen;
}

export function fuzzyMatchColumns(
  newColumns: string[],
  existingCanonicals: string[]
): Map<string, string> {
  const result = new Map<string, string>();

  for (const rawNew of newColumns) {
    const normalizedNew = normalizeColumnName(rawNew);

    // Exact match first
    if (existingCanonicals.includes(normalizedNew)) {
      result.set(rawNew, normalizedNew);
      continue;
    }

    // Fuzzy match
    let bestCanonical: string | null = null;
    let bestDist = Infinity;

    for (const canonical of existingCanonicals) {
      const dist = levenshtein(normalizedNew, canonical);
      if (dist < bestDist) {
        bestDist = dist;
        bestCanonical = canonical;
      }
    }

    if (
      bestCanonical !== null &&
      bestDist <= 2 &&
      sharedCharRatio(normalizedNew, bestCanonical) >= 0.6
    ) {
      result.set(rawNew, bestCanonical);
    } else {
      result.set(rawNew, normalizedNew);
    }
  }

  return result;
}
