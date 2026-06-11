import type { Metadata } from "next";
import Link from "next/link";
import InfoNav from "@/components/InfoNav";
import { SUPPORT_EMAIL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "About | Consult6",
  description: "Consult6 gives treasurers and finance directors senior-level financial analysis in seconds, without consultant fees.",
};

export default function AboutPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#1e1e1e", color: "#f0f0f0", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <InfoNav />

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "72px 24px 96px" }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: "#CC5500", letterSpacing: 3, marginBottom: 12 }}>ABOUT</p>
        <h1 style={{ fontSize: 40, fontWeight: 800, color: "#f0f0f0", margin: "0 0 24px", letterSpacing: -1, lineHeight: 1.15 }}>Your organization&apos;s pocket consultant.</h1>
        <p style={{ fontSize: 16, color: "#888", lineHeight: 1.8, margin: "0 0 32px" }}>
          Financial consulting firms charge $10,000 to $50,000+ for the kind of analysis that smaller organizations need just as much as large enterprises. The problem: most of those organizations are run by volunteer treasurers, part-time finance directors, or elected officials who don&apos;t have that budget. Or that time. They&apos;re making significant financial decisions without proper analysis, not because they don&apos;t care, but because professional advice has always been priced out of reach.
        </p>
        <p style={{ fontSize: 16, color: "#888", lineHeight: 1.8, margin: "0 0 32px" }}>
          Consult6 fixes that. Upload your spreadsheet, get a boardroom-ready executive report in seconds.
        </p>

        <h2 style={{ fontSize: 22, fontWeight: 700, color: "#f0f0f0", margin: "0 0 14px" }}>What we do</h2>
        <p style={{ fontSize: 15, color: "#888", lineHeight: 1.8, margin: "0 0 32px" }}>
          Consult6 analyses financial spreadsheets (CSV or Excel) and returns a structured executive report: critical flags, prioritised recommendations, a financial trajectory note, and in advanced mode, sector benchmarks, 12-month scenario projections, a risk matrix, and an action plan. Every report is downloadable as a professional PDF, ready to share with your board.
        </p>

        <h2 style={{ fontSize: 22, fontWeight: 700, color: "#f0f0f0", margin: "0 0 14px" }}>Built for real organizations of any type</h2>
        <p style={{ fontSize: 15, color: "#888", lineHeight: 1.8, margin: "0 0 32px" }}>
          Consult6 is not built for Fortune 500 finance teams. It&apos;s built for sports clubs, HOAs, nonprofits, student organizations, religious groups, small businesses, community associations, and professional associations. Any organization where someone has been handed the treasurer role and needs to look sharp in front of a board without spending thousands on a consultant. The analysis adapts to your specific organization type, sector, and stated constraints.
        </p>

        <h2 style={{ fontSize: 22, fontWeight: 700, color: "#f0f0f0", margin: "0 0 14px" }}>Our approach</h2>
        <p style={{ fontSize: 15, color: "#888", lineHeight: 1.8, margin: "0 0 32px" }}>
          Fast, contextual, and actionable. We believe senior financial insight should take seconds, not weeks. Consult6 takes the context you provide (your organization type, sector, size, and constraints) and produces the kind of specific, first-person analysis you would expect from a consulting engagement, not a generic spreadsheet summary.
        </p>

        <h2 style={{ fontSize: 22, fontWeight: 700, color: "#f0f0f0", margin: "0 0 14px" }}>Company Profiles</h2>
        <p style={{ fontSize: 15, color: "#888", lineHeight: 1.8, margin: "0 0 32px" }}>
          Consult6 includes a Company Profiles feature that lets you save organisations as persistent profiles. You can upload multiple periods of financial data to each profile, and track key metrics over time with visual charts. This gives your analyses historical context and helps you spot trends that would be invisible in a one-off report.
        </p>

        <h2 style={{ fontSize: 22, fontWeight: 700, color: "#f0f0f0", margin: "0 0 14px" }}>Infrastructure</h2>
        <p style={{ fontSize: 15, color: "#888", lineHeight: 1.8, margin: "0 0 32px" }}>
          Consult6 is a web application built on modern cloud infrastructure. User authentication and account credentials are managed securely through Supabase, a PostgreSQL-based backend platform. File data you upload is processed in memory during analysis and is not permanently stored on our servers. Report history — your previous analysis results and metadata — is saved to your account server-side, so it is accessible across all your devices wherever you sign in.
        </p>

        <h2 style={{ fontSize: 22, fontWeight: 700, color: "#f0f0f0", margin: "0 0 14px" }}>Where we are headed</h2>
        <p style={{ fontSize: 15, color: "#888", lineHeight: 1.8, margin: "0 0 40px" }}>
          Consult6 is an actively developed product. We are continually expanding its analytical capabilities, improving output quality, and adding features based on user feedback. If you have thoughts or questions, we would genuinely like to hear from you.
        </p>

        <div style={{ background: "#232323", border: "1px solid #2f2f2f", borderRadius: 12, padding: "24px 28px" }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: "#f0f0f0", margin: "0 0 6px" }}>Get in touch</p>
          <p style={{ fontSize: 14, color: "#666", margin: 0 }}>Questions, feedback, or partnership enquiries: visit our <a href="/contact" style={{ color: "#CC5500", textDecoration: "none" }}>contact page</a> or reach us at <span style={{ color: "#CC5500" }}>{SUPPORT_EMAIL}</span></p>
        </div>
      </main>

      <footer style={{ borderTop: "1px solid #272727", padding: "24px 40px" }}>
        <div style={{ maxWidth: 1060, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 26, height: 26, background: "#CC5500", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13, color: "#fff" }}>6</div>
              <span style={{ fontWeight: 700, fontSize: 14, color: "#888" }}>Consult6</span>
            </div>
            <span style={{ fontSize: 13, color: "#484848" }}>© {new Date().getFullYear()} Consult6. All rights reserved.</span>
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
