import AuthProvider from "./components/AuthProvider";
import { ThemeProvider } from "next-themes";
import { Toaster } from "react-hot-toast";
import config from "../config.json";
import "./globals.css";
import ParticlesBackground from "./components/ParticlesBackground";
import OfflineBanner from "./components/OfflineBanner";
import GlobalAudioListener from "./components/GlobalAudioListener";
import { ErrorBoundary } from "./components/ErrorBoundary";

// ── SEO Metadata ──────────────────────────────────────────────────────────────
// Applies to all pages by default. Individual page layouts can override these.
export const metadata = {
  title: {
    default: config.app.name,
    // Page-specific layouts set the template: e.g. "Dashboard | Problem Sorter"
    template: `%s | ${config.app.name}`,
  },
  description: config.app.description,
  keywords: [
    'LeetCode tracker',
    'DSA problem tracker',
    'coding interview prep',
    'spaced repetition',
    'algorithm practice',
    'competitive programming',
  ],
  authors: [{ name: 'Problem Sorter' }],
  // Open Graph — controls link previews on Slack, LinkedIn, Twitter, etc.
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: process.env.NEXT_PUBLIC_APP_URL || 'https://problem-sorter.vercel.app',
    siteName: config.app.name,
    title: config.app.name,
    description: config.app.description,
  },
  // Twitter card
  twitter: {
    card: 'summary',
    title: config.app.name,
    description: config.app.description,
  },
  // Tell crawlers to index this site
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

// ── Root layout ───────────────────────────────────────────────────────────────
export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="data-theme"
          defaultTheme={config.app.defaultTheme}
          disableTransitionOnChange
        >
          <AuthProvider>
            {/* Toast notifications — bottom-right, 3.5s duration */}
            <Toaster
              position="bottom-right"
              toastOptions={{ duration: 3500 }}
            />

            {/* Connectivity warning — visible only when the user goes offline */}
            <OfflineBanner />

            {/* Theme-aware interactive particle canvas (client component, renders after hydration) */}
            <ParticlesBackground />

            {/* Global sound effects listener */}
            <GlobalAudioListener />

            {/* Page content — sits above the particle canvas (z-index: 1) */}
            <div className="app-content">
              <ErrorBoundary>
                {children}
              </ErrorBoundary>
            </div>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
