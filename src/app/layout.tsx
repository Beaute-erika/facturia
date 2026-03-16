import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Facturia — CRM pour artisans",
  description: "Gérez vos clients, devis, factures et chantiers en un seul endroit.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className="bg-background text-text-primary font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
