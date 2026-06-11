"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import Link from "next/link";

export default function UpdatePasswordClient() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setHasSession(!!data.user));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      window.location.href = "/dashboard";
    }
  }

  if (hasSession === false) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div style={{ textAlign: "center", maxWidth: 400 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Link expired or invalid</h2>
          <p style={{ color: "#888", fontSize: 14 }}>This password reset link is no longer valid. Request a new one and try again.</p>
          <Link href="/auth/reset-password" style={{ display: "inline-block", marginTop: 20, color: "#CC5500", textDecoration: "none", fontSize: 14 }}>Request a new link</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <style>{`input::placeholder, textarea::placeholder { color: #4a4a4a !important; }`}</style>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 48, height: 48, background: "#CC5500", borderRadius: 10, fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 16 }}>6</div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Set a new password</h1>
          <p style={{ color: "#888", marginTop: 6, fontSize: 14 }}>Choose a password you haven&apos;t used before</p>
        </div>
        <form onSubmit={handleUpdate} className="auth-card" style={{ background: "#333333", border: "1px solid #484848", borderRadius: 12 }}>
          <div style={{ marginBottom: 16 }}>
            <label htmlFor="new-password" style={{ display: "block", fontSize: 13, color: "#aaa", marginBottom: 6 }}>New password</label>
            <input id="new-password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="At least 8 characters" />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label htmlFor="confirm-password" style={{ display: "block", fontSize: 13, color: "#aaa", marginBottom: 6 }}>Confirm password</label>
            <input id="confirm-password" required minLength={8} value={confirm} onChange={e => setConfirm(e.target.value)} type="password" placeholder="Repeat your new password" />
          </div>
          {error && <div style={{ background: "#3a1a1a", border: "1px solid #c0392b", borderRadius: 8, padding: "10px 14px", color: "#e74c3c", fontSize: 13, marginBottom: 16 }}>{error}</div>}
          <button type="submit" disabled={loading} style={{ width: "100%", background: "#CC5500", color: "#fff", border: "none", borderRadius: 8, padding: "12px 0", fontSize: 15, fontWeight: 600, opacity: loading ? 0.7 : 1, cursor: "pointer" }}>
            {loading ? "Updating..." : "Update password"}
          </button>
        </form>
      </div>
    </div>
  );
}
