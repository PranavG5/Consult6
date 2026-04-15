"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  async function handleLogin() {
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    else window.location.href = "/dashboard";
    setLoading(false);
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 48, height: 48, background: "#CC5500", borderRadius: 10, fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 16 }}>6</div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Sign in to Consult6</h1>
          <p style={{ color: "#888", marginTop: 6, fontSize: 14 }}>AI-powered financial health analysis</p>
        </div>
        <div style={{ background: "#242424", border: "1px solid #333", borderRadius: 12, padding: 28 }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 13, color: "#aaa", marginBottom: 6 }}>Email</label>
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="you@example.com" onKeyDown={e => e.key === "Enter" && handleLogin()} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 13, color: "#aaa", marginBottom: 6 }}>Password</label>
            <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="••••••••" onKeyDown={e => e.key === "Enter" && handleLogin()} />
          </div>
          {error && <div style={{ background: "#3a1a1a", border: "1px solid #c0392b", borderRadius: 8, padding: "10px 14px", color: "#e74c3c", fontSize: 13, marginBottom: 16 }}>{error}</div>}
          <button onClick={handleLogin} disabled={loading} style={{ width: "100%", background: "#CC5500", color: "#fff", border: "none", borderRadius: 8, padding: "12px 0", fontSize: 15, fontWeight: 600, opacity: loading ? 0.7 : 1 }}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
          <p style={{ textAlign: "center", marginTop: 18, fontSize: 13, color: "#888" }}>
            Don&apos;t have an account?{" "}
            <Link href="/auth/signup" style={{ color: "#CC5500", textDecoration: "none" }}>Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
