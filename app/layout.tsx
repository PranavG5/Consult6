import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Consult6",
  description: "AI-powered financial health analysis",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
