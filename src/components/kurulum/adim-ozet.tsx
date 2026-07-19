"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { PartyPopperIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ErrorShakeField } from "@/components/ui/error-shake"
import { kurulumuSonlandir } from "@/lib/db/kurulum-actions"
import type { KurulumOzet } from "@/lib/kurulum/kurulum-islem"

export function AdimOzet({ ozet, geri }: { ozet: KurulumOzet; geri: () => void }) {
  const router = useRouter()
  const [calisiyor, setCalisiyor] = React.useState(false)
  const [hata, setHata] = React.useState<string>()
  const [shakeNonce, setShakeNonce] = React.useState(0)

  const satirlar: [string, string][] = [
    ["SQL sunucusu", ozet.sunucu],
    ["Veritabanı", ozet.veritabani],
    ["Firma", ozet.firmaAdi],
    ["Yönetici", ozet.yonetici],
    ["Kullanıcı adı", ozet.kullaniciAdi],
    ["Lisans firma ID", ozet.lisansFirmaId || "—"],
    ["Lisans anahtarı", ozet.lisansAnahtar || "—"],
  ]

  async function bitir() {
    setCalisiyor(true)
    setHata(undefined)
    const r = await kurulumuSonlandir()
    if (!r.ok) {
      setCalisiyor(false)
      setHata(r.error ?? "Kurulum tamamlanamadı.")
      setShakeNonce((n) => n + 1)
      return
    }
    // Oturum açıldı; sunucu bileşenleri tazelensin diye refresh.
    router.replace("/")
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold">Özet</h2>
        <p className="text-sm text-muted-foreground">
          Her şey hazır. Bilgileri son bir kez denetleyin.
        </p>
      </div>

      <dl className="divide-y rounded-lg border">
        {satirlar.map(([etiket, deger]) => (
          <div
            key={etiket}
            className="flex items-start justify-between gap-4 px-3 py-2.5"
          >
            <dt className="text-sm text-muted-foreground">{etiket}</dt>
            <dd className="min-w-0 text-right text-sm font-medium break-words">
              {deger}
            </dd>
          </div>
        ))}
      </dl>

      <p className="text-xs text-muted-foreground">
        Bitirdiğinizde kurulum ekranı kapanır ve bir daha açılmaz. Yönetici
        hesabınızla otomatik giriş yapılır.
      </p>

      <ErrorShakeField error={hata} shakeNonce={shakeNonce}>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-10"
            onClick={geri}
            disabled={calisiyor}
          >
            Geri
          </Button>
          <Button
            type="button"
            className="h-10 flex-1"
            onClick={bitir}
            disabled={calisiyor}
          >
            <PartyPopperIcon className="size-4" />
            {calisiyor ? "Tamamlanıyor..." : "Kurulumu tamamla ve başla"}
          </Button>
        </div>
      </ErrorShakeField>
    </div>
  )
}
