// Treasurer trajectory helpers - pure functions shared by the dashboard UI and
// the insight route. Given a profile's tracked metrics, they identify which
// series represent the cash balance, income, and expenses, then derive the
// numbers a club treasurer actually reports on: current balance, runway, net
// cash flow per period, and a simple next-period projection.

export type MetricRole = "balance" | "income" | "expense";
export type MetricRoles = Partial<Record<MetricRole, string>>;

// Keyword signals for auto-detecting each role from a (canonical) metric name.
// Ordered loosely by specificity; scoring below prefers "total"/"net" columns.
const ROLE_KEYWORDS: Record<MetricRole, string[]> = {
  balance: ["cash on hand", "cash balance", "bank balance", "account balance", "ending balance", "balance", "cash", "bank", "reserve", "funds available", "checking", "savings", "treasury"],
  income: ["total income", "total revenue", "income", "revenue", "dues", "fundraising", "donations", "donation", "sponsorship", "sponsor", "deposits", "inflow", "receipts", "sales", "grants"],
  expense: ["total expenses", "total spending", "expenses", "expense", "spending", "spend", "costs", "cost", "outflow", "withdrawals", "payments", "disbursements"],
};

// Words that should NOT be read as an expense even though they contain a stem
// (e.g. "net income" is income, not an expense).
const EXPENSE_EXCLUDE = ["income", "revenue", "net income"];

function norm(s: string): string {
  return s.toLowerCase().replace(/[_\-/]+/g, " ").replace(/\s+/g, " ").trim();
}

function scoreFor(role: MetricRole, metricName: string): number {
  const name = norm(metricName);
  if (role === "expense" && EXPENSE_EXCLUDE.some(x => name.includes(x))) return 0;
  let best = 0;
  ROLE_KEYWORDS[role].forEach((kw, idx) => {
    if (name.includes(kw)) {
      // Earlier (more specific) keywords score higher; exact match beats substring.
      let s = ROLE_KEYWORDS[role].length - idx;
      if (name === kw) s += 5;
      if (name.includes("total") || name.includes("net")) s += 2;
      best = Math.max(best, s);
    }
  });
  return best;
}

// Best-guess role assignment. Each role gets at most one metric, and a metric
// is assigned to at most one role (its strongest).
export function detectRoles(metricNames: string[]): MetricRoles {
  const roles: MetricRole[] = ["balance", "income", "expense"];
  const candidates: { role: MetricRole; name: string; score: number }[] = [];
  for (const role of roles) {
    for (const name of metricNames) {
      const score = scoreFor(role, name);
      if (score > 0) candidates.push({ role, name, score });
    }
  }
  candidates.sort((a, b) => b.score - a.score);

  const result: MetricRoles = {};
  const usedNames = new Set<string>();
  const usedRoles = new Set<MetricRole>();
  for (const c of candidates) {
    if (usedRoles.has(c.role) || usedNames.has(c.name)) continue;
    result[c.role] = c.name;
    usedRoles.add(c.role);
    usedNames.add(c.name);
  }
  return result;
}

// Only keep stored roles that still point at a metric that exists.
export function sanitizeRoles(roles: MetricRoles, metricNames: string[]): MetricRoles {
  const out: MetricRoles = {};
  (["balance", "income", "expense"] as MetricRole[]).forEach(r => {
    const v = roles[r];
    if (v && metricNames.includes(v)) out[r] = v;
  });
  return out;
}

export interface TreasurySummary {
  unit: "month" | "quarter" | "year" | "period";
  balance: number | null;
  balancePeriod: string | null;
  balancePrev: number | null;
  balanceChange: number | null;
  balanceChangePct: number | null;
  balanceSeries: (number | null)[] | null;
  incomeSeries: (number | null)[] | null;
  expenseSeries: (number | null)[] | null;
  netFlowSeries: (number | null)[];
  avgNetFlow: number | null;       // average of recent net flows (signed)
  burnRate: number | null;         // positive number when net flow is negative
  runway: number | null;           // periods of funds remaining at current burn
  projectedBalance: number | null; // balance + avgNetFlow (next period)
  hasData: boolean;
}

