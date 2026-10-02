import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KI Masterclass CRM",
  description: "Marktpotenzial, Akquisition und Veranstaltungen für die KI Masterclass – Speed-Dating KI-Mittelstand.",
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
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
