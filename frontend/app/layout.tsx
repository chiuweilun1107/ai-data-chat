import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Data Chat - Dashboard Builder",
  description:
    "Conversational dashboard builder powered by AI. Connect your database, ask questions, get interactive charts.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW">
      <body className="font-sans antialiased bg-surface-primary text-text-primary">
        {children}
      </body>
    </html>
  );
}
