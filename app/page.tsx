import Link from "next/link";

const features = [
  {
    icon: "⚑",
    title: "Financial Flags",
    desc: "Automatically surface critical issues, warnings, and key observations from your raw data — no manual review needed.",
  },
  {
    icon: "◎",
    title: "Smart Recommendations",
    desc: "Get prioritized, actionable next steps tailored to your organization's size, industry, and stated constraints.",
  },
  {
    icon: "▲",
    title: "Industry Benchmarks",
    desc: "Compare your key metrics against sector averages and top-quartile performers to understand where you actually stand.",
    badge: "Advanced",
  },
  {
    icon: "◈",
    title: "Scenario Planning",
    desc: "Optimistic, base, and pessimistic 12-month financial forecasts based on your current trajectory and risk profile.",
    badge: "Advanced",
  },
  {
    icon: "◉",
    title: "Risk Matrix",
    desc: "Assess the likelihood and impact of key risks, with specific mitigation strategies for each.",
    badge: "Advanced",
  },
  {
    icon: "↓",
    title: "PDF Reports",
    desc: "Download a professional, branded report — ready to share with stakeholders, boards, or investors.",
  },
];

const freeFeatures = [
  "5 basic analyses per day",
  "2 advanced analyses per day",
  "Financial flags & recommendations",
  "Trajectory note",
  "PDF report download",
  "Single file upload (CSV / Excel)",
];

const proFeatures = [
  "15 basic analyses per day",
  "5 advanced analyses per day",
  "Everything in Free",
  "Up to 3 files per analysis",
  "Industry benchmarks & case studies",
  "Scenario planning",
  "Risk matrix & action plan",
  "Additional context inputs",
];

