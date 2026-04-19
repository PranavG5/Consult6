"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import Link from "next/link";

type Tab = "profile" | "privacy" | "billing" | "account";

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

const TAB_LABELS: { id: Tab; label: string }[] = [
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
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) { window.location.href = "/auth/login"; return; }
      setUser({ email: u.email ?? "", id: u.id });

      const { data } = await supabase.from("profiles").select("*").eq("id", u.id).single();
      if (data) {
        setAccountType(data.account_type ?? "free");
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

  const badgeStyle: Record<string, { bg: string; color: string }> = {
    free: { bg: "#484848", color: "#aaa" },
    paid: { bg: "#CC5500", color: "#fff" },
    enterprise: { bg: "#16a34a", color: "#fff" },
    admin: { bg: "#6b21a8", color: "#f0f0f0" },
  };
  const badge = badgeStyle[accountType] ?? badgeStyle.free;

  return (
    <div style={{ minHeight: "100vh", background: "#272727" }}>
      {/* Navbar */}
      <nav style={{ background: "#1e1e1e", borderBottom: "1px solid #3a3a3a", padding: "0 24px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div style={{ width: 32, height: 32, background: "#CC5500", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16, color: "#fff" }}>6</div>
          <span style={{ fontWeight: 700, fontSize: 16, color: "#f0f0f0" }}>Consult6</span>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 13, color: "#888" }}>{user?.email}</span>
          <Link href="/dashboard" style={{ background: "none", border: "1px solid #484848", color: "#aaa", borderRadius: 6, padding: "4px 12px", fontSize: 12, textDecoration: "none" }}>← Dashboard</Link>
        </div>
      </nav>

      <main style={{ maxWidth: 820, margin: "40px auto", padding: "0 20px" }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "#f0f0f0", margin: "0 0 8px" }}>Settings</h1>
        <p style={{ fontSize: 14, color: "#666", margin: "0 0 32px" }}>Manage your profile, privacy, billing, and account.</p>

        {msg && (
          <div style={{ background: msg.ok ? "#0a1a0e" : "#2d1010", border: `1px solid ${msg.ok ? "#16a34a" : "#c0392b"}`, borderRadius: 8, padding: "10px 16px", marginBottom: 20, fontSize: 13, color: msg.ok ? "#4ade80" : "#e74c3c" }}>
            {msg.text}
          </div>
        )}

        <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
          {/* Sidebar tabs */}
          <div style={{ width: 180, flexShrink: 0 }}>
            {TAB_LABELS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{ width: "100%", textAlign: "left", background: tab === t.id ? "#2a1800" : "transparent", border: tab === t.id ? "1px solid #CC5500" : "1px solid transparent", borderRadius: 8, padding: "10px 14px", fontSize: 14, fontWeight: tab === t.id ? 700 : 500, color: tab === t.id ? "#CC5500" : "#888", cursor: "pointer", marginBottom: 4 }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div style={{ flex: 1, background: "#333333", border: "1px solid #484848", borderRadius: 12, padding: 28 }}>

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
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#ccc", marginBottom: 8 }}>Industry / sector</label>
                    <input value={profile.industry} onChange={e => setProfile(p => ({ ...p, industry: e.target.value }))}
                      placeholder="e.g. SaaS, Healthcare, Manufacturing" style={{ width: "100%", boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#ccc", marginBottom: 8 }}>Company size</label>
                    <select value={profile.company_size} onChange={e => setProfile(p => ({ ...p, company_size: e.target.value }))}
                      style={{ width: "100%", background: "#3a3a3a", border: "1px solid #484848", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: profile.company_size ? "#f0f0f0" : "#666", boxSizing: "border-box" }}>
                      <option value="">Select size</option>
                      <option value="≤ 10 employees">≤ 10 employees</option>
                      <option value="11–50 employees">11–50 employees</option>
                      <option value="51–200 employees">51–200 employees</option>
                      <option value="201–1,000 employees">201–1,000 employees</option>
                      <option value="1,001–10,000 employees">1,001–10,000 employees</option>
                      <option value="> 10,000 employees">&gt; 10,000 employees</option>
                    </select>
                  </div>
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
                  desc="Prevent Consult6 from pre-filling your profile context (industry, company size, about me) into new analyses." />
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
                      <span style={{ fontSize: 15, color: "#ccc" }}>{accountType === "free" ? "Free — $0/mo" : accountType === "paid" ? "Pro — $10/mo" : accountType === "enterprise" ? "Enterprise — $40/mo" : "Admin"}</span>
                    </div>
                    {accountType === "free" ? (
                      <Link href="/#pricing" style={{ background: "#CC5500", color: "#fff", fontSize: 13, fontWeight: 700, textDecoration: "none", padding: "8px 18px", borderRadius: 7 }}>Upgrade</Link>
                    ) : (
                      <button style={{ background: "none", border: "1px solid #484848", color: "#888", fontSize: 13, borderRadius: 7, padding: "8px 16px" }}
                        onClick={() => flash("Subscription management coming soon. Contact support@consult6.com to cancel.")}>Cancel Plan</button>
                    )}
                  </div>
                </div>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "#666", letterSpacing: 1, margin: "0 0 12px" }}>SUBSCRIPTION HISTORY</p>
                  <div style={{ background: "#2d2d2d", border: "1px solid #3a3a3a", borderRadius: 8, padding: "20px", textAlign: "center" }}>
                    <p style={{ fontSize: 13, color: "#555", margin: 0 }}>No billing history yet.</p>
                  </div>
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
          </div>
        </div>
      </footer>
    </div>
  );
}
