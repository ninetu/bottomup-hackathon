import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import { MerchantProvider } from "@/lib/MerchantContext";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BottomUp | Decision Intelligence for Micro-Merchants",
  description:
    "Simulate tomorrow. Decide what matters today. AI-powered decision intelligence that protects working capital and cash flow.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body className="min-h-full flex flex-col font-sans bg-background text-foreground antialiased selection:bg-primary selection:text-primary-foreground">
        <MerchantProvider>
          <Header />
          <main className="flex-1 container mx-auto px-4 py-3.5 max-w-lg pb-16">
            {children}
          </main>
          <BottomNav />
        </MerchantProvider>
      </body>
    </html>
  );
}
