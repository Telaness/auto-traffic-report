import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { getBaseUrl } from "@/src/lib/env";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const APP_NAME = "オトレポ";
const APP_DESCRIPTION = "HP月次トラフィックレポート自動生成・配信システム";

// ファビコン / アプリアイコン / OGP画像は src/app 配下のファイル規約で自動配信される。
//   icon.png / apple-icon.png / opengraph-image.jpg / twitter-image.jpg
export const metadata: Metadata = {
  metadataBase: new URL(getBaseUrl()),
  title: APP_NAME,
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  appleWebApp: {
    title: APP_NAME,
    capable: true,
  },
  openGraph: {
    type: "website",
    locale: "ja_JP",
    siteName: APP_NAME,
    title: APP_NAME,
    description: APP_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: APP_NAME,
    description: APP_DESCRIPTION,
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
