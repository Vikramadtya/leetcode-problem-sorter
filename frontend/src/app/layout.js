import AuthProvider from "./components/AuthProvider";
import { ThemeProvider } from "next-themes";
import { Toaster } from "react-hot-toast";
import config from "../config.json";
import "./globals.css";

export const metadata = {
  title: config.app.name,
  description: config.app.description,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="data-theme" defaultTheme={config.app.defaultTheme}>
          <AuthProvider>
            <Toaster position="bottom-right" />
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
