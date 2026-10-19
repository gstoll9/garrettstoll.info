import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "../fonts/GeistVF.woff",
  variable: "--font-body",
  display: "swap",
});

const geistMono = localFont({
  src: "../fonts/GeistMonoVF.woff",
  variable: "--font-mono",
  display: "swap",
});

const displaySerif = localFont({
  src: "../fonts/GeistVF.woff",
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Garrett Stoll",
  description: "Garrett Stoll — data scientist working across machine learning, high-performance computing and scientific simulation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} ${displaySerif.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
