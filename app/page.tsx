"use client";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { generatePDF, type AnalysisResult } from "@/lib/generateReport";
import Papa from "papaparse";
import * as XLSX from "xlsx";

type Mode = "basic" | "advanced";
type State = "idle" | "uploading" | "analyzing" | "done" | "error";

interface UsageData {
  accountType: string;
  basicUsed: number;
  advancedUsed: number;
  basicLimit: number;
  advancedLimit: number;
}

function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const result = Papa.parse(text, { header: true, skipEmptyLines: true });
  return { headers: result.meta.fields ?? [], rows: result.data as Record<string, string>[] };
}

function parseXLSX(buf: ArrayBuffer): { headers: string[]; rows: Record<string, string>[] } {
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const json = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: "" });
  const headers = json.length > 0 ? Object.keys(json[0]) : [];
  return { headers, rows: json };
}

async function parseFile(file: File): Promise<{ rawText: string; headers: string[]; rows: Record<string, string>[] }> {
  if (file.name.endsWith(".csv") || file.type === "text/csv") {
    const text = await file.text();
    const parsed = parseCSV(text);
    return { rawText: text, ...parsed };
  }
  const buf = await file.arrayBuffer();
  const parsed = parseXLSX(buf);
  const rawText = parsed.headers.join(",") + "\n" + parsed.rows.map(r => parsed.headers.map(h => r[h] ?? "").join(",")).join("\n");
  return { rawText, ...parsed };
}

