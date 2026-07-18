import { redirect } from "next/navigation";

import { AppNav } from "@/components/nav/app-nav";
import { AppHeader } from "@/components/nav/app-header";
import { getOturum } from "@/lib/oturum";

/**
 * Panelin oturum kapısı — tek nokta.
 *
 * /login, /q/[kod] ve /api/dosya bu grubun DIŞINDA olduğu için doğal olarak
 * açık kalır (QR ile atölye görünümü login istemez).
 */
export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const oturum = await getOturum();
  if (!oturum) redirect("/login");

  return (
    <div className="relative flex h-svh overflow-hidden bg-background">
      <AppNav />
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-card">
        <AppHeader />
        <div className="flex-1 overflow-auto p-3">
          {children}
        </div>
      </main>
    </div>
  );
}
