"use client"

import { CheckIcon } from "lucide-react"

import { cn } from "@/lib/utils"

export type AdimTanim = { anahtar: string; baslik: string; aciklama: string }

export const ADIMLAR: AdimTanim[] = [
  { anahtar: "sql", baslik: "Veritabanı", aciklama: "SQL Server bağlantısı" },
  { anahtar: "kullanici", baslik: "Yönetici", aciklama: "Firma ve ilk hesap" },
  { anahtar: "lisans", baslik: "Lisans", aciklama: "Firma ID ve anahtar" },
  { anahtar: "ozet", baslik: "Özet", aciklama: "Denetle ve bitir" },
]

export function AdimGostergesi({ aktif }: { aktif: string }) {
  const aktifIndeks = ADIMLAR.findIndex((a) => a.anahtar === aktif)

  return (
    <ol className="flex flex-col gap-1">
      {ADIMLAR.map((adim, i) => {
        const bitti = i < aktifIndeks
        const suan = i === aktifIndeks
        return (
          <li
            key={adim.anahtar}
            className={cn(
              "flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors",
              suan && "bg-primary/10",
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                bitti && "border-primary bg-primary text-primary-foreground",
                suan && "border-primary text-primary",
                !bitti && !suan && "border-muted-foreground/30 text-muted-foreground",
              )}
            >
              {bitti ? <CheckIcon className="size-3.5" /> : i + 1}
            </span>
            <div className="min-w-0">
              <div
                className={cn(
                  "text-sm font-medium",
                  suan ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {adim.baslik}
              </div>
              <div className="text-xs text-muted-foreground">{adim.aciklama}</div>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
