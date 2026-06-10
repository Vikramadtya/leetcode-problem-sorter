import AuthProvider from "./components/AuthProvider";
import { ThemeProvider } from "next-themes";
import "./globals.css";

export const metadata = {
  title: "LeetCode Prep",
  description: "Track your LeetCode interview preparation questions.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="data-theme" defaultTheme="dark">
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
