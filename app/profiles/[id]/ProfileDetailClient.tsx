"use client";
import { useEffect, useState, useRef, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import * as XLSX from "xlsx";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import ErrorBanner from "@/app/components/ErrorBanner";
import { generatePDF, type AnalysisResult } from "@/lib/generateReport";

export const metadata = { title: "Profile | Consult6" };

interface Upload {
  id: string;
  period_label: string;
  period_type: string;
  uploaded_at: string;
  row_count: number;
  column_headers: string[];
  sort_order: number;
}

interface MetricSeries {
  name: string;
  values: (number | null)[];
  latest: number | null;
  latestPeriod: string | null;
  previous: number | null;
  change: number | null;
  changePct: number | null;
}

interface AnalysisItem {
  id: string;
  created_at: string;
  label: string;
  org_name: string;
  file_name: string;
  mode: string;
  analysis_result: AnalysisResult;
  share_token: string | null;
}

const COLORS = ["#CC5500", "#2980b9", "#27ae60", "#d4a017", "#9b59b6", "#e74c3c", "#1abc9c", "#e67e22"];

// Compact number formatting for KPI cards (1.2K, 3.4M, etc.)
function fmtCompact(v: number | null): string {
  if (v === null || v === undefined || isNaN(v)) return "—";
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (abs >= 1_000_000_000) return `${sign}${(abs / 1_000_000_000).toFixed(abs >= 10_000_000_000 ? 0 : 1)}B`;
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(abs >= 10_000 ? 0 : 1)}K`;
  return `${sign}${abs % 1 === 0 ? abs.toLocaleString() : abs.toFixed(2)}`;
}

function fmtPct(v: number | null): string {
  if (v === null || v === undefined || !isFinite(v)) return "";
  return `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;
}

