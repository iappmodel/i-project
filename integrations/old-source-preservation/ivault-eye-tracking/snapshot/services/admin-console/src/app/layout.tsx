import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "[ i ] Admin Review",
  description: "Alphabet Currency System — admin review console"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
