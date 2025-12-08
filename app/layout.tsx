import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Overtime Management System",
  description: "Production-grade backend API for managing employee overtime requests with concurrent safety",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
