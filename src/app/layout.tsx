import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const joyride = localFont({
  src: [
    { path: "../fonts/JoyrideSTD.ttf", weight: "400", style: "normal" },
    { path: "../fonts/JoyrideSTDItalic.ttf", weight: "400", style: "italic" },
  ],
  variable: "--font-joyride",
  display: "swap",
});

export const metadata: Metadata = {
  title: "One More EPK - Your Music Deserves a Better First Impression",
  description:
    "Build a stunning Electronic Press Kit in minutes. Upload your photos, link your music, and get a beautiful animated EPK you can share with venues, blogs, and industry contacts.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${joyride.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
