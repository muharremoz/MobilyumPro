import { redirect } from "next/navigation";

import { AppNav } from "@/components/nav/app-nav";
import { AppHeader } from "@/components/nav/app-header";
import { AraclarSaglayici } from "@/components/araclar/araclar-baglam";
import { YetkiSaglayici } from "@/components/yetki/yetki-baglam";
import { kurulumAdimi } from "@/lib/kurulum/kurulum-islem";
import { getOturum } from "@/lib/oturum";
import { kullaniciYetkileri } from "@/lib/yetki-sunucu";

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
  if (!oturum) {
    // Hiç kullanıcı yoksa login'e atmak çıkmaz sokak olur (liste boş).
    redirect((await kurulumAdimi()) !== "bitti" ? "/kurulum" : "/login");
  }

  // Menüde yalnız listeleme yetkisi olan modüller görünür.
  const yetkiler = await kullaniciYetkileri(oturum);
  const izinliModuller = Object.entries(yetkiler)
    .filter(([, y]) => y.isList)
    .map(([modul]) => modul);

  return (
    <YetkiSaglayici moduller={yetkiler} yonetici={oturum.yonetici}>
    <AraclarSaglayici>
    <div className="relative flex h-svh overflow-hidden bg-background">
      <AppNav izinliModuller={izinliModuller} />
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-card">
        <AppHeader />
        <div className="flex-1 overflow-auto p-3">
          {children}
        </div>
      </main>
    </div>
    </AraclarSaglayici>
    </YetkiSaglayici>
  );
}
