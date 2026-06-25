"use client";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { generatePDF, generateDeepDivePDF, type AnalysisResult } from "@/lib/generateReport";
import Link from "next/link";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import ErrorBanner from "@/app/components/ErrorBanner";
import InfoBanner from "@/app/components/InfoBanner";
import { createSampleFile, SAMPLE_ORG_NAME, SAMPLE_SECTOR } from "@/lib/sampleData";

type Mode = "basic" | "advanced";
type State = "idle" | "uploading" | "analyzing" | "done" | "error";

interface UsageData {
  accountType: string;
  basicUsed: number;
  advancedUsed: number;
  basicLimit: number;
  advancedLimit: number;
}

interface HistoryItem {
  id: string;
  created_at: string;
  label: string;
  mode: string;
  org_name: string;
  file_name: string;
  analysis_result: AnalysisResult;
  share_token: string | null;
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

export default function Home() {
  const [mode, setMode] = useState<Mode>("basic");
  const [files, setFiles] = useState<File[]>([]);
  const [orgName, setOrgName] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [industry, setIndustry] = useState("");
  const [constraints, setConstraints] = useState("");
  const [extraContext, setExtraContext] = useState("");
  const [contextOpen, setContextOpen] = useState(false);
  const [state, setState] = useState<State>("idle");
  const [checklistDismissed, setChecklistDismissed] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [profileContext, setProfileContext] = useState<{ about_me: string; other_context: string; disable_pdf_history: boolean; disable_analysis_memory: boolean } | null>(null);
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyAccountType, setHistoryAccountType] = useState<string>("free");
  const [noContextWarnShown, setNoContextWarnShown] = useState(false);
  const [showNoContextModal, setShowNoContextModal] = useState(false);
  const [outputMode, setOutputMode] = useState<"report" | "deepdive">("report");
  const [metric, setMetric] = useState("");
  const [deepDiveResult, setDeepDiveResult] = useState<string | null>(null);
  const [deepDivePdfBytes, setDeepDivePdfBytes] = useState<Uint8Array | null>(null);
  const [copied, setCopied] = useState(false);
  const [dedupMessage, setDedupMessage] = useState<string>("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentAnalysisId, setCurrentAnalysisId] = useState<string | null>(null);
  const [shareState, setShareState] = useState<"idle" | "loading" | "shared">("idle");
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [shareToast, setShareToast] = useState(false);
  const [historyShareTokens, setHistoryShareTokens] = useState<Record<string, string | null>>({});
  const [historyShareLoading, setHistoryShareLoading] = useState<Record<string, boolean>>({});
  const [profiles, setProfiles] = useState<{ id: string; name: string; sector: string }[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [usingSample, setUsingSample] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");
  const [sectionsConfig, setSectionsConfig] = useState({
    executiveSummary: true,
    recommendations: true,
    benchmarks: true,
    trajectory: true,
    riskMatrix: true,
  });
  const [allSectionsOn, setAllSectionsOn] = useState(true);
  const [lastSectionsConfig, setLastSectionsConfig] = useState<typeof sectionsConfig | null>(null);
  const contextSectionRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      setUser({ email: data.user.email ?? "" });
      setUserId(data.user.id);

      // Load profile settings
      const { data: prof } = await supabase.from("profiles").select("about_me,industry,company_size,other_context,disable_pdf_history,disable_analysis_memory,settings_popup_shown").eq("id", data.user.id).single();
      if (prof) {
        setProfileContext({
          about_me: prof.about_me ?? "",
          other_context: prof.other_context ?? "",
          disable_pdf_history: prof.disable_pdf_history ?? false,
          disable_analysis_memory: prof.disable_analysis_memory ?? false,
        });
        // Pre-fill industry/company_size if memory not disabled
        if (!prof.disable_analysis_memory) {
          if (prof.industry) setIndustry(prof.industry);
          if (prof.company_size) setCompanySize(prof.company_size);
        }
        // Show the onboarding checklist until the user dismisses it.
        // (Older accounts that saw the legacy popup keep it hidden.)
        setChecklistDismissed(prof.settings_popup_shown ?? false);
      }
    });
    setNoContextWarnShown(localStorage.getItem("consult6_no_context_warn_shown") === "true");
    fetchUsage();
    fetchHistory();
    fetchProfiles();
  }, []);

  const LOAD_ERROR_MSG = "Some of your dashboard data didn't load. Check your connection and refresh the page to retry.";

  async function fetchProfiles() {
    setProfilesLoading(true);
    try {
      const res = await fetch("/api/profiles");
      if (res.ok) {
        const json = await res.json();
        const loaded: { id: string; name: string; sector: string }[] = json.profiles ?? [];
        setProfiles(loaded);
        // Preselect a company when arriving via /dashboard?profile=ID (e.g. the
        // "Run analysis" button on a company's dashboard).
        const params = new URLSearchParams(window.location.search);
        const wanted = params.get("profile");
        if (wanted) {
          const match = loaded.find(p => p.id === wanted);
          if (match) {
            setSelectedProfileId(match.id);
            setOrgName(prev => prev || match.name);
          }
        }
      } else {
        setLoadError(LOAD_ERROR_MSG);
      }
    } catch {
      setLoadError(LOAD_ERROR_MSG);
    } finally {
      setProfilesLoading(false);
    }
  }

  async function fetchUsage() {
    try {
      const res = await fetch("/api/usage");
      if (res.ok) setUsage(await res.json());
      else setLoadError(LOAD_ERROR_MSG);
    } catch {
      setLoadError(LOAD_ERROR_MSG);
    }
  }

  async function fetchHistory() {
    try {
      const res = await fetch("/api/history");
      if (!res.ok) {
        setLoadError(LOAD_ERROR_MSG);
        return;
      }
      const json = await res.json();
      const items: HistoryItem[] = json.history ?? [];
      setHistory(items);
      setHistoryAccountType(json.accountType ?? "free");
      const tokens: Record<string, string | null> = {};
      for (const item of items) tokens[item.id] = item.share_token;
      setHistoryShareTokens(tokens);
    } catch {
      setLoadError(LOAD_ERROR_MSG);
    }
  }

  async function saveToHistory(result: AnalysisResult, _label: string, currentMode: Mode, currentOrgName: string, currentFileNames: string) {
    try {
      const res = await fetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: currentMode,
          orgName: currentOrgName,
          fileName: currentFileNames,
          analysisResult: result,
          // Link the saved report to the selected company so it surfaces on
          // that company's dashboard.
          profileId: selectedProfileId || undefined,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.analysis_id) setCurrentAnalysisId(json.analysis_id);
        fetchHistory();
      }
    } catch {}
  }

  async function handleShare() {
    if (!currentAnalysisId) return;
    if (shareState === "shared" && shareToken) {
      const url = `${window.location.origin}/r/${shareToken}`;
      navigator.clipboard.writeText(url).then(() => { setShareToast(true); setTimeout(() => setShareToast(false), 3000); });
      return;
    }
    setShareState("loading");
    try {
      const res = await fetch("/api/share-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysis_id: currentAnalysisId }),
      });
      if (res.ok) {
        const { token, url } = await res.json();
        setShareToken(token);
        setShareState("shared");
        navigator.clipboard.writeText(url).then(() => { setShareToast(true); setTimeout(() => setShareToast(false), 3000); });
      } else {
        setShareState("idle");
      }
    } catch {
      setShareState("idle");
    }
  }

  async function handleHistoryShare(item: HistoryItem) {
    const existing = historyShareTokens[item.id];
    if (existing) {
      navigator.clipboard.writeText(`${window.location.origin}/r/${existing}`);
      setShareToast(true);
      setTimeout(() => setShareToast(false), 3000);
      return;
    }
    setHistoryShareLoading(prev => ({ ...prev, [item.id]: true }));
    try {
      const res = await fetch("/api/share-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysis_id: item.id }),
      });
      if (res.ok) {
        const { token, url } = await res.json();
        setHistoryShareTokens(prev => ({ ...prev, [item.id]: token }));
        navigator.clipboard.writeText(url);
        setShareToast(true);
        setTimeout(() => setShareToast(false), 3000);
      }
    } finally {
      setHistoryShareLoading(prev => ({ ...prev, [item.id]: false }));
    }
  }

  async function handleHistoryDestroy(item: HistoryItem) {
    setHistoryShareLoading(prev => ({ ...prev, [item.id]: true }));
    try {
      await fetch("/api/share-report", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysis_id: item.id }),
      });
      setHistoryShareTokens(prev => ({ ...prev, [item.id]: null }));
    } finally {
      setHistoryShareLoading(prev => ({ ...prev, [item.id]: false }));
    }
  }

  function downloadHistoryPDF(item: HistoryItem) {
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
    setFiles(prev => [...prev, ...valid].slice(0, maxFiles));
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    handleFiles(Array.from(e.dataTransfer.files));
  }

  // One-click demo: loads a realistic student-org ledger and pre-fills the
  // context so the marketer just hits Generate. No file of their own needed.
  function loadSampleData() {
    setErrorMsg("");
    setFiles([createSampleFile()]);
    setOrgName(SAMPLE_ORG_NAME);
    setIndustry(SAMPLE_SECTOR);
    setSelectedProfileId("");
    setUsingSample(true);
  }

  function dismissChecklist() {
    setChecklistDismissed(true);
    if (userId) supabase.from("profiles").update({ settings_popup_shown: true }).eq("id", userId).then(() => {});
  }

  // Onboarding checklist completion is derived from real account state.
  const checklistAnalysisDone = history.length > 0;
  const checklistProfileDone = profiles.length > 0;
  const checklistContextDone = !!(
    profileContext?.about_me?.trim() ||
    profileContext?.other_context?.trim() ||
    industry.trim() ||
    companySize.trim()
  );
  const checklistSteps = [checklistAnalysisDone, checklistProfileDone, checklistContextDone];
  const checklistCompleted = checklistSteps.filter(Boolean).length;
  const showChecklist = !checklistDismissed && checklistCompleted < checklistSteps.length;

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = "/auth/login";
  }

  const advancedHasNoContext = mode === "advanced"
    && !companySize && !industry && !constraints && !extraContext
    && (!profileContext || profileContext.disable_analysis_memory || (!profileContext.about_me && !profileContext.other_context));

  function confirmRunWithoutContext() {
    localStorage.setItem("consult6_no_context_warn_shown", "true");
    setNoContextWarnShown(true);
    setShowNoContextModal(false);
    runAnalysis(true);
  }

  async function runAnalysis(skipContextCheck = false) {
    if (!files.length) return;
    if (mode === "advanced" && advancedHasNoContext && !noContextWarnShown && !skipContextCheck) {
      setShowNoContextModal(true);
      return;
    }
    setState("uploading");
    setErrorMsg("");
    setAnalysis(null);
    setPdfBytes(null);
    setDedupMessage("");
    stopProgress();
    setProgress(2);

    try {
      const parsed = await Promise.all(files.map(f => parseFile(f)));
      const combinedRawText = parsed.map((p, i) =>
        files.length > 1 ? `=== File ${i + 1}: ${files[i].name} ===\n${p.rawText}` : p.rawText
      ).join("\n\n");

      setState("analyzing");
      setProgress(5);

      const fd = new FormData();
      fd.append("data", combinedRawText);
      fd.append("files", files[0]);
      fd.append("orgName", orgName);
      fd.append("mode", mode);
      if (selectedProfileId) fd.append("profileId", selectedProfileId);
      if (mode === "advanced") {
        if (companySize) fd.append("companySize", companySize);
        if (industry) fd.append("industry", industry);
        if (constraints) fd.append("constraints", constraints);
        // Merge user-typed context with saved profile context (if memory not disabled)
        const profileExtra = profileContext && !profileContext.disable_analysis_memory
          ? [profileContext.about_me, profileContext.other_context].filter(Boolean).join("\n")
          : "";
        const combinedExtra = [extraContext, profileExtra].filter(Boolean).join("\n");
        if (combinedExtra) fd.append("extraContext", combinedExtra);
        const effectiveSections = allSectionsOn
          ? { executiveSummary: true, recommendations: true, benchmarks: true, trajectory: true, riskMatrix: true }
          : sectionsConfig;
        fd.append("sections", JSON.stringify(effectiveSections));
      }

      const res = await fetch("/api/analyze", { method: "POST", body: fd });

      // Handle non-streaming error responses
      if (!res.ok) {
        if (res.status === 401) throw new Error("Your session has expired. Please sign in again.");
        const err = await res.json().catch(() => ({ error: "Analysis failed" }));
        throw new Error(err.error ?? "Analysis failed");
      }

      // Read stream - drive progress from chunk arrival
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let raw = "";
      const estimatedTotal = mode === "advanced" ? 6000 : 1500; // chars

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        raw += decoder.decode(value, { stream: true });
        // Drive progress from 5% → 90% based on accumulated content
        const chunkProgress = Math.min(90, 5 + (raw.length / estimatedTotal) * 85);
        setProgress(chunkProgress);
      }
      raw += decoder.decode();
      setProgress(95);

      if (raw.includes("__STREAM_ERROR__")) {
        const marker = "__STREAM_ERROR__:";
        const idx = raw.indexOf(marker);
        const detail = idx !== -1 ? raw.slice(idx + marker.length).trim() : "";
        if (detail.toLowerCase().includes("rate limit") || detail.toLowerCase().includes("429")) {
          throw new Error("__RATE_LIMIT__");
        }
        throw new Error(detail || "__ANTHROPIC_ERROR__");
      }

      // Extract JSON
      const jsonStart = raw.indexOf("{");
      const jsonEnd = raw.lastIndexOf("}");
      if (jsonStart === -1 || jsonEnd === -1) throw new Error("__EMPTY_RESPONSE__");

      const result: AnalysisResult = JSON.parse(raw.slice(jsonStart, jsonEnd + 1));
      if (!result.summary && !result.flags?.length) throw new Error("__EMPTY_RESPONSE__");
      setAnalysis(result);
      if (mode === "advanced") {
        setLastSectionsConfig(allSectionsOn
          ? { executiveSummary: true, recommendations: true, benchmarks: true, trajectory: true, riskMatrix: true }
          : { ...sectionsConfig });
      }

      // Show dedup banner if any rows were cleaned
      const ds = ((result as unknown) as Record<string, unknown>).dedupStats as { removedExact?: number; removedNearDupe?: number; removedSummary?: number } | undefined;
      if (ds && (ds.removedExact || ds.removedNearDupe || ds.removedSummary)) {
        const dupCount = (ds.removedExact ?? 0) + (ds.removedNearDupe ?? 0);
        const sumCount = ds.removedSummary ?? 0;
        const parts: string[] = [];
        if (dupCount > 0) parts.push(`${dupCount} duplicate row${dupCount !== 1 ? "s" : ""}`);
        if (sumCount > 0) parts.push(`${sumCount} summary row${sumCount !== 1 ? "s" : ""}`);
        setDedupMessage(`We cleaned your data before analysis: removed ${parts.join(" and ")}. Your report reflects the deduplicated dataset.`);
      }

      const now = new Date().toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" });
      const pdf = generatePDF({
        orgName: orgName || "Your Organization",
        fileName: files.map(f => f.name).join(", "),
        generatedAt: now,
        mode,
        analysis: result,
      });
      setPdfBytes(pdf);

      const historyLabel = orgName.trim() || files[0]?.name || "Unnamed Analysis";
      const fileNames = files.map(f => f.name).join(", ");
      if (!profileContext?.disable_pdf_history) {
        saveToHistory(result, historyLabel, mode, orgName, fileNames);
      }

      stopProgress();
      setProgress(100);
      setState("done");
      fetchUsage();
    } catch (err) {
      stopProgress();
      setProgress(0);
      const raw = err instanceof Error ? err.message : "Something went wrong.";
      if (raw === "__RATE_LIMIT__" || raw.toLowerCase().includes("rate limit")) {
        setErrorMsg("This analysis took too long to complete. Try using Basic mode, or reduce your file size and try again.");
      } else if (raw === "__ANTHROPIC_ERROR__" || raw.toLowerCase().includes("anthropic") || raw.toLowerCase().includes("overloaded")) {
        setErrorMsg("Something went wrong with the analysis. Please try again in a moment.");
      } else if (raw === "__EMPTY_RESPONSE__" || raw.toLowerCase().includes("invalid response")) {
        setErrorMsg("The analysis came back incomplete. Please try again. If the issue persists, try a smaller file or Basic mode.");
      } else if (raw.toLowerCase().includes("daily") && raw.toLowerCase().includes("limit")) {
        setErrorMsg(raw);
      } else if (raw.toLowerCase().includes("failed to fetch") || raw.toLowerCase().includes("networkerror")) {
        setErrorMsg("Something went wrong. Check your connection and try again.");
      } else {
        setErrorMsg(raw);
      }
      setState("error");
    }
  }

  function downloadPDF() {
    if (!pdfBytes) return;
    const blob = new Blob([new Uint8Array(pdfBytes) as unknown as BlobPart], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const monthYear = new Date().toLocaleString("en-US", { month: "long", year: "numeric" });
    const safeName = (orgName || "Report").replace(/[^a-zA-Z0-9 \-]/g, "").trim();
    a.download = `Consult6 ${safeName} Executive Report ${monthYear}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadDeepDivePDF() {
    if (!deepDivePdfBytes) return;
    const blob = new Blob([new Uint8Array(deepDivePdfBytes) as unknown as BlobPart], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const monthYear = new Date().toLocaleString("en-US", { month: "long", year: "numeric" });
    const safeName = (orgName || "Report").replace(/[^a-zA-Z0-9 \-]/g, "").trim();
    const safeMetric = metric.replace(/[^a-zA-Z0-9 \-]/g, "").trim();
    a.download = `Consult6 ${safeName} ${safeMetric} Deep-Dive ${monthYear}.pdf`;
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
    setDedupMessage("");
    setFiles([]);
    setCompanySize("");
    setIndustry("");
    setConstraints("");
    setExtraContext("");
    setContextOpen(false);
    setMetric("");
    setDeepDiveResult(null);
    setDeepDivePdfBytes(null);
    setCopied(false);
    setSelectedProfileId("");
    setCurrentAnalysisId(null);
    setShareState("idle");
    setShareToken(null);
    setShareToast(false);
    setSectionsConfig({ executiveSummary: true, recommendations: true, benchmarks: true, trajectory: true, riskMatrix: true });
    setAllSectionsOn(true);
    setLastSectionsConfig(null);
    setUsingSample(false);
  }

  async function runDeepDive() {
    if (!files.length || !metric.trim()) return;
    setState("uploading");
    setErrorMsg("");
    setDeepDiveResult(null);
    setDedupMessage("");
    stopProgress();
    setProgress(2);

    try {
      const parsed = await Promise.all(files.map(f => parseFile(f)));
      const combinedRawText = parsed.map((p, i) =>
        files.length > 1 ? `=== File ${i + 1}: ${files[i].name} ===\n${p.rawText}` : p.rawText
      ).join("\n\n");

      setState("analyzing");
      setProgress(5);

      const fd = new FormData();
      fd.append("data", combinedRawText);
      fd.append("files", files[0]);
      fd.append("orgName", orgName);
      fd.append("metric", metric);
      fd.append("mode", mode);
      if (selectedProfileId) fd.append("profileId", selectedProfileId);
      if (industry) fd.append("industry", industry);
      if (constraints) fd.append("constraints", constraints);

      const res = await fetch("/api/deep-dive", { method: "POST", body: fd });

      if (!res.ok) {
        if (res.status === 401) throw new Error("Your session has expired. Please sign in again.");
        const err = await res.json().catch(() => ({ error: "Analysis failed" }));
        throw new Error(err.error ?? "Analysis failed");
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let raw = "";
      const estimatedTotal = 2000; // chars for deep-dive
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

      // Extract and strip dedup stats marker from deep-dive result
      const DEDUP_MARKER = "\n__DEDUP__:";
      const dedupIdx = raw.indexOf(DEDUP_MARKER);
      let resultText = raw.trim();
      if (dedupIdx !== -1) {
        try {
          const ddStats = JSON.parse(raw.slice(dedupIdx + DEDUP_MARKER.length).trim()) as { removedExact?: number; removedNearDupe?: number; removedSummary?: number };
          if (ddStats && (ddStats.removedExact || ddStats.removedNearDupe || ddStats.removedSummary)) {
            const dupCount = (ddStats.removedExact ?? 0) + (ddStats.removedNearDupe ?? 0);
            const sumCount = ddStats.removedSummary ?? 0;
            const parts: string[] = [];
            if (dupCount > 0) parts.push(`${dupCount} duplicate row${dupCount !== 1 ? "s" : ""}`);
            if (sumCount > 0) parts.push(`${sumCount} summary row${sumCount !== 1 ? "s" : ""}`);
            setDedupMessage(`We cleaned your data before analysis: removed ${parts.join(" and ")}. Your report reflects the deduplicated dataset.`);
          }
        } catch { /* non-fatal */ }
        resultText = raw.slice(0, dedupIdx).trim();
      }
      setDeepDiveResult(resultText);

      // Generate PDF immediately (client-side, synchronous)
      const now = new Date().toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" });
      const pdfSections = parseDeepDive(resultText);
      const pdfBytes = generateDeepDivePDF(pdfSections, orgName || "Your Organization", metric, now);
      setDeepDivePdfBytes(pdfBytes);

      stopProgress();
      setProgress(100);
      setState("done");
      fetchUsage();
    } catch (err) {
      stopProgress();
      setProgress(0);
      const raw = err instanceof Error ? err.message : "Something went wrong.";
      if (raw.toLowerCase().includes("rate limit") || raw.toLowerCase().includes("429")) {
        setErrorMsg("This analysis took too long to complete. Try using Basic mode, or reduce your file size and try again.");
      } else if (raw.toLowerCase().includes("failed to fetch") || raw.toLowerCase().includes("networkerror")) {
        setErrorMsg("Something went wrong. Check your connection and try again.");
      } else {
        setErrorMsg(raw || "Something went wrong with the analysis. Please try again in a moment.");
      }
      setState("error");
    }
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
    <div style={{ minHeight: "100vh", background: "#272727" }}>
      <style>{`input::placeholder, textarea::placeholder { color: #4a4a4a !important; }`}</style>
      {/* Navbar */}
      <nav style={{ background: "#1e1e1e", borderBottom: "1px solid #3a3a3a", padding: "0 24px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100, overflow: "visible" }}>
        <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div style={{ width: 32, height: 32, background: "#CC5500", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16, color: "#fff" }}>6</div>
          <span style={{ fontWeight: 700, fontSize: 16, color: "#f0f0f0" }}>Consult6</span>
        </Link>
        {usage && (
          <>
            {/* Token counts - always visible */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 13 }}>
              <span style={{ color: "#aaa" }}>Basic <span style={{ color: "#f0f0f0", fontWeight: 600 }}>{usage.basicUsed}/{usage.basicLimit}</span></span>
              <span style={{ color: "#aaa" }}>Advanced <span style={{ color: "#f0f0f0", fontWeight: 600 }}>{usage.advancedUsed}/{usage.advancedLimit}</span></span>

              {/* Desktop-only extras */}
              <span className="dash-nav-desktop">
                {usage.accountType === "admin" && (
                  <span style={{ background: "#6b21a8", color: "#f0f0f0", padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>ADMIN</span>
                )}
                {usage.accountType === "paid" && (
                  <span style={{ background: "#CC5500", color: "#fff", padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>PRO</span>
                )}
                {usage.accountType === "enterprise" && (
                  <span style={{ background: "#16a34a", color: "#fff", padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>ENTERPRISE</span>
                )}
                {usage.accountType === "free" && (
                  <span style={{ background: "#484848", color: "#aaa", padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600 }}>FREE</span>
                )}
              </span>
              <span className="dash-nav-desktop" style={{ color: "#888", fontSize: 12 }}>{user?.email}</span>
              <Link href="/profiles" className="dash-nav-desktop" style={{ background: "none", border: "1px solid #484848", color: "#aaa", borderRadius: 6, padding: "4px 12px", fontSize: 12, textDecoration: "none" }}>Companies</Link>
              <Link href="/settings" className="dash-nav-desktop" style={{ background: "none", border: "1px solid #484848", color: "#aaa", borderRadius: 6, padding: "4px 12px", fontSize: 12, textDecoration: "none" }}>Settings</Link>
              <button onClick={handleSignOut} className="dash-nav-desktop" style={{ background: "none", border: "1px solid #484848", color: "#aaa", borderRadius: 6, padding: "4px 12px", fontSize: 12 }}>Sign out</button>

              {/* Mobile-only hamburger */}
              <button
                className="dash-nav-mobile"
                onClick={() => setMobileMenuOpen(o => !o)}
                style={{ background: "none", border: "none", color: "#aaa", padding: "4px 6px", fontSize: 20, lineHeight: 1, flexDirection: "column", gap: 5, justifyContent: "center", alignItems: "center" }}
                aria-label="Menu"
              >
                <span style={{ display: "block", width: 22, height: 2, background: "#aaa", borderRadius: 1 }} />
                <span style={{ display: "block", width: 22, height: 2, background: "#aaa", borderRadius: 1 }} />
                <span style={{ display: "block", width: 22, height: 2, background: "#aaa", borderRadius: 1 }} />
              </button>
            </div>

            {/* Mobile dropdown menu */}
            {mobileMenuOpen && (
              <div className="dash-nav-mobile" style={{ position: "absolute", top: 56, right: 16, background: "#1e1e1e", border: "1px solid #3a3a3a", borderRadius: 10, padding: "8px 0", minWidth: 160, zIndex: 200, boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
                <Link href="/profiles" onClick={() => setMobileMenuOpen(false)} style={{ display: "block", padding: "10px 20px", fontSize: 14, color: "#f0f0f0", textDecoration: "none" }}>Companies</Link>
                <Link href="/settings" onClick={() => setMobileMenuOpen(false)} style={{ display: "block", padding: "10px 20px", fontSize: 14, color: "#f0f0f0", textDecoration: "none" }}>Settings</Link>
                <div style={{ height: 1, background: "#2d2d2d", margin: "6px 0" }} />
                <button onClick={() => { setMobileMenuOpen(false); handleSignOut(); }} style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 20px", fontSize: 14, color: "#f87171", background: "none", border: "none" }}>Sign out</button>
              </div>
            )}
          </>
        )}
      </nav>

      {/* Main */}
      <div className="dashboard-layout" style={{ justifyContent: "center", padding: "40px 20px", overflowX: "hidden" }}>
      <main style={{ width: "100%", maxWidth: 760, flexShrink: 1 }}>
        {loadError && (
          <ErrorBanner
            title="Couldn't load your data"
            message={loadError}
            onDismiss={() => setLoadError("")}
          />
        )}

        {/* Onboarding checklist - guides a brand-new user and tracks real progress */}
        {showChecklist && (() => {
          const items = [
            {
              done: checklistAnalysisDone,
              label: "Run your first analysis",
              desc: "No spreadsheet handy? Load a sample to see a full report in seconds.",
              actionLabel: "Try sample data",
              onAction: loadSampleData,
            },
            {
              done: checklistProfileDone,
              label: "Save a company profile",
              desc: "Track one organization's numbers over time so each report builds on the last.",
              actionLabel: "Create profile",
              href: "/profiles",
            },
            {
              done: checklistContextDone,
              label: "Add your context",
              desc: "Tell us your sector and goals once, and we'll tailor every analysis to you.",
              actionLabel: "Open settings",
              href: "/settings",
            },
          ];
          return (
            <div style={{ background: "#2a1800", border: "1px solid #CC5500", borderRadius: 12, padding: "18px 20px", marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 800, color: "#f0f0f0", margin: "0 0 2px" }}>Get started with Consult6</p>
                  <p style={{ fontSize: 12, color: "#c89", margin: 0 }}>{checklistCompleted} of {items.length} complete</p>
                </div>
                <button onClick={dismissChecklist} aria-label="Dismiss"
                  style={{ background: "none", border: "none", color: "#a86", fontSize: 18, lineHeight: 1, cursor: "pointer", padding: "0 2px", flexShrink: 0 }}>×</button>
              </div>
              <div style={{ height: 4, background: "#3a2200", borderRadius: 2, overflow: "hidden", marginBottom: 16 }}>
                <div style={{ height: "100%", width: `${(checklistCompleted / items.length) * 100}%`, background: "#CC5500", transition: "width 0.3s" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {items.map((item, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <span style={{
                      flexShrink: 0, width: 20, height: 20, borderRadius: "50%", marginTop: 1,
                      background: item.done ? "#16a34a" : "transparent",
                      border: item.done ? "none" : "2px solid #6a5030",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#fff", fontSize: 12, fontWeight: 700,
                    }}>{item.done ? "✓" : ""}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: item.done ? "#888" : "#f0f0f0", margin: "0 0 2px", textDecoration: item.done ? "line-through" : "none" }}>{item.label}</p>
                      {!item.done && <p style={{ fontSize: 12, color: "#a89", margin: 0, lineHeight: 1.5 }}>{item.desc}</p>}
                    </div>
                    {!item.done && (
                      item.href ? (
                        <Link href={item.href} style={{ flexShrink: 0, background: "none", border: "1px solid #CC5500", color: "#CC5500", borderRadius: 7, padding: "6px 14px", fontSize: 12, fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap" }}>{item.actionLabel}</Link>
                      ) : (
                        <button onClick={item.onAction} style={{ flexShrink: 0, background: "none", border: "1px solid #CC5500", color: "#CC5500", borderRadius: 7, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>{item.actionLabel}</button>
                      )
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Your companies - prominent quick access to each company's dashboard.
            Keeps the consult engine central while making the client files easy
            to reach without hunting for the nav link. */}
        {!profilesLoading && profiles.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: "#888", letterSpacing: 1, margin: 0 }}>YOUR COMPANIES</p>
              <Link href="/profiles" style={{ fontSize: 12, color: "#CC5500", textDecoration: "none" }}>View all →</Link>
            </div>
            <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
              {profiles.map(p => (
                <Link key={p.id} href={`/profiles/${p.id}`} style={{ textDecoration: "none", flexShrink: 0 }}>
                  <div
                    style={{ minWidth: 158, maxWidth: 210, background: "#333333", border: "1px solid #484848", borderRadius: 10, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", transition: "border-color 0.15s" }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = "#CC5500")}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = "#484848")}>
                    <div style={{ width: 30, height: 30, flexShrink: 0, background: "#2a1800", border: "1px solid #CC5500", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>🏢</div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "#f0f0f0", margin: "0 0 1px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</p>
                      <p style={{ fontSize: 11, color: "#888", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.sector}</p>
                    </div>
                  </div>
                </Link>
              ))}
              <Link href="/profiles" style={{ textDecoration: "none", flexShrink: 0 }}>
                <div
                  style={{ height: "100%", minWidth: 104, background: "#2d2d2d", border: "1px dashed #5a5a5a", borderRadius: 10, padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer", color: "#aaa", transition: "all 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#CC5500"; e.currentTarget.style.color = "#CC5500"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "#5a5a5a"; e.currentTarget.style.color = "#aaa"; }}>
                  <span style={{ fontSize: 16, fontWeight: 700 }}>+</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>New</span>
                </div>
              </Link>
            </div>
          </div>
        )}

        {/* Mode selector */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: "#888", letterSpacing: 1, marginBottom: 10 }}>ANALYSIS TYPE</p>
          <div className="mode-selector">
            {(["basic", "advanced"] as Mode[]).map(m => (
              <button key={m} onClick={() => { setMode(m); reset(); }}
                style={{ background: mode === m ? "#2a1800" : "#333333", border: `2px solid ${mode === m ? "#CC5500" : "#484848"}`, borderRadius: 10, padding: "14px 16px", textAlign: "left", cursor: "pointer", transition: "all 0.15s" }}>
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
        <div style={{ background: "#333333", border: "1px solid #484848", borderRadius: 12, padding: 28 }}>
          {/* New Analysis button at top when done */}
          {state === "done" && (
            <div style={{ marginBottom: 20 }}>
              <button onClick={reset} style={{ width: "100%", background: "#2d2d2d", border: "1px solid #5a5a5a", color: "#ccc", borderRadius: 9, padding: "11px 0", fontSize: 14, fontWeight: 600 }}>
                ← New Analysis
              </button>
            </div>
          )}

          {/* Org name */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#ccc", marginBottom: 8 }}>Organization name</label>
            <input value={orgName} onChange={e => setOrgName(e.target.value)} placeholder="e.g. Acme Corp, Sunrise Foundation" disabled={isRunning || state === "done"} />
          </div>

          {/* Profile selector */}
          {state !== "done" && !isRunning && (
            profilesLoading ? (
              <div style={{ marginBottom: 20 }}>
                <div className="skeleton" style={{ height: 13, width: 140, borderRadius: 4, marginBottom: 8 }} />
                <div className="skeleton" style={{ height: 38, width: "100%", borderRadius: 6 }} />
              </div>
            ) : profiles.length > 0 ? (
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#ccc", marginBottom: 8 }}>
                  Company profile <span style={{ fontWeight: 400, color: "#666" }}>(optional: adds historical context)</span>
                </label>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <select
                    value={selectedProfileId}
                    onChange={e => {
                      const pid = e.target.value;
                      setSelectedProfileId(pid);
                      if (pid) {
                        const found = profiles.find(p => p.id === pid);
                        if (found && !orgName) setOrgName(found.name);
                      }
                    }}
                    style={{ flex: 1, background: "#3a3a3a", border: `1px solid ${selectedProfileId ? "#CC5500" : "#494949"}`, borderRadius: 6, padding: "9px 10px", fontSize: 13, color: "#f0f0f0", boxSizing: "border-box" }}>
                    <option value="">No profile selected</option>
                    {profiles.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.sector})</option>
                    ))}
                  </select>
                  <Link href="/profiles" style={{ fontSize: 12, color: "#CC5500", textDecoration: "none", whiteSpace: "nowrap" }}>Manage →</Link>
                </div>
              </div>
            ) : null
          )}

          {/* Additional context (advanced only) */}
          {mode === "advanced" && (
            <div ref={contextSectionRef} style={{ marginBottom: 20 }}>
              <button
                onClick={() => setContextOpen(o => !o)}
                disabled={isRunning}
                style={{ width: "100%", background: contextOpen ? "#2a1800" : "#2d2d2d", border: `1px solid ${contextOpen ? "#CC5500" : "#484848"}`, borderRadius: 8, padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: contextOpen ? "#CC5500" : "#aaa" }}>Additional context <span style={{ fontWeight: 400, color: "#666" }}>(optional)</span></span>
                <span style={{ color: contextOpen ? "#CC5500" : "#555", fontSize: 14, fontWeight: 700 }}>{contextOpen ? "▲" : "▼"}</span>
              </button>
              {contextOpen && (
                <div style={{ background: "#2d2d2d", border: "1px solid #3a3a3a", borderTop: "none", borderRadius: "0 0 8px 8px", padding: "16px 14px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#888", marginBottom: 6 }}>Organization type / sector</label>
                    <input
                      value={industry}
                      onChange={e => setIndustry(e.target.value)}
                      placeholder="e.g. youth sports club, HOA, nonprofit food bank, small retail business"
                      disabled={isRunning}
                      style={{ width: "100%", boxSizing: "border-box" }} />
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#888", marginBottom: 6 }}>Key constraints</label>
                    <textarea
                      value={constraints}
                      onChange={e => setConstraints(e.target.value)}
                      placeholder="e.g. Limited hiring budget, must maintain 6-month cash runway, no new debt"
                      disabled={isRunning}
                      rows={2}
                      style={{ width: "100%", boxSizing: "border-box", background: "#3a3a3a", border: "1px solid #494949", borderRadius: 6, padding: "8px 10px", fontSize: 13, color: "#f0f0f0", resize: "vertical", fontFamily: "inherit" }} />
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#888", marginBottom: 6 }}>Other notes</label>
                    <textarea
                      value={extraContext}
                      onChange={e => setExtraContext(e.target.value)}
                      placeholder="e.g. Recently acquired a competitor, planning Series B, seasonality in Q4 revenue"
                      disabled={isRunning}
                      rows={2}
                      style={{ width: "100%", boxSizing: "border-box", background: "#3a3a3a", border: "1px solid #494949", borderRadius: 6, padding: "8px 10px", fontSize: 13, color: "#f0f0f0", resize: "vertical", fontFamily: "inherit" }} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* File upload */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#ccc", marginBottom: 8 }}>
              Financial data{mode === "advanced" ? " (up to 3 files)" : ""}
            </label>

            {files.map((f, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#2d2d2d", border: "1px solid #484848", borderRadius: 8, padding: "10px 14px", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ color: "#CC5500", fontSize: 18 }}>📄</span>
                  <span style={{ fontSize: 13, color: "#f0f0f0" }}>{f.name}</span>
                  <span style={{ fontSize: 12, color: "#666" }}>{(f.size / 1024).toFixed(1)} KB</span>
                </div>
                {!isRunning && state !== "done" && (
                  <button onClick={() => { setFiles(prev => prev.filter((_, idx) => idx !== i)); setUsingSample(false); }}
                    style={{ background: "none", border: "none", color: "#666", fontSize: 18, padding: "0 4px" }}>×</button>
                )}
              </div>
            ))}

            {files.length < (mode === "advanced" ? 3 : 1) && !isRunning && state !== "done" && (
              <div
                onDrop={handleDrop}
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onClick={() => fileInputRef.current?.click()}
                style={{ border: `2px dashed ${dragging ? "#CC5500" : "#484848"}`, borderRadius: 10, padding: "28px 20px", textAlign: "center", cursor: "pointer", transition: "border-color 0.2s", background: dragging ? "#2a1800" : "transparent" }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>↑</div>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#ccc", margin: 0 }}>{files.length > 0 ? "Add another file" : "Upload financial data"}</p>
                <p style={{ fontSize: 12, color: "#666", margin: "4px 0 0" }}>CSV or Excel · Up to {mode === "advanced" ? "10 MB" : "5 MB"}</p>
                {files.length === 0 && (
                  <>
                    <p style={{ fontSize: 12, color: "#777", margin: "8px 0 0", lineHeight: 1.5 }}>
                      Works best with one row per period and columns like date/month, revenue, expenses, and cash balance. A plain export from your bank, accounting tool, or treasurer&apos;s spreadsheet is fine.
                    </p>
                    <p style={{ fontSize: 12, color: "#e05555", margin: "8px 0 0", fontWeight: 500 }}>A file is required to generate an analysis</p>
                  </>
                )}
                <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" multiple style={{ display: "none" }}
                  onChange={e => handleFiles(Array.from(e.target.files ?? []))} />
              </div>
            )}

            {/* No data on hand? Load a realistic sample to see a full report. */}
            {files.length === 0 && !isRunning && state !== "done" && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
                <div style={{ flex: 1, height: 1, background: "#3a3a3a" }} />
                <button
                  type="button"
                  onClick={loadSampleData}
                  style={{ background: "none", border: "1px solid #484848", color: "#CC5500", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
                  ✨ Try with sample data
                </button>
                <div style={{ flex: 1, height: 1, background: "#3a3a3a" }} />
              </div>
            )}

            {usingSample && files.length > 0 && !isRunning && state !== "done" && (
              <p style={{ fontSize: 12, color: "#888", margin: "10px 0 0", lineHeight: 1.5 }}>
                Loaded a sample 12-month ledger for a student organization. Just hit <span style={{ color: "#CC5500", fontWeight: 600 }}>Generate Report</span> below to see a full analysis, or remove it and upload your own file.
              </p>
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

          {/* Report Sections (advanced + full report mode only) */}
          {mode === "advanced" && outputMode === "report" && state !== "done" && !isRunning && (() => {
            const SECTIONS = [
              { key: "executiveSummary" as const, label: "Executive Summary", desc: "Key trends and discrepancies. No recommendations, just what the data shows." },
              { key: "recommendations" as const, label: "Recommendations", desc: "Prioritized action items tailored to your organization." },
              { key: "benchmarks" as const, label: "Industry Benchmarks", desc: "How your metrics compare to sector peers and top performers." },
              { key: "trajectory" as const, label: "Where This Is Heading", desc: "12-month optimistic, base, and pessimistic scenarios." },
              { key: "riskMatrix" as const, label: "Risk Matrix", desc: "Key risks ranked by likelihood and impact." },
            ];
            const activeCount = Object.values(sectionsConfig).filter(Boolean).length;
            return (
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: "#888", letterSpacing: 1, marginBottom: 10 }}>REPORT SECTIONS</p>
                <div style={{ background: "#1e1e1e", border: "1px solid #2f2f2f", borderRadius: 10, overflow: "hidden" }}>
                  {/* Master "All sections" toggle row */}
                  <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, borderBottom: allSectionsOn ? "none" : "1px solid #2a2a2a" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: "#f0f0f0" }}>All sections</p>
                      <p style={{ margin: "2px 0 0", fontSize: 12, color: "#666", lineHeight: 1.4 }}>Generate the full report with every section included.</p>
                    </div>
                    <button
                      onClick={() => {
                        const next = !allSectionsOn;
                        setAllSectionsOn(next);
                        if (next) setSectionsConfig({ executiveSummary: true, recommendations: true, benchmarks: true, trajectory: true, riskMatrix: true });
                      }}
                      style={{ flexShrink: 0, width: 52, height: 28, borderRadius: 14, border: "none", background: allSectionsOn ? "#CC5500" : "#3a3a3a", cursor: "pointer", position: "relative", transition: "background 0.15s ease" }}>
                      <span style={{ position: "absolute", top: 4, left: allSectionsOn ? 26 : 4, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left 0.15s ease", display: "block" }} />
                    </button>
                  </div>

                  {/* Individual section toggles - only visible when "All sections" is OFF */}
                  {!allSectionsOn && SECTIONS.map((section, idx) => {
                    const isOn = sectionsConfig[section.key];
                    const isLastActive = activeCount === 1 && isOn;
                    return (
                      <div key={section.key} style={{ borderBottom: idx < SECTIONS.length - 1 ? "1px solid #2a2a2a" : "none", padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: "#f0f0f0" }}>{section.label}</p>
                          <p style={{ margin: "2px 0 0", fontSize: 12, color: "#666", lineHeight: 1.4 }}>{section.desc}</p>
                        </div>
                        <button
                          title={isLastActive ? "At least one section must be selected." : undefined}
                          disabled={isLastActive}
                          onClick={() => { if (!isLastActive) setSectionsConfig(prev => ({ ...prev, [section.key]: !prev[section.key] })); }}
                          style={{ flexShrink: 0, width: 52, height: 28, borderRadius: 14, border: "none", background: isOn ? "#CC5500" : "#3a3a3a", cursor: isLastActive ? "not-allowed" : "pointer", position: "relative", transition: "background 0.15s ease", opacity: isLastActive ? 0.5 : 1 }}>
                          <span style={{ position: "absolute", top: 4, left: isOn ? 26 : 4, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left 0.15s ease", display: "block" }} />
                        </button>
                      </div>
                    );
                  })}
                </div>
                {!allSectionsOn && (
                  <p style={{ fontSize: 12, color: activeCount < 3 ? "#CC5500" : "#555", margin: "8px 0 0" }}>
                    {activeCount} of 5 sections selected
                  </p>
                )}
              </div>
            );
          })()}

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

          {/* Progress bar */}
          {isRunning && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ height: 6, background: "#484848", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", background: "#CC5500", borderRadius: 3, width: `${progress}%`, transition: "width 0.3s ease" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 12, color: "#666" }}>
                <span>{state === "uploading" ? "Parsing files..." : "Analyzing with AI..."}</span>
                <span>{Math.round(progress)}%</span>
              </div>
            </div>
          )}

          {/* Dedup info banner */}
          {state === "done" && dedupMessage && (
            <InfoBanner message={dedupMessage} onDismiss={() => setDedupMessage("")} />
          )}

          {/* Deep-dive result */}
          {state === "done" && outputMode === "deepdive" && deepDiveResult && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ background: "#2a1800", border: "1px solid #CC5500", borderRadius: 8, padding: "8px 14px", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: "#CC5500", letterSpacing: 1 }}>DEEP-DIVE</span>
                <span style={{ fontSize: 13, color: "#f0a060", fontWeight: 600 }}>{metric}</span>
                <span style={{ marginLeft: "auto", background: mode === "advanced" ? "#2a1800" : "#333", border: `1px solid ${mode === "advanced" ? "#CC5500" : "#555"}`, color: mode === "advanced" ? "#CC5500" : "#888", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4, letterSpacing: 0.5 }}>
                  {mode === "advanced" ? "ADVANCED" : "BASIC"}
                </span>
              </div>
              {parseDeepDive(deepDiveResult).map((section, i) => (
                <div key={i} style={{ background: "#2d2d2d", border: "1px solid #484848", borderRadius: 8, padding: "14px 16px", marginBottom: 10 }}>
                  <p style={{ fontSize: 11, fontWeight: 800, color: "#CC5500", letterSpacing: 1, margin: "0 0 8px" }}>{section.title}</p>
                  <div style={{ fontSize: 13, color: "#ccc", lineHeight: 1.7, margin: 0, whiteSpace: "pre-wrap" }}>{section.content}</div>
                </div>
              ))}
              <div style={{ display: "flex", gap: 10, marginTop: 4, flexWrap: "wrap" }}>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(deepDiveResult).then(() => {
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    });
                  }}
                  style={{ background: copied ? "#1a3a1a" : "#2d2d2d", border: `1px solid ${copied ? "#2e7d32" : "#484848"}`, color: copied ? "#4caf50" : "#888", borderRadius: 7, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}>
                  {copied ? "Copied!" : "Copy to Clipboard"}
                </button>
                <button
                  onClick={downloadDeepDivePDF}
                  disabled={!deepDivePdfBytes}
                  style={{ background: "#CC5500", border: "none", color: "#fff", borderRadius: 7, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: deepDivePdfBytes ? "pointer" : "default", opacity: deepDivePdfBytes ? 1 : 0.5 }}>
                  Download Report
                </button>
              </div>
            </div>
          )}

          {/* Results */}
          {state === "done" && outputMode === "report" && analysis && (
            <div style={{ marginBottom: 20 }}>
              {/* Sections indicator */}
              {lastSectionsConfig && mode === "advanced" && (() => {
                const shownCount = Object.values(lastSectionsConfig).filter(Boolean).length;
                if (shownCount >= 5) return null;
                return (
                  <div style={{ fontSize: 12, color: "#555", marginBottom: 14, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span>Showing {shownCount} of 5 sections</span>
                    <span style={{ color: "#3a3a3a" }}>·</span>
                    <button
                      onClick={() => {
                        setSectionsConfig({ executiveSummary: true, recommendations: true, benchmarks: true, trajectory: true, riskMatrix: true });
                        reset();
                      }}
                      style={{ background: "none", border: "none", color: "#CC5500", fontSize: 12, cursor: "pointer", padding: 0, fontFamily: "inherit" }}>
                      Re-run with all sections →
                    </button>
                  </div>
                );
              })()}

              {/* Summary */}
              {(!lastSectionsConfig || lastSectionsConfig.executiveSummary) && (
              <div style={{ background: "#2d2d2d", border: "1px solid #484848", borderRadius: 10, padding: 16, marginBottom: 16 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#CC5500", letterSpacing: 1, marginBottom: 8 }}>EXECUTIVE SUMMARY</p>
                <p style={{ fontSize: 14, color: "#e0e0e0", lineHeight: 1.6, margin: 0 }}>{analysis.summary}</p>
              </div>
              )}

              {/* Flags - part of Executive Summary section */}
              {(!lastSectionsConfig || lastSectionsConfig.executiveSummary) && analysis.flags.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#888", letterSpacing: 1, marginBottom: 10 }}>WHAT WE FOUND</p>
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
              {(!lastSectionsConfig || lastSectionsConfig.recommendations) && analysis.recommendations.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#888", letterSpacing: 1, marginBottom: 10 }}>WHAT WE'D DO</p>
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

              {/* Trajectory */}
              {(!lastSectionsConfig || lastSectionsConfig.trajectory) && analysis.trajectoryNote && (
              <div style={{ background: "#2d2d2d", border: "1px solid #484848", borderRadius: 8, padding: "12px 14px", marginBottom: 16 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#888", letterSpacing: 1, marginBottom: 6 }}>WHERE THIS IS HEADING</p>
                <p style={{ fontSize: 13, color: "#ccc", margin: 0, fontStyle: "italic", lineHeight: 1.5 }}>{analysis.trajectoryNote}</p>
              </div>
              )}

              {/* Industry Benchmarks */}
              {(!lastSectionsConfig || lastSectionsConfig.benchmarks) && !!analysis.industryComparisons?.length && (
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#888", letterSpacing: 1, marginBottom: 10 }}>HOW YOU COMPARE</p>
                  <div style={{ background: "#2d2d2d", border: "1px solid #484848", borderRadius: 8, overflow: "hidden" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: "#3a3a3a" }}>
                          {["Metric", "Your Value", "Industry Avg", "Top 25%", "Status"].map(h => (
                            <th key={h} style={{ padding: "10px 12px", textAlign: "left", color: "#CC5500", fontWeight: 700, fontSize: 11 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {analysis.industryComparisons.map((c, i) => (
                          <tr key={i} style={{ borderTop: "1px solid #3a3a3a" }}>
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

              {/* Case Studies - part of Recommendations section */}
              {(!lastSectionsConfig || lastSectionsConfig.recommendations) && !!analysis.caseStudies?.length && (
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#888", letterSpacing: 1, marginBottom: 10 }}>WHO'S BEEN HERE BEFORE</p>
                  {analysis.caseStudies.map((cs, i) => (
                    <div key={i} style={{ background: "#2d2d2d", border: "1px solid #484848", borderLeft: "3px solid #CC5500", borderRadius: 8, padding: "14px 16px", marginBottom: 8 }}>
                      <p style={{ fontWeight: 700, fontSize: 14, color: "#CC5500", margin: "0 0 10px" }}>{cs.organization}</p>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                        {[["Challenge", cs.challenge], ["Solution", cs.solution], ["Outcome", cs.outcome]].map(([label, text]) => (
                          <div key={label}>
                            <p style={{ fontSize: 10, fontWeight: 700, color: "#666", letterSpacing: 1, margin: "0 0 4px" }}>{label?.toString().toUpperCase()}</p>
                            <p style={{ fontSize: 12, color: "#ccc", margin: 0, lineHeight: 1.5 }}>{text?.toString()}</p>
                          </div>
                        ))}
                      </div>
                      {cs.source && (
                        <p style={{ fontSize: 11, color: "#555", margin: "10px 0 0", fontStyle: "italic" }}>Source: {cs.source}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Scenarios - part of Where This Is Heading */}
              {(!lastSectionsConfig || lastSectionsConfig.trajectory) && analysis.scenarios && (
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#888", letterSpacing: 1, marginBottom: 10 }}>HOW THIS COULD PLAY OUT</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                    {[
                      { label: "OPTIMISTIC", text: analysis.scenarios.optimistic, color: "#27ae60", border: "#1e5c32" },
                      { label: "BASE CASE", text: analysis.scenarios.base, color: "#2980b9", border: "#1a3a5c" },
                      { label: "PESSIMISTIC", text: analysis.scenarios.pessimistic, color: "#e74c3c", border: "#5c1a1a" },
                    ].map(s => (
                      <div key={s.label} style={{ background: "#2d2d2d", border: `1px solid ${s.border}`, borderTop: `3px solid ${s.color}`, borderRadius: 8, padding: "12px 14px" }}>
                        <p style={{ fontSize: 10, fontWeight: 800, color: s.color, margin: "0 0 6px", letterSpacing: 1 }}>{s.label}</p>
                        <p style={{ fontSize: 12, color: "#ccc", margin: 0, lineHeight: 1.5 }}>{s.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Risk Matrix */}
              {(!lastSectionsConfig || lastSectionsConfig.riskMatrix) && !!analysis.riskMatrix?.length && (
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#888", letterSpacing: 1, marginBottom: 10 }}>WHAT WE'RE WATCHING</p>
                  <div style={{ background: "#2d2d2d", border: "1px solid #484848", borderRadius: 8, overflow: "hidden" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: "#3a3a3a" }}>
                          {["Risk", "Likelihood", "Impact", "Mitigation"].map(h => (
                            <th key={h} style={{ padding: "10px 12px", textAlign: "left", color: "#CC5500", fontWeight: 700, fontSize: 11 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {analysis.riskMatrix.map((r, i) => {
                          const levelColor = (v: string) => v === "high" ? "#e74c3c" : v === "medium" ? "#d4a017" : "#27ae60";
                          return (
                            <tr key={i} style={{ borderTop: "1px solid #3a3a3a" }}>
                              <td style={{ padding: "10px 12px", color: "#f0f0f0", fontWeight: 600, maxWidth: 160 }}>{r.risk}</td>
                              <td style={{ padding: "10px 12px" }}>
                                <span style={{ color: levelColor(r.likelihood), fontWeight: 700, fontSize: 11 }}>{r.likelihood.toUpperCase()}</span>
                              </td>
                              <td style={{ padding: "10px 12px" }}>
                                <span style={{ color: levelColor(r.impact), fontWeight: 700, fontSize: 11 }}>{r.impact.toUpperCase()}</span>
                              </td>
                              <td style={{ padding: "10px 12px", color: "#aaa", fontSize: 12 }}>{r.mitigation}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Action Plan - part of Recommendations section */}
              {(!lastSectionsConfig || lastSectionsConfig.recommendations) && analysis.actionPlan && (
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#888", letterSpacing: 1, marginBottom: 10 }}>YOUR NEXT STEPS</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                    {[
                      { label: "IMMEDIATE", sub: "0–30 days", items: analysis.actionPlan.immediate, color: "#e74c3c", border: "#5c1a1a" },
                      { label: "SHORT-TERM", sub: "30–90 days", items: analysis.actionPlan.shortTerm, color: "#d4a017", border: "#4a3500" },
                      { label: "LONG-TERM", sub: "90+ days", items: analysis.actionPlan.longTerm, color: "#27ae60", border: "#1e5c32" },
                    ].map(phase => (
                      <div key={phase.label} style={{ background: "#2d2d2d", border: `1px solid ${phase.border}`, borderTop: `3px solid ${phase.color}`, borderRadius: 8, padding: "12px 14px" }}>
                        <p style={{ fontSize: 10, fontWeight: 800, color: phase.color, margin: "0 0 2px", letterSpacing: 1 }}>{phase.label}</p>
                        <p style={{ fontSize: 10, color: "#666", margin: "0 0 10px" }}>{phase.sub}</p>
                        {phase.items.map((item, j) => (
                          <div key={j} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                            <span style={{ color: phase.color, fontWeight: 700, flexShrink: 0, fontSize: 12 }}>→</span>
                            <p style={{ fontSize: 12, color: "#ccc", margin: 0, lineHeight: 1.5 }}>{item}</p>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* No-context warning bubble (after first-time modal) */}
          {state !== "done" && !isRunning && advancedHasNoContext && noContextWarnShown && (
            <div style={{ background: "#2a1400", border: "1px solid #CC5500", borderRadius: 8, padding: "8px 12px", marginBottom: 12, fontSize: 12, color: "#ffaa66", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ flexShrink: 0 }}>⚠</span>
              <span>No context provided. Advanced analysis may produce generic results.</span>
              <button onClick={() => { setContextOpen(true); setTimeout(() => contextSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50); }} style={{ background: "none", border: "none", color: "#CC5500", fontSize: 12, fontWeight: 700, cursor: "pointer", padding: 0, marginLeft: "auto", whiteSpace: "nowrap" }}>Add context →</button>
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {state === "done" && outputMode === "report" ? (
              <>
                <button onClick={downloadPDF} style={{ flex: 1, minWidth: 160, background: "#CC5500", color: "#fff", border: "none", borderRadius: 9, padding: "14px 0", fontSize: 15, fontWeight: 700 }}>
                  ↓ Download PDF
                </button>
                {currentAnalysisId && (
                  <button
                    onClick={handleShare}
                    disabled={shareState === "loading"}
                    style={{ flex: 1, minWidth: 140, background: shareState === "shared" ? "#0a1a0e" : "#2d2d2d", color: shareState === "shared" ? "#4ade80" : "#f0f0f0", border: `1px solid ${shareState === "shared" ? "#16a34a" : "#484848"}`, borderRadius: 9, padding: "14px 0", fontSize: 15, fontWeight: 700, opacity: shareState === "loading" ? 0.6 : 1 }}>
                    {shareState === "loading" ? "Sharing…" : shareState === "shared" ? "⇗ Shared ✓" : "⇗ Share Report"}
                  </button>
                )}
              </>
            ) : state !== "done" ? (
              <button
                onClick={() => outputMode === "deepdive" ? runDeepDive() : runAnalysis()}
                disabled={isRunning || !files.length || (outputMode === "deepdive" && !metric.trim())}
                style={{ flex: 1, background: (isRunning || !files.length || (outputMode === "deepdive" && !metric.trim())) ? "#4a2800" : "#CC5500", color: "#fff", border: "none", borderRadius: 9, padding: "14px 0", fontSize: 15, fontWeight: 700, opacity: (isRunning || !files.length || (outputMode === "deepdive" && !metric.trim())) ? 0.6 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                {isRunning ? (
                  <>{state === "uploading" ? "Parsing files..." : outputMode === "deepdive" ? "Analyzing..." : "Generating analysis..."}</>
                ) : (
                  <>{outputMode === "deepdive" ? "Run Deep-Dive →" : `Generate ${mode === "advanced" ? "Advanced " : ""}Report →`}</>
                )}
              </button>
            ) : null}
          </div>

          {/* Error - shown below the run button */}
          {state === "error" && errorMsg && (
            <div style={{ marginTop: 12 }}>
              <ErrorBanner
                title="Analysis failed"
                message={errorMsg}
                onDismiss={() => { setErrorMsg(""); setState("idle"); }}
              />
            </div>
          )}

          {/* Share toast - shown below action buttons */}
          {shareToast && (
            <div style={{ marginTop: 12, background: "#0a1a0e", border: "1px solid #16a34a", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#4ade80", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ flexShrink: 0 }}>✓</span> Link copied to clipboard!
            </div>
          )}
        </div>
      </main>

      {/* History Sidebar */}
      <aside className="dashboard-sidebar" style={{ position: "sticky", top: 76 }}>
        {shareToast && (
          <div style={{ background: "#0a1a0e", border: "1px solid #16a34a", borderRadius: 8, padding: "8px 12px", marginBottom: 8, fontSize: 12, color: "#4ade80", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ flexShrink: 0 }}>✓</span> Link copied to clipboard!
          </div>
        )}
        <div style={{ background: "#333333", border: "1px solid #484848", borderRadius: 12, padding: "16px 14px" }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#CC5500", letterSpacing: 1, margin: "0 0 12px" }}>REPORT HISTORY</p>
          {profileContext?.disable_pdf_history ? (
            <p style={{ fontSize: 12, color: "#555", margin: 0, lineHeight: 1.6 }}>
              PDF history is turned off in{" "}
              <span
                onClick={() => window.location.href = "/settings"}
                style={{ color: "#CC5500", cursor: "pointer", textDecoration: "underline" }}
              >Settings</span>.
            </p>
          ) : history.length === 0 ? (
            <p style={{ fontSize: 12, color: "#555", margin: 0, lineHeight: 1.5 }}>No analyses yet. Run your first report to see history here.</p>
          ) : (
            <div style={{ overflowY: "auto", maxHeight: 480, display: "flex", flexDirection: "column", gap: 8 }}>
              {history.map(item => {
                const date = new Date(item.created_at);
                const dateStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                const timeStr = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
                return (
                  <div key={item.id} style={{ background: "#2d2d2d", border: "1px solid #3e3e3e", borderRadius: 8, padding: "10px 11px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <span style={{
                        fontSize: 9, fontWeight: 800, letterSpacing: 0.5, padding: "1px 5px", borderRadius: 3,
                        background: item.mode === "advanced" ? "#CC5500" : "#484848",
                        color: item.mode === "advanced" ? "#fff" : "#aaa",
                      }}>
                        {item.mode === "advanced" ? "ADV" : "BASIC"}
                      </span>
                      <span style={{ fontSize: 10, color: "#555" }}>{dateStr} · {timeStr}</span>
                    </div>
                    <p style={{ fontSize: 12, fontWeight: 600, color: "#e0e0e0", margin: "0 0 8px", lineHeight: 1.3, wordBreak: "break-word" }}>
                      {item.label}
                    </p>
                    <div style={{ display: "flex", gap: 5 }}>
                      <button
                        onClick={() => downloadHistoryPDF(item)}
                        style={{ flex: 1, background: "#3a3a3a", border: "1px solid #494949", color: "#CC5500", borderRadius: 5, padding: "5px 0", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                        ↓ PDF
                      </button>
                      <button
                        onClick={() => handleHistoryShare(item)}
                        disabled={historyShareLoading[item.id]}
                        title={historyShareTokens[item.id] ? "Copy share link" : "Share report"}
                        style={{ width: 30, background: "#3a3a3a", border: "1px solid #494949", color: historyShareTokens[item.id] ? "#4ade80" : "#aaa", borderRadius: 5, padding: "5px 0", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                        ⇗
                      </button>
                      {historyShareTokens[item.id] && (
                        <button
                          onClick={() => handleHistoryDestroy(item)}
                          disabled={historyShareLoading[item.id]}
                          title="Remove public webpage"
                          style={{ width: 30, background: "#3a3a3a", border: "1px solid #5c1a1a", color: "#e74c3c", borderRadius: 5, padding: "5px 0", fontSize: 13, cursor: "pointer" }}>
                          🗑
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {!profileContext?.disable_pdf_history && (
            <p style={{ fontSize: 10, color: "#5a5a5a", margin: "10px 0 0", textAlign: "center" }}>
              {historyAccountType === "free" ? "Free accounts: capped at 20 reports" : ""}
            </p>
          )}
        </div>
      </aside>
      </div>

      {/* No-context first-time warning modal */}
      {showNoContextModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "#333333", border: "1px solid #484848", borderRadius: 16, padding: 32, maxWidth: 440, width: "100%" }}>
            <div style={{ width: 40, height: 40, background: "#CC5500", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, marginBottom: 18 }}>⚠</div>
            <p style={{ fontSize: 18, fontWeight: 800, color: "#f0f0f0", margin: "0 0 10px" }}>Advanced analysis works best with context</p>
            <p style={{ fontSize: 14, color: "#999", margin: "0 0 20px", lineHeight: 1.65 }}>
              Without providing industry, company size, or constraints, the analysis will be based on generic benchmarks and may not reflect your organisation&apos;s actual situation. Results could be less accurate and harder to act on.
            </p>
            <p style={{ fontSize: 13, color: "#666", margin: "0 0 24px" }}>
              You can add context using the <strong style={{ color: "#ccc" }}>Additional context</strong> panel above the upload area.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => { setShowNoContextModal(false); setContextOpen(true); }}
                style={{ flex: 1, background: "#CC5500", color: "#fff", border: "none", borderRadius: 9, padding: "12px 0", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                Add context
              </button>
              <button
                onClick={confirmRunWithoutContext}
                style={{ flex: 1, background: "none", border: "1px solid #484848", color: "#aaa", borderRadius: 9, padding: "12px 0", fontSize: 14, cursor: "pointer" }}>
                Run anyway
              </button>
            </div>
          </div>
        </div>
      )}

      <footer style={{ borderTop: "1px solid #272727", padding: "24px 40px", marginTop: 40 }}>
        <div style={{ maxWidth: 1060, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <span style={{ fontSize: 13, color: "#484848" }}>© {new Date().getFullYear()} Consult6. All rights reserved.</span>
          <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
            <Link href="/about" style={{ fontSize: 13, color: "#555", textDecoration: "none" }}>About</Link>
            <Link href="/privacy" style={{ fontSize: 13, color: "#555", textDecoration: "none" }}>Privacy</Link>
            <Link href="/terms" style={{ fontSize: 13, color: "#555", textDecoration: "none" }}>Terms</Link>
            <Link href="/contact" style={{ fontSize: 13, color: "#555", textDecoration: "none" }}>Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}


