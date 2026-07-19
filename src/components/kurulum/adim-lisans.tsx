"use client"

import * as React from "react"
import { CheckCircle2Icon, InfoIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ErrorShakeField } from "@/components/ui/error-shake"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { lisansGonder } from "@/lib/db/kurulum-actions"

/** Anahtarı yazarken XXXX-XXXX-XXXX-XXXX biçimine sokar. */
function bicimle(ham: string): string {
  const temiz = ham.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 16)
  return temiz.match(/.{1,4}/g)?.join("-") ?? temiz
}

export function AdimLisans({ ileri }: { ileri: () => void }) {
  const [firmaId, setFirmaId] = React.useState("")
  const [anahtar, setAnahtar] = React.useState("")
  const [dogrulandi, setDogrulandi] = React.useState(false)
  const [calisiyor, setCalisiyor] = React.useState(false)
  const [hata, setHata] = React.useState<string>()
  const [shakeNonce, setShakeNonce] = React.useState(0)

  function hataGoster(m: string) {
    setHata(m)
    setShakeNonce((n) => n + 1)
  }

  async function dogrula() {
    setCalisiyor(true)
    setHata(undefined)
    const r = await lisansGonder(firmaId, anahtar)
    setCalisiyor(false)
    if (!r.ok) {
      setDogrulandi(false)
      hataGoster(r.error ?? "Lisans doğrulanamadı.")
      return
    }
    setDogrulandi(true)
  }

  return (
    <FieldGroup className="gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold">Lisans</h2>
        <p className="text-sm text-muted-foreground">
          Size iletilen firma numarası ve lisans anahtarını girin.
        </p>
      </div>

      <p className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
        <InfoIcon className="mt-0.5 size-4 shrink-0" />
        <span>
          Lisans sunucusu henüz yayında değil. Bu adım şimdilik yalnız biçim
          denetimi yapar ve bilgiyi kaydeder; anahtarın geçerliliği
          <strong> doğrulanmaz</strong>.
        </span>
      </p>

      <Field>
        <FieldLabel htmlFor="firmaId">Firma ID</FieldLabel>
        <Input
          id="firmaId"
          value={firmaId}
          onChange={(e) => {
            setFirmaId(e.target.value)
            setDogrulandi(false)
          }}
          placeholder="Örn. MP-1042"
          className="h-10"
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="lisansAnahtar">Lisans anahtarı</FieldLabel>
        <Input
          id="lisansAnahtar"
          value={anahtar}
          onChange={(e) => {
            setAnahtar(bicimle(e.target.value))
            setDogrulandi(false)
          }}
          placeholder="XXXX-XXXX-XXXX-XXXX"
          className="h-10 font-mono tracking-wider"
        />
      </Field>

      {dogrulandi && (
        <p className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
          <CheckCircle2Icon className="size-4 shrink-0" />
          Lisans bilgisi kaydedildi.
        </p>
      )}

      <ErrorShakeField error={hata} shakeNonce={shakeNonce}>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-10"
            onClick={dogrula}
            disabled={calisiyor}
          >
            {calisiyor ? "Doğrulanıyor..." : "Doğrula"}
          </Button>
          <Button
            type="button"
            className="h-10 flex-1"
            onClick={ileri}
            disabled={!dogrulandi}
          >
            Devam
          </Button>
        </div>
      </ErrorShakeField>
    </FieldGroup>
  )
}
