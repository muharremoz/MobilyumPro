import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { AnimGuard } from "@/components/anim-guard";

const geist = Geist({
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
    <html lang="tr" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full" suppressHydrationWarning>
        <AnimGuard />
        {children}
        <Toaster position="bottom-center" />
      </body>
    </html>
  );
}
