"use client"

import * as React from "react"
import { CheckCircle2Icon, DatabaseIcon, XCircleIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ErrorShakeField } from "@/components/ui/error-shake"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { sqlBaglantiTest, sqlKaydet } from "@/lib/db/kurulum-actions"
import type { SqlBilgi } from "@/lib/kurulum/env-dosya"

type Durum =
  | { tip: "bos" }
  | { tip: "test-ediliyor" }
  | { tip: "basarili"; mesaj: string }
  | { tip: "hata"; mesaj: string }

export function AdimSql({ ileri }: { ileri: () => void }) {
  const [b, setB] = React.useState<SqlBilgi>({
    sunucu: "localhost",
    port: 1433,
    veritabani: "mobilyumpro",
    windowsKimlik: false,
    kullanici: "sa",
    sifre: "",
  })
  const [durum, setDurum] = React.useState<Durum>({ tip: "bos" })
  const [kuruluyor, setKuruluyor] = React.useState(false)
  const [hata, setHata] = React.useState<string>()
  const [shakeNonce, setShakeNonce] = React.useState(0)

  function guncelle<K extends keyof SqlBilgi>(k: K, v: SqlBilgi[K]) {
    setB((o) => ({ ...o, [k]: v }))
    // Bilgi değişince eski test sonucu artık geçersiz; yanıltmasın diye siliyoruz.
    setDurum({ tip: "bos" })
  }

  async function testEt() {
    setDurum({ tip: "test-ediliyor" })
    const r = await sqlBaglantiTest(b)
    setDurum(
      r.ok
        ? { tip: "basarili", mesaj: r.surum ?? "Bağlantı başarılı." }
        : { tip: "hata", mesaj: r.error ?? "Bağlantı kurulamadı." },
    )
  }

  async function devam() {
    setKuruluyor(true)
    setHata(undefined)
    const r = await sqlKaydet(b)
    setKuruluyor(false)
    if (!r.ok) {
      setHata(r.error ?? "Kurulum yapılamadı.")
      setShakeNonce((n) => n + 1)
      return
    }
    ileri()
  }

  return (
    <FieldGroup className="gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold">Veritabanı bağlantısı</h2>
        <p className="text-sm text-muted-foreground">
          MobilyumPro verilerini SQL Server üzerinde tutar. Veritabanı yoksa
          bu adımda oluşturulur.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_7rem]">
        <Field>
          <FieldLabel htmlFor="sunucu">Sunucu</FieldLabel>
          <Input
            id="sunucu"
            value={b.sunucu}
            onChange={(e) => guncelle("sunucu", e.target.value)}
            placeholder="localhost veya SUNUCU\SQLEXPRESS"
            className="h-10"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="port">Port</FieldLabel>
          <Input
            id="port"
            inputMode="numeric"
            value={String(b.port)}
            onChange={(e) =>
              guncelle("port", Number(e.target.value.replace(/\D/g, "")) || 0)
            }
            className="h-10"
          />
        </Field>
      </div>

      <Field>
        <FieldLabel htmlFor="veritabani">Veritabanı adı</FieldLabel>
        <Input
          id="veritabani"
          value={b.veritabani}
          onChange={(e) => guncelle("veritabani", e.target.value)}
          className="h-10"
        />
      </Field>

      <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border p-3">
        <span className="flex flex-col">
          <span className="text-sm font-medium">Windows kimlik doğrulaması</span>
          <span className="text-xs text-muted-foreground">
            Kapalıysa SQL Server kullanıcı adı ve şifresi kullanılır.
          </span>
        </span>
        <Switch
          checked={b.windowsKimlik}
          onCheckedChange={(v) => guncelle("windowsKimlik", v === true)}
        />
      </label>

      {!b.windowsKimlik && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="sqlKullanici">Kullanıcı</FieldLabel>
            <Input
              id="sqlKullanici"
              value={b.kullanici}
              onChange={(e) => guncelle("kullanici", e.target.value)}
              autoComplete="off"
              className="h-10"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="sqlSifre">Şifre</FieldLabel>
            <Input
              id="sqlSifre"
              type="password"
              value={b.sifre}
              onChange={(e) => guncelle("sifre", e.target.value)}
              autoComplete="off"
              className="h-10"
            />
          </Field>
        </div>
      )}

      {durum.tip === "basarili" && (
        <p className="flex items-start gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
          <CheckCircle2Icon className="mt-0.5 size-4 shrink-0" />
          <span className="min-w-0 break-words">{durum.mesaj}</span>
        </p>
      )}
      {durum.tip === "hata" && (
        <p className="flex items-start gap-2 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">
          <XCircleIcon className="mt-0.5 size-4 shrink-0" />
          <span className="min-w-0">{durum.mesaj}</span>
        </p>
      )}

      <ErrorShakeField error={hata} shakeNonce={shakeNonce}>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-10"
            onClick={testEt}
            disabled={durum.tip === "test-ediliyor" || kuruluyor}
          >
            <DatabaseIcon className="size-4" />
            {durum.tip === "test-ediliyor" ? "Deneniyor..." : "Bağlantıyı test et"}
          </Button>
          <Button
            type="button"
            className="h-10 flex-1"
            onClick={devam}
            disabled={kuruluyor || durum.tip === "test-ediliyor"}
          >
            {kuruluyor ? "Veritabanı hazırlanıyor..." : "Devam"}
          </Button>
        </div>
      </ErrorShakeField>

      <p className="text-xs text-muted-foreground">
        Devam edildiğinde bağlantı bilgileri <code>.env</code> dosyasına yazılır
        ve veritabanı şeması kurulur. Bu birkaç dakika sürebilir.
      </p>
    </FieldGroup>
  )
}
