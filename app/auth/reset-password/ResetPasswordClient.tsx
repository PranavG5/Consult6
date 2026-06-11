"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import Link from "next/link";

export default function ResetPasswordClient() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      setError("Enter your account email.");
      return;
    }
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/update-password`,
    });
    if (error) setError(error.message);
    else setSent(true);
    setLoading(false);
  }

  if (sent) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div style={{ textAlign: "center", maxWidth: 400 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Check your email</h2>
          <p style={{ color: "#888", fontSize: 14 }}>If an account exists for <strong style={{ color: "#f0f0f0" }}>{email}</strong>, we sent a link to reset your password.</p>
          <Link href="/auth/login" style={{ display: "inline-block", marginTop: 20, color: "#CC5500", textDecoration: "none", fontSize: 14 }}>← Back to sign in</Link>
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
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Reset your password</h1>
          <p style={{ color: "#888", marginTop: 6, fontSize: 14 }}>We&apos;ll email you a link to set a new one</p>
        </div>
        <form onSubmit={handleReset} className="auth-card" style={{ background: "#333333", border: "1px solid #484848", borderRadius: 12 }}>
          <div style={{ marginBottom: 20 }}>
            <label htmlFor="reset-email" style={{ display: "block", fontSize: 13, color: "#aaa", marginBottom: 6 }}>Email</label>
            <input id="reset-email" required value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="you@example.com" />
          </div>
          {error && <div style={{ background: "#3a1a1a", border: "1px solid #c0392b", borderRadius: 8, padding: "10px 14px", color: "#e74c3c", fontSize: 13, marginBottom: 16 }}>{error}</div>}
          <button type="submit" disabled={loading} style={{ width: "100%", background: "#CC5500", color: "#fff", border: "none", borderRadius: 8, padding: "12px 0", fontSize: 15, fontWeight: 600, opacity: loading ? 0.7 : 1, cursor: "pointer" }}>
            {loading ? "Sending..." : "Send reset link"}
          </button>
          <p style={{ textAlign: "center", marginTop: 18, fontSize: 13, color: "#888" }}>
            Remembered it?{" "}
            <Link href="/auth/login" style={{ color: "#CC5500", textDecoration: "none" }}>Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
