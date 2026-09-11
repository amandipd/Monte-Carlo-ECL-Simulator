import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Quant-as-a-Service · ECL Dashboard",
  description:
    "Monte Carlo Expected Credit Loss simulator.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