export default function LandingPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#111", color: "#f0f0f0", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* Navbar */}
      <nav style={{ borderBottom: "1px solid #1e1e1e", padding: "0 32px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: "#111", zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, background: "#CC5500", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16, color: "#fff" }}>6</div>
          <span style={{ fontWeight: 700, fontSize: 16, color: "#f0f0f0" }}>Consult6</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/auth/login" style={{ fontSize: 14, color: "#aaa", textDecoration: "none", padding: "8px 14px" }}>Sign in</Link>
          <Link href="/auth/signup" style={{ background: "#CC5500", color: "#fff", fontSize: 14, fontWeight: 600, textDecoration: "none", padding: "8px 18px", borderRadius: 7 }}>Get Started Free</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ maxWidth: 720, margin: "0 auto", padding: "96px 24px 80px", textAlign: "center" }}>
        <div style={{ display: "inline-block", background: "#1e1e1e", border: "1px solid #2a2a2a", borderRadius: 20, padding: "4px 14px", fontSize: 12, fontWeight: 600, color: "#CC5500", letterSpacing: 1, marginBottom: 28 }}>
          AI-POWERED · INSTANT · ACTIONABLE
        </div>
        <h1 style={{ fontSize: 52, fontWeight: 800, lineHeight: 1.1, margin: "0 0 24px", letterSpacing: -1 }}>
          Financial health analysis<br />
          <span style={{ color: "#CC5500" }}>that actually helps.</span>
        </h1>
        <p style={{ fontSize: 18, color: "#888", lineHeight: 1.7, margin: "0 auto 40px", maxWidth: 560 }}>
          Upload your financial data and get instant AI-generated flags, benchmarks, and tailored recommendations — in under 30 seconds.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/auth/signup" style={{ background: "#CC5500", color: "#fff", fontSize: 16, fontWeight: 700, textDecoration: "none", padding: "14px 32px", borderRadius: 9, display: "inline-block" }}>
            Get Started Free →
          </Link>
          <Link href="/auth/login" style={{ background: "#1e1e1e", color: "#ccc", fontSize: 16, fontWeight: 600, textDecoration: "none", padding: "14px 32px", borderRadius: 9, border: "1px solid #333", display: "inline-block" }}>
            Sign In
          </Link>
        </div>
        <p style={{ marginTop: 20, fontSize: 13, color: "#555" }}>Free tier available · No credit card required</p>
      </section>

      {/* Features */}
      <section style={{ maxWidth: 960, margin: "0 auto", padding: "0 24px 96px" }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: "#CC5500", letterSpacing: 2, textAlign: "center", marginBottom: 12 }}>FEATURES</p>
        <h2 style={{ fontSize: 32, fontWeight: 800, textAlign: "center", margin: "0 0 48px", letterSpacing: -0.5 }}>Everything you need to understand your finances</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {features.map(f => (
            <div key={f.title} style={{ background: "#161616", border: "1px solid #222", borderRadius: 12, padding: "24px 22px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <span style={{ fontSize: 20, color: "#CC5500" }}>{f.icon}</span>
                <span style={{ fontWeight: 700, fontSize: 15, color: "#f0f0f0" }}>{f.title}</span>
                {f.badge && (
                  <span style={{ background: "#2a1800", color: "#CC5500", fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4, letterSpacing: 0.5 }}>{f.badge}</span>
                )}
              </div>
              <p style={{ fontSize: 13, color: "#777", lineHeight: 1.65, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section style={{ borderTop: "1px solid #1a1a1a", borderBottom: "1px solid #1a1a1a", background: "#141414", padding: "80px 24px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#CC5500", letterSpacing: 2, marginBottom: 12 }}>HOW IT WORKS</p>
          <h2 style={{ fontSize: 32, fontWeight: 800, margin: "0 0 48px", letterSpacing: -0.5 }}>Three steps to clarity</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24 }}>
            {[
              { step: "1", title: "Upload your data", desc: "Drop in a CSV or Excel file. Basic supports one file; Advanced supports up to three." },
              { step: "2", title: "Add context (optional)", desc: "Tell the AI your company size, industry, and any constraints for more tailored results." },
              { step: "3", title: "Get your report", desc: "In under 30 seconds, receive flags, recommendations, benchmarks, and a downloadable PDF." },
            ].map(s => (
              <div key={s.step} style={{ textAlign: "left" }}>
                <div style={{ width: 36, height: 36, background: "#CC5500", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16, color: "#fff", marginBottom: 14 }}>{s.step}</div>
                <p style={{ fontWeight: 700, fontSize: 15, color: "#f0f0f0", margin: "0 0 8px" }}>{s.title}</p>
                <p style={{ fontSize: 13, color: "#666", lineHeight: 1.65, margin: 0 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section style={{ maxWidth: 760, margin: "0 auto", padding: "96px 24px" }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: "#CC5500", letterSpacing: 2, textAlign: "center", marginBottom: 12 }}>PRICING</p>
        <h2 style={{ fontSize: 32, fontWeight: 800, textAlign: "center", margin: "0 0 48px", letterSpacing: -0.5 }}>Simple, transparent pricing</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {/* Free */}
          <div style={{ background: "#161616", border: "1px solid #222", borderRadius: 14, padding: 28 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#888", margin: "0 0 8px", letterSpacing: 0.5 }}>FREE</p>
            <p style={{ fontSize: 38, fontWeight: 800, color: "#f0f0f0", margin: "0 0 4px" }}>$0</p>
            <p style={{ fontSize: 13, color: "#555", margin: "0 0 24px" }}>per month</p>
            <div style={{ borderTop: "1px solid #222", paddingTop: 20, marginBottom: 28 }}>
              {freeFeatures.map(f => (
                <div key={f} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 10 }}>
                  <span style={{ color: "#27ae60", fontWeight: 700, flexShrink: 0, marginTop: 1 }}>✓</span>
                  <span style={{ fontSize: 13, color: "#aaa" }}>{f}</span>
                </div>
              ))}
            </div>
            <Link href="/auth/signup" style={{ display: "block", textAlign: "center", background: "#1e1e1e", border: "1px solid #333", color: "#ccc", fontSize: 14, fontWeight: 600, textDecoration: "none", padding: "12px 0", borderRadius: 8 }}>
              Get Started Free
            </Link>
          </div>

          {/* Pro */}
          <div style={{ background: "#1e1000", border: "2px solid #CC5500", borderRadius: 14, padding: 28, position: "relative" }}>
            <div style={{ position: "absolute", top: -12, right: 20, background: "#CC5500", color: "#fff", fontSize: 10, fontWeight: 800, padding: "3px 10px", borderRadius: 20, letterSpacing: 0.5 }}>MOST POPULAR</div>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#CC5500", margin: "0 0 8px", letterSpacing: 0.5 }}>PRO</p>
            <p style={{ fontSize: 38, fontWeight: 800, color: "#f0f0f0", margin: "0 0 4px" }}>$29</p>
            <p style={{ fontSize: 13, color: "#555", margin: "0 0 24px" }}>per month</p>
            <div style={{ borderTop: "1px solid #2a1800", paddingTop: 20, marginBottom: 28 }}>
              {proFeatures.map(f => (
                <div key={f} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 10 }}>
                  <span style={{ color: "#CC5500", fontWeight: 700, flexShrink: 0, marginTop: 1 }}>✓</span>
                  <span style={{ fontSize: 13, color: "#aaa" }}>{f}</span>
                </div>
              ))}
            </div>
            <Link href="/auth/signup" style={{ display: "block", textAlign: "center", background: "#CC5500", color: "#fff", fontSize: 14, fontWeight: 700, textDecoration: "none", padding: "12px 0", borderRadius: 8 }}>
              Get Started with Pro
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid #1a1a1a", padding: "32px 24px", textAlign: "center" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 12 }}>
          <div style={{ width: 24, height: 24, background: "#CC5500", borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12, color: "#fff" }}>6</div>
          <span style={{ fontWeight: 700, fontSize: 14, color: "#888" }}>Consult6</span>
        </div>
        <p style={{ fontSize: 13, color: "#444", margin: 0 }}>© {new Date().getFullYear()} Consult6 · AI-powered financial health analysis · Built with Claude</p>
      </footer>
    </div>
  );
}
