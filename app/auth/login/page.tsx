"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const supabase = createClient();

  async function handleLogin() {
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    else window.location.href = "/dashboard";
    setLoading(false);
  }

  async function handleGoogleLogin() {
    setGoogleLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setError(error.message);
      setGoogleLoading(false);
    }
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
          <button onClick={handleGoogleLogin} disabled={googleLoading || loading} style={{ width: "100%", background: "#fff", color: "#1a1a1a", border: "1px solid #444", borderRadius: 8, padding: "11px 0", fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, cursor: "pointer", opacity: googleLoading ? 0.7 : 1, marginBottom: 20 }}>
            <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.08 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-3.59-13.46-8.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/><path fill="none" d="M0 0h48v48H0z"/></svg>
            {googleLoading ? "Redirecting..." : "Continue with Google"}
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: "#333" }} />
            <span style={{ fontSize: 12, color: "#555" }}>or sign in with email</span>
            <div style={{ flex: 1, height: 1, background: "#333" }} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 13, color: "#aaa", marginBottom: 6 }}>Email</label>
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="you@example.com" onKeyDown={e => e.key === "Enter" && handleLogin()} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 13, color: "#aaa", marginBottom: 6 }}>Password</label>
            <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="••••••••" onKeyDown={e => e.key === "Enter" && handleLogin()} />
          </div>
          {error && <div style={{ background: "#3a1a1a", border: "1px solid #c0392b", borderRadius: 8, padding: "10px 14px", color: "#e74c3c", fontSize: 13, marginBottom: 16 }}>{error}</div>}
          <button onClick={handleLogin} disabled={loading || googleLoading} style={{ width: "100%", background: "#CC5500", color: "#fff", border: "none", borderRadius: 8, padding: "12px 0", fontSize: 15, fontWeight: 600, opacity: loading ? 0.7 : 1 }}>
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
