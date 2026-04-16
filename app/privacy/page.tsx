import Link from "next/link";

export default function PrivacyPage() {
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
        <p style={{ fontSize: 12, fontWeight: 700, color: "#CC5500", letterSpacing: 3, marginBottom: 12 }}>PRIVACY POLICY</p>
        <h1 style={{ fontSize: 40, fontWeight: 800, color: "#f0f0f0", margin: "0 0 8px", letterSpacing: -1, lineHeight: 1.15 }}>Your privacy, clearly explained</h1>
        <p style={{ fontSize: 13, color: "#555", margin: "0 0 32px" }}>Last updated: April 2026</p>

        <p style={{ fontSize: 16, color: "#888", lineHeight: 1.8, margin: "0 0 40px" }}>
          Consult6 is built for organisations that care about the integrity of their financial data. This policy explains what information we collect, how it is stored, and what controls you have over it. We have kept this document as plain as possible.
        </p>

        <h2 style={{ fontSize: 22, fontWeight: 700, color: "#f0f0f0", margin: "0 0 14px" }}>Account information</h2>
        <p style={{ fontSize: 15, color: "#888", lineHeight: 1.8, margin: "0 0 12px" }}>
          When you create a Consult6 account, we collect the email address and password you provide. Your credentials are stored and managed by <strong style={{ color: "#ccc" }}>Supabase</strong>, a PostgreSQL-based backend platform. Supabase handles authentication, password hashing, and session tokens on our behalf.
        </p>
        <p style={{ fontSize: 15, color: "#888", lineHeight: 1.8, margin: "0 0 32px" }}>
          We also store optional profile information you choose to provide: your industry, company size, a short description of your organisation, and any additional context you add in settings. This information is used solely to personalise the analysis output and is never shared with third parties.
        </p>

        <h2 style={{ fontSize: 22, fontWeight: 700, color: "#f0f0f0", margin: "0 0 14px" }}>Files you upload</h2>
        <p style={{ fontSize: 15, color: "#888", lineHeight: 1.8, margin: "0 0 12px" }}>
          CSV and Excel files you upload are processed in memory on our servers during the analysis and are <strong style={{ color: "#ccc" }}>not permanently stored</strong>. Once the analysis is complete, the raw file data is discarded. We do not retain copies of your spreadsheets.
        </p>
        <p style={{ fontSize: 15, color: "#888", lineHeight: 1.8, margin: "0 0 32px" }}>
          The structured output of each analysis — the findings, flags, and recommendations — is stored locally in your browser using <strong style={{ color: "#ccc" }}>localStorage</strong>, keyed to your account. This data never leaves your device unless you explicitly download a PDF. You can clear your analysis history at any time from the Privacy section of your settings.
        </p>

        <h2 style={{ fontSize: 22, fontWeight: 700, color: "#f0f0f0", margin: "0 0 14px" }}>Usage data</h2>
        <p style={{ fontSize: 15, color: "#888", lineHeight: 1.8, margin: "0 0 32px" }}>
          We track the number of analyses you have run in order to enforce plan limits. This usage count is stored in our database and resets daily. We do not use third-party analytics platforms or advertising trackers.
        </p>

        <h2 style={{ fontSize: 22, fontWeight: 700, color: "#f0f0f0", margin: "0 0 14px" }}>Cookies and local storage</h2>
        <p style={{ fontSize: 15, color: "#888", lineHeight: 1.8, margin: "0 0 32px" }}>
          Consult6 uses browser cookies strictly for authentication session management. No advertising or tracking cookies are set. We use localStorage to store your analysis history locally on your device. You can clear this data through your browser settings or through the Privacy tab in your Consult6 account settings.
        </p>

        <h2 style={{ fontSize: 22, fontWeight: 700, color: "#f0f0f0", margin: "0 0 14px" }}>Your controls</h2>
        <p style={{ fontSize: 15, color: "#888", lineHeight: 1.8, margin: "0 0 8px" }}>From your account settings, you can:</p>
        <ul style={{ fontSize: 15, color: "#888", lineHeight: 2, margin: "0 0 32px", paddingLeft: 20 }}>
          <li>Disable PDF history so no analysis output is saved locally</li>
          <li>Disable analysis memory so your profile context is not used to personalise outputs</li>
          <li>Restrict history to local-only storage</li>
          <li>Update or delete your account, which permanently removes your profile and usage data</li>
        </ul>

        <h2 style={{ fontSize: 22, fontWeight: 700, color: "#f0f0f0", margin: "0 0 14px" }}>Data retention</h2>
        <p style={{ fontSize: 15, color: "#888", lineHeight: 1.8, margin: "0 0 32px" }}>
          Account data is retained for as long as your account is active. If you delete your account, your profile, usage records, and any server-side data associated with your account are permanently deleted. Analysis history stored in localStorage is cleared from your browser at the time of deletion.
        </p>

        <h2 style={{ fontSize: 22, fontWeight: 700, color: "#f0f0f0", margin: "0 0 14px" }}>Third-party services</h2>
        <p style={{ fontSize: 15, color: "#888", lineHeight: 1.8, margin: "0 0 40px" }}>
          Consult6 uses Supabase for authentication and database storage. Supabase&apos;s own privacy practices govern how they handle infrastructure-level data. We do not share your personal information with any other third parties.
        </p>

        <div style={{ background: "#161616", border: "1px solid #222", borderRadius: 12, padding: "24px 28px" }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: "#f0f0f0", margin: "0 0 6px" }}>Questions about your data?</p>
          <p style={{ fontSize: 14, color: "#666", margin: 0 }}>Reach us at <span style={{ color: "#CC5500" }}>hello@consult6.com</span> and we will respond as promptly as possible.</p>
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