export default function Home() {
  const [mode, setMode] = useState<Mode>("basic");
  const [files, setFiles] = useState<File[]>([]);
  const [orgName, setOrgName] = useState("");
  const [state, setState] = useState<State>("idle");
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [dragging, setDragging] = useState(false);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUser({ email: data.user.email ?? "" });
    });
    fetchUsage();
  }, []);

  async function fetchUsage() {
    try {
      const res = await fetch("/api/usage");
      if (res.ok) setUsage(await res.json());
    } catch {}
  }

  function startProgress(from: number, to: number, ms: number) {
    if (progressRef.current) clearInterval(progressRef.current);
    setProgress(from);
    const steps = 60;
    const stepMs = ms / steps;
    let step = 0;
    progressRef.current = setInterval(() => {
      step++;
      const t = step / steps;
      const eased = 1 - Math.pow(1 - t, 2);
      setProgress(from + (to - from) * eased);
      if (step >= steps) clearInterval(progressRef.current!);
    }, stepMs);
  }

  function stopProgress() {
    if (progressRef.current) clearInterval(progressRef.current);
    progressRef.current = null;
  }

  function handleFiles(newFiles: File[]) {
    const maxFiles = mode === "advanced" ? 3 : 1;
    const valid = newFiles.filter(f =>
      f.name.endsWith(".csv") || f.name.endsWith(".xlsx") || f.name.endsWith(".xls")
    );
    setFiles(prev => [...prev, ...valid].slice(0, maxFiles));
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    handleFiles(Array.from(e.dataTransfer.files));
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = "/auth/login";
  }

  async function runAnalysis() {
    if (!files.length) return;
    setState("uploading");
    setErrorMsg("");
    setAnalysis(null);
    setPdfBytes(null);
    startProgress(0, 15, 2000);

    try {
      const parsed = await Promise.all(files.map(f => parseFile(f)));
      const combinedRawText = parsed.map((p, i) =>
        files.length > 1 ? `=== File ${i + 1}: ${files[i].name} ===\n${p.rawText}` : p.rawText
      ).join("\n\n");

      setState("analyzing");
      startProgress(15, 90, mode === "advanced" ? 30000 : 10000);

      const fd = new FormData();
      fd.append("data", combinedRawText);
      fd.append("files", files[0]);
      fd.append("orgName", orgName);
      fd.append("mode", mode);

      const res = await fetch("/api/analyze", { method: "POST", body: fd });

      // Handle non-streaming error responses
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Analysis failed" }));
        throw new Error(err.error ?? "Analysis failed");
      }

      // Read stream
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let raw = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        raw += decoder.decode(value, { stream: true });
      }
      raw += decoder.decode();

      if (raw.includes("__STREAM_ERROR__")) throw new Error("Analysis failed on server.");

      // Extract JSON
      const jsonStart = raw.indexOf("{");
      const jsonEnd = raw.lastIndexOf("}");
      if (jsonStart === -1 || jsonEnd === -1) throw new Error("Invalid response from server.");

      const result: AnalysisResult = JSON.parse(raw.slice(jsonStart, jsonEnd + 1));
      setAnalysis(result);

      const now = new Date().toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" });
      const pdf = generatePDF({
        orgName: orgName || "Your Organization",
        fileName: files.map(f => f.name).join(", "),
        generatedAt: now,
        mode,
        analysis: result,
      });
      setPdfBytes(pdf);

      stopProgress();
      setProgress(100);
      setState("done");
      fetchUsage();
    } catch (err) {
      stopProgress();
      setProgress(0);
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
      setState("error");
    }
  }

  function downloadPDF() {
    if (!pdfBytes) return;
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `consult6-${mode}-report-${Date.now()}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function reset() {
    stopProgress();
    setProgress(0);
    setState("idle");
    setErrorMsg("");
    setAnalysis(null);
    setPdfBytes(null);
    setFiles([]);
  }

  const isRunning = state === "uploading" || state === "analyzing";
  const basicLeft = usage ? usage.basicLimit - usage.basicUsed : null;
  const advancedLeft = usage ? usage.advancedLimit - usage.advancedUsed : null;

  // Severity colors
  const sevStyle: Record<string, { bg: string; border: string; label: string; labelBg: string }> = {
    critical: { bg: "#2d1010", border: "#c0392b", label: "CRITICAL", labelBg: "#c0392b" },
    warning: { bg: "#2d2000", border: "#d4a017", label: "WARNING", labelBg: "#d4a017" },
    info: { bg: "#0f1e30", border: "#2980b9", label: "INFO", labelBg: "#2980b9" },
  };

  return (
    <div style={{ minHeight: "100vh", background: "#1a1a1a" }}>
      {/* Navbar */}
      <nav style={{ background: "#111", borderBottom: "1px solid #2a2a2a", padding: "0 24px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, background: "#CC5500", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16, color: "#fff" }}>6</div>
          <span style={{ fontWeight: 700, fontSize: 16, color: "#f0f0f0" }}>Consult6</span>
        </div>
        {usage && (
          <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 13 }}>
            <span style={{ color: "#aaa" }}>Basic <span style={{ color: "#f0f0f0", fontWeight: 600 }}>{usage.basicUsed}/{usage.basicLimit}</span></span>
            <span style={{ color: "#aaa" }}>Advanced <span style={{ color: "#f0f0f0", fontWeight: 600 }}>{usage.advancedUsed}/{usage.advancedLimit}</span></span>
            {usage.accountType === "admin" && (
              <span style={{ background: "#6b21a8", color: "#f0f0f0", padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>ADMIN</span>
            )}
            {usage.accountType === "paid" && (
              <span style={{ background: "#CC5500", color: "#fff", padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>PRO</span>
            )}
            {usage.accountType === "free" && (
              <span style={{ background: "#333", color: "#aaa", padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600 }}>FREE</span>
            )}
            <span style={{ color: "#888", fontSize: 12 }}>{user?.email}</span>
            <button onClick={handleSignOut} style={{ background: "none", border: "1px solid #333", color: "#aaa", borderRadius: 6, padding: "4px 12px", fontSize: 12 }}>Sign out</button>
          </div>
        )}
      </nav>

      {/* Main */}
      <main style={{ maxWidth: 760, margin: "40px auto", padding: "0 20px" }}>
        {/* Mode selector */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: "#888", letterSpacing: 1, marginBottom: 10 }}>ANALYSIS TYPE</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {(["basic", "advanced"] as Mode[]).map(m => (
              <button key={m} onClick={() => { setMode(m); reset(); }}
                style={{ background: mode === m ? "#2a1800" : "#242424", border: `2px solid ${mode === m ? "#CC5500" : "#333"}`, borderRadius: 10, padding: "14px 16px", textAlign: "left", cursor: "pointer", transition: "all 0.15s" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, fontSize: 15, color: "#f0f0f0" }}>{m === "basic" ? "Basic" : "Advanced"}</span>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    {m === "advanced" && <span style={{ background: "#CC5500", color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4 }}>AI+</span>}
                    {usage && <span style={{ fontSize: 12, color: "#888" }}>{m === "basic" ? basicLeft : advancedLeft}/{m === "basic" ? usage.basicLimit : usage.advancedLimit} left</span>}
                  </div>
                </div>
                <p style={{ fontSize: 12, color: "#888", margin: 0 }}>
                  {m === "basic" ? "Single file · Standard flags & recommendations · PDF report" : "Up to 3 files · Trend charts · Industry benchmarks · Case studies · Scenarios"}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Card */}
        <div style={{ background: "#242424", border: "1px solid #333", borderRadius: 12, padding: 28 }}>
          {/* Org name */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#ccc", marginBottom: 8 }}>Organization name</label>
            <input value={orgName} onChange={e => setOrgName(e.target.value)} placeholder="e.g. Acme Corp, Sunrise Foundation" disabled={isRunning} />
          </div>

          {/* File upload */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#ccc", marginBottom: 8 }}>
              Financial data{mode === "advanced" ? " (up to 3 files)" : ""}
            </label>

            {files.map((f, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#1e1e1e", border: "1px solid #333", borderRadius: 8, padding: "10px 14px", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ color: "#CC5500", fontSize: 18 }}>📄</span>
                  <span style={{ fontSize: 13, color: "#f0f0f0" }}>{f.name}</span>
                  <span style={{ fontSize: 12, color: "#666" }}>{(f.size / 1024).toFixed(1)} KB</span>
                </div>
                {!isRunning && (
                  <button onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))}
                    style={{ background: "none", border: "none", color: "#666", fontSize: 18, padding: "0 4px" }}>×</button>
                )}
              </div>
            ))}

            {files.length < (mode === "advanced" ? 3 : 1) && !isRunning && (
              <div
                onDrop={handleDrop}
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onClick={() => fileInputRef.current?.click()}
                style={{ border: `2px dashed ${dragging ? "#CC5500" : "#333"}`, borderRadius: 10, padding: "28px 20px", textAlign: "center", cursor: "pointer", transition: "border-color 0.2s", background: dragging ? "#2a1800" : "transparent" }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>↑</div>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#ccc", margin: 0 }}>{files.length > 0 ? "Add another file" : "Upload financial data"}</p>
                <p style={{ fontSize: 12, color: "#666", margin: "4px 0 0" }}>CSV or Excel · Up to 50 MB</p>
                <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" multiple style={{ display: "none" }}
                  onChange={e => handleFiles(Array.from(e.target.files ?? []))} />
              </div>
            )}
          </div>

          {/* Progress bar */}
          {isRunning && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ height: 6, background: "#333", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", background: "#CC5500", borderRadius: 3, width: `${progress}%`, transition: "width 0.3s ease" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 12, color: "#666" }}>
                <span>{state === "uploading" ? "Parsing files..." : "Analyzing with AI..."}</span>
                <span>{Math.round(progress)}%</span>
              </div>
            </div>
          )}

          {/* Error */}
          {state === "error" && (
            <div style={{ background: "#2d1010", border: "1px solid #c0392b", borderRadius: 8, padding: "12px 16px", color: "#e74c3c", fontSize: 13, marginBottom: 20 }}>
              ⚠ {errorMsg}
            </div>
          )}

          {/* Results */}
          {state === "done" && analysis && (
            <div style={{ marginBottom: 20 }}>
              {/* Summary */}
              <div style={{ background: "#1e1e1e", border: "1px solid #333", borderRadius: 10, padding: 16, marginBottom: 16 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#CC5500", letterSpacing: 1, marginBottom: 8 }}>EXECUTIVE SUMMARY</p>
                <p style={{ fontSize: 14, color: "#e0e0e0", lineHeight: 1.6, margin: 0 }}>{analysis.summary}</p>
              </div>

              {/* Flags */}
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

              {/* Recommendations */}
              {analysis.recommendations.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#888", letterSpacing: 1, marginBottom: 10 }}>RECOMMENDATIONS</p>
                  {analysis.recommendations.map((rec, i) => (
                    <div key={i} style={{ background: "#1e1e1e", border: "1px solid #333", borderRadius: 8, padding: "12px 14px", marginBottom: 8, display: "flex", gap: 12 }}>
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
              <div style={{ background: "#1e1e1e", border: "1px solid #333", borderRadius: 8, padding: "12px 14px", marginBottom: 16 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#888", letterSpacing: 1, marginBottom: 6 }}>FINANCIAL TRAJECTORY</p>
                <p style={{ fontSize: 13, color: "#ccc", margin: 0, fontStyle: "italic", lineHeight: 1.5 }}>{analysis.trajectoryNote}</p>
              </div>

              {/* Advanced sections */}
              {analysis.industryComparisons?.length && (
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#888", letterSpacing: 1, marginBottom: 10 }}>INDUSTRY BENCHMARKS</p>
                  <div style={{ background: "#1e1e1e", border: "1px solid #333", borderRadius: 8, overflow: "hidden" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: "#2a2a2a" }}>
                          {["Metric", "Your Value", "Industry Avg", "Top 25%", "Status"].map(h => (
                            <th key={h} style={{ padding: "10px 12px", textAlign: "left", color: "#CC5500", fontWeight: 700, fontSize: 11 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {analysis.industryComparisons.map((c, i) => (
                          <tr key={i} style={{ borderTop: "1px solid #2a2a2a" }}>
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

              {analysis.caseStudies?.length && (
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#888", letterSpacing: 1, marginBottom: 10 }}>CASE STUDIES</p>
                  {analysis.caseStudies.map((cs, i) => (
                    <div key={i} style={{ background: "#1e1e1e", border: "1px solid #333", borderLeft: "3px solid #CC5500", borderRadius: 8, padding: "14px 16px", marginBottom: 8 }}>
                      <p style={{ fontWeight: 700, fontSize: 14, color: "#CC5500", margin: "0 0 10px" }}>{cs.organization}</p>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                        {[["Challenge", cs.challenge], ["Solution", cs.solution], ["Outcome", cs.outcome]].map(([label, text]) => (
                          <div key={label}>
                            <p style={{ fontSize: 10, fontWeight: 700, color: "#666", letterSpacing: 1, margin: "0 0 4px" }}>{label?.toString().toUpperCase()}</p>
                            <p style={{ fontSize: 12, color: "#ccc", margin: 0, lineHeight: 1.5 }}>{text?.toString()}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {analysis.scenarios && (
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#888", letterSpacing: 1, marginBottom: 10 }}>12-MONTH SCENARIOS</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                    {[
                      { label: "OPTIMISTIC", text: analysis.scenarios.optimistic, color: "#27ae60", border: "#1e5c32" },
                      { label: "BASE CASE", text: analysis.scenarios.base, color: "#2980b9", border: "#1a3a5c" },
                      { label: "PESSIMISTIC", text: analysis.scenarios.pessimistic, color: "#e74c3c", border: "#5c1a1a" },
                    ].map(s => (
                      <div key={s.label} style={{ background: "#1e1e1e", border: `1px solid ${s.border}`, borderTop: `3px solid ${s.color}`, borderRadius: 8, padding: "12px 14px" }}>
                        <p style={{ fontSize: 10, fontWeight: 800, color: s.color, margin: "0 0 6px", letterSpacing: 1 }}>{s.label}</p>
                        <p style={{ fontSize: 12, color: "#ccc", margin: 0, lineHeight: 1.5 }}>{s.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 10 }}>
            {state !== "done" ? (
              <button
                onClick={runAnalysis}
                disabled={isRunning || !files.length}
                style={{ flex: 1, background: isRunning || !files.length ? "#4a2800" : "#CC5500", color: "#fff", border: "none", borderRadius: 9, padding: "14px 0", fontSize: 15, fontWeight: 700, opacity: isRunning || !files.length ? 0.6 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                {isRunning ? (
                  <>{state === "uploading" ? "Parsing files..." : "Generating analysis..."}</>
                ) : (
                  <>Generate {mode === "advanced" ? "Advanced " : ""}Report →</>
                )}
              </button>
            ) : (
              <>
                <button onClick={downloadPDF} style={{ flex: 1, background: "#CC5500", color: "#fff", border: "none", borderRadius: 9, padding: "14px 0", fontSize: 15, fontWeight: 700 }}>
                  Download PDF Report
                </button>
                <button onClick={reset} style={{ background: "#333", color: "#ccc", border: "none", borderRadius: 9, padding: "14px 20px", fontSize: 14, fontWeight: 600 }}>
                  New Analysis
                </button>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