function lastNonNull(arr: (number | null)[]): { v: number; i: number } | null {
  for (let i = arr.length - 1; i >= 0; i--) {
    const v = arr[i];
    if (v !== null && v !== undefined && !isNaN(v)) return { v, i };
  }
  return null;
}

function mean(nums: number[]): number | null {
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

const UNIT_FROM_TYPE: Record<string, TreasurySummary["unit"]> = {
  monthly: "month", quarterly: "quarter", annual: "year",
};

export function computeTreasury(
  periods: string[],
  seriesMap: Record<string, Record<string, number>>,
  roles: MetricRoles,
  periodTypes: Record<string, string> = {}
): TreasurySummary {
  // Most common period type → human unit for the runway label.
  const counts: Record<string, number> = {};
  for (const p of periods) { const t = periodTypes[p]; if (t) counts[t] = (counts[t] ?? 0) + 1; }
  const dominantType = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
  const unit = (dominantType && UNIT_FROM_TYPE[dominantType]) || "period";

  const seriesFor = (name?: string): (number | null)[] | null =>
    name && seriesMap[name] ? periods.map(p => seriesMap[name][p] ?? null) : null;

  const balanceSeries = seriesFor(roles.balance);
  const incomeSeries = seriesFor(roles.income);
  const expenseSeries = seriesFor(roles.expense);

  // Net flow per period: prefer income − expense; otherwise fall back to the
  // period-over-period change in balance (first period has no prior → null).
  let netFlowSeries: (number | null)[];
  if (incomeSeries || expenseSeries) {
    netFlowSeries = periods.map((_, i) => {
      const inc = incomeSeries?.[i];
      const exp = expenseSeries?.[i];
      if ((inc === null || inc === undefined) && (exp === null || exp === undefined)) return null;
      return (inc ?? 0) - (exp ?? 0);
    });
  } else if (balanceSeries) {
    netFlowSeries = balanceSeries.map((v, i) => {
      if (i === 0) return null;
      const prev = balanceSeries[i - 1];
      if (v === null || v === undefined || prev === null || prev === undefined) return null;
      return v - prev;
    });
  } else {
    netFlowSeries = periods.map(() => null);
  }

  const latestBal = balanceSeries ? lastNonNull(balanceSeries) : null;
  // Balance immediately prior to the latest populated one.
  let prevBal: number | null = null;
  if (balanceSeries && latestBal) {
    for (let i = latestBal.i - 1; i >= 0; i--) {
      const v = balanceSeries[i];
      if (v !== null && v !== undefined) { prevBal = v; break; }
    }
  }
  const balance = latestBal?.v ?? null;
  const balanceChange = balance !== null && prevBal !== null ? balance - prevBal : null;
  const balanceChangePct = balanceChange !== null && prevBal !== null && prevBal !== 0
    ? (balanceChange / Math.abs(prevBal)) * 100 : null;

  // Recent net-flow trend = mean of the last up-to-3 populated net flows.
  const recentNet = netFlowSeries.filter((v): v is number => v !== null && v !== undefined).slice(-3);
  const avgNetFlow = mean(recentNet);
  const burnRate = avgNetFlow !== null && avgNetFlow < 0 ? -avgNetFlow : null;
  const runway = balance !== null && burnRate !== null && burnRate > 0
    ? Math.round((balance / burnRate) * 10) / 10 : null;
  const projectedBalance = balance !== null && avgNetFlow !== null ? balance + avgNetFlow : null;

  return {
    unit,
    balance,
    balancePeriod: latestBal ? periods[latestBal.i] : null,
    balancePrev: prevBal,
    balanceChange,
    balanceChangePct,
    balanceSeries,
    incomeSeries,
    expenseSeries,
    netFlowSeries,
    avgNetFlow,
    burnRate,
    runway,
    projectedBalance,
    hasData: balance !== null || recentNet.length > 0,
  };
}
