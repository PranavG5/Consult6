import type { Metadata } from "next";
import "./globals.css";
import MobileGate from "@/components/MobileGate";

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
      <body><MobileGate>{children}</MobileGate></body>
    </html>
  );
}
