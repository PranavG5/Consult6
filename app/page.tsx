import Link from "next/link";

const features = [
  {
    icon: "⚑",
    title: "Financial Flags",
    desc: "Surface critical issues, warnings, and key observations from your raw data — the kind a senior consultant would flag in the first hour of an engagement.",
  },
  {
    icon: "◎",
    title: "Smart Recommendations",
    desc: "Get prioritized, boardroom-ready action items tailored to your organization's type, size, and stated constraints. Not generic advice — specific next steps.",
  },
  {
    icon: "▲",
    title: "Industry Benchmarks",
    desc: "Compare your key metrics against sector peers and top-quartile performers. Know exactly where you stand before your next board meeting.",
    badge: "Advanced",
  },
  {
    icon: "◈",
    title: "Scenario Planning",
    desc: "Optimistic, base, and pessimistic 12-month forecasts based on your current trajectory — the kind of forward-looking analysis consultants charge thousands to produce.",
    badge: "Advanced",
  },
  {
    icon: "◉",
    title: "Risk Matrix",
    desc: "Assess the likelihood and impact of key risks, with specific mitigation strategies tailored to your organization.",
    badge: "Advanced",
  },
  {
    icon: "↓",
    title: "Executive PDF Report",
    desc: "Download a professional, branded executive report — boardroom-ready in seconds, not weeks.",
  },
];

const orgTypes = [
  "Sports clubs & leagues",
  "HOAs & community associations",
  "Nonprofits & charities",
  "Student organizations",
  "Religious groups",
  "Small businesses",
  "Professional associations",
  "Any organization with a treasurer",
];

const freeFeatures = [
  "3 basic analyses per day",
  "1 advanced analysis per day",
  "Financial flags & recommendations",
  "Trajectory note",
  "Executive PDF report download",
  "Single file upload (CSV / Excel)",
];

const proFeatures = [
  "10 basic analyses per day",
  "3 advanced analyses per day",
  "Everything in Free",
  "Up to 3 files per analysis",
  "Industry benchmarks & case studies",
  "Scenario planning",
  "Risk matrix & action plan",
  "Additional context inputs",
];

const enterpriseFeatures = [
  "50 basic analyses per day",
  "20 advanced analyses per day",
  "Everything in Pro",
  "Priority support",
  "Team-ready usage limits",
  "Dedicated onboarding",
];

