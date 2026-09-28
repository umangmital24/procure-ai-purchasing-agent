import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ProcureAI | Supplier Recovery Agent",
  description:
    "An action-oriented purchasing agent that investigates supplier shortfalls, executes recovery plans, and validates outcomes.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  );
}
