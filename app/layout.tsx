import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Inter, IBM_Plex_Mono } from "next/font/google";
import { Toaster } from "sonner";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { HeaderSettings } from "@/components/HeaderSettings";
import { AppNavigation } from "@/components/AppNavigation";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["600"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500"],
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "SAREN - Super App Rendi",
  description: "Aplikasi internal pencatatan pekerjaan bulanan (garapan) Rendi",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${inter.variable} ${plusJakartaSans.variable} ${ibmPlexMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#080D14" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="SAREN" />
        <link rel="apple-touch-icon" href="/saren_logo.png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('theme');
                  var theme = saved || 'dark';
                  document.documentElement.setAttribute('data-theme', theme);
                  if (theme === 'dark') {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })()
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-bg-page text-text-primary selection:bg-accent-soft selection:text-accent">
        {/* Global Navigation Header with Glassmorphism */}
        <header className="sticky top-0 z-40 w-full border-b border-border-soft/50 bg-bg-surface/80 backdrop-blur-xl transition-all duration-200">
          <div className="max-w-7xl mx-auto w-full px-4 h-16 flex items-center justify-between md:px-8">
            <Link href="/" className="flex items-center gap-2.5 group">
              <img
                src="/saren_logo_dark.png"
                alt="SAREN Logo"
                className="h-9 w-9 rounded-xl object-cover shadow-sm border border-border-soft/50 bg-bg-surface transition-transform duration-200 group-hover:scale-105 group-active:scale-95"
              />
              <span className="font-display font-semibold text-base text-text-primary tracking-tight">
                SAREN
              </span>
            </Link>
            <div className="flex items-center gap-2.5">
              <span className="text-[11px] font-semibold text-accent bg-accent-soft px-3 py-1 rounded-full font-sans select-none tracking-wide hidden sm:inline">
                Super App Rendi
              </span>
              <ThemeToggle />
              <HeaderSettings />
            </div>
          </div>
        </header>

        <div className="flex-1 flex flex-row overflow-hidden">
          <AppNavigation />
          <main className="flex-1 flex flex-col h-full overflow-y-auto pb-20 md:pb-0 relative">
            {children}
          </main>
        </div>

        <Toaster 
          position="top-right" 
          toastOptions={{
            style: {
              background: "var(--bg-surface)",
              color: "var(--text-primary)",
              border: "1px solid var(--border-soft)",
              borderRadius: "12px",
              fontFamily: "var(--font-sans)",
            },
          }}
        />
      </body>
    </html>
  );
}
