import Link from "next/link";
import { createAnonClient } from "@/lib/supabase-anon";
import type { AnalysisResult, Flag, Recommendation, IndustryComparison, RiskMatrixItem } from "@/lib/generateReport";

interface SharedReport {
  org_name: string;
  mode: string;
  created_at: string;
  analysis_data: AnalysisResult;
}

async function fetchReport(token: string): Promise<SharedReport | null> {
  const supabase = createAnonClient();

  const { data: share } = await supabase
    .from("shared_reports")
    .select("id, analysis_id, view_count")
    .eq("share_token", token)
    .is("revoked_at", null)
    .single();

  if (!share) return null;

  const { data: analysis } = await supabase
    .from("analysis_history")
    .select("org_name, mode, created_at, analysis_data")
    .eq("id", share.analysis_id)
    .single();

  if (!analysis) return null;

  // Increment view_count fire-and-forget
  supabase
    .from("shared_reports")
    .update({ view_count: (share.view_count ?? 0) + 1 })
    .eq("id", share.id)
    .then(() => {});

  return {
    org_name: analysis.org_name,
    mode: analysis.mode,
    created_at: analysis.created_at,
    analysis_data: analysis.analysis_data,
  };
}

const sevStyle: Record<string, { bg: string; border: string; labelBg: string; label: string }> = {
  critical: { bg: "#2d1010", border: "#c0392b", labelBg: "#c0392b", label: "CRITICAL" },
  warning:  { bg: "#2a1d00", border: "#CC5500", labelBg: "#CC5500", label: "WARNING" },
  info:     { bg: "#1a1a2e", border: "#2980b9", labelBg: "#2980b9", label: "INFO" },
};

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const report = await fetchReport(token);
  if (!report) return { title: "Report Not Available | Consult6" };
  return { title: `${report.org_name || "Financial Report"} | Consult6` };
}

