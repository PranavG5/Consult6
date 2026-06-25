"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";

export const metadata = { title: "Companies | Consult6" };

function SkeletonCard() {
  return (
    <div style={{ background: "#333333", border: "1px solid #484848", borderRadius: 12, padding: "20px 20px 16px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
        <div className="skeleton" style={{ width: 38, height: 38, borderRadius: 8 }} />
        <div className="skeleton" style={{ width: 60, height: 20, borderRadius: 20 }} />
      </div>
      <div className="skeleton" style={{ height: 16, width: "70%", marginBottom: 8, borderRadius: 4 }} />
      <div className="skeleton" style={{ height: 13, width: "45%", marginBottom: 14, borderRadius: 4 }} />
      <div className="skeleton" style={{ height: 11, width: "55%", borderRadius: 4 }} />
    </div>
  );
}

interface Profile {
  id: string;
  name: string;
  sector: string;
  created_at: string;
  upload_count: number;
  metric_count: number;
  latest_period: string | null;
}

export default function ProfilesPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [sector, setSector] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { window.location.href = "/auth/login"; return; }
      fetchProfiles();
    });
  }, []);

  async function fetchProfiles() {
    setLoading(true);
    try {
      const res = await fetch("/api/profiles");
      if (res.ok) {
        const json = await res.json();
        setProfiles(json.profiles ?? []);
      }
    } finally {
      setLoading(false);
    }
  }

  async function createProfile() {
    if (!name.trim() || !sector.trim()) return;
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), sector: sector.trim() }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Failed to create profile."); return; }
      setShowModal(false);
      setName("");
      setSector("");
      fetchProfiles();
    } finally {
      setCreating(false);
    }
  }

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
          <span className="dash-nav-desktop" style={{ fontSize: 14, color: "#CC5500", fontWeight: 600 }}>Companies</span>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {/* Desktop buttons */}
          <Link href="/dashboard" className="dash-nav-desktop" style={{ background: "none", border: "1px solid #484848", color: "#aaa", borderRadius: 6, padding: "4px 14px", fontSize: 12, textDecoration: "none" }}>Dashboard</Link>
          <Link href="/settings" className="dash-nav-desktop" style={{ background: "none", border: "1px solid #484848", color: "#aaa", borderRadius: 6, padding: "4px 14px", fontSize: 12, textDecoration: "none" }}>Settings</Link>
          {/* Mobile hamburger */}
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
        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div className="dash-nav-mobile" style={{ position: "absolute", top: 56, right: 16, background: "#1e1e1e", border: "1px solid #3a3a3a", borderRadius: 10, padding: "8px 0", minWidth: 160, zIndex: 200, boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
            <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)} style={{ display: "block", padding: "10px 20px", fontSize: 14, color: "#f0f0f0", textDecoration: "none" }}>Dashboard</Link>
            <Link href="/settings" onClick={() => setMobileMenuOpen(false)} style={{ display: "block", padding: "10px 20px", fontSize: 14, color: "#f0f0f0", textDecoration: "none" }}>Settings</Link>
            <div style={{ height: 1, background: "#2d2d2d", margin: "6px 0" }} />
            <button onClick={async () => { setMobileMenuOpen(false); await supabase.auth.signOut(); window.location.href = "/"; }} style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 20px", fontSize: 14, color: "#f87171", background: "none", border: "none" }}>Sign out</button>
          </div>
        )}
      </nav>

      <div style={{ maxWidth: 980, margin: "0 auto", padding: "40px 20px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32, gap: 16, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: "#f0f0f0", margin: "0 0 6px" }}>Companies</h1>
            <p style={{ fontSize: 14, color: "#777", margin: 0 }}>Each company is a live financial dashboard: KPIs, trends, and the analyses you run for it.</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            style={{ background: "#CC5500", color: "#fff", border: "none", borderRadius: 9, padding: "11px 22px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            + New Company
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : profiles.length === 0 ? (
          <div style={{ background: "#333333", border: "2px dashed #484848", borderRadius: 16, padding: "60px 40px", textAlign: "center" }}>
            <div style={{ width: 56, height: 56, background: "#2a1800", border: "2px solid #CC5500", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, margin: "0 auto 20px" }}>
              📁
            </div>
            <p style={{ fontSize: 18, fontWeight: 800, color: "#f0f0f0", margin: "0 0 10px" }}>No companies yet</p>
            <p style={{ fontSize: 14, color: "#777", margin: "0 0 28px", lineHeight: 1.6, maxWidth: 400, marginLeft: "auto", marginRight: "auto" }}>
              Add a company to start tracking its finances over time and build a live dashboard.
            </p>
            <button
              onClick={() => setShowModal(true)}
              style={{ background: "#CC5500", color: "#fff", border: "none", borderRadius: 9, padding: "13px 32px", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
              Add your first company
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: 16 }}>
            {profiles.map((p) => (
              <Link key={p.id} href={`/profiles/${p.id}`} style={{ textDecoration: "none" }}>
                <div style={{ background: "#333333", border: "1px solid #484848", borderRadius: 12, padding: "18px 20px 16px", cursor: "pointer", transition: "border-color 0.15s" }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = "#CC5500")}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = "#484848")}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
                      <div style={{ width: 38, height: 38, flexShrink: 0, background: "#2a1800", border: "1px solid #CC5500", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🏢</div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 15, fontWeight: 700, color: "#f0f0f0", margin: "0 0 2px", lineHeight: 1.25, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</p>
                        <p style={{ fontSize: 12, color: "#888", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.sector}</p>
                      </div>
                    </div>
                  </div>

                  {p.metric_count > 0 ? (
                    <div style={{ display: "flex", gap: 14, fontSize: 11, color: "#666" }}>
                      <span>{p.metric_count} metric{p.metric_count === 1 ? "" : "s"}</span>
                      <span>{p.upload_count} period{p.upload_count === 1 ? "" : "s"}</span>
                      {p.latest_period && <span style={{ marginLeft: "auto", color: "#888" }}>{p.latest_period}</span>}
                    </div>
                  ) : (
                    <div style={{ fontSize: 11, color: "#666" }}>No data yet. Open to upload.</div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Create modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "#333333", border: "1px solid #484848", borderRadius: 16, padding: 32, maxWidth: 440, width: "100%" }}>
            <p style={{ fontSize: 18, fontWeight: 800, color: "#f0f0f0", margin: "0 0 20px" }}>Add Company</p>

            {error && (
              <div style={{ background: "#2d1010", border: "1px solid #c0392b", borderRadius: 8, padding: "10px 14px", color: "#e74c3c", fontSize: 13, marginBottom: 16 }}>
                {error}
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#ccc", marginBottom: 8 }}>Organization name *</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Acme Corp, Sunrise Foundation"
                autoFocus
                onKeyDown={e => e.key === "Enter" && createProfile()} />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#ccc", marginBottom: 8 }}>Sector / Industry *</label>
              <input
                value={sector}
                onChange={e => setSector(e.target.value)}
                placeholder="e.g. nonprofit, retail, healthcare, HOA"
                onKeyDown={e => e.key === "Enter" && createProfile()} />
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={createProfile}
                disabled={creating || !name.trim() || !sector.trim()}
                style={{ flex: 1, background: "#CC5500", color: "#fff", border: "none", borderRadius: 9, padding: "12px 0", fontSize: 14, fontWeight: 700, cursor: creating || !name.trim() || !sector.trim() ? "default" : "pointer", opacity: creating || !name.trim() || !sector.trim() ? 0.6 : 1 }}>
                {creating ? "Creating..." : "Create Profile"}
              </button>
              <button
                onClick={() => { setShowModal(false); setName(""); setSector(""); setError(""); }}
                style={{ flex: 1, background: "none", border: "1px solid #484848", color: "#aaa", borderRadius: 9, padding: "12px 0", fontSize: 14, cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
