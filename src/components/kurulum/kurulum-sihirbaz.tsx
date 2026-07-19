"use client"

import * as React from "react"

import { AdimGostergesi } from "./adim-gostergesi"
import { AdimSql } from "./adim-sql"
import { AdimKullanici } from "./adim-kullanici"
import { AdimLisans } from "./adim-lisans"
import { AdimOzet } from "./adim-ozet"
import { ozetGetir } from "@/lib/db/kurulum-actions"
import type { KurulumAdim, KurulumOzet } from "@/lib/kurulum/kurulum-islem"

/**
 * Sihirbazın kabuğu. Hangi adımda başlanacağını SUNUCU söyler
 * (`kurulumAdimi()`); istemci yalnız ileri/geri gezinir.
 *
 * Böylece sayfa yenilenirse kaldığı yerden devam eder — SQL adımı bitmişken
 * baştan başlatmak, kurulumu yarıda kalmış birini gereksizce paniğe sokardı.
 */
export function KurulumSihirbaz({ baslangic }: { baslangic: KurulumAdim }) {
  const [adim, setAdim] = React.useState<KurulumAdim>(baslangic)
  const [ozet, setOzet] = React.useState<KurulumOzet | null>(null)

  // Özet adımına gelindiğinde veriler sunucudan tazelenir; ara adımlarda
  // girilen bilgileri istemcide biriktirip taşımak gereksiz kopya olurdu.
  React.useEffect(() => {
    if (adim !== "ozet") return
    let iptal = false
    ozetGetir().then((o) => {
      if (!iptal) setOzet(o)
    })
    return () => {
      iptal = true
    }
  }, [adim])

  return (
    <div className="grid w-full gap-8 md:grid-cols-[15rem_1fr]">
      <aside className="md:border-r md:pr-6">
        <AdimGostergesi aktif={adim} />
      </aside>

      <div className="min-w-0">
        {adim === "sql" && <AdimSql ileri={() => setAdim("kullanici")} />}
        {adim === "kullanici" && <AdimKullanici ileri={() => setAdim("lisans")} />}
        {adim === "lisans" && (
          // Geri tuşu yok: yönetici hesabı oluştu, önceki adım geri alınamaz.
          <AdimLisans ileri={() => setAdim("ozet")} />
        )}
        {adim === "ozet" &&
          (ozet ? (
            <AdimOzet ozet={ozet} geri={() => setAdim("lisans")} />
          ) : (
            <p className="text-sm text-muted-foreground">Özet hazırlanıyor...</p>
          ))}
      </div>
    </div>
  )
}
