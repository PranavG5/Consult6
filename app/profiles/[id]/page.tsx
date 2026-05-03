"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import ErrorBanner from "@/app/components/ErrorBanner";

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
}

const COLORS = ["#CC5500", "#2980b9", "#27ae60", "#d4a017", "#9b59b6", "#e74c3c", "#1abc9c", "#e67e22"];

export default function ProfileDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [profile, setProfile] = useState<{ id: string; name: string; sector: string; created_at: string } | null>(null);
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

  // Metrics
  const [periods, setPeriods] = useState<string[]>([]);
  const [series, setSeries] = useState<MetricSeries[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<string>("");
  const [historicalContext, setHistoricalContext] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [metricsLoading, setMetricsLoading] = useState(false);

  // Drag-and-drop reordering
  const dragItem = useRef<number | null>(null);
  const dragOver = useRef<number | null>(null);

  useEffect(() => {
    fetchProfile();
    fetchMetrics();
  }, [id]);

  async function fetchProfile() {
    setLoading(true);
    try {
      const res = await fetch(`/api/profiles/${id}`);
      if (!res.ok) { router.push("/profiles"); return; }
      const json = await res.json();
      setProfile(json.profile);
      setUploads(json.uploads ?? []);
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
      setSeries(json.series ?? []);
      setHistoricalContext(json.historicalContext ?? "");
      if (json.series?.length && !selectedMetric) {
        setSelectedMetric(json.series[0]?.name ?? "");
      }
    } finally {
      setMetricsLoading(false);
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

  function handleDragStart(index: number) {
    dragItem.current = index;
  }

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
    // Persist new order
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

  const selectedSeries = series.find(s => s.name === selectedMetric);
  const chartData = periods.map((period, i) => ({
    period,
    value: selectedSeries?.values[i] ?? null,
  }));

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#272727" }}>
        {/* Navbar skeleton */}
        <nav style={{ background: "#1e1e1e", borderBottom: "1px solid #3a3a3a", padding: "0 24px", height: 56, display: "flex", alignItems: "center" }}>
          <div className="skeleton" style={{ width: 32, height: 32, borderRadius: 7, marginRight: 10 }} />
          <div className="skeleton" style={{ width: 80, height: 16, borderRadius: 4 }} />
        </nav>
        <div style={{ maxWidth: 860, margin: "0 auto", padding: "40px 20px" }}>
          {/* Header skeleton */}
          <div style={{ marginBottom: 32 }}>
            <div className="skeleton" style={{ height: 28, width: 220, borderRadius: 6, marginBottom: 10 }} />
            <div className="skeleton" style={{ height: 13, width: 140, borderRadius: 4 }} />
          </div>
          {/* Upload panel skeleton */}
          <div style={{ background: "#333333", border: "1px solid #484848", borderRadius: 12, padding: 24, marginBottom: 24 }}>
            <div className="skeleton" style={{ height: 11, width: 120, borderRadius: 4, marginBottom: 16 }} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
              <div className="skeleton" style={{ height: 38, borderRadius: 6 }} />
              <div className="skeleton" style={{ height: 38, borderRadius: 6 }} />
            </div>
            <div className="skeleton" style={{ height: 60, borderRadius: 8, marginBottom: 16 }} />
            <div className="skeleton" style={{ height: 38, width: 120, borderRadius: 8 }} />
          </div>
          {/* Metric selector skeleton */}
          <div style={{ background: "#333333", border: "1px solid #484848", borderRadius: 12, padding: 24, marginBottom: 24 }}>
            <div className="skeleton" style={{ height: 11, width: 120, borderRadius: 4, marginBottom: 16 }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="skeleton" style={{ height: 32, borderRadius: 20, width: `${60 + i * 8}%` }} />
              ))}
            </div>
            {/* Chart area skeleton */}
            <div className="skeleton" style={{ height: 240, borderRadius: 8, marginBottom: 20 }} />
          </div>
          {/* Uploads table skeleton */}
          <div style={{ background: "#333333", border: "1px solid #484848", borderRadius: 12, padding: 24 }}>
            <div className="skeleton" style={{ height: 11, width: 120, borderRadius: 4, marginBottom: 16 }} />
            {[1, 2, 3].map(i => (
              <div key={i} className="skeleton" style={{ height: 56, borderRadius: 8, marginBottom: 8 }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div style={{ minHeight: "100vh", background: "#272727" }}>
      {/* Navbar */}
      <nav style={{ background: "#1e1e1e", borderBottom: "1px solid #3a3a3a", padding: "0 24px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <div style={{ width: 32, height: 32, background: "#CC5500", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16, color: "#fff" }}>6</div>
            <span style={{ fontWeight: 700, fontSize: 16, color: "#f0f0f0" }}>Consult6</span>
          </Link>
          <span style={{ color: "#484848" }}>/</span>
          <Link href="/profiles" style={{ fontSize: 13, color: "#888", textDecoration: "none" }}>Profiles</Link>
          <span style={{ color: "#484848" }}>/</span>
          <span style={{ fontSize: 14, color: "#CC5500", fontWeight: 600 }}>{profile.name}</span>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <Link href="/dashboard" style={{ background: "none", border: "1px solid #484848", color: "#aaa", borderRadius: 6, padding: "4px 14px", fontSize: 12, textDecoration: "none" }}>Dashboard</Link>
        </div>
      </nav>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "40px 20px" }}>
        {/* Profile header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: "#f0f0f0", margin: "0 0 6px" }}>{profile.name}</h1>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <span style={{ fontSize: 13, color: "#888" }}>{profile.sector}</span>
              <span style={{ color: "#484848" }}>·</span>
              <span style={{ fontSize: 13, color: "#555" }}>{uploads.length} {uploads.length === 1 ? "upload" : "uploads"}</span>
            </div>
          </div>
          <button
            onClick={deleteProfile}
            disabled={deleting}
            style={{ background: "none", border: "1px solid #5c1a1a", color: "#e74c3c", borderRadius: 7, padding: "7px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            {deleting ? "Deleting..." : "Delete Profile"}
          </button>
        </div>

        {/* Upload panel */}
        <div style={{ background: "#333333", border: "1px solid #484848", borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#CC5500", letterSpacing: 1, margin: "0 0 16px" }}>UPLOAD PERIOD DATA</p>

          {uploadError && (
            <ErrorBanner
              title="Upload failed"
              message={uploadError}
              onDismiss={() => setUploadError("")}
            />
          )}
          {uploadSuccess && (
            <div style={{ background: "#0d2a0d", border: "1px solid #27ae60", borderRadius: 8, padding: "10px 14px", color: "#4caf50", fontSize: 13, marginBottom: 16 }}>
              {uploadSuccess}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#888", marginBottom: 6 }}>Period label *</label>
              <input
                value={periodLabel}
                onChange={e => setPeriodLabel(e.target.value)}
                placeholder="e.g. Q1 2024, Jan 2024, FY 2023" />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#888", marginBottom: 6 }}>Period type *</label>
              <select
                value={periodType}
                onChange={e => setPeriodType(e.target.value as "monthly" | "quarterly" | "annual")}
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
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{ border: "2px dashed #484848", borderRadius: 8, padding: "20px", textAlign: "center", cursor: "pointer" }}>
                <p style={{ fontSize: 13, color: "#666", margin: 0 }}>Click to select CSV or Excel file</p>
                <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: "none" }}
                  onChange={e => setUploadFile(e.target.files?.[0] ?? null)} />
              </div>
            )}
          </div>

          <button
            onClick={handleUpload}
            disabled={uploading || !uploadFile || !periodLabel.trim()}
            style={{ background: "#CC5500", color: "#fff", border: "none", borderRadius: 8, padding: "11px 24px", fontSize: 14, fontWeight: 700, cursor: uploading || !uploadFile || !periodLabel.trim() ? "default" : "pointer", opacity: uploading || !uploadFile || !periodLabel.trim() ? 0.6 : 1 }}>
            {uploading ? "Uploading..." : "Upload Data"}
          </button>
        </div>

        {/* Metric Explorer */}
        {series.length > 0 && (
          <div style={{ background: "#333333", border: "1px solid #484848", borderRadius: 12, padding: 24, marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#CC5500", letterSpacing: 1, margin: 0 }}>METRIC EXPLORER</p>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <select
                  value={selectedMetric}
                  onChange={e => setSelectedMetric(e.target.value)}
                  style={{ background: "#3a3a3a", border: "1px solid #494949", borderRadius: 6, padding: "6px 10px", fontSize: 13, color: "#f0f0f0" }}>
                  {series.map(s => (
                    <option key={s.name} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Line chart */}
            {chartData.some(d => d.value !== null) ? (
              <div style={{ height: 240, marginBottom: 20 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#3a3a3a" />
                    <XAxis dataKey="period" tick={{ fill: "#888", fontSize: 11 }} axisLine={{ stroke: "#484848" }} tickLine={false} />
                    <YAxis tick={{ fill: "#888", fontSize: 11 }} axisLine={{ stroke: "#484848" }} tickLine={false} width={60} />
                    <Tooltip
                      contentStyle={{ background: "#2d2d2d", border: "1px solid #484848", borderRadius: 8 }}
                      labelStyle={{ color: "#f0f0f0", fontWeight: 700, marginBottom: 4 }}
                      itemStyle={{ color: "#CC5500" }} />
                    <Line
                      type="monotone"
                      dataKey="value"
                      name={selectedMetric}
                      stroke="#CC5500"
                      strokeWidth={2}
                      dot={{ r: 4, fill: "#CC5500" }}
                      activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#555", fontSize: 13 }}>Not enough data points to chart.</div>
            )}

            {/* Data table */}
            <div style={{ background: "#2d2d2d", border: "1px solid #3a3a3a", borderRadius: 8, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#3a3a3a" }}>
                    <th style={{ padding: "10px 14px", textAlign: "left", color: "#CC5500", fontWeight: 700, fontSize: 11 }}>PERIOD</th>
                    <th style={{ padding: "10px 14px", textAlign: "right", color: "#CC5500", fontWeight: 700, fontSize: 11 }}>{selectedMetric}</th>
                  </tr>
                </thead>
                <tbody>
                  {periods.map((period, i) => {
                    const val = selectedSeries?.values[i];
                    return (
                      <tr key={period} style={{ borderTop: "1px solid #3a3a3a" }}>
                        <td style={{ padding: "10px 14px", color: "#f0f0f0" }}>{period}</td>
                        <td style={{ padding: "10px 14px", color: "#ccc", textAlign: "right", fontFamily: "monospace" }}>
                          {val !== null && val !== undefined ? val.toLocaleString() : "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Historical context copy */}
            {historicalContext && (
              <div style={{ marginTop: 16, background: "#2a1800", border: "1px solid #CC5500", borderRadius: 8, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <span style={{ fontSize: 13, color: "#f0a060" }}>Copy historical context to use in a report or deep-dive</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(historicalContext).then(() => {
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    });
                  }}
                  style={{ background: copied ? "#1a3a1a" : "#2d2d2d", border: `1px solid ${copied ? "#2e7d32" : "#484848"}`, color: copied ? "#4caf50" : "#CC5500", borderRadius: 7, padding: "7px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.2s" }}>
                  {copied ? "Copied!" : "Copy Context"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Empty state for no uploads */}
        {uploads.length === 0 && !metricsLoading && (
          <div style={{ background: "#333333", border: "2px dashed #484848", borderRadius: 16, padding: "48px 40px", textAlign: "center", marginBottom: 24 }}>
            <div style={{ width: 52, height: 52, background: "#2a1800", border: "2px solid #CC5500", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, margin: "0 auto 18px" }}>
              📊
            </div>
            <p style={{ fontSize: 17, fontWeight: 800, color: "#f0f0f0", margin: "0 0 10px" }}>No data uploaded yet</p>
            <p style={{ fontSize: 14, color: "#777", margin: "0 0 24px", lineHeight: 1.6, maxWidth: 360, marginLeft: "auto", marginRight: "auto" }}>
              Upload your first CSV to start tracking this organization&apos;s metrics over time.
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{ background: "#CC5500", color: "#fff", border: "none", borderRadius: 9, padding: "12px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
              Upload Data
            </button>
          </div>
        )}

        {/* Uploads list with drag-to-reorder */}
        {uploads.length > 0 && (
          <div style={{ background: "#333333", border: "1px solid #484848", borderRadius: 12, padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#CC5500", letterSpacing: 1, margin: 0 }}>UPLOAD HISTORY</p>
              <span style={{ fontSize: 11, color: "#555" }}>Drag rows to set chronological order</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {uploads.map((u, i) => (
                <div
                  key={u.id}
                  draggable
                  onDragStart={() => handleDragStart(i)}
                  onDragEnter={() => handleDragEnter(i)}
                  onDragEnd={handleDragEnd}
                  onDragOver={e => e.preventDefault()}
                  style={{ background: "#2d2d2d", border: "1px solid #3a3a3a", borderRadius: 8, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, cursor: "grab", userSelect: "none" }}>
                  {/* Drag handle */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 3, flexShrink: 0, opacity: 0.4 }}>
                    <div style={{ width: 14, height: 2, background: "#888", borderRadius: 1 }} />
                    <div style={{ width: 14, height: 2, background: "#888", borderRadius: 1 }} />
                    <div style={{ width: 14, height: 2, background: "#888", borderRadius: 1 }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "#f0f0f0" }}>{u.period_label}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: "#888", background: "#3a3a3a", padding: "2px 7px", borderRadius: 3, letterSpacing: 0.5 }}>
                        {u.period_type.toUpperCase()}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 12, fontSize: 12, color: "#555" }}>
                      <span>{u.row_count} rows</span>
                      <span>{u.column_headers?.length ?? 0} columns</span>
                      <span>{new Date(u.uploaded_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                    </div>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); deleteUpload(u.id); }}
                    disabled={deletingUploadId === u.id}
                    title="Delete upload"
                    style={{ background: "none", border: "none", color: "#555", fontSize: 18, lineHeight: 1, cursor: "pointer", padding: "4px 6px", borderRadius: 4, flexShrink: 0, transition: "color 0.15s" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "#e74c3c")}
                    onMouseLeave={e => (e.currentTarget.style.color = "#555")}>
                    {deletingUploadId === u.id ? "…" : "×"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
