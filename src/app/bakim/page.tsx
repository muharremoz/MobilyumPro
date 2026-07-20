import { WrenchIcon } from "lucide-react"
import { redirect } from "next/navigation"

import { parametreAcik } from "@/lib/db/parametre"
import { getOturum } from "@/lib/oturum"

// Bakım durumu her istekte okunur; mod kapanınca kullanıcı yenileyip girebilsin.
export const dynamic = "force-dynamic"

/**
 * Bakım modu ekranı. Panel dışında durur ki bakım modundayken panelin
 * oturum kapısına takılıp sonsuz yönlendirmeye girmesin.
 */
export default async function BakimPage() {
  const oturum = await getOturum()
  const bakimda = await parametreAcik("bakim_modu")

  // Mod kapandıysa ya da giren kişi yöneticiyse burada tutmanın anlamı yok.
  if (!bakimda || oturum?.yonetici) redirect("/")

  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-6">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
          <WrenchIcon className="size-7" />
        </span>
        <h1 className="text-2xl font-semibold">Sistem bakımda</h1>
        <p className="text-sm text-muted-foreground">
          MobilyumPro şu anda bakım modunda. Çalışma kısa süre içinde
          tamamlanacak — bu sayfayı yenileyerek tekrar deneyebilirsiniz.
        </p>
        <p className="text-xs text-muted-foreground">
          Acil bir durum varsa sistem yöneticinize başvurun.
        </p>
      </div>
    </div>
  )
}
