import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Financial RAG Analyst",
  description: "AI-powered financial document analysis. Upload SEC filings and get instant, cited answers.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
