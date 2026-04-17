import type { Metadata } from "next";
import "./globals.css";
import MobileGate from "@/components/MobileGate";
import Script from "next/script";

export const metadata: Metadata = {
  title: "Consult6",
  description: "AI-powered financial health analysis",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon.png" type="image/png" sizes="512x512" />
      </head>
      <body>
        <Script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6148806781737488" crossOrigin="anonymous" strategy="afterInteractive" />
        <MobileGate>{children}</MobileGate>
      </body>
    </html>
  );
}
