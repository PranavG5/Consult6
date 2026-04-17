import Link from "next/link";

export default function TermsPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#1e1e1e", color: "#f0f0f0", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <nav style={{ borderBottom: "1px solid #2d2d2d", padding: "0 32px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: "#1e1e1e", zIndex: 100 }}>
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
        <p style={{ fontSize: 12, fontWeight: 700, color: "#CC5500", letterSpacing: 3, marginBottom: 12 }}>TERMS OF USE</p>
        <h1 style={{ fontSize: 40, fontWeight: 800, color: "#f0f0f0", margin: "0 0 8px", letterSpacing: -1, lineHeight: 1.15 }}>Terms and conditions</h1>
        <p style={{ fontSize: 13, color: "#555", margin: "0 0 32px" }}>Last updated: April 2026</p>

        <p style={{ fontSize: 16, color: "#888", lineHeight: 1.8, margin: "0 0 40px" }}>
          Please read these terms carefully before using Consult6. By creating an account or using any part of the service, you agree to be bound by these terms.
        </p>

        <h2 style={{ fontSize: 22, fontWeight: 700, color: "#f0f0f0", margin: "0 0 14px" }}>About the service</h2>
        <p style={{ fontSize: 15, color: "#888", lineHeight: 1.8, margin: "0 0 12px" }}>
          Consult6 is a financial analysis tool that processes spreadsheet data and returns structured insights. The service is actively developed and evolving. We are continuously improving the quality, accuracy, and breadth of the analysis output, and you may encounter limitations or changes as the product matures.
        </p>
        <p style={{ fontSize: 15, color: "#888", lineHeight: 1.8, margin: "0 0 32px" }}>
          We are transparent about this because we believe you deserve to know where the product stands. The core functionality (upload, analyse, receive structured output) is stable and available. Newer features may still be refined over time.
        </p>

        <h2 style={{ fontSize: 22, fontWeight: 700, color: "#f0f0f0", margin: "0 0 14px" }}>Nature of the output</h2>
        <p style={{ fontSize: 15, color: "#888", lineHeight: 1.8, margin: "0 0 12px" }}>
          The analysis output produced by Consult6 is intended to support your decision-making, not replace professional financial judgement. The insights, flags, recommendations, and projections are generated based on the data you provide and the context you specify. They should be treated as a starting point for review, not as audited or certified financial advice.
        </p>
        <p style={{ fontSize: 15, color: "#888", lineHeight: 1.8, margin: "0 0 32px" }}>
          Consult6 makes no warranties, express or implied, regarding the accuracy, completeness, or fitness for purpose of any analysis output. You remain responsible for verifying the output against your own records and for any decisions made based on it.
        </p>

        <h2 style={{ fontSize: 22, fontWeight: 700, color: "#f0f0f0", margin: "0 0 14px" }}>Acceptable use</h2>
        <p style={{ fontSize: 15, color: "#888", lineHeight: 1.8, margin: "0 0 8px" }}>You agree to use Consult6 only for lawful purposes. You must not:</p>
        <ul style={{ fontSize: 15, color: "#888", lineHeight: 2, margin: "0 0 32px", paddingLeft: 20 }}>
          <li>Upload files containing data you do not have the right to process</li>
          <li>Attempt to circumvent plan limits or access controls</li>
          <li>Use the service to process data in violation of applicable privacy or data protection laws</li>
          <li>Attempt to reverse-engineer, scrape, or disrupt the platform</li>
        </ul>

        <h2 style={{ fontSize: 22, fontWeight: 700, color: "#f0f0f0", margin: "0 0 14px" }}>Accounts and plans</h2>
        <p style={{ fontSize: 15, color: "#888", lineHeight: 1.8, margin: "0 0 32px" }}>
          You are responsible for maintaining the security of your account credentials. Plan limits (number of analyses per day) are enforced at the account level. We reserve the right to modify plan limits or pricing with reasonable notice. Paid subscriptions are subject to the billing terms presented at the time of purchase.
        </p>

        <h2 style={{ fontSize: 22, fontWeight: 700, color: "#f0f0f0", margin: "0 0 14px" }}>Intellectual property</h2>
        <p style={{ fontSize: 15, color: "#888", lineHeight: 1.8, margin: "0 0 32px" }}>
          The Consult6 platform, including its interface, analysis logic, and branding, is the property of Consult6 and its operators. The analysis output generated from your data belongs to you. We do not claim ownership over any content you upload or any reports generated from that content.
        </p>

        <h2 style={{ fontSize: 22, fontWeight: 700, color: "#f0f0f0", margin: "0 0 14px" }}>Limitation of liability</h2>
        <p style={{ fontSize: 15, color: "#888", lineHeight: 1.8, margin: "0 0 32px" }}>
          To the fullest extent permitted by applicable law, Consult6 and its operators shall not be liable for any indirect, incidental, or consequential damages arising from your use of the service, including any decisions made in reliance on analysis output. Our total liability in any circumstance shall not exceed the amount you paid for the service in the preceding three months.
        </p>

        <h2 style={{ fontSize: 22, fontWeight: 700, color: "#f0f0f0", margin: "0 0 14px" }}>Changes to these terms</h2>
        <p style={{ fontSize: 15, color: "#888", lineHeight: 1.8, margin: "0 0 32px" }}>
          We may update these terms as the service evolves. When we make material changes, we will update the date at the top of this page. Continued use of Consult6 after changes are published constitutes acceptance of the revised terms.
        </p>

        <h2 style={{ fontSize: 22, fontWeight: 700, color: "#f0f0f0", margin: "0 0 14px" }}>Termination</h2>
        <p style={{ fontSize: 15, color: "#888", lineHeight: 1.8, margin: "0 0 40px" }}>
          You may close your account at any time from the Account tab in your settings. We reserve the right to suspend or terminate accounts that violate these terms. Upon termination, your data is handled in accordance with the Privacy Policy.
        </p>

        <div style={{ background: "#232323", border: "1px solid #2f2f2f", borderRadius: 12, padding: "24px 28px" }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: "#f0f0f0", margin: "0 0 6px" }}>Questions about these terms?</p>
          <p style={{ fontSize: 14, color: "#666", margin: 0 }}>Contact us at <span style={{ color: "#CC5500" }}>consult6testing@gmail.com</span> and we will get back to you.</p>
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
          </div>
        </div>
      </footer>
    </div>
  );
}
