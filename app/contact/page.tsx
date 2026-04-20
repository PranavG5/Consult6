import Link from "next/link";
import InfoNav from "@/components/InfoNav";

export default function ContactPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#1e1e1e", color: "#f0f0f0", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <InfoNav />

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "72px 24px 96px" }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: "#CC5500", letterSpacing: 3, marginBottom: 12 }}>CONTACT US</p>
        <h1 style={{ fontSize: 40, fontWeight: 800, color: "#f0f0f0", margin: "0 0 8px", letterSpacing: -1, lineHeight: 1.15 }}>We&apos;d love to hear from you</h1>
        <p style={{ fontSize: 13, color: "#555", margin: "0 0 40px" }}>General enquiries, enterprise pricing, and support</p>

        <p style={{ fontSize: 16, color: "#888", lineHeight: 1.8, margin: "0 0 48px" }}>
          Whether you have a question about your account, want to discuss an enterprise deal, or need help with something on the platform — we read every message and respond as quickly as we can.
        </p>

        {/* General enquiries */}
        <div style={{ background: "#232323", border: "1px solid #2f2f2f", borderRadius: 12, padding: "28px 32px", marginBottom: 20 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: "#f0f0f0", margin: "0 0 6px" }}>General enquiries &amp; support</p>
          <p style={{ fontSize: 14, color: "#666", margin: "0 0 14px" }}>For account issues, billing questions, or anything else — email us directly:</p>
          <p style={{ fontSize: 15, color: "#CC5500", fontWeight: 600, margin: 0 }}>consult6testing@gmail.com</p>
        </div>

        {/* Enterprise */}
        <div style={{ background: "#111f14", border: "1px solid #16a34a55", borderRadius: 12, padding: "28px 32px", marginBottom: 20 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: "#4ade80", margin: "0 0 6px" }}>Enterprise &amp; custom pricing</p>
          <p style={{ fontSize: 14, color: "#666", margin: "0 0 14px" }}>
            Looking for a team plan, custom usage limits, or a tailored pricing package? Email us and tell us about your organisation:
          </p>
          <p style={{ fontSize: 15, color: "#CC5500", fontWeight: 600, margin: 0 }}>consult6testing@gmail.com</p>
        </div>

        {/* Response time */}
        <div style={{ background: "#1e1e1e", border: "1px solid #2d2d2d", borderRadius: 12, padding: "20px 24px" }}>
          <p style={{ fontSize: 13, color: "#555", margin: 0, lineHeight: 1.7 }}>
            We typically respond within one business day. For urgent account or billing issues, please include as much detail as possible so we can help quickly.
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
            <Link href="/contact" style={{ fontSize: 13, color: "#555", textDecoration: "none" }}>Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
