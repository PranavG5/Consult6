"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";
import { generatePDF, type AnalysisResult } from "@/lib/generateReport";

export const metadata = { title: "Report History | Consult6" };

interface HistoryItem {
  id: string;
  created_at: string;
  label: string;
  mode: string;
  org_name: string;
  file_name: string;
  analysis_result: AnalysisResult | null;
}

function SkeletonRow() {
  return (
    <div style={{ background: "#333333", border: "1px solid #484848", borderRadius: 10, padding: "18px 20px", display: "flex", alignItems: "center", gap: 16 }}>
      <div style={{ flex: 1 }}>
        <div className="skeleton" style={{ height: 14, width: "40%", marginBottom: 8, borderRadius: 4 }} />
        <div className="skeleton" style={{ height: 12, width: "60%", marginBottom: 8, borderRadius: 4 }} />
        <div className="skeleton" style={{ height: 11, width: "30%", borderRadius: 4 }} />
      </div>
      <div className="skeleton" style={{ height: 34, width: 120, borderRadius: 7 }} />
    </div>
  );
}

export default function HistoryPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [error, setError] = useState("");
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { window.location.href = "/auth/login"; return; }
      fetchHistory();
    });
  }, []);

  async function fetchHistory() {
    setLoading(true);
    try {
      const res = await fetch("/api/history");
      if (res.status === 401) { window.location.href = "/auth/login"; return; }
      if (!res.ok) { setError("Failed to load report history."); return; }
      const json = await res.json();
      setItems(json.history ?? []);
    } catch {
      setError("Something went wrong. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  function downloadPDF(item: HistoryItem) {
    if (!item.analysis_result) return;
    const generatedAt = new Date(item.created_at).toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" });
    const pdf = generatePDF({
      orgName: item.org_name || item.label,
      fileName: item.file_name,
      generatedAt,
      mode: item.mode,
      analysis: item.analysis_result,
    });
    const blob = new Blob([new Uint8Array(pdf) as unknown as BlobPart], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const monthYear = new Date(item.created_at).toLocaleString("en-US", { month: "long", year: "numeric" });
    const safeName = (item.org_name || item.label || "Report").replace(/[^a-zA-Z0-9 \-]/g, "").trim();
    a.download = `Consult6 ${safeName} Executive Report ${monthYear}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
  }

  const modeLabel: Record<string, string> = { basic: "Basic", advanced: "Advanced" };
  const modeBg: Record<string, string> = { basic: "#484848", advanced: "#CC5500" };

  return (
    <div style={{ minHeight: "100vh", background: "#272727" }}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}.skeleton{animation:pulse 1.8s ease-in-out infinite;background:#2a2a2a;border-radius:6px;}`}</style>

      {/* Navbar */}
      <nav style={{ background: "#1e1e1e", borderBottom: "1px solid #3a3a3a", padding: "0 24px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <div style={{ width: 32, height: 32, background: "#CC5500", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16, color: "#fff" }}>6</div>
            <span style={{ fontWeight: 700, fontSize: 16, color: "#f0f0f0" }}>Consult6</span>
          </Link>
          <span style={{ color: "#484848" }}>/</span>
          <span style={{ fontSize: 14, color: "#CC5500", fontWeight: 600 }}>Report History</span>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <Link href="/dashboard" style={{ background: "none", border: "1px solid #484848", color: "#aaa", borderRadius: 6, padding: "4px 14px", fontSize: 12, textDecoration: "none" }}>Dashboard</Link>
          <Link href="/settings" style={{ background: "none", border: "1px solid #484848", color: "#aaa", borderRadius: 6, padding: "4px 14px", fontSize: 12, textDecoration: "none" }}>Settings</Link>
        </div>
      </nav>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "40px 20px" }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#f0f0f0", margin: "0 0 6px" }}>Report History</h1>
          <p style={{ fontSize: 14, color: "#777", margin: 0 }}>Download PDFs of your previously generated reports.</p>
        </div>

        {error && (
          <div style={{ background: "#1a0a0a", border: "1px solid rgba(239,68,68,0.4)", borderRadius: 10, padding: "14px 16px", marginBottom: 20 }}>
            <p style={{ color: "#f87171", fontSize: 14, margin: 0 }}>{error}</p>
          </div>
        )}

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </div>
        ) : items.length === 0 ? (
          <div style={{ background: "#333333", border: "2px dashed #484848", borderRadius: 16, padding: "60px 40px", textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.4 }}>📋</div>
            <p style={{ fontSize: 18, fontWeight: 800, color: "#f0f0f0", margin: "0 0 10px" }}>No reports generated yet</p>
            <p style={{ fontSize: 14, color: "#777", margin: "0 0 28px", lineHeight: 1.6, maxWidth: 380, marginLeft: "auto", marginRight: "auto" }}>
              Generate your first report from the dashboard to see it here.
            </p>
            <Link
              href="/dashboard"
              style={{ display: "inline-block", background: "#CC5500", color: "#fff", border: "none", borderRadius: 9, padding: "12px 28px", fontSize: 14, fontWeight: 700, textDecoration: "none" }}>
              Go to Dashboard
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {items.map(item => (
              <div key={item.id} style={{ background: "#333333", border: "1px solid #484848", borderRadius: 10, padding: "18px 20px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{
                      fontSize: 9, fontWeight: 800, letterSpacing: 0.5, padding: "2px 7px", borderRadius: 3,
                      background: modeBg[item.mode] ?? "#484848",
                      color: "#fff",
                    }}>
                      {(modeLabel[item.mode] ?? item.mode).toUpperCase()}
                    </span>
                    <span style={{ fontSize: 11, color: "#555" }}>{formatDate(item.created_at)}</span>
                  </div>
                  <p style={{ fontSize: 15, fontWeight: 700, color: "#f0f0f0", margin: "0 0 4px", lineHeight: 1.3 }}>
                    {item.org_name || item.label}
                  </p>
                  {item.file_name && (
                    <p style={{ fontSize: 12, color: "#555", margin: 0 }}>{item.file_name}</p>
                  )}
                </div>
                {item.analysis_result ? (
                  <button
                    onClick={() => downloadPDF(item)}
                    style={{ background: "#CC5500", border: "none", color: "#fff", borderRadius: 7, padding: "9px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
                    ↓ Download PDF
                  </button>
                ) : (
                  <div title="Full report download requires saved report data." style={{ position: "relative" }}>
                    <button
                      disabled
                      style={{ background: "#3a3a3a", border: "1px solid #484848", color: "#555", borderRadius: 7, padding: "9px 20px", fontSize: 13, fontWeight: 700, cursor: "not-allowed", whiteSpace: "nowrap" }}>
                      ↓ Download PDF
                    </button>
                    <p style={{ fontSize: 10, color: "#555", margin: "4px 0 0", textAlign: "center" }}>No saved data</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
