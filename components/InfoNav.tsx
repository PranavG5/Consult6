"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";

export default function InfoNav() {
  const [email, setEmail] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
      setChecked(true);
    });
  }, []);

  if (!checked) return (
    <nav style={{ borderBottom: "1px solid #2d2d2d", padding: "0 32px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: "#1e1e1e", zIndex: 100 }}>
      <Link href={email ? "/dashboard" : "/"} style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
        <div style={{ width: 32, height: 32, background: "#CC5500", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16, color: "#fff" }}>6</div>
        <span style={{ fontWeight: 700, fontSize: 16, color: "#f0f0f0" }}>Consult6</span>
      </Link>
      <div style={{ width: 160 }} />
    </nav>
  );

  return (
    <nav style={{ borderBottom: "1px solid #2d2d2d", padding: "0 32px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: "#1e1e1e", zIndex: 100 }}>
      <Link href={email ? "/dashboard" : "/"} style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
        <div style={{ width: 32, height: 32, background: "#CC5500", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16, color: "#fff" }}>6</div>
        <span style={{ fontWeight: 700, fontSize: 16, color: "#f0f0f0" }}>Consult6</span>
      </Link>
      {email ? (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className="info-nav-email" style={{ fontSize: 13, color: "#666" }}>{email}</span>
          <Link href="/dashboard" style={{ background: "#CC5500", color: "#fff", fontSize: 14, fontWeight: 600, textDecoration: "none", padding: "8px 18px", borderRadius: 7 }}>Dashboard</Link>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 12 }}>
          <Link href="/auth/login" style={{ fontSize: 14, color: "#aaa", textDecoration: "none", padding: "8px 14px" }}>Sign in</Link>
          <Link href="/auth/signup" style={{ background: "#CC5500", color: "#fff", fontSize: 14, fontWeight: 600, textDecoration: "none", padding: "8px 18px", borderRadius: 7 }}>Get Started</Link>
        </div>
      )}
    </nav>
  );
}
