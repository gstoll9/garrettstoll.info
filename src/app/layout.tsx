import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

export const metadata: Metadata = {
  title: "Garrett Stoll",
  description: "The Garrett Stoll website",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
      {/* className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      > */}
        {children}
      </body>
    </html>
  );
}
