"use client";
import { useEffect, useRef, useState } from "react";
import { generatePDF, type AnalysisResult } from "@/lib/generateReport";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import Link from "next/link";
import ErrorBanner from "@/app/components/ErrorBanner";
import BrandLink from "@/components/BrandLink";
import { createSampleFile, SAMPLE_ORG_NAME } from "@/lib/sampleData";

type State = "idle" | "uploading" | "analyzing" | "done" | "error";

const GUEST_USED_KEY = "consult6_guest_used";
const GUEST_PENDING_KEY = "consult6_guest_pending";

function parseCSV(text: string) {
  const r = Papa.parse(text, { header: true, skipEmptyLines: true });
  return { headers: r.meta.fields ?? [], rows: r.data as Record<string, string>[] };
}
function parseXLSX(buf: ArrayBuffer) {
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const json = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: "" });
  return { headers: json.length > 0 ? Object.keys(json[0]) : [], rows: json };
}
async function parseFile(file: File) {
  if (file.name.endsWith(".csv") || file.type === "text/csv") {
    const text = await file.text();
    return { rawText: text, ...parseCSV(text) };
  }
  const buf = await file.arrayBuffer();
  const p = parseXLSX(buf);
  const rawText = p.headers.join(",") + "\n" + p.rows.map(r => p.headers.map(h => r[h] ?? "").join(",")).join("\n");
  return { rawText, ...p };
}

const sevStyle: Record<string, { bg: string; border: string; label: string; labelBg: string }> = {
  critical: { bg: "#2d1010", border: "#c0392b", label: "CRITICAL", labelBg: "#c0392b" },
  warning: { bg: "#2d2000", border: "#d4a017", label: "WARNING", labelBg: "#d4a017" },
  info: { bg: "#0f1e30", border: "#2980b9", label: "INFO", labelBg: "#2980b9" },
};

