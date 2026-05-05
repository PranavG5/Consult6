"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import Link from "next/link";

export const metadata = { title: "Settings | Consult6" };

type Tab = "profile" | "privacy" | "billing" | "account" | "admin";

interface SubHistoryEntry {
  id: string;
  plan: string;
  status: string;
  from_plan?: string;
  to_plan?: string;
  is_admin_action?: boolean;
  note?: string;
  started_at?: string;
  admin_email?: string;
}

interface AdminUser {
  id: string;
  email: string;
  account_type: string;
  industry: string;
  company_size: string;
  created_at: string;
  last_sign_in_at: string | null;
  provider: string;
}

interface ReportCount {
  user_id: string;
  mode: string;
  count: number;
}

interface ProfileData {
  about_me: string;
  industry: string;
  company_size: string;
  other_context: string;
}

interface PrivacyData {
  disable_pdf_history: boolean;
  disable_analysis_memory: boolean;
  memory_local_only: boolean;
}

const BASE_TABS: { id: Tab; label: string }[] = [
  { id: "profile", label: "Profile" },
  { id: "privacy", label: "Privacy" },
  { id: "billing", label: "Billing" },
  { id: "account", label: "Account" },
];

function Toggle({ checked, onChange, label, desc }: { checked: boolean; onChange: (v: boolean) => void; label: string; desc: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "16px 0", borderBottom: "1px solid #3a3a3a" }}>
      <div style={{ flex: 1, marginRight: 24 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: "#f0f0f0", margin: "0 0 4px" }}>{label}</p>
        <p style={{ fontSize: 13, color: "#666", margin: 0, lineHeight: 1.5 }}>{desc}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        style={{ width: 44, height: 24, borderRadius: 12, background: checked ? "#CC5500" : "#484848", border: "none", position: "relative", cursor: "pointer", flexShrink: 0, transition: "background 0.2s" }}>
        <span style={{ position: "absolute", top: 3, left: checked ? 23 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("profile");
  const [user, setUser] = useState<{ email: string; id: string } | null>(null);
  const [accountType, setAccountType] = useState("free");
  const [profile, setProfile] = useState<ProfileData>({ about_me: "", industry: "", company_size: "", other_context: "" });
  const [privacy, setPrivacy] = useState<PrivacyData>({ disable_pdf_history: false, disable_analysis_memory: false, memory_local_only: true });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [subHistory, setSubHistory] = useState<SubHistoryEntry[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [adminSearch, setAdminSearch] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);
  const [reportCounts, setReportCounts] = useState<ReportCount[]>([]);
  const [reportCountsLoading, setReportCountsLoading] = useState(false);
  const [upgradeTarget, setUpgradeTarget] = useState<AdminUser | null>(null);
  const [upgradePlan, setUpgradePlan] = useState("free");
  const [upgradeNote, setUpgradeNote] = useState("");
  const [upgrading, setUpgrading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) { window.location.href = "/auth/login"; return; }
      setUser({ email: u.email ?? "", id: u.id });

      const { data } = await supabase.from("profiles").select("*").eq("id", u.id).single();
      if (data) {
        const aType = data.account_type ?? "free";
        setAccountType(aType);
        setProfile({
          about_me: data.about_me ?? "",
          industry: data.industry ?? "",
          company_size: data.company_size ?? "",
          other_context: data.other_context ?? "",
        });
        setPrivacy({
          disable_pdf_history: data.disable_pdf_history ?? false,
          disable_analysis_memory: data.disable_analysis_memory ?? false,
          memory_local_only: data.memory_local_only ?? true,
        });
        // fetch billing history for all users
        fetch("/api/billing/history").then(r => r.json()).then(d => setSubHistory(d.history ?? []));
        // fetch admin user list if admin
        if (aType === "admin") {
          setAdminLoading(true);
          fetch("/api/admin/users")
            .then(r => r.json())
            .then(d => {
              if (d.error) flash(d.error, false);
              setAdminUsers(d.users ?? []);
              setAdminLoading(false);
            })
            .catch(err => {
              flash("Admin API error: " + (err?.message ?? "unknown"), false);
              setAdminLoading(false);
            });
          setReportCountsLoading(true);
          fetch("/api/admin/report-counts")
            .then(r => r.json())
            .then(d => {
              setReportCounts(d.counts ?? []);
              setReportCountsLoading(false);
            })
            .catch(() => setReportCountsLoading(false));
        }
      }
    }
    load();
  }, []);

  function flash(text: string, ok = true) {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 4000);
  }

  async function saveProfile() {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update(profile).eq("id", user.id);
    setSaving(false);
    error ? flash("Failed to save profile.", false) : flash("Profile saved.");
  }

  async function savePrivacy() {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update(privacy).eq("id", user.id);
    if (!error && privacy.disable_pdf_history) {
      localStorage.removeItem(`consult6_history_${user.id}`);
    }
    setSaving(false);
    error ? flash("Failed to save privacy settings.", false) : flash("Privacy settings saved.");
  }

  async function handleUpdateEmail() {
    if (!newEmail.trim()) return;
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
    setSaving(false);
    error ? flash(error.message, false) : flash("Confirmation sent to your current email address. Please verify to complete the change.");
    setNewEmail("");
  }

  async function handleUpdatePassword() {
    if (!newPassword.trim() || newPassword.length < 8) { flash("Password must be at least 8 characters.", false); return; }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSaving(false);
    error ? flash(error.message, false) : flash("Password updated successfully.");
    setNewPassword("");
    setCurrentPassword("");
  }

  async function handleDeleteAccount() {
    if (deleteConfirm !== "DELETE") { flash("Type DELETE exactly to confirm.", false); return; }
    if (!user) return;
    setSaving(true);
    await supabase.from("analysis_history").delete().eq("user_id", user.id);
    await supabase.from("daily_usage").delete().eq("user_id", user.id);
    await supabase.from("profiles").delete().eq("id", user.id);
    localStorage.removeItem(`consult6_history_${user.id}`);
    await supabase.auth.signOut();
    window.location.href = "/?deleted=1";
  }

  async function handleUpgrade() {
    if (!upgradeTarget) return;
    setUpgrading(true);
    const res = await fetch("/api/admin/upgrade", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target_user_id: upgradeTarget.id, new_plan: upgradePlan, note: upgradeNote }),
    });
    const data = await res.json();
    setUpgrading(false);
    if (!res.ok) { flash(data.error ?? "Upgrade failed.", false); return; }
    setAdminUsers(prev => prev.map(u => u.id === upgradeTarget.id ? { ...u, account_type: upgradePlan } : u));
    setUpgradeTarget(null);
    setUpgradeNote("");
    flash(`${upgradeTarget.email} upgraded to ${upgradePlan}.`);
  }

  const tabLabels: { id: Tab; label: string }[] = accountType === "admin"
    ? [...BASE_TABS, { id: "admin", label: "Admin" }]
    : BASE_TABS;

  const badgeStyle: Record<string, { bg: string; color: string }> = {
    free: { bg: "#484848", color: "#aaa" },
    paid: { bg: "#CC5500", color: "#fff" },
    enterprise: { bg: "#16a34a", color: "#fff" },
    admin: { bg: "#6b21a8", color: "#f0f0f0" },
  };
  const badge = badgeStyle[accountType] ?? badgeStyle.free;

  return (
    <div style={{ minHeight: "100vh", background: "#272727" }}>
      <style>{`input::placeholder, textarea::placeholder { color: #4a4a4a !important; }`}</style>
      {/* Navbar */}
      <nav style={{ background: "#1e1e1e", borderBottom: "1px solid #3a3a3a", padding: "0 24px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100, overflow: "visible" }}>
        <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div style={{ width: 32, height: 32, background: "#CC5500", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16, color: "#fff" }}>6</div>
          <span style={{ fontWeight: 700, fontSize: 16, color: "#f0f0f0" }}>Consult6</span>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Desktop */}
          <span className="dash-nav-desktop" style={{ fontSize: 13, color: "#888" }}>{user?.email}</span>
          <Link href="/dashboard" className="dash-nav-desktop" style={{ background: "none", border: "1px solid #484848", color: "#aaa", borderRadius: 6, padding: "4px 12px", fontSize: 12, textDecoration: "none" }}>← Dashboard</Link>
          {/* Mobile hamburger */}
          <button
            className="dash-nav-mobile"
            onClick={() => setMobileMenuOpen(o => !o)}
            style={{ background: "none", border: "none", color: "#aaa", padding: "4px 6px", display: "flex", flexDirection: "column", gap: 5, justifyContent: "center", alignItems: "center" }}
            aria-label="Menu"
          >
            <span style={{ display: "block", width: 22, height: 2, background: "#aaa", borderRadius: 1 }} />
            <span style={{ display: "block", width: 22, height: 2, background: "#aaa", borderRadius: 1 }} />
            <span style={{ display: "block", width: 22, height: 2, background: "#aaa", borderRadius: 1 }} />
          </button>
        </div>
        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div className="dash-nav-mobile" style={{ position: "absolute", top: 56, right: 16, background: "#1e1e1e", border: "1px solid #3a3a3a", borderRadius: 10, padding: "8px 0", minWidth: 160, zIndex: 200, boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
            <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)} style={{ display: "block", padding: "10px 20px", fontSize: 14, color: "#f0f0f0", textDecoration: "none" }}>Dashboard</Link>
            <Link href="/profiles" onClick={() => setMobileMenuOpen(false)} style={{ display: "block", padding: "10px 20px", fontSize: 14, color: "#f0f0f0", textDecoration: "none" }}>Profiles</Link>
          </div>
        )}
      </nav>

      <main style={{ maxWidth: 820, margin: "40px auto", padding: "0 20px" }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "#f0f0f0", margin: "0 0 8px" }}>Settings</h1>
        <p style={{ fontSize: 14, color: "#666", margin: "0 0 32px" }}>Manage your profile, privacy, billing, and account.</p>

        {msg && (
          <div style={{ background: msg.ok ? "#0a1a0e" : "#2d1010", border: `1px solid ${msg.ok ? "#16a34a" : "#c0392b"}`, borderRadius: 8, padding: "10px 16px", marginBottom: 20, fontSize: 13, color: msg.ok ? "#4ade80" : "#e74c3c" }}>
            {msg.text}
          </div>
        )}

        <div className="settings-layout" style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
          {/* Sidebar tabs */}
          <div className="settings-tabs" style={{ width: 180, flexShrink: 0 }}>
            {tabLabels.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{ width: "100%", textAlign: "left", background: tab === t.id ? "#2a1800" : "transparent", border: tab === t.id ? "1px solid #CC5500" : "1px solid transparent", borderRadius: 8, padding: "10px 14px", fontSize: 14, fontWeight: tab === t.id ? 700 : 500, color: tab === t.id ? "#CC5500" : "#888", cursor: "pointer", marginBottom: 4 }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="settings-content" style={{ flex: 1, background: "#333333", border: "1px solid #484848", borderRadius: 12, padding: 28 }}>

            {/* ── PROFILE ── */}
            {tab === "profile" && (
              <div>
                <p style={{ fontSize: 16, fontWeight: 700, color: "#f0f0f0", margin: "0 0 4px" }}>Profile</p>
                <p style={{ fontSize: 13, color: "#666", margin: "0 0 24px" }}>This information is used to personalise your analyses and save you time.</p>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#ccc", marginBottom: 8 }}>About me</label>
                  <textarea value={profile.about_me} onChange={e => setProfile(p => ({ ...p, about_me: e.target.value }))}
                    placeholder="e.g. I'm a CFO at a mid-sized SaaS company focused on unit economics and runway management."
                    rows={3} style={{ width: "100%", boxSizing: "border-box", background: "#2d2d2d", border: "1px solid #484848", borderRadius: 8, color: "#f0f0f0", padding: "10px 14px", fontSize: 13, resize: "vertical", fontFamily: "inherit" }} />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#ccc", marginBottom: 8 }}>Organization type / sector</label>
                  <input value={profile.industry} onChange={e => setProfile(p => ({ ...p, industry: e.target.value }))}
                    placeholder="e.g. youth sports club, HOA, nonprofit food bank, small retail business" style={{ width: "100%", boxSizing: "border-box" }} />
                </div>
                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#ccc", marginBottom: 8 }}>Other relevant context</label>
                  <textarea value={profile.other_context} onChange={e => setProfile(p => ({ ...p, other_context: e.target.value }))}
                    placeholder="e.g. We target Series A startups, have a 12-month runway target, and prioritise gross margin over growth."
                    rows={3} style={{ width: "100%", boxSizing: "border-box", background: "#2d2d2d", border: "1px solid #484848", borderRadius: 8, color: "#f0f0f0", padding: "10px 14px", fontSize: 13, resize: "vertical", fontFamily: "inherit" }} />
                </div>
                <button onClick={saveProfile} disabled={saving}
                  style={{ background: "#CC5500", color: "#fff", border: "none", borderRadius: 8, padding: "11px 24px", fontSize: 14, fontWeight: 700, opacity: saving ? 0.6 : 1 }}>
                  {saving ? "Saving…" : "Save Profile"}
                </button>
              </div>
            )}

            {/* ── PRIVACY ── */}
            {tab === "privacy" && (
              <div>
                <p style={{ fontSize: 16, fontWeight: 700, color: "#f0f0f0", margin: "0 0 4px" }}>Privacy</p>
                <p style={{ fontSize: 13, color: "#666", margin: "0 0 4px" }}>Control how Consult6 stores and uses your data.</p>
                <Toggle checked={privacy.disable_pdf_history} onChange={v => setPrivacy(p => ({ ...p, disable_pdf_history: v }))}
                  label="Disable PDF history"
                  desc="Stop saving analysis reports to your history sidebar. Enabling this will also clear your existing history." />
                <Toggle checked={privacy.disable_analysis_memory} onChange={v => setPrivacy(p => ({ ...p, disable_analysis_memory: v }))}
                  label="Disable analysis memory"
                  desc="Prevent Consult6 from pre-filling your profile context (organization type, about me) into new analyses." />
                <Toggle checked={privacy.memory_local_only} onChange={v => setPrivacy(p => ({ ...p, memory_local_only: v }))}
                  label="Keep history local to this device"
                  desc="Store report history only in your browser's local storage, not linked to your account. Clearing your browser data will erase it." />
                <div style={{ marginTop: 24 }}>
                  <button onClick={savePrivacy} disabled={saving}
                    style={{ background: "#CC5500", color: "#fff", border: "none", borderRadius: 8, padding: "11px 24px", fontSize: 14, fontWeight: 700, opacity: saving ? 0.6 : 1 }}>
                    {saving ? "Saving…" : "Save Privacy Settings"}
                  </button>
                </div>
              </div>
            )}

            {/* ── BILLING ── */}
            {tab === "billing" && (
              <div>
                <p style={{ fontSize: 16, fontWeight: 700, color: "#f0f0f0", margin: "0 0 4px" }}>Billing</p>
                <p style={{ fontSize: 13, color: "#666", margin: "0 0 24px" }}>Manage your subscription and billing history.</p>
                <div style={{ background: "#2d2d2d", border: "1px solid #3a3a3a", borderRadius: 10, padding: "20px 22px", marginBottom: 20 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "#666", letterSpacing: 1, margin: "0 0 10px" }}>CURRENT PLAN</p>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ background: badge.bg, color: badge.color, fontSize: 12, fontWeight: 800, padding: "4px 12px", borderRadius: 20, letterSpacing: 0.5 }}>{accountType.toUpperCase()}</span>
                      <span style={{ fontSize: 15, color: "#ccc" }}>{accountType === "free" ? "Free · $0/mo" : accountType === "paid" ? "Pro · $10/mo" : accountType === "enterprise" ? "Enterprise · $40/mo" : "Admin"}</span>
                    </div>
                    {accountType === "free" ? (
                      <Link href="/#pricing" style={{ background: "#CC5500", color: "#fff", fontSize: 13, fontWeight: 700, textDecoration: "none", padding: "8px 18px", borderRadius: 7 }}>Upgrade</Link>
                    ) : (
                      <button style={{ background: "none", border: "1px solid #484848", color: "#888", fontSize: 13, borderRadius: 7, padding: "8px 16px" }}
                        onClick={() => flash("Subscription management coming soon. Visit /contact or email consult6testing@gmail.com to cancel.")}>Cancel Plan</button>
                    )}
                  </div>
                </div>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "#666", letterSpacing: 1, margin: "0 0 12px" }}>SUBSCRIPTION HISTORY</p>
                  {subHistory.length === 0 ? (
                    <div style={{ background: "#2d2d2d", border: "1px solid #3a3a3a", borderRadius: 8, padding: "20px", textAlign: "center" }}>
                      <p style={{ fontSize: 13, color: "#555", margin: 0 }}>No billing history yet.</p>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {subHistory.map(h => (
                        <div key={h.id} style={{ background: "#2d2d2d", border: `1px solid ${h.is_admin_action ? "#4b2e7a" : "#3a3a3a"}`, borderRadius: 8, padding: "14px 16px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              {h.from_plan && h.to_plan ? (
                                <span style={{ fontSize: 13, color: "#f0f0f0", fontWeight: 600 }}>
                                  {h.from_plan.toUpperCase()} → {h.to_plan.toUpperCase()}
                                </span>
                              ) : (
                                <span style={{ fontSize: 13, color: "#f0f0f0", fontWeight: 600 }}>{h.plan.toUpperCase()}</span>
                              )}
                              {h.is_admin_action && (
                                <span style={{ fontSize: 10, fontWeight: 700, background: "#2d1a4a", color: "#c084fc", padding: "2px 7px", borderRadius: 10, letterSpacing: 0.5 }}>ADMIN ACTION</span>
                              )}
                            </div>
                            <span style={{ fontSize: 11, color: "#555" }}>{h.started_at ? new Date(h.started_at).toLocaleDateString() : ""}</span>
                          </div>
                          {h.is_admin_action && h.admin_email && (
                            <p style={{ fontSize: 12, color: "#888", margin: "2px 0 0" }}>Changed by {h.admin_email}</p>
                          )}
                          {h.note && <p style={{ fontSize: 12, color: "#666", margin: "4px 0 0", fontStyle: "italic" }}>{h.note}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── ADMIN ── */}
            {tab === "admin" && (
              <div>
                <p style={{ fontSize: 16, fontWeight: 700, color: "#f0f0f0", margin: "0 0 4px" }}>Admin Dashboard</p>
                <p style={{ fontSize: 13, color: "#666", margin: "0 0 20px" }}>Manage all accounts. Sensitive data (passwords, payment info) is never shown.</p>

                {/* Search */}
                <input
                  value={adminSearch}
                  onChange={e => setAdminSearch(e.target.value)}
                  placeholder="Search by email, plan, industry…"
                  style={{ width: "100%", boxSizing: "border-box", marginBottom: 16, background: "#2d2d2d", border: "1px solid #484848", borderRadius: 8, color: "#f0f0f0", padding: "10px 14px", fontSize: 13 }}
                />

                {adminLoading ? (
                  <p style={{ fontSize: 13, color: "#555", textAlign: "center", padding: 20 }}>Loading accounts…</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 520, overflowY: "auto" }}>
                    {adminUsers
                      .filter(u => {
                        const q = adminSearch.toLowerCase();
                        return !q || (u.email ?? "").toLowerCase().includes(q) || u.account_type.includes(q) || u.industry.toLowerCase().includes(q);
                      })
                      .map(u => {
                        const planColors: Record<string, { bg: string; color: string }> = {
                          free: { bg: "#484848", color: "#aaa" },
                          paid: { bg: "#CC5500", color: "#fff" },
                          enterprise: { bg: "#16a34a", color: "#fff" },
                          admin: { bg: "#6b21a8", color: "#f0f0f0" },
                        };
                        const pc = planColors[u.account_type] ?? planColors.free;
                        return (
                          <div key={u.id} style={{ background: "#2d2d2d", border: "1px solid #3a3a3a", borderRadius: 10, padding: "14px 16px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                                  <span style={{ fontSize: 14, fontWeight: 600, color: "#f0f0f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email}</span>
                                  <span style={{ fontSize: 10, fontWeight: 700, background: pc.bg, color: pc.color, padding: "2px 8px", borderRadius: 10, flexShrink: 0 }}>{u.account_type.toUpperCase()}</span>
                                </div>
                                <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                                  {u.industry && <span style={{ fontSize: 12, color: "#777" }}>◈ {u.industry}</span>}
                                  {u.company_size && <span style={{ fontSize: 12, color: "#777" }}>⊞ {u.company_size}</span>}
                                  <span style={{ fontSize: 12, color: "#555" }}>Joined {new Date(u.created_at).toLocaleDateString()}</span>
                                  <span style={{ fontSize: 12, color: "#555" }}>
                                    Last seen {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString() : "never"}
                                  </span>
                                  <span style={{ fontSize: 12, color: "#555" }}>via {u.provider}</span>
                                </div>
                              </div>
                              <button
                                onClick={() => { setUpgradeTarget(u); setUpgradePlan(u.account_type); setUpgradeNote(""); }}
                                style={{ background: "#2a1800", border: "1px solid #CC5500", color: "#CC5500", fontSize: 12, fontWeight: 600, borderRadius: 7, padding: "6px 14px", cursor: "pointer", flexShrink: 0 }}>
                                Change Plan
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    {adminUsers.filter(u => {
                      const q = adminSearch.toLowerCase();
                      return !q || (u.email ?? "").toLowerCase().includes(q) || u.account_type.includes(q) || u.industry.toLowerCase().includes(q);
                    }).length === 0 && (
                      <p style={{ fontSize: 13, color: "#555", textAlign: "center", padding: 20 }}>No accounts match your search.</p>
                    )}
                  </div>
                )}

                {/* Upgrade modal */}
                {upgradeTarget && (
                  <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
                    <div style={{ background: "#252525", border: "1px solid #484848", borderRadius: 14, padding: 28, width: "100%", maxWidth: 420 }}>
                      <p style={{ fontSize: 16, fontWeight: 700, color: "#f0f0f0", margin: "0 0 4px" }}>Change Plan</p>
                      <p style={{ fontSize: 13, color: "#666", margin: "0 0 20px", wordBreak: "break-all" }}>{upgradeTarget.email}</p>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#aaa", marginBottom: 6 }}>New Plan</label>
                      <select
                        value={upgradePlan}
                        onChange={e => setUpgradePlan(e.target.value)}
                        style={{ width: "100%", background: "#2d2d2d", border: "1px solid #484848", borderRadius: 8, color: "#f0f0f0", padding: "10px 14px", fontSize: 13, marginBottom: 14, boxSizing: "border-box" }}>
                        <option value="free">Free</option>
                        <option value="paid">Pro ($10/mo)</option>
                        <option value="enterprise">Enterprise ($40/mo)</option>
                        <option value="admin">Admin</option>
                      </select>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#aaa", marginBottom: 6 }}>Note (shown in user's billing history)</label>
                      <input
                        value={upgradeNote}
                        onChange={e => setUpgradeNote(e.target.value)}
                        placeholder="e.g. Complimentary upgrade, partnership deal"
                        style={{ width: "100%", boxSizing: "border-box", background: "#2d2d2d", border: "1px solid #484848", borderRadius: 8, color: "#f0f0f0", padding: "10px 14px", fontSize: 13, marginBottom: 20 }}
                      />
                      <div style={{ display: "flex", gap: 10 }}>
                        <button onClick={handleUpgrade} disabled={upgrading}
                          style={{ flex: 1, background: "#CC5500", color: "#fff", border: "none", borderRadius: 8, padding: "11px 0", fontSize: 14, fontWeight: 700, opacity: upgrading ? 0.6 : 1, cursor: "pointer" }}>
                          {upgrading ? "Saving…" : "Confirm Change"}
                        </button>
                        <button onClick={() => setUpgradeTarget(null)}
                          style={{ background: "none", border: "1px solid #484848", color: "#888", borderRadius: 8, padding: "11px 18px", fontSize: 13, cursor: "pointer" }}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Report Usage */}
                <div style={{ marginTop: 32 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "#f0f0f0", margin: "0 0 4px" }}>Report Usage</p>
                  <p style={{ fontSize: 13, color: "#666", margin: "0 0 16px" }}>Total reports run per user, broken down by analysis type.</p>
                  {reportCountsLoading ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {[1, 2, 3].map(i => (
                        <div key={i} style={{ background: "#2d2d2d", border: "1px solid #3a3a3a", borderRadius: 8, padding: "14px 16px", display: "flex", gap: 16 }}>
                          <div className="skeleton" style={{ height: 14, width: "40%", borderRadius: 4 }} />
                          <div className="skeleton" style={{ height: 14, width: "15%", borderRadius: 4 }} />
                          <div className="skeleton" style={{ height: 14, width: "15%", borderRadius: 4 }} />
                          <div className="skeleton" style={{ height: 14, width: "10%", borderRadius: 4 }} />
                        </div>
                      ))}
                    </div>
                  ) : (() => {
                    // Build per-user totals
                    const userMap: Record<string, { basic: number; advanced: number }> = {};
                    for (const rc of reportCounts) {
                      if (!userMap[rc.user_id]) userMap[rc.user_id] = { basic: 0, advanced: 0 };
                      if (rc.mode === "basic") userMap[rc.user_id].basic += rc.count;
                      else if (rc.mode === "advanced") userMap[rc.user_id].advanced += rc.count;
                    }
                    const rows = Object.entries(userMap)
                      .map(([uid, counts]) => {
                        const u = adminUsers.find(au => au.id === uid);
                        return { uid, email: u?.email ?? uid, basic: counts.basic, advanced: counts.advanced, total: counts.basic + counts.advanced };
                      })
                      .filter(r => r.total > 0)
                      .sort((a, b) => b.total - a.total);

                    if (rows.length === 0) {
                      return <p style={{ fontSize: 13, color: "#555", textAlign: "center", padding: 20 }}>No report data yet.</p>;
                    }

                    return (
                      <div style={{ background: "#2d2d2d", border: "1px solid #3a3a3a", borderRadius: 10, overflow: "hidden" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                          <thead>
                            <tr style={{ background: "#3a3a3a" }}>
                              {["Email", "Basic", "Advanced", "Total"].map(h => (
                                <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "#CC5500", fontWeight: 700, fontSize: 11, letterSpacing: 0.5 }}>{h.toUpperCase()}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((r, i) => (
                              <tr key={r.uid} style={{ borderTop: i === 0 ? "none" : "1px solid #3a3a3a" }}>
                                <td style={{ padding: "10px 14px", color: "#f0f0f0", fontSize: 12, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.email}</td>
                                <td style={{ padding: "10px 14px", color: "#aaa" }}>{r.basic}</td>
                                <td style={{ padding: "10px 14px", color: "#aaa" }}>{r.advanced}</td>
                                <td style={{ padding: "10px 14px", color: "#f0f0f0", fontWeight: 700 }}>{r.total}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* ── ACCOUNT ── */}
            {tab === "account" && (
              <div>
                <p style={{ fontSize: 16, fontWeight: 700, color: "#f0f0f0", margin: "0 0 4px" }}>Account</p>
                <p style={{ fontSize: 13, color: "#666", margin: "0 0 24px" }}>Update your login credentials or delete your account.</p>

                {/* Update email */}
                <div style={{ background: "#2d2d2d", border: "1px solid #3a3a3a", borderRadius: 10, padding: "20px 22px", marginBottom: 16 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "#f0f0f0", margin: "0 0 4px" }}>Update email</p>
                  <p style={{ fontSize: 12, color: "#555", margin: "0 0 14px" }}>Current: {user?.email}</p>
                  <div style={{ display: "flex", gap: 10 }}>
                    <input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="New email address"
                      type="email" style={{ flex: 1, boxSizing: "border-box" }} />
                    <button onClick={handleUpdateEmail} disabled={saving || !newEmail.trim()}
                      style={{ background: "#CC5500", color: "#fff", border: "none", borderRadius: 8, padding: "10px 18px", fontSize: 13, fontWeight: 700, opacity: saving || !newEmail.trim() ? 0.5 : 1, whiteSpace: "nowrap" }}>
                      Send Verification
                    </button>
                  </div>
                  <p style={{ fontSize: 11, color: "#5a5a5a", margin: "8px 0 0" }}>A confirmation link will be sent to your current email to verify the change.</p>
                </div>

                {/* Update password */}
                <div style={{ background: "#2d2d2d", border: "1px solid #3a3a3a", borderRadius: 10, padding: "20px 22px", marginBottom: 16 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "#f0f0f0", margin: "0 0 14px" }}>Update password</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <input value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="Current password" type="password" style={{ boxSizing: "border-box" }} />
                    <input value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="New password (min 8 characters)" type="password" style={{ boxSizing: "border-box" }} />
                    <button onClick={handleUpdatePassword} disabled={saving || !newPassword.trim()}
                      style={{ background: "#CC5500", color: "#fff", border: "none", borderRadius: 8, padding: "10px 18px", fontSize: 13, fontWeight: 700, opacity: saving || !newPassword.trim() ? 0.5 : 1, alignSelf: "flex-start" }}>
                      Update Password
                    </button>
                  </div>
                </div>

                {/* Delete account */}
                <div style={{ background: "#1a0a0a", border: "1px solid #5c1a1a", borderRadius: 10, padding: "20px 22px" }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "#e74c3c", margin: "0 0 6px" }}>Delete account</p>
                  <p style={{ fontSize: 13, color: "#888", margin: "0 0 14px", lineHeight: 1.5 }}>
                    Permanently deletes your profile, analysis history, and usage data. This cannot be undone.
                  </p>
                  {!showDeleteConfirm ? (
                    <button onClick={() => setShowDeleteConfirm(true)}
                      style={{ background: "none", border: "1px solid #c0392b", color: "#e74c3c", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 600 }}>
                      Delete My Account
                    </button>
                  ) : (
                    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                      <input value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} placeholder='Type "DELETE" to confirm'
                        style={{ flex: 1, minWidth: 200, boxSizing: "border-box", border: "1px solid #c0392b" }} />
                      <button onClick={handleDeleteAccount} disabled={saving || deleteConfirm !== "DELETE"}
                        style={{ background: "#c0392b", color: "#fff", border: "none", borderRadius: 8, padding: "10px 18px", fontSize: 13, fontWeight: 700, opacity: deleteConfirm !== "DELETE" ? 0.4 : 1 }}>
                        {saving ? "Deleting…" : "Confirm Delete"}
                      </button>
                      <button onClick={() => { setShowDeleteConfirm(false); setDeleteConfirm(""); }}
                        style={{ background: "none", border: "none", color: "#666", fontSize: 13 }}>Cancel</button>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      </main>

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
