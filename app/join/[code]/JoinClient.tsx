"use client";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import Link from "next/link";

interface Props {
  code: string;
  valid: boolean;
  reason?: string;
  orgName?: string;
  university: string | null;
}

type Status = "checking" | "logged_out" | "joining" | "joined" | "error";

export default function JoinClient({ code, valid, reason, orgName, university }: Props) {
  const [status, setStatus] = useState<Status>("checking");
  const [error, setError] = useState("");
  const redeemed = useRef(false);
  const supabase = createClient();

  useEffect(() => {
    if (!valid) return;
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        setStatus("logged_out");
        return;
      }
      if (redeemed.current) return;
      redeemed.current = true;
      setStatus("joining");
      fetch("/api/invites/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      })
        .then(async res => {
          const json = await res.json().catch(() => ({}));
          if (res.ok) {
            setStatus("joined");
            setTimeout(() => { window.location.href = "/dashboard"; }, 2000);
          } else {
            setError(json.error ?? "Something went wrong accepting this invite.");
            setStatus("error");
          }
        })
        .catch(() => {
          setError("Something went wrong accepting this invite. Check your connection and refresh.");
          setStatus("error");
        });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const next = encodeURIComponent(`/join/${code}`);

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, background: "#1e1e1e", color: "#f0f0f0", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 440, textAlign: "center" }}>
        <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 48, height: 48, background: "#CC5500", borderRadius: 10, fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 24 }}>6</div>

        {!valid ? (
          <>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 10px" }}>Invite not available</h1>
            <p style={{ color: "#888", fontSize: 14, lineHeight: 1.7, margin: "0 0 24px" }}>{reason}</p>
            <Link href="/" style={{ color: "#CC5500", textDecoration: "none", fontSize: 14 }}>← Back to Consult6</Link>
          </>
        ) : (
          <>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#CC5500", letterSpacing: 3, margin: "0 0 12px" }}>YOU&apos;RE INVITED</p>
            <h1 style={{ fontSize: 26, fontWeight: 800, margin: "0 0 6px", lineHeight: 1.25 }}>{orgName}</h1>
            {university && <p style={{ color: "#888", fontSize: 14, margin: "0 0 4px" }}>{university}</p>}
            <p style={{ color: "#888", fontSize: 14, lineHeight: 1.7, margin: "14px 0 28px" }}>
              Join your organization on Consult6 to get its plan, shared limits, and financial analysis tools.
            </p>

            {status === "checking" && (
              <p style={{ color: "#666", fontSize: 13 }}>Checking your account…</p>
            )}

            {status === "logged_out" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <Link href={`/auth/signup?next=${next}`} style={{ background: "#CC5500", color: "#fff", borderRadius: 8, padding: "13px 0", fontSize: 15, fontWeight: 700, textDecoration: "none", display: "block" }}>
                  Create account &amp; join
                </Link>
                <Link href={`/auth/login?next=${next}`} style={{ background: "none", border: "1px solid #484848", color: "#ccc", borderRadius: 8, padding: "12px 0", fontSize: 14, fontWeight: 600, textDecoration: "none", display: "block" }}>
                  I already have an account
                </Link>
              </div>
            )}

            {status === "joining" && (
              <p style={{ color: "#888", fontSize: 14 }}>Joining {orgName}…</p>
            )}

            {status === "joined" && (
              <div style={{ background: "#0a1a0e", border: "1px solid #16a34a", borderRadius: 10, padding: "18px 20px" }}>
                <p style={{ color: "#4ade80", fontSize: 15, fontWeight: 700, margin: "0 0 4px" }}>✓ You&apos;re in</p>
                <p style={{ color: "#888", fontSize: 13, margin: 0 }}>Taking you to your dashboard…</p>
              </div>
            )}

            {status === "error" && (
              <div style={{ background: "#3a1a1a", border: "1px solid #c0392b", borderRadius: 10, padding: "16px 18px" }}>
                <p style={{ color: "#e74c3c", fontSize: 14, margin: "0 0 10px" }}>{error}</p>
                <Link href="/dashboard" style={{ color: "#CC5500", textDecoration: "none", fontSize: 13 }}>Go to dashboard →</Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
