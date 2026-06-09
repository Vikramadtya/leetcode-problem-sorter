import AuthProvider from "./components/AuthProvider";
import "./globals.css";

export const metadata = {
  title: "LeetCode Prep",
  description: "Track your LeetCode interview preparation questions.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
