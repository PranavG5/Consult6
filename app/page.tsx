import type { Metadata } from "next";
import Link from "next/link";
import {
  Flag, Lightbulb, BarChart3, TrendingUp, ShieldAlert, FileDown,
  Layers, Building2, LineChart, Upload, SlidersHorizontal, FileText,
  Sparkles, Check, ArrowRight, Zap, AlertTriangle, Info,
} from "lucide-react";
import Reveal from "./components/Reveal";
import BrandLink from "../components/BrandLink";

export const metadata: Metadata = {
  title: "Consult6 | Senior Financial Insight, No Consultant Fees",
};

const features = [
  { icon: Flag, title: "Financial Flags", desc: "Surface critical issues, warnings, and key observations from your raw data: the kind a senior consultant flags in the first hour of an engagement." },
  { icon: Lightbulb, title: "Smart Recommendations", desc: "Get prioritized, boardroom-ready action items tailored to your organization's type, size, and stated constraints. Not generic advice. Specific next steps." },
  { icon: BarChart3, title: "Industry Benchmarks", desc: "Compare your key metrics against sector peers and top-quartile performers. Know exactly where you stand before your next board meeting.", badge: "Advanced" },
  { icon: TrendingUp, title: "Scenario Planning", desc: "Optimistic, base, and pessimistic 12-month forecasts based on your current trajectory: forward-looking analysis consultants charge thousands to produce.", badge: "Advanced" },
  { icon: ShieldAlert, title: "Risk Matrix", desc: "Assess the likelihood and impact of key risks, with specific mitigation strategies tailored to your organization.", badge: "Advanced" },
  { icon: FileDown, title: "Executive PDF Report", desc: "Download a professional, branded executive report. Boardroom-ready in seconds, not weeks." },
  { icon: Layers, title: "Deep Dive Analyses", desc: "Go beyond the summary. Deep dive mode runs a richer, multi-layered analysis across benchmarks, scenarios, and risk in a single comprehensive report.", badge: "Advanced" },
  { icon: Building2, title: "Company Profiles", desc: "Save your organization's financial data as a persistent profile. Pick up where you left off and track progress across multiple reporting periods." },
  { icon: LineChart, title: "Metric Tracking", desc: "Monitor key financial metrics over time across your saved profiles. Spot trends, regressions, and improvements at a glance, period over period." },
];

const orgTypes = [
  "Sports clubs & leagues", "HOAs & community associations", "Nonprofits & charities",
  "Student organizations", "Religious groups", "Small businesses",
  "Professional associations", "Any organization with a treasurer",
];

const freeFeatures = [
  "3 basic analyses per day", "1 advanced analysis per day", "Financial flags & recommendations",
  "Trajectory note", "Executive PDF report download", "Single file upload (CSV / Excel)",
];
const proFeatures = [
  "10 basic analyses per day", "3 advanced analyses per day", "Everything in Free",
  "Up to 3 files per analysis", "Industry benchmarks & case studies", "Scenario planning",
  "Risk matrix & action plan", "Additional context inputs",
];
const enterpriseFeatures = [
  "50 basic analyses per day", "20 advanced analyses per day", "Everything in Pro",
  "Priority support", "Custom usage limits", "Dedicated onboarding",
];

const steps = [
  { icon: Upload, step: "1", title: "Upload your data", desc: "Drop in a CSV or Excel file. Basic supports one file; Advanced supports up to three." },
  { icon: SlidersHorizontal, step: "2", title: "Add context (optional)", desc: "Tell the AI your organization type, sector, and any constraints for more tailored results." },
  { icon: FileText, step: "3", title: "Get your executive report", desc: "In under 60 seconds, receive flags, recommendations, benchmarks, and a boardroom-ready PDF." },
];

