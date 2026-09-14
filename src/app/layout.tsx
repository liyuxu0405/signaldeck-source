import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://signaldeck.org"),
  title: { default: "SignalDeck｜AI API 中转站透明度监测", template: "%s｜SignalDeck" },
  description: "用真实请求核验 AI 中转接口的 Token 计费、协议兼容与 Agent 能力；浏览独立目录和服务端签发的公开报告。",
  keywords: ["AI API", "中转站", "Claude 中转站", "OpenAI 中转站", "Gemini 中转站", "Token 检测"],
  openGraph: { type: "website", locale: "zh_CN", siteName: "SignalDeck" },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SiteHeader />
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