function parseDeepDive(text: string): { title: string; content: string }[] {
  const sections: { title: string; content: string }[] = [];
  const lines = text.split("\n");
  let current: { title: string; lines: string[] } | null = null;
  for (const line of lines) {
    if (line.startsWith("## ")) {
      if (current) sections.push({ title: current.title, content: current.lines.join("\n").trim() });
      current = { title: line.slice(3).trim(), lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) sections.push({ title: current.title, content: current.lines.join("\n").trim() });
  return sections;
}

export default function TryPage() {
  const [alreadyUsed, setAlreadyUsed] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [orgName, setOrgName] = useState("");
  const [state, setState] = useState<State>("idle");
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [dragging, setDragging] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalReason, setModalReason] = useState<"pdf" | "advanced">("pdf");
  const [outputMode, setOutputMode] = useState<"report" | "deepdive">("report");
  const [metric, setMetric] = useState("");
  const [deepDiveResult, setDeepDiveResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setAlreadyUsed(!!localStorage.getItem(GUEST_USED_KEY));
    }
  }, []);

  function startProgress(from: number, to: number, ms: number) {
    if (progressRef.current) clearInterval(progressRef.current);
    setProgress(from);
    const steps = 60;
    const stepMs = ms / steps;
    let step = 0;
    progressRef.current = setInterval(() => {
      step++;
      const t = step / steps;
      setProgress(from + (to - from) * (1 - Math.pow(1 - t, 2)));
      if (step >= steps) clearInterval(progressRef.current!);
    }, stepMs);
  }
  function stopProgress() {
    if (progressRef.current) clearInterval(progressRef.current);
    progressRef.current = null;
  }

  function handleFiles(newFiles: File[]) {
    const maxBytes = 5 * 1024 * 1024;
    const valid = newFiles.filter(f => {
      const validType = f.name.endsWith(".csv") || f.name.endsWith(".xlsx") || f.name.endsWith(".xls") || f.type === "text/csv";
      if (!validType) {
        setErrorMsg("This file type isn't supported. Please upload a CSV or Excel file (.csv, .xlsx, .xls).");
        return false;
      }
      if (f.size > maxBytes) {
        setErrorMsg("This file is too large. Consult6 supports files up to 5MB. Try removing unused columns or splitting into smaller date ranges.");
        return false;
      }
      return true;
    });
    setFiles(prev => [...prev, ...valid].slice(0, 1));
  }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    handleFiles(Array.from(e.dataTransfer.files));
  }

  async function runAnalysis() {
    if (!files.length) return;
    setState("uploading");
    setErrorMsg("");
    setAnalysis(null);
    stopProgress();
    setProgress(2);

    try {
      const parsed = await parseFile(files[0]);
      setState("analyzing");
      setProgress(5);

      const fd = new FormData();
      fd.append("data", parsed.rawText);
      fd.append("files", files[0]);
      fd.append("orgName", orgName);

      const res = await fetch("/api/analyze-guest", { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Analysis failed" }));
        throw new Error(err.error ?? "Analysis failed");
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let raw = "";
      const estimatedTotal = 1200; // chars for guest basic analysis
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        raw += decoder.decode(value, { stream: true });
        const chunkProgress = Math.min(90, 5 + (raw.length / estimatedTotal) * 85);
        setProgress(chunkProgress);
      }
      raw += decoder.decode();
      setProgress(95);
      if (raw.includes("__STREAM_ERROR__")) throw new Error("__ANTHROPIC_ERROR__");

      const jsonStart = raw.indexOf("{");
      const jsonEnd = raw.lastIndexOf("}");
      if (jsonStart === -1 || jsonEnd === -1) throw new Error("__EMPTY_RESPONSE__");

      const result: AnalysisResult = JSON.parse(raw.slice(jsonStart, jsonEnd + 1));
      if (!result.summary && !result.flags?.length) throw new Error("__EMPTY_RESPONSE__");
      setAnalysis(result);

      // Mark guest trial as used
      localStorage.setItem(GUEST_USED_KEY, "1");
      setAlreadyUsed(true);

      stopProgress();
      setProgress(100);
      setState("done");
    } catch (err) {
      stopProgress();
      setProgress(0);
      const raw = err instanceof Error ? err.message : "Something went wrong.";
      if (raw === "__ANTHROPIC_ERROR__" || raw.toLowerCase().includes("anthropic")) {
        setErrorMsg("Something went wrong with the analysis. Please try again in a moment.");
      } else if (raw === "__EMPTY_RESPONSE__" || raw.toLowerCase().includes("invalid response")) {
        setErrorMsg("The analysis came back incomplete. Please try again. If the issue persists, try a smaller file.");
      } else if (raw.toLowerCase().includes("failed to fetch") || raw.toLowerCase().includes("networkerror")) {
        setErrorMsg("Something went wrong. Check your connection and try again.");
      } else {
        setErrorMsg(raw);
      }
      setState("error");
    }
  }

  async function runDeepDive() {
    if (!files.length || !metric.trim()) return;
    setState("uploading");
    setErrorMsg("");
    setDeepDiveResult(null);
    stopProgress();
    setProgress(2);

    try {
      const parsed = await parseFile(files[0]);
      setState("analyzing");
      setProgress(5);

      const fd = new FormData();
      fd.append("data", parsed.rawText);
      fd.append("files", files[0]);
      fd.append("orgName", orgName);
      fd.append("metric", metric);

      const res = await fetch("/api/deep-dive-guest", { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Analysis failed" }));
        throw new Error(err.error ?? "Analysis failed");
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let raw = "";
      const estimatedTotal = 1500;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        raw += decoder.decode(value, { stream: true });
        const chunkProgress = Math.min(90, 5 + (raw.length / estimatedTotal) * 85);
        setProgress(chunkProgress);
      }
      raw += decoder.decode();
      setProgress(95);

      if (raw.includes("__STREAM_ERROR__")) {
        const marker = "__STREAM_ERROR__:";
        const idx = raw.indexOf(marker);
        const detail = idx !== -1 ? raw.slice(idx + marker.length).trim() : "";
        throw new Error(detail || "Analysis failed on server.");
      }

      setDeepDiveResult(raw.trim());
      localStorage.setItem(GUEST_USED_KEY, "1");
      setAlreadyUsed(true);
      stopProgress();
      setProgress(100);
      setState("done");
    } catch (err) {
      stopProgress();
      setProgress(0);
      const raw = err instanceof Error ? err.message : "Something went wrong.";
      if (raw.toLowerCase().includes("failed to fetch") || raw.toLowerCase().includes("networkerror")) {
        setErrorMsg("Something went wrong. Check your connection and try again.");
      } else {
        setErrorMsg(raw || "Something went wrong with the analysis. Please try again in a moment.");
      }
      setState("error");
    }
  }

  function handleAdvancedClick() {
    setModalReason("advanced");
    setShowModal(true);
  }

  function handleDownloadClick() {
    setModalReason("pdf");
    // Save pending analysis to localStorage for post-signup transfer
    if (analysis) {
      const label = orgName.trim() || files[0]?.name || "Guest Analysis";
      localStorage.setItem(GUEST_PENDING_KEY, JSON.stringify({
        label,
        mode: "basic",
        orgName,
        fileName: files[0]?.name ?? "",
        analysisResult: analysis,
        createdAt: new Date().toISOString(),
      }));
    }
    setShowModal(true);
  }

  const isRunning = state === "uploading" || state === "analyzing";

  if (alreadyUsed && state !== "done") {
    return (
      <div style={{ minHeight: "100vh", background: "#272727", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ background: "#333333", border: "1px solid #484848", borderRadius: 14, padding: 40, maxWidth: 420, textAlign: "center" }}>
          <div style={{ width: 48, height: 48, background: "#CC5500", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 22, color: "#fff", margin: "0 auto 20px" }}>6</div>
          <p style={{ fontSize: 20, fontWeight: 700, color: "#f0f0f0", margin: "0 0 10px" }}>Free trial already used</p>
          <p style={{ fontSize: 14, color: "#888", margin: "0 0 28px", lineHeight: 1.6 }}>Create a free account to keep running analyses and download your reports.</p>
          <Link href="/auth/signup" style={{ display: "block", background: "#CC5500", color: "#fff", fontSize: 15, fontWeight: 700, textDecoration: "none", padding: "13px 0", borderRadius: 9, marginBottom: 10 }}>Create Free Account</Link>
          <Link href="/auth/login" style={{ display: "block", background: "#2d2d2d", border: "1px solid #484848", color: "#ccc", fontSize: 14, fontWeight: 600, textDecoration: "none", padding: "11px 0", borderRadius: 9 }}>Sign In</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#272727" }}>
      <style>{`input::placeholder, textarea::placeholder { color: #4a4a4a !important; }`}</style>
      {/* Navbar */}
      <nav style={{ background: "#1e1e1e", borderBottom: "1px solid #3a3a3a", padding: "0 24px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <BrandLink style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, background: "#CC5500", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16, color: "#fff" }}>6</div>
          <span style={{ fontWeight: 700, fontSize: 16, color: "#f0f0f0" }}>Consult6</span>
        </BrandLink>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ background: "#2a1800", color: "#CC5500", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>GUEST TRIAL</span>
          <Link href="/auth/signup" style={{ background: "#CC5500", color: "#fff", fontSize: 13, fontWeight: 600, textDecoration: "none", padding: "6px 14px", borderRadius: 7 }}>Create Account</Link>
        </div>
      </nav>

      <main style={{ maxWidth: 760, margin: "40px auto", padding: "0 20px" }}>
        {/* Mode selector */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: "#888", letterSpacing: 1, marginBottom: 10 }}>ANALYSIS TYPE</p>
          <div className="mode-selector">
            {/* Basic - active */}
            <div style={{ background: "#2a1800", border: "2px solid #CC5500", borderRadius: 10, padding: "14px 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <span style={{ fontWeight: 700, fontSize: 15, color: "#f0f0f0" }}>Basic</span>
                <span style={{ background: "#CC5500", color: "#fff", fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 4 }}>TRIAL</span>
              </div>
              <p style={{ fontSize: 12, color: "#888", margin: 0 }}>Single file · Standard flags & recommendations · PDF report</p>
            </div>
            {/* Advanced - locked */}
            <button onClick={handleAdvancedClick}
              style={{ background: "#333333", border: "2px solid #484848", borderRadius: 10, padding: "14px 16px", textAlign: "left", cursor: "pointer", position: "relative" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <span style={{ fontWeight: 700, fontSize: 15, color: "#666" }}>Advanced</span>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span style={{ background: "#2a1800", color: "#CC5500", fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4 }}>AI+</span>
                  <span style={{ fontSize: 12, color: "#555" }}>🔒</span>
                </div>
              </div>
              <p style={{ fontSize: 12, color: "#555", margin: 0 }}>Up to 3 files · Trend charts · Industry benchmarks · Case studies · Scenarios</p>
            </button>
          </div>
        </div>

        <div style={{ background: "#333333", border: "1px solid #484848", borderRadius: 12, padding: 28 }}>
          {state === "done" && (
            <div style={{ marginBottom: 20 }}>
              <button onClick={() => { setState("idle"); setAnalysis(null); setDeepDiveResult(null); setFiles([]); setOrgName(""); setMetric(""); setCopied(false); setProgress(0); }}
                style={{ width: "100%", background: "#2d2d2d", border: "1px solid #5a5a5a", color: "#ccc", borderRadius: 9, padding: "11px 0", fontSize: 14, fontWeight: 600 }}>
                ← New Analysis
              </button>
            </div>
          )}

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#ccc", marginBottom: 8 }}>Organization name</label>
            <input value={orgName} onChange={e => setOrgName(e.target.value)} placeholder="e.g. Acme Corp" disabled={isRunning || state === "done"} />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#ccc", marginBottom: 8 }}>Financial data</label>
            {files.map((f, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#2d2d2d", border: "1px solid #484848", borderRadius: 8, padding: "10px 14px", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ color: "#CC5500", fontSize: 18 }}>📄</span>
                  <span style={{ fontSize: 13, color: "#f0f0f0" }}>{f.name}</span>
                  <span style={{ fontSize: 12, color: "#666" }}>{(f.size / 1024).toFixed(1)} KB</span>
                </div>
                {!isRunning && state !== "done" && (
                  <button onClick={() => setFiles([])} style={{ background: "none", border: "none", color: "#666", fontSize: 18, padding: "0 4px" }}>×</button>
                )}
              </div>
            ))}
            {files.length === 0 && !isRunning && state !== "done" && (
              <div onDrop={handleDrop} onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)}
                onClick={() => fileInputRef.current?.click()}
                style={{ border: `2px dashed ${dragging ? "#CC5500" : "#484848"}`, borderRadius: 10, padding: "28px 20px", textAlign: "center", cursor: "pointer", background: dragging ? "#2a1800" : "transparent" }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>↑</div>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#ccc", margin: 0 }}>Upload financial data</p>
                <p style={{ fontSize: 12, color: "#666", margin: "4px 0 0" }}>CSV or Excel · Up to 5 MB</p>
                <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: "none" }} onChange={e => handleFiles(Array.from(e.target.files ?? []))} />
              </div>
            )}
            {files.length === 0 && !isRunning && state !== "done" && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
                <div style={{ flex: 1, height: 1, background: "#3a3a3a" }} />
                <button
                  type="button"
                  onClick={() => { setFiles([createSampleFile()]); setOrgName(SAMPLE_ORG_NAME); }}
                  style={{ background: "none", border: "1px solid #484848", color: "#CC5500", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
                  ✨ Try with sample data
                </button>
                <div style={{ flex: 1, height: 1, background: "#3a3a3a" }} />
              </div>
            )}
          </div>

          {/* Output mode toggle */}
          {state !== "done" && !isRunning && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "inline-flex", background: "#2d2d2d", border: "1px solid #484848", borderRadius: 8, padding: 3 }}>
                <button
                  onClick={() => setOutputMode("report")}
                  style={{ background: outputMode === "report" ? "#CC5500" : "transparent", color: outputMode === "report" ? "#fff" : "#888", border: "none", borderRadius: 6, padding: "7px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}>
                  Full Report
                </button>
                <button
                  onClick={() => setOutputMode("deepdive")}
                  style={{ background: outputMode === "deepdive" ? "#CC5500" : "transparent", color: outputMode === "deepdive" ? "#fff" : "#888", border: "none", borderRadius: 6, padding: "7px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}>
                  Deep-Dive
                </button>
              </div>
            </div>
          )}

          {/* Metric input (deep-dive only) */}
          {outputMode === "deepdive" && state !== "done" && !isRunning && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#ccc", marginBottom: 8 }}>Which metric do you want to focus on?</label>
              <input
                value={metric}
                onChange={e => setMetric(e.target.value)}
                placeholder="e.g. revenue, cash reserves, payroll costs, inventory, donor count, membership dues"
                style={{ width: "100%", boxSizing: "border-box" }} />
            </div>
          )}

          {isRunning && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ height: 6, background: "#484848", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", background: "#CC5500", borderRadius: 3, width: `${progress}%`, transition: "width 0.3s ease" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 12, color: "#666" }}>
                <span>{state === "uploading" ? "Parsing file..." : "Analyzing with AI..."}</span>
                <span>{Math.round(progress)}%</span>
              </div>
            </div>
          )}

          {state === "error" && errorMsg && (
            <ErrorBanner
              title="Analysis failed"
              message={errorMsg}
              onDismiss={() => { setErrorMsg(""); setState("idle"); }}
            />
          )}

          {/* Deep-dive result */}
          {state === "done" && outputMode === "deepdive" && deepDiveResult && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ background: "#2a1800", border: "1px solid #CC5500", borderRadius: 8, padding: "8px 14px", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: "#CC5500", letterSpacing: 1 }}>DEEP-DIVE</span>
                <span style={{ fontSize: 13, color: "#f0a060", fontWeight: 600 }}>{metric}</span>
              </div>
              {parseDeepDive(deepDiveResult).map((section, i) => (
                <div key={i} style={{ background: "#2d2d2d", border: "1px solid #484848", borderRadius: 8, padding: "14px 16px", marginBottom: 10 }}>
                  <p style={{ fontSize: 11, fontWeight: 800, color: "#CC5500", letterSpacing: 1, margin: "0 0 8px" }}>{section.title}</p>
                  <div style={{ fontSize: 13, color: "#ccc", lineHeight: 1.7, margin: 0, whiteSpace: "pre-wrap" }}>{section.content}</div>
                </div>
              ))}
              <button
                onClick={() => {
                  navigator.clipboard.writeText(deepDiveResult).then(() => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  });
                }}
                style={{ marginTop: 4, background: copied ? "#1a3a1a" : "#2d2d2d", border: `1px solid ${copied ? "#2e7d32" : "#484848"}`, color: copied ? "#4caf50" : "#888", borderRadius: 7, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}>
                {copied ? "Copied!" : "Copy to Clipboard"}
              </button>
            </div>
          )}

          {state === "done" && outputMode === "report" && analysis && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ background: "#2d2d2d", border: "1px solid #484848", borderRadius: 10, padding: 16, marginBottom: 16 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#CC5500", letterSpacing: 1, marginBottom: 8 }}>EXECUTIVE SUMMARY</p>
                <p style={{ fontSize: 14, color: "#e0e0e0", lineHeight: 1.6, margin: 0 }}>{analysis.summary}</p>
              </div>
              {analysis.flags.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#888", letterSpacing: 1, marginBottom: 10 }}>FINANCIAL FLAGS</p>
                  {analysis.flags.map((flag, i) => {
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
              {analysis.recommendations.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#888", letterSpacing: 1, marginBottom: 10 }}>RECOMMENDATIONS</p>
                  {analysis.recommendations.map((rec, i) => (
                    <div key={i} style={{ background: "#2d2d2d", border: "1px solid #484848", borderRadius: 8, padding: "12px 14px", marginBottom: 8, display: "flex", gap: 12 }}>
                      <div style={{ minWidth: 24, height: 24, background: "#CC5500", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12, color: "#fff", flexShrink: 0 }}>{i + 1}</div>
                      <div>
                        <p style={{ fontWeight: 700, fontSize: 13, color: "#f0f0f0", margin: "0 0 4px" }}>{rec.title}</p>
                        <p style={{ fontSize: 13, color: "#ccc", margin: 0, lineHeight: 1.5 }}>{rec.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ background: "#2d2d2d", border: "1px solid #484848", borderRadius: 8, padding: "12px 14px" }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#888", letterSpacing: 1, marginBottom: 6 }}>FINANCIAL TRAJECTORY</p>
                <p style={{ fontSize: 13, color: "#ccc", margin: 0, fontStyle: "italic", lineHeight: 1.5 }}>{analysis.trajectoryNote}</p>
              </div>
            </div>
          )}

          <div>
            {state === "done" && outputMode === "report" ? (
              <button onClick={handleDownloadClick}
                style={{ width: "100%", background: "#CC5500", color: "#fff", border: "none", borderRadius: 9, padding: "14px 0", fontSize: 15, fontWeight: 700 }}>
                Download PDF Report
              </button>
            ) : state !== "done" ? (
              <button
                onClick={() => outputMode === "deepdive" ? runDeepDive() : runAnalysis()}
                disabled={isRunning || !files.length || (outputMode === "deepdive" && !metric.trim())}
                style={{ width: "100%", background: (isRunning || !files.length || (outputMode === "deepdive" && !metric.trim())) ? "#4a2800" : "#CC5500", color: "#fff", border: "none", borderRadius: 9, padding: "14px 0", fontSize: 15, fontWeight: 700, opacity: (isRunning || !files.length || (outputMode === "deepdive" && !metric.trim())) ? 0.6 : 1 }}>
                {isRunning
                  ? (state === "uploading" ? "Parsing file..." : outputMode === "deepdive" ? "Analyzing..." : "Generating analysis...")
                  : outputMode === "deepdive" ? "Run Deep-Dive →" : "Generate Report →"}
              </button>
            ) : null}
          </div>
        </div>
      </main>

      {/* Signup Modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "#333333", border: "1px solid #484848", borderRadius: 16, padding: 36, maxWidth: 400, width: "100%", textAlign: "center" }}>
            <div style={{ width: 48, height: 48, background: "#CC5500", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 22, color: "#fff", margin: "0 auto 20px" }}>6</div>
            <p style={{ fontSize: 20, fontWeight: 800, color: "#f0f0f0", margin: "0 0 10px" }}>
              {modalReason === "advanced" ? "Unlock Advanced Analysis" : "Create an account to download"}
            </p>
            <p style={{ fontSize: 14, color: "#888", margin: "0 0 28px", lineHeight: 1.6 }}>
              {modalReason === "advanced"
                ? "Advanced analysis (trend charts, industry benchmarks, risk matrix, and more) is available on free and paid accounts."
                : "Your report is ready! Create a free account and it will be saved directly to your report history."}
            </p>
            <Link href="/auth/signup" style={{ display: "block", background: "#CC5500", color: "#fff", fontSize: 15, fontWeight: 700, textDecoration: "none", padding: "13px 0", borderRadius: 9, marginBottom: 10 }}>
              Create Free Account →
            </Link>
            <Link href="/auth/login" style={{ display: "block", background: "#2d2d2d", border: "1px solid #484848", color: "#ccc", fontSize: 14, fontWeight: 600, textDecoration: "none", padding: "11px 0", borderRadius: 9, marginBottom: 16 }}>
              Sign In Instead
            </Link>
            <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", color: "#555", fontSize: 13 }}>Maybe later</button>
          </div>
        </div>
      )}
    </div>
  );
}
