import { AlertTriangleIcon, GalleryVerticalEndIcon } from "lucide-react"
import { redirect } from "next/navigation"

import { KurulumSihirbaz } from "@/components/kurulum/kurulum-sihirbaz"
import { kurulumAdimi } from "@/lib/kurulum/kurulum-islem"

// Kurulum durumu her istekte okunur; build'de donmamalı.
export const dynamic = "force-dynamic"

export default async function KurulumPage() {
  const adim = await kurulumAdimi()

  // Kurulum bittiyse burası kalıcı olarak kapanır.
  // (Action'ların kendi denetimi ayrıca var — bu yalnız ekranı gizler.)
  if (adim === "bitti") redirect("/login")

  return (
    <div className="flex min-h-svh flex-col gap-6 bg-white p-6 md:p-10">
      <div className="flex items-center gap-2 font-medium">
        <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <GalleryVerticalEndIcon className="size-4" />
        </div>
        MobilyumPro
      </div>

      <div className="flex flex-1 items-center justify-center">
        <div className="w-full max-w-3xl">
          {adim === "baglanti-hatasi" ? <BaglantiHatasi /> : (
            <KurulumSihirbaz baslangic={adim} />
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Kurulmuş bir sistemde DB'ye ulaşılamıyor. Bilerek sihirbazı AÇMIYORUZ:
 * geçici bir veritabanı kesintisinin, "isteyen uygulamayı kendi DB'sine
 * yönlendirip yönetici olsun" deliğine dönüşmesini istemiyoruz.
 */
function BaglantiHatasi() {
  return (
    <div className="mx-auto max-w-lg rounded-lg border border-amber-200 bg-amber-50 p-6">
      <div className="flex items-start gap-3">
        <AlertTriangleIcon className="mt-0.5 size-5 shrink-0 text-amber-600" />
        <div className="flex flex-col gap-2">
          <h1 className="font-semibold text-amber-900">
            Veritabanına ulaşılamıyor
          </h1>
          <p className="text-sm text-amber-900">
            Bu sunucuda kurulum daha önce tamamlanmış, ancak veritabanı şu an
            yanıt vermiyor. Kurulum ekranı bu yüzden açılmadı — mevcut veriler
            yerinde duruyor.
          </p>
          <ul className="list-disc pl-5 text-sm text-amber-900">
            <li>SQL Server hizmetinin çalıştığını denetleyin.</li>
            <li>Sunucuya ağ üzerinden erişilebildiğini doğrulayın.</li>
            <li>
              <code>.env</code> içindeki <code>DATABASE_URL</code> değişmiş
              olabilir.
            </li>
          </ul>
          <p className="text-sm text-amber-900">
            Sorun giderilince bu sayfayı yenilemeniz yeterli.
          </p>
        </div>
      </div>
    </div>
  )
}
