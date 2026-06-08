import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { AnimGuard } from "@/components/anim-guard";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "MobilyumPro · Yönetim Paneli",
  description: "MobilyumPro mobilya yönetim paneli",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full" suppressHydrationWarning>
        <AnimGuard />
        {children}
        <Toaster position="bottom-center" />
      </body>
    </html>
  );
}
