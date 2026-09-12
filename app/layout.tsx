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

const title = "BunkerCoin Explorer | Private Testnet";
const description =
  "Explore the BunkerCoin Private Testnet and watch the livestream. Running Alpenglow consensus on a shortwave radio network.";
const socialImage = {
  url: "/explorer-og.png",
  width: 1200,
  height: 630,
  type: "image/png",
  alt: "BunkerCoin Explorer Private Testnet with shortwave radio equipment",
};

export const metadata: Metadata = {
  title,
  description,
  
  // Favicon
  icons: {
    icon: "/bunker-favicon.png",
    shortcut: "/bunker-favicon.png",
    apple: "/bunker-favicon.png",
  },
  
  // Open Graph metadata
  openGraph: {
    title,
    description,
    url: "https://explorer.bunkercoin.com/",
    siteName: "BunkerCoin Explorer",
    images: [socialImage],
    locale: "en_US",
    type: "website",
  },
  
  // Twitter Card metadata
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [socialImage],
    creator: "@bunkercoin_io",
  },
  
  // Additional metadata
  metadataBase: new URL("https://explorer.bunkercoin.com"),
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
