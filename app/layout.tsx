import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Consult6 | Senior Financial Insight, No Consultant Fees",
  description: "Senior financial insight in 60 seconds. No consultant fees. Boardroom-ready executive reports for treasurers and financial directors at organizations of any type and size.",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon.png", type: "image/png" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: "/favicon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}.skeleton{animation:pulse 1.8s ease-in-out infinite;background:#2a2a2a;border-radius:6px;}`}</style>
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
