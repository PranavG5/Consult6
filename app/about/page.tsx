import Link from "next/link";

export default function AboutPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#111", color: "#f0f0f0", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <nav style={{ borderBottom: "1px solid #1e1e1e", padding: "0 32px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: "#111", zIndex: 100 }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div style={{ width: 32, height: 32, background: "#CC5500", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16, color: "#fff" }}>6</div>
          <span style={{ fontWeight: 700, fontSize: 16, color: "#f0f0f0" }}>Consult6</span>
        </Link>
        <div style={{ display: "flex", gap: 12 }}>
          <Link href="/auth/login" style={{ fontSize: 14, color: "#aaa", textDecoration: "none", padding: "8px 14px" }}>Sign in</Link>
          <Link href="/auth/signup" style={{ background: "#CC5500", color: "#fff", fontSize: 14, fontWeight: 600, textDecoration: "none", padding: "8px 18px", borderRadius: 7 }}>Get Started</Link>
        </div>
      </nav>

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "72px 24px 96px" }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: "#CC5500", letterSpacing: 3, marginBottom: 12 }}>ABOUT</p>
        <h1 style={{ fontSize: 40, fontWeight: 800, color: "#f0f0f0", margin: "0 0 24px", letterSpacing: -1, lineHeight: 1.15 }}>Financial clarity for every organisation</h1>
        <p style={{ fontSize: 16, color: "#888", lineHeight: 1.8, margin: "0 0 32px" }}>
          Consult6 was built on a simple premise: understanding your organisation's financial health should not require a team of expensive consultants or weeks of manual analysis. Whether you are a founder reviewing monthly burn, a finance manager benchmarking against peers, or a non-profit tracking restricted fund usage, your data deserves the same rigour that large enterprises take for granted.
        </p>

        <h2 style={{ fontSize: 22, fontWeight: 700, color: "#f0f0f0", margin: "0 0 14px" }}>What we do</h2>
        <p style={{ fontSize: 15, color: "#888", lineHeight: 1.8, margin: "0 0 32px" }}>
          Consult6 analyses financial spreadsheets — uploaded as CSV or Excel files — and returns structured insights: critical flags, prioritised recommendations, a financial trajectory note, and in advanced mode, industry benchmarks, scenario projections, a risk matrix, and an action plan. Every report is downloadable as a professional PDF.
        </p>

        <h2 style={{ fontSize: 22, fontWeight: 700, color: "#f0f0f0", margin: "0 0 14px" }}>Our approach</h2>
        <p style={{ fontSize: 15, color: "#888", lineHeight: 1.8, margin: "0 0 32px" }}>
          We believe good financial analysis should be fast, contextual, and actionable. Consult6 takes the context you provide — your industry, company size, constraints, and goals — and tailors every output to your specific situation. Generic advice is not advice; we aim to give you something you can act on today.
        </p>

        <h2 style={{ fontSize: 22, fontWeight: 700, color: "#f0f0f0", margin: "0 0 14px" }}>Infrastructure</h2>
        <p style={{ fontSize: 15, color: "#888", lineHeight: 1.8, margin: "0 0 32px" }}>
          Consult6 is a web application built on modern cloud infrastructure. User authentication and account credentials are managed securely through Supabase, a PostgreSQL-based backend platform. File data you upload is processed in memory during analysis and is not permanently stored on our servers.
        </p>

        <h2 style={{ fontSize: 22, fontWeight: 700, color: "#f0f0f0", margin: "0 0 14px" }}>Where we are headed</h2>
        <p style={{ fontSize: 15, color: "#888", lineHeight: 1.8, margin: "0 0 40px" }}>
          Consult6 is an actively developed product. We are continually expanding its analytical capabilities, improving output quality, and adding features based on user feedback. If you have thoughts or questions, we would genuinely like to hear from you.
        </p>

        <div style={{ background: "#161616", border: "1px solid #222", borderRadius: 12, padding: "24px 28px" }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: "#f0f0f0", margin: "0 0 6px" }}>Get in touch</p>
          <p style={{ fontSize: 14, color: "#666", margin: 0 }}>Questions, feedback, or partnership enquiries — reach us at <span style={{ color: "#CC5500" }}>hello@consult6.com</span></p>
        </div>
      </main>

      <footer style={{ borderTop: "1px solid #1a1a1a", padding: "24px 40px" }}>
        <div style={{ maxWidth: 1060, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 26, height: 26, background: "#CC5500", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13, color: "#fff" }}>6</div>
              <span style={{ fontWeight: 700, fontSize: 14, color: "#888" }}>Consult6</span>
            </div>
            <span style={{ fontSize: 13, color: "#333" }}>© {new Date().getFullYear()} Consult6. All rights reserved.</span>
          </div>
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