// Lightweight inline-SVG sparkline — avoids spinning up a recharts container per card.
function Sparkline({ values, color = "#CC5500", width = 132, height = 36 }: { values: (number | null)[]; color?: string; width?: number; height?: number }) {
  const pts = values.map((v, i) => ({ v, i })).filter((p): p is { v: number; i: number } => p.v !== null);
  if (pts.length < 2) return <div style={{ height, display: "flex", alignItems: "center", color: "#555", fontSize: 11 }}>—</div>;
  const xs = pts.map(p => p.i);
  const ys = pts.map(p => p.v);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const pad = 3;
  const sx = (x: number) => maxX === minX ? width / 2 : pad + ((x - minX) / (maxX - minX)) * (width - pad * 2);
  const sy = (y: number) => maxY === minY ? height / 2 : height - pad - ((y - minY) / (maxY - minY)) * (height - pad * 2);
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${sx(p.i).toFixed(1)},${sy(p.v).toFixed(1)}`).join(" ");
  const lastP = pts[pts.length - 1];
  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <path d={d} fill="none" stroke={color} strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={sx(lastP.i)} cy={sy(lastP.v)} r={2.4} fill={color} />
    </svg>
  );
}

type Tab = "overview" | "analyses" | "data";

export default function ProfileDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");

  const [profile, setProfile] = useState<{ id: string; name: string; sector: string; created_at: string; key_metrics?: string[]; latest_insight?: string | null; latest_insight_at?: string | null } | null>(null);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [deletingUploadId, setDeletingUploadId] = useState<string | null>(null);

  // Upload form
  const [periodLabel, setPeriodLabel] = useState("");
  const [periodType, setPeriodType] = useState<"monthly" | "quarterly" | "annual">("quarterly");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [lastColumnMappings, setLastColumnMappings] = useState<{ raw: string; canonical: string }[]>([]);

  // Metrics
  const [periods, setPeriods] = useState<string[]>([]);
  const [periodTypes, setPeriodTypes] = useState<Record<string, string>>({});
  const [series, setSeries] = useState<MetricSeries[]>([]);
  const [keyMetrics, setKeyMetrics] = useState<string[]>([]);
  const [historicalContext, setHistoricalContext] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [metricsLoading, setMetricsLoading] = useState(false);

  // Chart controls
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [chartType, setChartType] = useState<"line" | "area" | "bar">("line");
  const [customizeOpen, setCustomizeOpen] = useState(false);

  // Insight
  const [insight, setInsight] = useState<string | null>(null);
  const [insightAt, setInsightAt] = useState<string | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [insightError, setInsightError] = useState("");

  // Analyses
  const [analyses, setAnalyses] = useState<AnalysisItem[]>([]);
  const [analysesLoading, setAnalysesLoading] = useState(true);
  const [shareLoading, setShareLoading] = useState<Record<string, boolean>>({});
  const [shareTokens, setShareTokens] = useState<Record<string, string | null>>({});
  const [shareToast, setShareToast] = useState(false);

  // Drag-and-drop reordering
  const dragItem = useRef<number | null>(null);
  const dragOver = useRef<number | null>(null);

  useEffect(() => {
    fetchProfile();
    fetchMetrics();
    fetchAnalyses();
  }, [id]);

  // Featured KPIs: pinned metrics that have data, else the first few tracked.
  const featuredMetrics = useMemo(() => {
    const withData = keyMetrics.filter(m => series.some(s => s.name === m));
    if (withData.length) return withData;
    return series.slice(0, 4).map(s => s.name);
  }, [keyMetrics, series]);

  async function fetchProfile() {
    setLoading(true);
    try {
      const res = await fetch(`/api/profiles/${id}`);
      if (!res.ok) { router.push("/profiles"); return; }
      const json = await res.json();
      setProfile(json.profile);
      setUploads(json.uploads ?? []);
      setKeyMetrics(Array.isArray(json.profile?.key_metrics) ? json.profile.key_metrics : []);
      setInsight(json.profile?.latest_insight ?? null);
      setInsightAt(json.profile?.latest_insight_at ?? null);
    } finally {
      setLoading(false);
    }
  }

  async function fetchMetrics() {
    setMetricsLoading(true);
    try {
      const res = await fetch(`/api/profiles/${id}/metrics`);
      if (!res.ok) return;
      const json = await res.json();
      setPeriods(json.periods ?? []);
      setPeriodTypes(json.periodTypes ?? {});
      setSeries(json.series ?? []);
      setHistoricalContext(json.historicalContext ?? "");
      if (Array.isArray(json.keyMetrics) && json.keyMetrics.length) setKeyMetrics(json.keyMetrics);
      // Default the chart selection on first load.
      setSelectedMetrics(prev => {
        if (prev.length) return prev.filter(m => (json.series ?? []).some((s: MetricSeries) => s.name === m));
        const km: string[] = (json.keyMetrics ?? []).filter((m: string) => (json.series ?? []).some((s: MetricSeries) => s.name === m));
        if (km.length) return km.slice(0, 3);
        return (json.series ?? []).slice(0, 2).map((s: MetricSeries) => s.name);
      });
    } finally {
      setMetricsLoading(false);
    }
  }

  async function fetchAnalyses() {
    setAnalysesLoading(true);
    try {
      const res = await fetch(`/api/history?profileId=${id}`);
      if (res.ok) {
        const json = await res.json();
        const items: AnalysisItem[] = json.history ?? [];
        setAnalyses(items);
        const tokens: Record<string, string | null> = {};
        for (const it of items) tokens[it.id] = it.share_token;
        setShareTokens(tokens);
      }
    } finally {
      setAnalysesLoading(false);
    }
  }

  async function togglePin(name: string) {
    const next = keyMetrics.includes(name)
      ? keyMetrics.filter(m => m !== name)
      : [...keyMetrics, name].slice(0, 8);
    setKeyMetrics(next); // optimistic
    await fetch(`/api/profiles/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key_metrics: next }),
    });
  }

  function toggleChartMetric(name: string) {
    setSelectedMetrics(prev =>
      prev.includes(name) ? prev.filter(m => m !== name) : [...prev, name].slice(0, 6)
    );
  }

  async function generateInsight() {
    setInsightLoading(true);
    setInsightError("");
    try {
      const res = await fetch(`/api/profiles/${id}/insight`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) { setInsightError(json.error ?? "Couldn't generate an insight."); return; }
      setInsight(json.insight);
      setInsightAt(json.generatedAt);
    } catch {
      setInsightError("Couldn't generate an insight. Please try again.");
    } finally {
      setInsightLoading(false);
    }
  }

  async function deleteUpload(uploadId: string) {
    setDeletingUploadId(uploadId);
    const res = await fetch(`/api/profiles/${id}/uploads/${uploadId}`, { method: "DELETE" });
    if (res.ok) {
      setUploads(prev => prev.filter(u => u.id !== uploadId));
      fetchMetrics();
    }
    setDeletingUploadId(null);
  }

  function handleDragStart(index: number) { dragItem.current = index; }
  function handleDragEnter(index: number) {
    dragOver.current = index;
    if (dragItem.current === null || dragItem.current === index) return;
    setUploads(prev => {
      const next = [...prev];
      const [moved] = next.splice(dragItem.current!, 1);
      next.splice(index, 0, moved);
      dragItem.current = index;
      return next;
    });
  }
  async function handleDragEnd() {
    dragItem.current = null;
    dragOver.current = null;
    const orderedIds = uploads.map(u => u.id);
    await fetch(`/api/profiles/${id}/reorder`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds }),
    });
    fetchMetrics();
  }

  async function handleUpload() {
    if (!uploadFile || !periodLabel.trim()) return;
    setUploading(true);
    setUploadError("");
    setUploadSuccess("");
    try {
      let rawText = "";
      if (uploadFile.name.endsWith(".csv") || uploadFile.type === "text/csv") {
        rawText = await uploadFile.text();
      } else {
        const buf = await uploadFile.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: "" });
        if (json.length) {
          const headers = Object.keys(json[0]);
          rawText = headers.join(",") + "\n" + json.map(r => headers.map(h => r[h] ?? "").join(",")).join("\n");
        }
      }

      const fd = new FormData();
      fd.append("data", rawText);
      fd.append("period_label", periodLabel.trim());
      fd.append("period_type", periodType);

      const res = await fetch(`/api/profiles/${id}/upload`, { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) {
        const msg: string = json.error ?? "Upload failed.";
        if (msg.toLowerCase().includes("parse") || msg.toLowerCase().includes("csv")) {
          setUploadError("We couldn't parse this file. Make sure it's a valid CSV with headers in the first row.");
        } else if (msg.toLowerCase().includes("numeric") || msg.toLowerCase().includes("no metric")) {
          setUploadError("This file doesn't contain any numeric columns. Add at least one numeric column and try again.");
        } else if (msg.toLowerCase().includes("duplicate") || msg.toLowerCase().includes("already") || msg.toLowerCase().includes("period")) {
          setUploadError("You've already uploaded data for this period. Delete the existing upload first, or use a different period label.");
        } else {
          setUploadError(msg);
        }
        return;
      }

      setUploadSuccess(`Uploaded successfully. ${json.metrics_extracted} metric columns extracted.`);
      setLastColumnMappings(json.columnMappings?.length ? json.columnMappings : []);
      setPeriodLabel("");
      setUploadFile(null);
      fetchProfile();
      fetchMetrics();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function deleteProfile() {
    if (!confirm(`Delete profile "${profile?.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    await fetch(`/api/profiles/${id}`, { method: "DELETE" });
    router.push("/profiles");
  }

  function downloadAnalysisPDF(item: AnalysisItem) {
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

  async function shareAnalysis(item: AnalysisItem) {
    const existing = shareTokens[item.id];
    if (existing) {
      navigator.clipboard.writeText(`${window.location.origin}/r/${existing}`);
      setShareToast(true); setTimeout(() => setShareToast(false), 3000);
      return;
    }
    setShareLoading(prev => ({ ...prev, [item.id]: true }));
    try {
      const res = await fetch("/api/share-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysis_id: item.id }),
      });
      if (res.ok) {
        const { token, url } = await res.json();
        setShareTokens(prev => ({ ...prev, [item.id]: token }));
        navigator.clipboard.writeText(url);
        setShareToast(true); setTimeout(() => setShareToast(false), 3000);
      }
    } finally {
      setShareLoading(prev => ({ ...prev, [item.id]: false }));
    }
  }

  // Chart data assembled from the selected metric series.
  const chartData = useMemo(() => periods.map((period, i) => {
    const row: Record<string, string | number | null> = { period };
    for (const name of selectedMetrics) {
      const s = series.find(x => x.name === name);
      row[name] = s ? s.values[i] : null;
    }
    return row;
  }), [periods, selectedMetrics, series]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#272727" }}>
        <nav style={{ background: "#1e1e1e", borderBottom: "1px solid #3a3a3a", padding: "0 24px", height: 56, display: "flex", alignItems: "center" }}>
          <div className="skeleton" style={{ width: 32, height: 32, borderRadius: 7, marginRight: 10 }} />
          <div className="skeleton" style={{ width: 80, height: 16, borderRadius: 4 }} />
        </nav>
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "40px 20px" }}>
          <div className="skeleton" style={{ height: 28, width: 220, borderRadius: 6, marginBottom: 24 }} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14, marginBottom: 24 }}>
            {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 120, borderRadius: 12 }} />)}
          </div>
          <div className="skeleton" style={{ height: 320, borderRadius: 12 }} />
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const hasData = series.length > 0;

  return (
    <div style={{ minHeight: "100vh", background: "#272727" }}>
      <style>{`input::placeholder, textarea::placeholder { color: #4a4a4a !important; }`}</style>
      {/* Navbar */}
      <nav style={{ background: "#1e1e1e", borderBottom: "1px solid #3a3a3a", padding: "0 24px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100, overflow: "visible" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <div style={{ width: 32, height: 32, background: "#CC5500", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16, color: "#fff" }}>6</div>
            <span style={{ fontWeight: 700, fontSize: 16, color: "#f0f0f0" }}>Consult6</span>
          </Link>
          <span className="dash-nav-desktop" style={{ color: "#484848" }}>/</span>
          <Link href="/profiles" className="dash-nav-desktop" style={{ fontSize: 13, color: "#888", textDecoration: "none" }}>Companies</Link>
          <span className="dash-nav-desktop" style={{ color: "#484848" }}>/</span>
          <span className="dash-nav-desktop" style={{ fontSize: 14, color: "#CC5500", fontWeight: 600 }}>{profile.name}</span>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <Link href="/dashboard" className="dash-nav-desktop" style={{ background: "none", border: "1px solid #484848", color: "#aaa", borderRadius: 6, padding: "4px 14px", fontSize: 12, textDecoration: "none" }}>Dashboard</Link>
          <button
            className="dash-nav-mobile"
            onClick={() => setMobileMenuOpen(o => !o)}
            style={{ background: "none", border: "none", color: "#aaa", padding: "4px 6px", flexDirection: "column", gap: 5, justifyContent: "center", alignItems: "center" }}
            aria-label="Menu"
          >
            <span style={{ display: "block", width: 22, height: 2, background: "#aaa", borderRadius: 1 }} />
            <span style={{ display: "block", width: 22, height: 2, background: "#aaa", borderRadius: 1 }} />
            <span style={{ display: "block", width: 22, height: 2, background: "#aaa", borderRadius: 1 }} />
          </button>
        </div>
        {mobileMenuOpen && (
          <div className="dash-nav-mobile" style={{ position: "absolute", top: 56, right: 16, background: "#1e1e1e", border: "1px solid #3a3a3a", borderRadius: 10, padding: "8px 0", minWidth: 160, zIndex: 200, boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
            <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)} style={{ display: "block", padding: "10px 20px", fontSize: 14, color: "#f0f0f0", textDecoration: "none" }}>Dashboard</Link>
            <Link href="/profiles" onClick={() => setMobileMenuOpen(false)} style={{ display: "block", padding: "10px 20px", fontSize: 14, color: "#f0f0f0", textDecoration: "none" }}>Companies</Link>
            <Link href="/settings" onClick={() => setMobileMenuOpen(false)} style={{ display: "block", padding: "10px 20px", fontSize: 14, color: "#f0f0f0", textDecoration: "none" }}>Settings</Link>
            <div style={{ height: 1, background: "#2d2d2d", margin: "6px 0" }} />
            <button onClick={async () => { setMobileMenuOpen(false); await supabase.auth.signOut(); window.location.href = "/"; }} style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 20px", fontSize: 14, color: "#f87171", background: "none", border: "none" }}>Sign out</button>
          </div>
        )}
      </nav>

      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "32px 20px 60px" }}>
        {/* Profile header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 22, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 46, height: 46, background: "#2a1800", border: "1px solid #CC5500", borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🏢</div>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: "#f0f0f0", margin: "0 0 4px" }}>{profile.name}</h1>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ fontSize: 13, color: "#888" }}>{profile.sector}</span>
                <span style={{ color: "#484848" }}>·</span>
                <span style={{ fontSize: 13, color: "#555" }}>{periods.length} {periods.length === 1 ? "period" : "periods"}</span>
                <span style={{ color: "#484848" }}>·</span>
                <span style={{ fontSize: 13, color: "#555" }}>{series.length} metrics</span>
              </div>
            </div>
          </div>
          <Link
            href={`/dashboard?profile=${id}`}
            style={{ background: "#CC5500", color: "#fff", border: "none", borderRadius: 9, padding: "11px 22px", fontSize: 14, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap" }}>
            Run analysis →
          </Link>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, borderBottom: "1px solid #3a3a3a", marginBottom: 28 }}>
          {([
            ["overview", "Overview"],
            ["analyses", `Analyses${analyses.length ? ` (${analyses.length})` : ""}`],
            ["data", `Data${uploads.length ? ` (${uploads.length})` : ""}`],
          ] as [Tab, string][]).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              style={{ background: "none", border: "none", borderBottom: `2px solid ${tab === key ? "#CC5500" : "transparent"}`, color: tab === key ? "#f0f0f0" : "#888", padding: "10px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer", marginBottom: -1 }}>
              {label}
            </button>
          ))}
        </div>

        {/* ===================== OVERVIEW ===================== */}
        {tab === "overview" && (
          !hasData ? (
            <div style={{ background: "#333333", border: "2px dashed #484848", borderRadius: 16, padding: "60px 40px", textAlign: "center" }}>
              <div style={{ width: 52, height: 52, background: "#2a1800", border: "2px solid #CC5500", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, margin: "0 auto 18px" }}>📊</div>
              <p style={{ fontSize: 17, fontWeight: 800, color: "#f0f0f0", margin: "0 0 10px" }}>No financial data yet</p>
              <p style={{ fontSize: 14, color: "#777", margin: "0 0 24px", lineHeight: 1.6, maxWidth: 380, marginLeft: "auto", marginRight: "auto" }}>
                Upload a period of data to populate this company&apos;s financial dashboard — KPIs, trends and comparisons.
              </p>
              <button onClick={() => setTab("data")} style={{ background: "#CC5500", color: "#fff", border: "none", borderRadius: 9, padding: "12px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Upload data</button>
            </div>
          ) : (
            <>
              {/* KPI cards */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#CC5500", letterSpacing: 1, margin: 0 }}>KEY METRICS</p>
                <button onClick={() => setCustomizeOpen(o => !o)} style={{ background: "none", border: "1px solid #484848", color: "#aaa", borderRadius: 6, padding: "4px 12px", fontSize: 12, cursor: "pointer" }}>
                  {customizeOpen ? "Done" : "Customize"}
                </button>
              </div>

              {customizeOpen && (
                <div style={{ background: "#2d2d2d", border: "1px solid #3a3a3a", borderRadius: 10, padding: 16, marginBottom: 18 }}>
                  <p style={{ fontSize: 12, color: "#888", margin: "0 0 12px" }}>Pin up to 8 metrics to feature as KPI cards.</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {series.map(s => {
                      const on = keyMetrics.includes(s.name);
                      return (
                        <button key={s.name} onClick={() => togglePin(s.name)}
                          style={{ background: on ? "#2a1800" : "#333", border: `1px solid ${on ? "#CC5500" : "#484848"}`, color: on ? "#CC5500" : "#aaa", borderRadius: 20, padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                          {on ? "★ " : "☆ "}{s.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14, marginBottom: 28 }}>
                {featuredMetrics.map((name, idx) => {
                  const s = series.find(x => x.name === name);
                  if (!s) return null;
                  const up = s.change !== null && s.change > 0;
                  const down = s.change !== null && s.change < 0;
                  const deltaColor = up ? "#4caf50" : down ? "#e74c3c" : "#888";
                  return (
                    <div key={name} style={{ background: "#333333", border: "1px solid #484848", borderRadius: 12, padding: "16px 18px" }}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 10 }}>
                        <span style={{ fontSize: 12, color: "#999", fontWeight: 600, lineHeight: 1.3, textTransform: "capitalize" }}>{name}</span>
                        <button onClick={() => togglePin(name)} title={keyMetrics.includes(name) ? "Unpin" : "Pin"}
                          style={{ background: "none", border: "none", color: keyMetrics.includes(name) ? "#CC5500" : "#555", fontSize: 14, cursor: "pointer", padding: 0, lineHeight: 1, flexShrink: 0 }}>
                          {keyMetrics.includes(name) ? "★" : "☆"}
                        </button>
                      </div>
                      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 8 }}>
                        <div>
                          <p style={{ fontSize: 24, fontWeight: 800, color: "#f0f0f0", margin: "0 0 4px", fontFeatureSettings: "'tnum'" }}>{fmtCompact(s.latest)}</p>
                          {s.change !== null && (
                            <span style={{ fontSize: 12, fontWeight: 700, color: deltaColor }}>
                              {up ? "▲" : down ? "▼" : ""} {fmtPct(s.changePct)}
                            </span>
                          )}
                        </div>
                        <Sparkline values={s.values} color={COLORS[idx % COLORS.length]} />
                      </div>
                      {s.latestPeriod && <p style={{ fontSize: 10, color: "#555", margin: "8px 0 0" }}>as of {s.latestPeriod}</p>}
                    </div>
                  );
                })}
              </div>

              {/* AI insight */}
              <div style={{ background: "linear-gradient(135deg, #2a1800 0%, #2d2416 100%)", border: "1px solid #CC5500", borderRadius: 12, padding: "18px 20px", marginBottom: 28 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: insight || insightError ? 10 : 0 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#CC5500", letterSpacing: 1, margin: 0 }}>✦ WHAT CHANGED</p>
                  <button onClick={generateInsight} disabled={insightLoading || periods.length < 2}
                    style={{ background: "#CC5500", color: "#fff", border: "none", borderRadius: 7, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: insightLoading || periods.length < 2 ? "default" : "pointer", opacity: insightLoading || periods.length < 2 ? 0.6 : 1, whiteSpace: "nowrap" }}>
                    {insightLoading ? "Analyzing…" : insight ? "Refresh" : "Generate insight"}
                  </button>
                </div>
                {insightError && <p style={{ fontSize: 13, color: "#e74c3c", margin: 0 }}>{insightError}</p>}
                {insight && !insightError && (
                  <>
                    <p style={{ fontSize: 14, color: "#f0e0d0", margin: 0, lineHeight: 1.6 }}>{insight}</p>
                    {insightAt && <p style={{ fontSize: 10, color: "#a86", margin: "10px 0 0" }}>Generated {new Date(insightAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</p>}
                  </>
                )}
                {!insight && !insightError && (
                  <p style={{ fontSize: 13, color: "#a98", margin: 0, lineHeight: 1.5 }}>
                    {periods.length < 2 ? "Add at least two periods of data to generate an AI readout of what changed." : "Generate an AI readout of the most important movements across your periods."}
                  </p>
                )}
              </div>

              {/* Trend chart */}
              <div style={{ background: "#333333", border: "1px solid #484848", borderRadius: 12, padding: 24, marginBottom: 28 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#CC5500", letterSpacing: 1, margin: 0 }}>TRENDS</p>
                  <div style={{ display: "flex", gap: 6 }}>
                    {(["line", "area", "bar"] as const).map(t => (
                      <button key={t} onClick={() => setChartType(t)}
                        style={{ background: chartType === t ? "#2a1800" : "#2d2d2d", border: `1px solid ${chartType === t ? "#CC5500" : "#484848"}`, color: chartType === t ? "#CC5500" : "#aaa", borderRadius: 6, padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", textTransform: "capitalize" }}>{t}</button>
                    ))}
                  </div>
                </div>

                {/* metric chips */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
                  {series.map((s, i) => {
                    const on = selectedMetrics.includes(s.name);
                    return (
                      <button key={s.name} onClick={() => toggleChartMetric(s.name)}
                        style={{ background: on ? "#2d2d2d" : "transparent", border: `1px solid ${on ? COLORS[i % COLORS.length] : "#484848"}`, color: on ? "#f0f0f0" : "#888", borderRadius: 20, padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: on ? COLORS[i % COLORS.length] : "#555" }} />
                        {s.name}
                      </button>
                    );
                  })}
                </div>

                {selectedMetrics.length && chartData.some(d => selectedMetrics.some(m => d[m] !== null)) ? (
                  <div style={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      {chartType === "bar" ? (
                        <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#3a3a3a" />
                          <XAxis dataKey="period" tick={{ fill: "#888", fontSize: 11 }} axisLine={{ stroke: "#484848" }} tickLine={false} />
                          <YAxis tick={{ fill: "#888", fontSize: 11 }} axisLine={{ stroke: "#484848" }} tickLine={false} width={56} tickFormatter={(v) => fmtCompact(Number(v))} />
                          <Tooltip contentStyle={{ background: "#2d2d2d", border: "1px solid #484848", borderRadius: 8 }} labelStyle={{ color: "#f0f0f0", fontWeight: 700 }} />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                          {selectedMetrics.map((name) => {
                            const i = series.findIndex(s => s.name === name);
                            return <Bar key={name} dataKey={name} fill={COLORS[i % COLORS.length]} radius={[3, 3, 0, 0]} />;
                          })}
                        </BarChart>
                      ) : chartType === "area" ? (
                        <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#3a3a3a" />
                          <XAxis dataKey="period" tick={{ fill: "#888", fontSize: 11 }} axisLine={{ stroke: "#484848" }} tickLine={false} />
                          <YAxis tick={{ fill: "#888", fontSize: 11 }} axisLine={{ stroke: "#484848" }} tickLine={false} width={56} tickFormatter={(v) => fmtCompact(Number(v))} />
                          <Tooltip contentStyle={{ background: "#2d2d2d", border: "1px solid #484848", borderRadius: 8 }} labelStyle={{ color: "#f0f0f0", fontWeight: 700 }} />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                          {selectedMetrics.map((name) => {
                            const i = series.findIndex(s => s.name === name);
                            return <Area key={name} type="monotone" dataKey={name} stroke={COLORS[i % COLORS.length]} fill={COLORS[i % COLORS.length]} fillOpacity={0.15} strokeWidth={2} connectNulls />;
                          })}
                        </AreaChart>
                      ) : (
                        <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#3a3a3a" />
                          <XAxis dataKey="period" tick={{ fill: "#888", fontSize: 11 }} axisLine={{ stroke: "#484848" }} tickLine={false} />
                          <YAxis tick={{ fill: "#888", fontSize: 11 }} axisLine={{ stroke: "#484848" }} tickLine={false} width={56} tickFormatter={(v) => fmtCompact(Number(v))} />
                          <Tooltip contentStyle={{ background: "#2d2d2d", border: "1px solid #484848", borderRadius: 8 }} labelStyle={{ color: "#f0f0f0", fontWeight: 700 }} />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                          {selectedMetrics.map((name) => {
                            const i = series.findIndex(s => s.name === name);
                            return <Line key={name} type="monotone" dataKey={name} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} connectNulls />;
                          })}
                        </LineChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div style={{ textAlign: "center", padding: "50px 0", color: "#555", fontSize: 13 }}>
                    {selectedMetrics.length ? "Not enough data points to chart." : "Select one or more metrics to chart."}
                  </div>
                )}
              </div>

              {/* Comparison table */}
              <div style={{ background: "#333333", border: "1px solid #484848", borderRadius: 12, padding: 24 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#CC5500", letterSpacing: 1, margin: "0 0 16px" }}>PERIOD COMPARISON</p>
                <div style={{ overflowX: "auto", border: "1px solid #3a3a3a", borderRadius: 8 }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 480 }}>
                    <thead>
                      <tr style={{ background: "#3a3a3a" }}>
                        <th style={{ padding: "10px 14px", textAlign: "left", color: "#CC5500", fontWeight: 700, fontSize: 11, position: "sticky", left: 0, background: "#3a3a3a" }}>METRIC</th>
                        {periods.map(p => (
                          <th key={p} style={{ padding: "10px 14px", textAlign: "right", color: "#ccc", fontWeight: 700, fontSize: 11, whiteSpace: "nowrap" }}>{p}</th>
                        ))}
                        <th style={{ padding: "10px 14px", textAlign: "right", color: "#CC5500", fontWeight: 700, fontSize: 11, whiteSpace: "nowrap" }}>Δ LATEST</th>
                      </tr>
                    </thead>
                    <tbody>
                      {series.map(s => {
                        const up = s.change !== null && s.change > 0;
                        const down = s.change !== null && s.change < 0;
                        return (
                          <tr key={s.name} style={{ borderTop: "1px solid #3a3a3a" }}>
                            <td style={{ padding: "10px 14px", color: "#f0f0f0", fontWeight: 600, textTransform: "capitalize", position: "sticky", left: 0, background: "#333333", whiteSpace: "nowrap" }}>{s.name}</td>
                            {s.values.map((v, i) => (
                              <td key={i} style={{ padding: "10px 14px", color: "#ccc", textAlign: "right", fontFamily: "monospace", whiteSpace: "nowrap" }}>
                                {v !== null && v !== undefined ? v.toLocaleString() : "–"}
                              </td>
                            ))}
                            <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 700, whiteSpace: "nowrap", color: up ? "#4caf50" : down ? "#e74c3c" : "#888" }}>
                              {s.changePct !== null ? `${up ? "▲" : down ? "▼" : ""} ${fmtPct(s.changePct)}` : "–"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {historicalContext && (
                  <div style={{ marginTop: 16, background: "#2a1800", border: "1px solid #CC5500", borderRadius: 8, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 13, color: "#f0a060" }}>Copy this history as context for a report or deep-dive</span>
                    <button
                      onClick={() => navigator.clipboard.writeText(historicalContext).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })}
                      style={{ background: copied ? "#1a3a1a" : "#2d2d2d", border: `1px solid ${copied ? "#2e7d32" : "#484848"}`, color: copied ? "#4caf50" : "#CC5500", borderRadius: 7, padding: "7px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
                      {copied ? "Copied!" : "Copy context"}
                    </button>
                  </div>
                )}
              </div>
            </>
          )
        )}

        {/* ===================== ANALYSES ===================== */}
        {tab === "analyses" && (
          analysesLoading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 70, borderRadius: 10 }} />)}
            </div>
          ) : analyses.length === 0 ? (
            <div style={{ background: "#333333", border: "2px dashed #484848", borderRadius: 16, padding: "56px 40px", textAlign: "center" }}>
              <div style={{ width: 52, height: 52, background: "#2a1800", border: "2px solid #CC5500", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, margin: "0 auto 18px" }}>📄</div>
              <p style={{ fontSize: 17, fontWeight: 800, color: "#f0f0f0", margin: "0 0 10px" }}>No analyses for this company yet</p>
              <p style={{ fontSize: 14, color: "#777", margin: "0 0 24px", lineHeight: 1.6, maxWidth: 400, marginLeft: "auto", marginRight: "auto" }}>
                Run an analysis scoped to {profile.name} — it&apos;ll use this company&apos;s history as context and show up here.
              </p>
              <Link href={`/dashboard?profile=${id}`} style={{ background: "#CC5500", color: "#fff", border: "none", borderRadius: 9, padding: "12px 28px", fontSize: 14, fontWeight: 700, textDecoration: "none" }}>Run analysis →</Link>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {analyses.map(item => (
                <div key={item.id} style={{ background: "#333333", border: "1px solid #484848", borderRadius: 10, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "#f0f0f0" }}>{item.org_name || item.label}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: item.mode === "advanced" ? "#CC5500" : "#888", background: item.mode === "advanced" ? "#2a1800" : "#3a3a3a", border: item.mode === "advanced" ? "1px solid #CC5500" : "none", padding: "2px 7px", borderRadius: 4, letterSpacing: 0.5 }}>{item.mode.toUpperCase()}</span>
                    </div>
                    <div style={{ display: "flex", gap: 12, fontSize: 12, color: "#555" }}>
                      <span>{item.file_name}</span>
                      <span>{new Date(item.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => downloadAnalysisPDF(item)} style={{ background: "#2d2d2d", border: "1px solid #484848", color: "#ccc", borderRadius: 7, padding: "7px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>PDF</button>
                    <button onClick={() => shareAnalysis(item)} disabled={shareLoading[item.id]}
                      style={{ background: shareTokens[item.id] ? "#1a3a1a" : "#2d2d2d", border: `1px solid ${shareTokens[item.id] ? "#2e7d32" : "#484848"}`, color: shareTokens[item.id] ? "#4caf50" : "#CC5500", borderRadius: 7, padding: "7px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                      {shareLoading[item.id] ? "…" : shareTokens[item.id] ? "Copy link" : "Share"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* ===================== DATA ===================== */}
        {tab === "data" && (
          <>
            {/* Upload panel */}
            <div style={{ background: "#333333", border: "1px solid #484848", borderRadius: 12, padding: 24, marginBottom: 24 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#CC5500", letterSpacing: 1, margin: "0 0 16px" }}>UPLOAD PERIOD DATA</p>
              {uploadError && <ErrorBanner title="Upload failed" message={uploadError} onDismiss={() => setUploadError("")} />}
              {uploadSuccess && (
                <div style={{ background: "#0d2a0d", border: "1px solid #27ae60", borderRadius: 8, padding: "10px 14px", marginBottom: 16 }}>
                  <p style={{ color: "#4caf50", fontSize: 13, margin: 0 }}>{uploadSuccess}</p>
                  {lastColumnMappings.length > 0 && (
                    <div style={{ marginTop: 10 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: "#27ae60", margin: "0 0 6px", letterSpacing: 0.5 }}>COLUMN NAME NORMALIZATIONS</p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {lastColumnMappings.map((m, i) => (
                          <span key={i} style={{ background: "#1a3a1a", border: "1px solid #2e7d32", borderRadius: 6, padding: "3px 8px", fontSize: 11, color: "#81c784" }}>{m.raw} → {m.canonical}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#888", marginBottom: 6 }}>Period label *</label>
                  <input value={periodLabel} onChange={e => setPeriodLabel(e.target.value)} placeholder="e.g. Q1 2024, Jan 2024, FY 2023" />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#888", marginBottom: 6 }}>Period type *</label>
                  <select value={periodType} onChange={e => setPeriodType(e.target.value as "monthly" | "quarterly" | "annual")}
                    style={{ width: "100%", background: "#3a3a3a", border: "1px solid #494949", borderRadius: 6, padding: "9px 10px", fontSize: 13, color: "#f0f0f0", boxSizing: "border-box" }}>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="annual">Annual</option>
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#888", marginBottom: 6 }}>Financial data file *</label>
                {uploadFile ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#2d2d2d", border: "1px solid #484848", borderRadius: 8, padding: "10px 14px" }}>
                    <span style={{ color: "#CC5500" }}>📄</span>
                    <span style={{ fontSize: 13, color: "#f0f0f0" }}>{uploadFile.name}</span>
                    <span style={{ fontSize: 12, color: "#666" }}>{(uploadFile.size / 1024).toFixed(1)} KB</span>
                    <button onClick={() => setUploadFile(null)} style={{ marginLeft: "auto", background: "none", border: "none", color: "#666", fontSize: 18, cursor: "pointer" }}>×</button>
                  </div>
                ) : (
                  <div onClick={() => fileInputRef.current?.click()} style={{ border: "2px dashed #484848", borderRadius: 8, padding: "20px", textAlign: "center", cursor: "pointer" }}>
                    <p style={{ fontSize: 13, color: "#666", margin: 0 }}>Click to select CSV or Excel file</p>
                    <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: "none" }} onChange={e => setUploadFile(e.target.files?.[0] ?? null)} />
                  </div>
                )}
              </div>
              <button onClick={handleUpload} disabled={uploading || !uploadFile || !periodLabel.trim()}
                style={{ background: "#CC5500", color: "#fff", border: "none", borderRadius: 8, padding: "11px 24px", fontSize: 14, fontWeight: 700, cursor: uploading || !uploadFile || !periodLabel.trim() ? "default" : "pointer", opacity: uploading || !uploadFile || !periodLabel.trim() ? 0.6 : 1 }}>
                {uploading ? "Uploading..." : "Upload Data"}
              </button>
            </div>

            {/* Uploads list */}
            {uploads.length > 0 ? (
              <div style={{ background: "#333333", border: "1px solid #484848", borderRadius: 12, padding: 24, marginBottom: 24 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#CC5500", letterSpacing: 1, margin: 0 }}>UPLOAD HISTORY</p>
                  <span style={{ fontSize: 11, color: "#555" }}>Drag rows to set chronological order</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {uploads.map((u, i) => (
                    <div key={u.id} draggable onDragStart={() => handleDragStart(i)} onDragEnter={() => handleDragEnter(i)} onDragEnd={handleDragEnd} onDragOver={e => e.preventDefault()}
                      style={{ background: "#2d2d2d", border: "1px solid #3a3a3a", borderRadius: 8, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, cursor: "grab", userSelect: "none" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 3, flexShrink: 0, opacity: 0.4 }}>
                        <div style={{ width: 14, height: 2, background: "#888", borderRadius: 1 }} />
                        <div style={{ width: 14, height: 2, background: "#888", borderRadius: 1 }} />
                        <div style={{ width: 14, height: 2, background: "#888", borderRadius: 1 }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: "#f0f0f0" }}>{u.period_label}</span>
                          <span style={{ fontSize: 10, fontWeight: 700, color: "#888", background: "#3a3a3a", padding: "2px 7px", borderRadius: 3, letterSpacing: 0.5 }}>{u.period_type.toUpperCase()}</span>
                        </div>
                        <div style={{ display: "flex", gap: 12, fontSize: 12, color: "#555" }}>
                          <span>{u.row_count} rows</span>
                          <span>{u.column_headers?.length ?? 0} columns</span>
                          <span>{new Date(u.uploaded_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                        </div>
                      </div>
                      <button onClick={e => { e.stopPropagation(); deleteUpload(u.id); }} disabled={deletingUploadId === u.id} title="Delete upload"
                        style={{ background: "none", border: "none", color: "#555", fontSize: 18, lineHeight: 1, cursor: "pointer", padding: "4px 6px", borderRadius: 4, flexShrink: 0 }}
                        onMouseEnter={e => (e.currentTarget.style.color = "#e74c3c")} onMouseLeave={e => (e.currentTarget.style.color = "#555")}>
                        {deletingUploadId === u.id ? "…" : "×"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ background: "#333333", border: "2px dashed #484848", borderRadius: 16, padding: "48px 40px", textAlign: "center", marginBottom: 24 }}>
                <p style={{ fontSize: 15, fontWeight: 700, color: "#f0f0f0", margin: "0 0 8px" }}>No uploads yet</p>
                <p style={{ fontSize: 13, color: "#777", margin: 0 }}>Upload your first CSV above to start tracking this company.</p>
              </div>
            )}

            {/* Danger zone */}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button onClick={deleteProfile} disabled={deleting}
                style={{ background: "none", border: "1px solid #5c1a1a", color: "#e74c3c", borderRadius: 7, padding: "8px 18px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                {deleting ? "Deleting..." : "Delete Company"}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Share toast */}
      {shareToast && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: "#1a3a1a", border: "1px solid #2e7d32", color: "#4caf50", borderRadius: 9, padding: "12px 20px", fontSize: 14, fontWeight: 600, zIndex: 300, boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
          Share link copied to clipboard
        </div>
      )}
    </div>
  );
}