export default function LandingPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#1e1e1e", color: "#f0f0f0", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* Navbar */}
      <nav style={{ position: "sticky", top: 0, zIndex: 100, background: "#1e1e1e", borderBottom: "1px solid #2d2d2d", padding: "0 32px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{ width: 30, height: 30, background: "#CC5500", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 15, color: "#fff" }}>6</div>
          <span style={{ fontWeight: 700, fontSize: 15, color: "#f0f0f0" }}>Consult6</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <a href="#features" style={{ fontSize: 14, color: "#aaa", textDecoration: "none", padding: "6px 14px" }}>Features</a>
          <a href="#how-it-works" style={{ fontSize: 14, color: "#aaa", textDecoration: "none", padding: "6px 14px" }}>How it Works</a>
          <a href="#pricing" style={{ fontSize: 14, color: "#aaa", textDecoration: "none", padding: "6px 14px" }}>Pricing</a>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link href="/auth/login" style={{ fontSize: 14, color: "#aaa", textDecoration: "none", padding: "7px 16px" }}>Sign in</Link>
          <Link href="/auth/signup" style={{ background: "#CC5500", color: "#fff", fontSize: 14, fontWeight: 600, textDecoration: "none", padding: "8px 18px", borderRadius: 7 }}>Get Started Free</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ maxWidth: 720, margin: "0 auto", padding: "96px 24px 80px", textAlign: "center" }}>
        <div style={{ display: "inline-block", background: "#2d2d2d", border: "1px solid #3a3a3a", borderRadius: 20, padding: "4px 14px", fontSize: 12, fontWeight: 600, color: "#CC5500", letterSpacing: 1, marginBottom: 28 }}>
          POCKET CONSULTANT · 60 SECONDS · NO RETAINER
        </div>
        <h1 style={{ fontSize: 60, fontWeight: 800, lineHeight: 1.08, margin: "0 0 24px", letterSpacing: -2 }}>
          Senior financial insight.<br />
          <span style={{ color: "#CC5500" }}>No consultant fees.</span>
        </h1>
        <p style={{ fontSize: 18, color: "#888", lineHeight: 1.7, margin: "0 auto 40px", maxWidth: 560 }}>
          Consulting firms charge $10,000+ for a financial review. Consult6 gives your treasurer the same insight in under a minute, for a fraction of the cost.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/auth/signup" style={{ background: "#CC5500", color: "#fff", fontSize: 16, fontWeight: 700, textDecoration: "none", padding: "14px 32px", borderRadius: 9, display: "inline-block" }}>
            Analyze My Financials →
          </Link>
          <Link href="/try" style={{ background: "#2d2d2d", color: "#ccc", fontSize: 16, fontWeight: 600, textDecoration: "none", padding: "14px 32px", borderRadius: 9, border: "1px solid #484848", display: "inline-block" }}>
            Try Without Account
          </Link>
        </div>
        <p style={{ marginTop: 20, fontSize: 13, color: "#555" }}>Free tier available · No credit card required · 1 free trial, no account needed</p>
      </section>

      {/* Pain point comparison */}
      <section style={{ background: "#212121", borderTop: "1px solid #272727", borderBottom: "1px solid #272727", padding: "72px 24px" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#CC5500", letterSpacing: 3, textAlign: "center", marginBottom: 10 }}>THE PROBLEM</p>
          <h2 style={{ fontSize: 22, fontWeight: 600, textAlign: "center", margin: "0 0 48px", color: "#888", lineHeight: 1.4 }}>Senior analysis shouldn&apos;t require a senior budget</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 60px 1fr", gap: 0, alignItems: "start" }}>
            <div style={{ background: "#232323", border: "1px solid #2f2f2f", borderRadius: 12, padding: "28px 24px" }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#666", letterSpacing: 2, margin: "0 0 20px" }}>CONSULTING FIRM</p>
              {[
                { label: "Cost", value: "$10,000 – $50,000+" },
                { label: "Turnaround", value: "Weeks of back-and-forth" },
                { label: "Built for", value: "Fortune 500 companies" },
              ].map(row => (
                <div key={row.label} style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 11, color: "#555", margin: "0 0 3px", letterSpacing: 0.5 }}>{row.label.toUpperCase()}</p>
                  <p style={{ fontSize: 14, color: "#aaa", margin: 0, lineHeight: 1.4 }}>{row.value}</p>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", paddingTop: 60 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: "#484848" }}>VS</span>
            </div>
            <div style={{ background: "#1e1000", border: "2px solid #CC5500", borderRadius: 12, padding: "28px 24px" }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#CC5500", letterSpacing: 2, margin: "0 0 20px" }}>CONSULT6</p>
              {[
                { label: "Cost", value: "A fraction of that" },
                { label: "Turnaround", value: "Executive report in 60 seconds" },
                { label: "Built for", value: "Organizations like yours" },
              ].map(row => (
                <div key={row.label} style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 11, color: "#CC5500", margin: "0 0 3px", letterSpacing: 0.5, opacity: 0.7 }}>{row.label.toUpperCase()}</p>
                  <p style={{ fontSize: 14, color: "#f0f0f0", margin: 0, lineHeight: 1.4, fontWeight: 600 }}>{row.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Who this is for */}
      <section style={{ maxWidth: 860, margin: "0 auto", padding: "72px 24px" }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: "#CC5500", letterSpacing: 3, textAlign: "center", marginBottom: 10 }}>WHO THIS IS FOR</p>
        <h2 style={{ fontSize: 22, fontWeight: 600, textAlign: "center", margin: "0 0 14px", color: "#888", lineHeight: 1.4 }}>Your treasurer shouldn&apos;t need a CFO budget to get CFO-level insight</h2>
        <p style={{ fontSize: 15, color: "#666", textAlign: "center", margin: "0 0 40px", lineHeight: 1.7, maxWidth: 560, marginLeft: "auto", marginRight: "auto" }}>
          Consult6 is built for elected or appointed treasurers, financial directors, and finance leads at any kind of organization — not just large enterprises.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
          {orgTypes.map(org => (
            <div key={org} style={{ background: "#232323", border: "1px solid #2f2f2f", borderRadius: 9, padding: "14px 16px", textAlign: "center" }}>
              <p style={{ fontSize: 13, color: "#ccc", margin: 0, lineHeight: 1.4 }}>{org}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" style={{ maxWidth: 960, margin: "0 auto", padding: "0 24px 96px" }}>
        <p style={{ fontSize: 32, fontWeight: 700, color: "#CC5500", letterSpacing: 3, textAlign: "center", marginBottom: 10 }}>FEATURES</p>
        <h2 style={{ fontSize: 20, fontWeight: 600, textAlign: "center", margin: "0 0 48px", letterSpacing: 0, lineHeight: 1.4, color: "#888" }}>Everything your treasurer needs to look sharp in the boardroom</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {features.map(f => (
            <div key={f.title} style={{ background: "#232323", border: "1px solid #2f2f2f", borderRadius: 12, padding: "24px 22px" }}>
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
      <section id="how-it-works" style={{ borderTop: "1px solid #272727", borderBottom: "1px solid #272727", background: "#212121", padding: "96px 24px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
          <p style={{ fontSize: 32, fontWeight: 700, color: "#CC5500", letterSpacing: 3, marginBottom: 10 }}>HOW IT WORKS</p>
          <h2 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 48px", letterSpacing: 0, lineHeight: 1.4, color: "#888" }}>Three steps to a boardroom-ready report</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24 }}>
            {[
              { step: "1", title: "Upload your data", desc: "Drop in a CSV or Excel file. Basic supports one file; Advanced supports up to three." },
              { step: "2", title: "Add context (optional)", desc: "Tell the AI your organization type, sector, and any constraints for more tailored results." },
              { step: "3", title: "Get your executive report", desc: "In under 60 seconds, receive flags, recommendations, benchmarks, and a boardroom-ready downloadable PDF." },
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
      <section id="pricing" style={{ maxWidth: 1060, margin: "0 auto", padding: "96px 24px" }}>
        <p style={{ fontSize: 32, fontWeight: 700, color: "#CC5500", letterSpacing: 3, textAlign: "center", marginBottom: 10 }}>PRICING</p>
        <h2 style={{ fontSize: 20, fontWeight: 600, textAlign: "center", margin: "0 0 48px", letterSpacing: 0, lineHeight: 1.4, color: "#888" }}>Simple, transparent pricing</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>

          {/* Free */}
          <div style={{ background: "#232323", border: "1px solid #2f2f2f", borderRadius: 14, padding: 28 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#888", margin: "0 0 8px", letterSpacing: 0.5 }}>FREE</p>
            <p style={{ fontSize: 38, fontWeight: 800, color: "#f0f0f0", margin: "0 0 4px" }}>$0</p>
            <p style={{ fontSize: 13, color: "#555", margin: "0 0 24px" }}>per month</p>
            <div style={{ borderTop: "1px solid #2f2f2f", paddingTop: 20, marginBottom: 28 }}>
              {freeFeatures.map(f => (
                <div key={f} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 10 }}>
                  <span style={{ color: "#27ae60", fontWeight: 700, flexShrink: 0, marginTop: 1 }}>✓</span>
                  <span style={{ fontSize: 13, color: "#aaa" }}>{f}</span>
                </div>
              ))}
            </div>
            <Link href="/auth/signup" style={{ display: "block", textAlign: "center", background: "#2d2d2d", border: "1px solid #484848", color: "#ccc", fontSize: 14, fontWeight: 600, textDecoration: "none", padding: "12px 0", borderRadius: 8 }}>
              Get Started Free
            </Link>
          </div>

          {/* Pro */}
          <div style={{ background: "#1e1000", border: "2px solid #CC5500", borderRadius: 14, padding: 28, position: "relative" }}>
            <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: "#CC5500", color: "#fff", fontSize: 10, fontWeight: 800, padding: "3px 12px", borderRadius: 20, letterSpacing: 0.5, whiteSpace: "nowrap" }}>BEST VALUE</div>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#CC5500", margin: "0 0 8px", letterSpacing: 0.5 }}>PRO</p>
            <p style={{ fontSize: 38, fontWeight: 800, color: "#f0f0f0", margin: "0 0 4px" }}>$10</p>
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

          {/* Enterprise */}
          <div style={{ background: "#0a160e", border: "2px solid #16a34a", borderRadius: 14, padding: 28, position: "relative" }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#16a34a", margin: "0 0 8px", letterSpacing: 0.5 }}>ENTERPRISE</p>
            <p style={{ fontSize: 38, fontWeight: 800, color: "#f0f0f0", margin: "0 0 4px" }}>$40</p>
            <p style={{ fontSize: 13, color: "#555", margin: "0 0 6px" }}>per month</p>
            <p style={{ fontSize: 12, color: "#16a34a", margin: "0 0 20px", background: "#0d2a18", border: "1px solid #16a34a33", borderRadius: 6, padding: "6px 10px", lineHeight: 1.5 }}>
              Need custom limits or a team deal?{" "}
              <Link href="/contact" style={{ color: "#4ade80", fontWeight: 600, textDecoration: "none" }}>Contact us</Link>
              {" "}to discuss pricing and usage packages.
            </p>
            <div style={{ borderTop: "1px solid #16a34a33", paddingTop: 20, marginBottom: 28 }}>
              {enterpriseFeatures.map(f => (
                <div key={f} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 10 }}>
                  <span style={{ color: "#16a34a", fontWeight: 700, flexShrink: 0, marginTop: 1 }}>✓</span>
                  <span style={{ fontSize: 13, color: "#aaa" }}>{f}</span>
                </div>
              ))}
            </div>
            <Link href="/auth/signup" style={{ display: "block", textAlign: "center", background: "#16a34a", color: "#fff", fontSize: 14, fontWeight: 700, textDecoration: "none", padding: "12px 0", borderRadius: 8, marginBottom: 10 }}>
              Get Started with Enterprise
            </Link>
            <Link href="/contact" style={{ display: "block", textAlign: "center", background: "transparent", border: "1px solid #16a34a55", color: "#4ade80", fontSize: 13, fontWeight: 600, textDecoration: "none", padding: "10px 0", borderRadius: 8 }}>
              Discuss Custom Pricing →
            </Link>
          </div>

        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid #272727", padding: "24px 40px" }}>
        <div style={{ maxWidth: 1060, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 26, height: 26, background: "#CC5500", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13, color: "#fff" }}>6</div>
              <span style={{ fontWeight: 700, fontSize: 14, color: "#888" }}>Consult6</span>
            </div>
            <span style={{ fontSize: 13, color: "#484848" }}>© {new Date().getFullYear()} Consult6. All rights reserved.</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ fontSize: 12, color: "#484848" }}>Senior financial insight, no consultant required.</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
            <Link href="/about" style={{ fontSize: 13, color: "#555", textDecoration: "none" }}>About</Link>
            <Link href="/privacy" style={{ fontSize: 13, color: "#555", textDecoration: "none" }}>Privacy</Link>
            <Link href="/terms" style={{ fontSize: 13, color: "#555", textDecoration: "none" }}>Terms</Link>
            <Link href="/contact" style={{ fontSize: 13, color: "#555", textDecoration: "none" }}>Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
