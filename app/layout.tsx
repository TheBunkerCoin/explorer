import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from './providers';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BunkerCoin Explorer",
  description: "A minimal blockchain explorer for BunkerCoin - running Alpenglow consensus on a simulated shortwave radio network",
  
  // Favicon
  icons: {
    icon: "/bunker-favicon.png",
    shortcut: "/bunker-favicon.png",
    apple: "/bunker-favicon.png",
  },
  
  // Open Graph metadata
  openGraph: {
    title: "BunkerCoin Explorer",
    description: "A minimal blockchain explorer for BunkerCoin - running Alpenglow consensus on a simulated shortwave radio network",
    url: "https://explorer.bunkercoin.io",
    siteName: "BunkerCoin Explorer",
    images: [
      {
        url: "/Preview.png",
        width: 1200,
        height: 630,
        alt: "BunkerCoin Explorer Preview",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  
  // Twitter Card metadata
  twitter: {
    card: "summary_large_image",
    title: "BunkerCoin Explorer",
    description: "A minimal blockchain explorer for BunkerCoin - running Alpenglow consensus on a simulated shortwave radio network",
    images: ["/preview.png"],
    creator: "@bunkercoin_io",
  },
  
  // Additional metadata
  metadataBase: new URL("https://explorer.bunkercoin.io"),
  alternates: {
    canonical: "/",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
