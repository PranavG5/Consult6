"use client";
import { useEffect, useState } from "react";

export default function MobileGate({ children }: { children: React.ReactNode }) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (!isMobile) return <>{children}</>;

  return (
    <div style={{
      minHeight: "100dvh",
      background: "#1a1a1a",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "32px 24px",
      textAlign: "center",
      fontFamily: "system-ui, sans-serif",
    }}>
      <div style={{
        width: 52,
        height: 52,
        background: "#CC5500",
        borderRadius: 12,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 800,
        fontSize: 24,
        color: "#fff",
        marginBottom: 32,
      }}>6</div>

      <div style={{ fontSize: 48, marginBottom: 20 }}>🖥️</div>

      <h1 style={{
        fontSize: 26,
        fontWeight: 800,
        color: "#f0f0f0",
        margin: "0 0 14px",
        lineHeight: 1.2,
        letterSpacing: -0.5,
      }}>
        Mobile support<br />isn&apos;t ready yet
      </h1>

      <p style={{
        fontSize: 15,
        color: "#888",
        lineHeight: 1.7,
        margin: "0 0 36px",
        maxWidth: 280,
      }}>
        Consult6 is built for desktop. Open it on your laptop or desktop computer for the full experience.
      </p>

      <div style={{
        background: "#242424",
        border: "1px solid #333",
        borderRadius: 12,
        padding: "18px 22px",
        maxWidth: 300,
        width: "100%",
      }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: "#CC5500", letterSpacing: 2, margin: "0 0 8px" }}>YOUR URL</p>
        <p style={{ fontSize: 13, color: "#ccc", margin: 0, wordBreak: "break-all" }}>
          {typeof window !== "undefined" ? window.location.hostname : "consult6.vercel.app"}
        </p>
      </div>
    </div>
  );
}
