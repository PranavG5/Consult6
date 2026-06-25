import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

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
    <html lang="en" className={inter.variable}>
      <head>
        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}.skeleton{animation:pulse 1.8s ease-in-out infinite;background:#1b212c;border-radius:6px;}`}</style>
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
