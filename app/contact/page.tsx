import Link from "next/link";

export default function ContactPage() {
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
        <p style={{ fontSize: 12, fontWeight: 700, color: "#CC5500", letterSpacing: 3, marginBottom: 12 }}>CONTACT US</p>
        <h1 style={{ fontSize: 40, fontWeight: 800, color: "#f0f0f0", margin: "0 0 8px", letterSpacing: -1, lineHeight: 1.15 }}>We&apos;d love to hear from you</h1>
        <p style={{ fontSize: 13, color: "#555", margin: "0 0 40px" }}>General enquiries, enterprise pricing, and support</p>

        <p style={{ fontSize: 16, color: "#888", lineHeight: 1.8, margin: "0 0 48px" }}>
          Whether you have a question about your account, want to discuss an enterprise deal, or need help with something on the platform — we read every message and respond as quickly as we can.
        </p>

        {/* Primary contact card */}
        <div style={{ background: "#232323", border: "1px solid #2f2f2f", borderRadius: 12, padding: "28px 32px", marginBottom: 20 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: "#f0f0f0", margin: "0 0 6px" }}>General enquiries &amp; support</p>
          <p style={{ fontSize: 14, color: "#666", margin: "0 0 16px" }}>For account issues, billing questions, or anything else — drop us an email and we&apos;ll get back to you.</p>
          <a
            href="mailto:consult6testing@gmail.com"
            style={{ display: "inline-block", background: "#CC5500", color: "#fff", fontSize: 14, fontWeight: 700, textDecoration: "none", padding: "10px 22px", borderRadius: 8 }}
          >
            consult6testing@gmail.com
          </a>
        </div>

        {/* Enterprise card */}
        <div style={{ background: "#111f14", border: "1px solid #16a34a55", borderRadius: 12, padding: "28px 32px", marginBottom: 20 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: "#4ade80", margin: "0 0 6px" }}>Enterprise &amp; custom pricing</p>
          <p style={{ fontSize: 14, color: "#666", margin: "0 0 16px" }}>
            Looking for a team plan, custom usage limits, or a tailored pricing package? Tell us about your organisation and we&apos;ll put together an offer.
          </p>
          <a
            href="mailto:consult6testing@gmail.com?subject=Enterprise%20Pricing%20Enquiry"
            style={{ display: "inline-block", background: "transparent", border: "1px solid #16a34a55", color: "#4ade80", fontSize: 13, fontWeight: 700, textDecoration: "none", padding: "10px 22px", borderRadius: 8 }}
          >
            Discuss Custom Pricing →
          </a>
        </div>

        {/* Response time note */}
        <div style={{ background: "#1e1e1e", border: "1px solid #2d2d2d", borderRadius: 12, padding: "20px 24px" }}>
          <p style={{ fontSize: 13, color: "#555", margin: 0, lineHeight: 1.7 }}>
            We typically respond within one business day. For urgent account issues, including login or billing problems, please include as much detail as possible in your email so we can resolve things quickly.
          </p>
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
            <Link href="/contact" style={{ fontSize: 13, color: "#CC5500", textDecoration: "none" }}>Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