export default async function SharedReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const report = await fetchReport(token);

  if (!report) {
    return (
      <div style={{ minHeight: "100vh", background: "#1e1e1e", color: "#f0f0f0", fontFamily: "system-ui, -apple-system, sans-serif", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px", textAlign: "center" }}>
        <div style={{ width: 64, height: 64, borderRadius: 16, background: "#2d2d2d", border: "1px solid #484848", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, marginBottom: 24 }}>🔒</div>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 12px" }}>The owner has removed this report</h1>
        <p style={{ fontSize: 15, color: "#666", margin: "0 0 32px", lineHeight: 1.6, maxWidth: 400 }}>The owner of this report has removed its public webpage. The link is no longer active.</p>
        <Link href="/" style={{ background: "#CC5500", color: "#fff", fontSize: 15, fontWeight: 700, textDecoration: "none", padding: "13px 28px", borderRadius: 9 }}>
          Analyze your own financials →
        </Link>
      </div>
    );
  }

  const { org_name, mode, created_at, analysis_data: a } = report;
  const date = new Date(created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  return (
    <div style={{ minHeight: "100vh", background: "#1e1e1e", color: "#f0f0f0", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* Top banner */}
      <div style={{ background: "#161616", borderBottom: "1px solid #2d2d2d", padding: "0 24px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <div style={{ width: 28, height: 28, background: "#CC5500", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13, color: "#fff", flexShrink: 0 }}>6</div>
          <span style={{ fontWeight: 700, fontSize: 14, color: "#f0f0f0", flexShrink: 0 }}>Consult6</span>
          <span style={{ color: "#484848", margin: "0 6px", flexShrink: 0 }}>|</span>
          <span style={{ fontSize: 13, color: "#888", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Shared report · {org_name || "Financial Report"}</span>
        </div>
        <Link href="/auth/signup" style={{ background: "#CC5500", color: "#fff", fontSize: 13, fontWeight: 700, textDecoration: "none", padding: "7px 16px", borderRadius: 7, whiteSpace: "nowrap", marginLeft: 12 }}>
          Analyze your own →
        </Link>
      </div>

      {/* Report */}
      <main style={{ maxWidth: 760, margin: "0 auto", padding: "40px 20px 80px" }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <span style={{ background: mode === "advanced" ? "#CC5500" : "#484848", color: mode === "advanced" ? "#fff" : "#aaa", fontSize: 10, fontWeight: 800, padding: "3px 9px", borderRadius: 20, letterSpacing: 0.5 }}>
              {mode === "advanced" ? "ADVANCED" : "BASIC"}
            </span>
            <span style={{ fontSize: 13, color: "#555" }}>{date}</span>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "#f0f0f0", margin: "0 0 4px", letterSpacing: -0.5 }}>{org_name || "Financial Report"}</h1>
          <p style={{ fontSize: 13, color: "#555", margin: 0 }}>Generated by Consult6</p>
        </div>

        {/* Summary */}
        <div style={{ background: "#232323", border: "1px solid #333", borderRadius: 10, padding: "16px 18px", marginBottom: 20 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#CC5500", letterSpacing: 1, marginBottom: 8 }}>EXECUTIVE SUMMARY</p>
          <p style={{ fontSize: 14, color: "#e0e0e0", lineHeight: 1.6, margin: 0 }}>{a.summary}</p>
        </div>

        {/* Flags */}
        {a.flags?.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#888", letterSpacing: 1, marginBottom: 10 }}>WHAT WE FOUND</p>
            {a.flags.map((flag: Flag, i: number) => {
              const s = sevStyle[flag.severity] ?? sevStyle.info;
              return (
                <div key={i} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 8, padding: "12px 14px", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ background: s.labelBg, color: "#fff", fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 3 }}>{s.label}</span>
                    <span style={{ fontWeight: 700, fontSize: 13, color: "#f0f0f0" }}>{flag.title}</span>
                  </div>
                  <p style={{ fontSize: 13, color: "#ccc", margin: 0, lineHeight: 1.5 }}>{flag.description}</p>
                  {flag.metric && <p style={{ fontSize: 12, color: s.border, margin: "6px 0 0", fontWeight: 600 }}>Metric: {flag.metric}</p>}
                </div>
              );
            })}
          </div>
        )}

        {/* Recommendations */}
        {a.recommendations?.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#888", letterSpacing: 1, marginBottom: 10 }}>WHAT WE&apos;D DO</p>
            {a.recommendations.map((rec: Recommendation, i: number) => (
              <div key={i} style={{ background: "#232323", border: "1px solid #333", borderRadius: 8, padding: "12px 14px", marginBottom: 8, display: "flex", gap: 12 }}>
                <div style={{ minWidth: 24, height: 24, background: "#CC5500", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12, color: "#fff", flexShrink: 0 }}>{i + 1}</div>
                <div>
                  <p style={{ fontWeight: 700, fontSize: 13, color: "#f0f0f0", margin: "0 0 4px" }}>{rec.title}</p>
                  <p style={{ fontSize: 13, color: "#ccc", margin: 0, lineHeight: 1.5 }}>{rec.detail}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Trajectory */}
        {a.trajectoryNote && (
          <div style={{ background: "#232323", border: "1px solid #333", borderRadius: 8, padding: "12px 14px", marginBottom: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#888", letterSpacing: 1, marginBottom: 6 }}>WHERE THIS IS HEADING</p>
            <p style={{ fontSize: 13, color: "#ccc", margin: 0, fontStyle: "italic", lineHeight: 1.5 }}>{a.trajectoryNote}</p>
          </div>
        )}

        {/* Industry comparisons */}
        {a.industryComparisons && a.industryComparisons.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#888", letterSpacing: 1, marginBottom: 10 }}>HOW YOU COMPARE</p>
            <div style={{ background: "#232323", border: "1px solid #333", borderRadius: 8, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#2d2d2d" }}>
                    {["Metric", "Your Value", "Industry Avg", "Top 25%", "Status"].map(h => (
                      <th key={h} style={{ padding: "10px 12px", textAlign: "left", color: "#CC5500", fontWeight: 700, fontSize: 11 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {a.industryComparisons.map((c: IndustryComparison, i: number) => (
                    <tr key={i} style={{ borderTop: "1px solid #333" }}>
                      <td style={{ padding: "10px 12px", color: "#f0f0f0", fontWeight: 600 }}>{c.metric}</td>
                      <td style={{ padding: "10px 12px", color: "#ccc" }}>{c.yourValue}</td>
                      <td style={{ padding: "10px 12px", color: "#ccc" }}>{c.industryAverage}</td>
                      <td style={{ padding: "10px 12px", color: "#ccc" }}>{c.topQuartile}</td>
                      <td style={{ padding: "10px 12px" }}>
                        <span style={{ color: c.status === "above_average" ? "#27ae60" : c.status === "below_average" ? "#e74c3c" : "#f0f0f0", fontWeight: 600 }}>
                          {c.status === "above_average" ? "▲ Above" : c.status === "below_average" ? "▼ Below" : "◆ Average"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Scenarios */}
        {a.scenarios && (
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#888", letterSpacing: 1, marginBottom: 10 }}>12-MONTH SCENARIOS</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              {[
                { label: "Optimistic",  text: a.scenarios.optimistic,  color: "#27ae60", border: "#1a5e32" },
                { label: "Base Case",   text: a.scenarios.base,        color: "#f0f0f0", border: "#484848" },
                { label: "Pessimistic", text: a.scenarios.pessimistic, color: "#e74c3c", border: "#5c1a1a" },
              ].map(s => (
                <div key={s.label} style={{ background: "#232323", border: `1px solid ${s.border}`, borderRadius: 8, padding: "14px" }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: s.color, letterSpacing: 0.5, margin: "0 0 8px" }}>{s.label.toUpperCase()}</p>
                  <p style={{ fontSize: 13, color: "#ccc", margin: 0, lineHeight: 1.5 }}>{s.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Risk matrix */}
        {a.riskMatrix && a.riskMatrix.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#888", letterSpacing: 1, marginBottom: 10 }}>RISK MATRIX</p>
            {a.riskMatrix.map((r: RiskMatrixItem, i: number) => {
              const hi = r.likelihood === "high" || r.impact === "high";
              const lo = r.likelihood === "low" && r.impact === "low";
              const col = hi ? "#e74c3c" : lo ? "#27ae60" : "#CC5500";
              return (
                <div key={i} style={{ background: "#232323", border: "1px solid #333", borderRadius: 8, padding: "12px 14px", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: "#f0f0f0" }}>{r.risk}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: col, background: "#1e1e1e", border: `1px solid ${col}`, padding: "2px 7px", borderRadius: 10 }}>
                      {r.likelihood.toUpperCase()} / {r.impact.toUpperCase()}
                    </span>
                  </div>
                  <p style={{ fontSize: 13, color: "#aaa", margin: 0, lineHeight: 1.5 }}><span style={{ color: "#666", fontWeight: 600 }}>Mitigation: </span>{r.mitigation}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* Action plan */}
        {a.actionPlan && (
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#888", letterSpacing: 1, marginBottom: 10 }}>ACTION PLAN</p>
            {[
              { label: "Immediate",  items: a.actionPlan.immediate,  color: "#e74c3c" },
              { label: "Short-term", items: a.actionPlan.shortTerm,  color: "#CC5500" },
              { label: "Long-term",  items: a.actionPlan.longTerm,   color: "#27ae60" },
            ].map(section => section.items?.length > 0 && (
              <div key={section.label} style={{ background: "#232323", border: "1px solid #333", borderRadius: 8, padding: "12px 14px", marginBottom: 8 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: section.color, letterSpacing: 0.5, margin: "0 0 8px" }}>{section.label.toUpperCase()}</p>
                {section.items.map((item: string, i: number) => (
                  <p key={i} style={{ fontSize: 13, color: "#ccc", margin: "0 0 4px", lineHeight: 1.5 }}>· {item}</p>
                ))}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid #2d2d2d", padding: "28px 24px", textAlign: "center" }}>
        <p style={{ fontSize: 13, color: "#555", margin: "0 0 16px" }}>Generated by Consult6 · Senior financial insight, no consultant fees</p>
        <Link href="/auth/signup" style={{ background: "#CC5500", color: "#fff", fontSize: 14, fontWeight: 700, textDecoration: "none", padding: "12px 28px", borderRadius: 9, display: "inline-block" }}>
          Want this for your organization? Get started free →
        </Link>
      </footer>
    </div>
  );
}