function Logo({ size = 30, font = 15 }: { size?: number; font?: number }) {
  return (
    <div style={{ width: size, height: size, background: "var(--brand-grad)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: font, color: "#fff", boxShadow: "0 6px 16px -6px var(--brand)" }}>6</div>
  );
}

// A static, styled preview of an executive report that anchors the hero.
function ReportMock() {
  const bars = [
    { r: 62, e: 44 }, { r: 70, e: 50 }, { r: 58, e: 61 },
    { r: 80, e: 55 }, { r: 88, e: 60 }, { r: 96, e: 64 },
  ];
  return (
    <div className="ds-card" style={{ padding: 0, overflow: "hidden", width: "100%", maxWidth: 760, margin: "0 auto", textAlign: "left" }}>
      {/* window bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderBottom: "1px solid var(--line)", background: "rgba(255,255,255,0.015)" }}>
        <div style={{ display: "flex", gap: 6 }}>
          {["#ff5f57", "#febc2e", "#28c840"].map(c => <span key={c} style={{ width: 11, height: 11, borderRadius: "50%", background: c, opacity: 0.85 }} />)}
        </div>
        <span style={{ fontSize: 12, color: "var(--ink-3)", marginLeft: 4 }}>Executive Report · Mock Org · Q3</span>
        <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, color: "var(--brand-2)", display: "inline-flex", alignItems: "center", gap: 5 }}>
          <Sparkles size={12} /> Generated in 41s
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: "var(--line)" }}>
        {/* flags */}
        <div style={{ background: "var(--surface)", padding: "16px 18px" }}>
          <p className="eyebrow" style={{ color: "var(--ink-3)", marginBottom: 12 }}>Flags</p>
          {[
            { icon: AlertTriangle, c: "#ff6b5e", bg: "rgba(255,107,94,0.12)", t: "Cash runway under 4 months" },
            { icon: AlertTriangle, c: "#ffb454", bg: "rgba(255,180,84,0.12)", t: "Event costs up 31% vs last term" },
            { icon: Info, c: "#6f8bff", bg: "rgba(111,139,255,0.12)", t: "Dues income flat while members rose" },
          ].map((f, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <span style={{ width: 26, height: 26, borderRadius: 7, background: f.bg, display: "flex", alignItems: "center", justifyContent: "center", color: f.c, flexShrink: 0 }}><f.icon size={14} /></span>
              <span style={{ fontSize: 12.5, color: "var(--ink-2)" }}>{f.t}</span>
            </div>
          ))}
        </div>
        {/* chart */}
        <div style={{ background: "var(--surface)", padding: "16px 18px" }}>
          <p className="eyebrow" style={{ color: "var(--ink-3)", marginBottom: 12 }}>Income vs Expenses</p>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 96 }}>
            {bars.map((b, i) => (
              <div key={i} style={{ flex: 1, display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 3, height: "100%" }}>
                <span style={{ width: "42%", height: `${b.r}%`, background: "var(--brand-grad)", borderRadius: "3px 3px 0 0" }} />
                <span style={{ width: "42%", height: `${b.e}%`, background: "#33405a", borderRadius: "3px 3px 0 0" }} />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 14, marginTop: 12, fontSize: 11, color: "var(--ink-3)" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 9, height: 9, borderRadius: 2, background: "var(--brand)" }} /> Income</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 9, height: 9, borderRadius: 2, background: "#33405a" }} /> Expenses</span>
          </div>
        </div>
      </div>

      {/* recommendation strip */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", background: "linear-gradient(90deg, rgba(242,106,44,0.08), transparent)", borderTop: "1px solid var(--line)" }}>
        <span className="icon-tile" style={{ width: 34, height: 34 }}><Lightbulb size={16} /></span>
        <span style={{ fontSize: 12.5, color: "var(--ink-2)" }}><strong style={{ color: "var(--ink)" }}>We recommend</strong> trimming discretionary event spend by ~15% and timing the spring dues drive earlier to rebuild runway.</span>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-0)", color: "var(--ink)" }}>
      {/* Navbar */}
      <nav className="landing-nav" style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(11,13,18,0.72)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", borderBottom: "1px solid var(--line)", height: 62, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <BrandLink style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <Logo />
          <span style={{ fontWeight: 700, fontSize: 15.5, color: "var(--ink)", letterSpacing: -0.2 }}>Consult6</span>
        </BrandLink>
        <div className="landing-nav-links">
          {[["Features", "#features"], ["How it Works", "#how-it-works"], ["Pricing", "#pricing"]].map(([l, h]) => (
            <a key={h} href={h} style={{ fontSize: 14, color: "var(--ink-2)", textDecoration: "none", padding: "6px 14px" }}>{l}</a>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Link href="/auth/login" style={{ fontSize: 14, color: "var(--ink-2)", textDecoration: "none", padding: "7px 16px" }}>Sign in</Link>
          <Link href="/auth/signup" className="btn btn-primary landing-signup-btn" style={{ padding: "8px 18px", fontSize: 14 }}>Get Started Free</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="landing-hero" style={{ position: "relative", overflow: "hidden", textAlign: "center", padding: "92px 24px 72px" }}>
        <div style={{ position: "relative", maxWidth: 760, margin: "0 auto" }}>
          <Reveal>
            <span className="chip" style={{ marginBottom: 26, color: "var(--brand-2)" }}>
              <Zap size={13} /> POCKET CONSULTANT · 60 SECONDS · NO RETAINER
            </span>
          </Reveal>
          <Reveal delay={60}>
            <h1 className="landing-h1" style={{ fontWeight: 800, lineHeight: 1.05, letterSpacing: -1.8, margin: "0 0 22px" }}>
              Senior financial insight.<br />
              <span className="grad-text">No consultant fees.</span>
            </h1>
          </Reveal>
          <Reveal delay={120}>
            <p style={{ fontSize: 18, color: "var(--ink-2)", lineHeight: 1.65, margin: "0 auto 36px", maxWidth: 560 }}>
              Consulting firms charge $10,000+ for a financial review. Consult6 gives your treasurer the same insight in under a minute, for a fraction of the cost.
            </p>
          </Reveal>
          <Reveal delay={180}>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/auth/signup" className="btn btn-primary" style={{ fontSize: 16, padding: "14px 28px" }}>
                Analyze My Financials <ArrowRight size={17} />
              </Link>
              <Link href="/try" className="btn btn-ghost" style={{ fontSize: 16, padding: "14px 26px" }}>
                Try Without Account
              </Link>
            </div>
          </Reveal>
          <Reveal delay={240}>
            <p style={{ marginTop: 18, fontSize: 13, color: "var(--ink-3)" }}>Free tier available · No credit card required · 1 free trial, no account needed</p>
          </Reveal>
        </div>

        {/* product mock */}
        <Reveal delay={260} style={{ position: "relative", marginTop: 56 }}>
          <div style={{ animation: "floaty 7s ease-in-out infinite" }}>
            <ReportMock />
          </div>
        </Reveal>
      </section>

      {/* Problem comparison */}
      <section style={{ background: "var(--bg-1)", borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)", padding: "84px 24px" }}>
        <div className="container" style={{ maxWidth: 880 }}>
          <Reveal style={{ textAlign: "center", marginBottom: 44 }}>
            <p className="eyebrow grad-text" style={{ marginBottom: 12 }}>The problem</p>
            <h2 style={{ fontSize: 30, fontWeight: 700, color: "var(--ink)", margin: 0, letterSpacing: -0.5 }}>Senior analysis shouldn&apos;t require a senior budget</h2>
          </Reveal>
          <div className="landing-vs-grid">
            <Reveal className="ds-card" style={{ padding: "28px 26px" }}>
              <p className="eyebrow" style={{ color: "var(--ink-3)", marginBottom: 20 }}>Consulting firm</p>
              {[
                { label: "Cost", value: "$10,000 to $50,000+" },
                { label: "Turnaround", value: "Weeks of back-and-forth" },
                { label: "Built for", value: "Fortune 500 companies" },
              ].map(row => (
                <div key={row.label} style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 11, color: "var(--ink-3)", margin: "0 0 3px", letterSpacing: 0.5 }}>{row.label.toUpperCase()}</p>
                  <p style={{ fontSize: 14.5, color: "var(--ink-2)", margin: 0 }}>{row.value}</p>
                </div>
              ))}
            </Reveal>
            <div className="landing-vs-divider" style={{ display: "flex", alignItems: "center", justifyContent: "center", paddingTop: 60 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: "var(--ink-3)" }}>VS</span>
            </div>
            <Reveal delay={120} className="ds-card" style={{ padding: "28px 26px", border: "1px solid transparent", background: "linear-gradient(180deg, rgba(242,106,44,0.10), rgba(242,106,44,0.02)), linear-gradient(180deg, #161c29, #11151f)", backgroundOrigin: "border-box", boxShadow: "0 0 0 1px rgba(242,106,44,0.4), 0 18px 50px -22px var(--brand)" }}>
              <p className="eyebrow grad-text" style={{ marginBottom: 20 }}>Consult6</p>
              {[
                { label: "Cost", value: "A fraction of that" },
                { label: "Turnaround", value: "Executive report in 60 seconds" },
                { label: "Built for", value: "Organizations like yours" },
              ].map(row => (
                <div key={row.label} style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 11, color: "var(--brand-2)", margin: "0 0 3px", letterSpacing: 0.5, opacity: 0.85 }}>{row.label.toUpperCase()}</p>
                  <p style={{ fontSize: 14.5, color: "var(--ink)", margin: 0, fontWeight: 600 }}>{row.value}</p>
                </div>
              ))}
            </Reveal>
          </div>
        </div>
      </section>

      {/* Who this is for */}
      <section style={{ padding: "84px 24px" }}>
        <div className="container" style={{ maxWidth: 880 }}>
          <Reveal style={{ textAlign: "center", marginBottom: 40 }}>
            <p className="eyebrow grad-text" style={{ marginBottom: 12 }}>Who it&apos;s for</p>
            <h2 style={{ fontSize: 30, fontWeight: 700, color: "var(--ink)", margin: "0 0 14px", letterSpacing: -0.5 }}>CFO-level insight without a CFO budget</h2>
            <p style={{ fontSize: 15.5, color: "var(--ink-2)", margin: "0 auto", lineHeight: 1.7, maxWidth: 560 }}>
              Built for elected or appointed treasurers, financial directors, and finance leads at any kind of organization. Not just large enterprises.
            </p>
          </Reveal>
          <div className="landing-who-grid">
            {orgTypes.map((org, i) => (
              <Reveal key={org} delay={i * 40} className="ds-card ds-card-hover" style={{ padding: "16px 16px", textAlign: "center" }}>
                <p style={{ fontSize: 13, color: "var(--ink-2)", margin: 0, lineHeight: 1.4 }}>{org}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" style={{ padding: "8px 24px 96px" }}>
        <div className="container">
          <Reveal style={{ textAlign: "center", marginBottom: 48 }}>
            <p className="eyebrow grad-text" style={{ marginBottom: 12 }}>Features</p>
            <h2 style={{ fontSize: 32, fontWeight: 700, color: "var(--ink)", margin: 0, letterSpacing: -0.6 }}>Everything your treasurer needs to look sharp in the boardroom</h2>
          </Reveal>
          <div className="landing-features-grid">
            {features.map((f, i) => (
              <Reveal key={f.title} delay={(i % 3) * 80} className="ds-card ds-card-hover" style={{ padding: "24px 22px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                  <span className="icon-tile"><f.icon size={19} /></span>
                  {f.badge && (
                    <span className="chip" style={{ marginLeft: "auto", padding: "3px 9px", fontSize: 9.5, color: "var(--brand-2)", borderColor: "rgba(242,106,44,0.3)", letterSpacing: 0.5 }}>{f.badge.toUpperCase()}</span>
                  )}
                </div>
                <p style={{ fontWeight: 700, fontSize: 15.5, color: "var(--ink)", margin: "0 0 8px", letterSpacing: -0.2 }}>{f.title}</p>
                <p style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" style={{ borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)", background: "var(--bg-1)", padding: "88px 24px" }}>
        <div className="container" style={{ maxWidth: 880, textAlign: "center" }}>
          <Reveal style={{ marginBottom: 48 }}>
            <p className="eyebrow grad-text" style={{ marginBottom: 12 }}>How it works</p>
            <h2 style={{ fontSize: 32, fontWeight: 700, color: "var(--ink)", margin: 0, letterSpacing: -0.6 }}>Three steps to a boardroom-ready report</h2>
          </Reveal>
          <div className="landing-steps-grid">
            {steps.map((s, i) => (
              <Reveal key={s.step} delay={i * 100} className="ds-card" style={{ textAlign: "left", padding: "24px 22px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                  <span className="icon-tile"><s.icon size={19} /></span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: "var(--ink-3)" }}>STEP {s.step}</span>
                </div>
                <p style={{ fontWeight: 700, fontSize: 16, color: "var(--ink)", margin: "0 0 8px", letterSpacing: -0.2 }}>{s.title}</p>
                <p style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.6, margin: 0 }}>{s.desc}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" style={{ padding: "96px 24px" }}>
        <div className="container">
          <Reveal style={{ textAlign: "center", marginBottom: 48 }}>
            <p className="eyebrow grad-text" style={{ marginBottom: 12 }}>Pricing</p>
            <h2 style={{ fontSize: 32, fontWeight: 700, color: "var(--ink)", margin: 0, letterSpacing: -0.6 }}>Simple, transparent pricing</h2>
          </Reveal>
          <div className="landing-pricing-grid">
            {/* Free */}
            <Reveal className="ds-card" style={{ padding: 28 }}>
              <p style={{ fontSize: 13, fontWeight: 800, color: "var(--ink-3)", margin: "0 0 12px", letterSpacing: 1 }}>FREE</p>
              <p style={{ fontSize: 40, fontWeight: 800, color: "var(--ink)", margin: "0 0 2px", letterSpacing: -1 }}>$0</p>
              <p style={{ fontSize: 13, color: "var(--ink-3)", margin: "0 0 24px" }}>per month</p>
              <div style={{ borderTop: "1px solid var(--line)", paddingTop: 20, marginBottom: 28 }}>
                {freeFeatures.map(f => (
                  <div key={f} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 11 }}>
                    <Check size={15} style={{ color: "var(--ink-2)", flexShrink: 0, marginTop: 2 }} />
                    <span style={{ fontSize: 13, color: "var(--ink-2)" }}>{f}</span>
                  </div>
                ))}
              </div>
              <Link href="/auth/signup" className="btn btn-ghost" style={{ display: "flex", padding: "12px 0", fontSize: 14 }}>Get Started Free</Link>
            </Reveal>

            {/* Pro */}
            <Reveal delay={100} className="ds-card" style={{ padding: 28, position: "relative", border: "1px solid transparent", background: "linear-gradient(180deg, rgba(242,106,44,0.10), rgba(242,106,44,0.02)), linear-gradient(180deg, #161c29, #11151f)", backgroundOrigin: "border-box", boxShadow: "0 0 0 1px rgba(242,106,44,0.45), 0 24px 60px -28px var(--brand)" }}>
              <div className="btn-primary" style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", fontSize: 10, fontWeight: 800, padding: "4px 14px", borderRadius: 999, letterSpacing: 0.5, whiteSpace: "nowrap" }}>BEST VALUE</div>
              <p className="grad-text" style={{ fontSize: 13, fontWeight: 800, margin: "0 0 12px", letterSpacing: 1 }}>PRO</p>
              <p style={{ fontSize: 40, fontWeight: 800, color: "var(--ink)", margin: "0 0 2px", letterSpacing: -1 }}>$10</p>
              <p style={{ fontSize: 13, color: "var(--ink-3)", margin: "0 0 24px" }}>per month</p>
              <div style={{ borderTop: "1px solid rgba(242,106,44,0.2)", paddingTop: 20, marginBottom: 28 }}>
                {proFeatures.map(f => (
                  <div key={f} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 11 }}>
                    <Check size={15} style={{ color: "var(--brand-2)", flexShrink: 0, marginTop: 2 }} />
                    <span style={{ fontSize: 13, color: "var(--ink-2)" }}>{f}</span>
                  </div>
                ))}
              </div>
              <Link href="/auth/signup" className="btn btn-primary" style={{ display: "flex", padding: "12px 0", fontSize: 14 }}>Get Started with Pro</Link>
            </Reveal>

            {/* Enterprise */}
            <Reveal delay={200} className="ds-card" style={{ padding: 28 }}>
              <p style={{ fontSize: 13, fontWeight: 800, color: "var(--good)", margin: "0 0 12px", letterSpacing: 1 }}>ENTERPRISE</p>
              <p style={{ fontSize: 12.5, color: "var(--ink-2)", margin: "0 0 20px", background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.22)", borderRadius: 8, padding: "10px 12px", lineHeight: 1.55 }}>
                Need custom limits or a team deal?{" "}
                <Link href="/contact" style={{ color: "var(--good)", fontWeight: 600, textDecoration: "none" }}>Contact us</Link>{" "}to discuss pricing and usage packages.
              </p>
              <div style={{ borderTop: "1px solid var(--line)", paddingTop: 20, marginBottom: 28 }}>
                {enterpriseFeatures.map(f => (
                  <div key={f} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 11 }}>
                    <Check size={15} style={{ color: "var(--good)", flexShrink: 0, marginTop: 2 }} />
                    <span style={{ fontSize: 13, color: "var(--ink-2)" }}>{f}</span>
                  </div>
                ))}
              </div>
              <Link href="/contact" className="btn btn-ghost" style={{ display: "flex", padding: "12px 0", fontSize: 14, color: "var(--good)", borderColor: "rgba(52,211,153,0.35)" }}>Discuss Custom Pricing <ArrowRight size={15} /></Link>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid var(--line)", padding: "28px 40px" }}>
        <div className="landing-footer container">
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Logo size={26} font={13} />
              <span style={{ fontWeight: 700, fontSize: 14, color: "var(--ink-2)" }}>Consult6</span>
            </div>
            <span style={{ fontSize: 13, color: "var(--ink-3)" }}>© {new Date().getFullYear()} Consult6. All rights reserved.</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
            <Link href="/about" style={{ fontSize: 13, color: "var(--ink-3)", textDecoration: "none" }}>About</Link>
            <Link href="/privacy" style={{ fontSize: 13, color: "var(--ink-3)", textDecoration: "none" }}>Privacy</Link>
            <Link href="/terms" style={{ fontSize: 13, color: "var(--ink-3)", textDecoration: "none" }}>Terms</Link>
            <Link href="/contact" style={{ fontSize: 13, color: "var(--ink-3)", textDecoration: "none" }}>Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
