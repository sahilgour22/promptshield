import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { WsProvider } from "@/components/dashboard/WsProvider";
import { CommandPalette } from "@/components/dashboard/CommandPalette";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "PromptShield — AI Security Gateway",
  description: "Real-time prompt injection and data exfiltration detection for AI agents.",
  openGraph: {
    title: "PromptShield — AI Security Gateway",
    description: "Detect prompt injection, jailbreaks, and data exfiltration in your AI agent in real time. Sub-millisecond detection. 3-line integration.",
    type: "website",
    siteName: "PromptShield",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "PromptShield Dashboard" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "PromptShield — AI Security Gateway",
    description: "Detect prompt injection, jailbreaks, and data exfiltration in your AI agent in real time.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} dark h-full`}>
      <head>
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="h-full antialiased">
        <WsProvider>
          <CommandPalette />
          <div className="flex h-full">
            <Sidebar />
            <main className="ml-[240px] flex-1 flex flex-col min-h-screen overflow-hidden bg-[#131315]">
              {children}
            </main>
          </div>
        </WsProvider>
      </body>
    </html>
  );
}
