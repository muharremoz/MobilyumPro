"use client"

import * as React from "react"
import { EyeIcon, EyeOffIcon, KeyRoundIcon } from "lucide-react"

import { sifreOner } from "@/lib/sifre-oner"
import { Button } from "@/components/ui/button"
import { ErrorShakeField } from "@/components/ui/error-shake"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { yoneticiOlustur } from "@/lib/db/kurulum-actions"

type Hatalar = {
  firmaAdi?: string
  adSoyad?: string
  kullaniciAdi?: string
  sifre?: string
  sifreTekrar?: string
}

/** Ad soyaddan kullanıcı adı önerir: "Muharrem Öz" → "muharrem.oz" */
function kullaniciAdiOner(adSoyad: string): string {
  const harita: Record<string, string> = {
    ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u",
  }
  return adSoyad
    .toLowerCase()
    .replace(/[çğıöşü]/g, (h) => harita[h] ?? h)
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .join(".")
}

export function AdimKullanici({ ileri }: { ileri: () => void }) {
  const [firmaAdi, setFirmaAdi] = React.useState("")
  const [adSoyad, setAdSoyad] = React.useState("")
  const [kullaniciAdi, setKullaniciAdi] = React.useState("")
  // Kullanıcı alana kendi dokunduysa öneri artık üzerine yazmaz.
  const [elleDegisti, setElleDegisti] = React.useState(false)
  const [sifre, setSifre] = React.useState("")
  const [sifreTekrar, setSifreTekrar] = React.useState("")
  const [hatalar, setHatalar] = React.useState<Hatalar>({})
  const [shakeNonce, setShakeNonce] = React.useState(0)
  const [gonderiliyor, setGonderiliyor] = React.useState(false)
  const [sifreGorunur, setSifreGorunur] = React.useState(false)
  const [onerildi, setOnerildi] = React.useState(false)
  const [kopyalandi, setKopyalandi] = React.useState(false)
  const revertTimer = React.useRef<ReturnType<typeof setTimeout>>(undefined)

  function sifreOnerVeDoldur() {
    const yeni = sifreOner()
    setSifre(yeni)
    // Tekrar alanını da dolduruyoruz: üretilmiş şifreyi kullanıcıya elle
    // ikinci kez yazdırmak, kopyalarken hata yapmaktan başka işe yaramaz.
    setSifreTekrar(yeni)
    // Görünür yapılmazsa kullanıcı kendi şifresini hiç göremeden kaydeder.
    setSifreGorunur(true)
    setOnerildi(true)
    setKopyalandi(false)
    setHatalar({})
  }

  async function sifreyiKopyala() {
    try {
      await navigator.clipboard.writeText(sifre)
      setKopyalandi(true)
      setTimeout(() => setKopyalandi(false), 2500)
    } catch {
      // Pano izni yoksa şifre zaten ekranda görünüyor; sessiz kalmak yerine
      // kullanıcıyı elle seçmeye yönlendiriyoruz.
      setSifreGorunur(true)
    }
  }

  function hataGoster(yeni: Hatalar) {
    setHatalar(yeni)
    setShakeNonce((n) => n + 1)
    clearTimeout(revertTimer.current)
    revertTimer.current = setTimeout(() => setHatalar({}), 3000)
  }

  function adSoyadDegisti(v: string) {
    setAdSoyad(v)
    if (!elleDegisti) setKullaniciAdi(kullaniciAdiOner(v))
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    const yeni: Hatalar = {}
    if (!firmaAdi.trim()) yeni.firmaAdi = "Firma adı zorunludur."
    if (!adSoyad.trim()) yeni.adSoyad = "Ad soyad zorunludur."
    if (!/^[a-z0-9._-]{3,}$/.test(kullaniciAdi.trim().toLowerCase()))
      yeni.kullaniciAdi = "En az 3 karakter; harf, rakam, . _ -"
    if (sifre.length < 8) yeni.sifre = "Şifre en az 8 karakter olmalıdır."
    else if (sifre !== sifreTekrar) yeni.sifreTekrar = "Şifreler eşleşmiyor."
    if (Object.keys(yeni).length > 0) {
      hataGoster(yeni)
      return
    }

    setGonderiliyor(true)
    const res = await yoneticiOlustur({ firmaAdi, adSoyad, kullaniciAdi, sifre })
    setGonderiliyor(false)
    if (!res.ok) {
      hataGoster({ sifre: res.error ?? "Yönetici hesabı oluşturulamadı." })
      return
    }
    ileri()
  }

  return (
    <form className="flex flex-col gap-6" noValidate onSubmit={onSubmit}>
      <FieldGroup className="gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold">Firma ve yönetici hesabı</h2>
          <p className="text-sm text-muted-foreground">
            Panele girecek ilk hesap. Tam yetkili olur ve sonradan başka
            kullanıcıları bu hesapla açarsınız.
          </p>
        </div>

        <Field>
          <FieldLabel htmlFor="firmaAdi">Firma Adı</FieldLabel>
          <ErrorShakeField error={hatalar.firmaAdi} shakeNonce={shakeNonce}>
            <Input
              id="firmaAdi"
              value={firmaAdi}
              onChange={(e) => setFirmaAdi(e.target.value)}
              placeholder="Örn. Mobilyum Mobilya San. Tic. Ltd. Şti."
              className="h-10"
            />
          </ErrorShakeField>
        </Field>

        <Field>
          <FieldLabel htmlFor="adSoyad">Ad Soyad</FieldLabel>
          <ErrorShakeField error={hatalar.adSoyad} shakeNonce={shakeNonce}>
            <Input
              id="adSoyad"
              value={adSoyad}
              onChange={(e) => adSoyadDegisti(e.target.value)}
              autoComplete="name"
              className="h-10"
            />
          </ErrorShakeField>
        </Field>

        <Field>
          <FieldLabel htmlFor="kullaniciAdi">Kullanıcı Adı</FieldLabel>
          <ErrorShakeField error={hatalar.kullaniciAdi} shakeNonce={shakeNonce}>
            <Input
              id="kullaniciAdi"
              value={kullaniciAdi}
              onChange={(e) => {
                setElleDegisti(true)
                setKullaniciAdi(e.target.value)
              }}
              autoComplete="username"
              className="h-10"
            />
          </ErrorShakeField>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <div className="flex items-center justify-between gap-2">
              <FieldLabel htmlFor="sifre">Şifre</FieldLabel>
              <button
                type="button"
                onClick={sifreOnerVeDoldur}
                className="text-xs font-medium text-primary underline-offset-4 hover:underline"
              >
                Şifre öner
              </button>
            </div>
            <ErrorShakeField error={hatalar.sifre} shakeNonce={shakeNonce}>
              <div className="relative">
                <Input
                  id="sifre"
                  type={sifreGorunur ? "text" : "password"}
                  value={sifre}
                  onChange={(e) => setSifre(e.target.value)}
                  autoComplete="new-password"
                  className="h-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setSifreGorunur((g) => !g)}
                  aria-label={sifreGorunur ? "Şifreyi gizle" : "Şifreyi göster"}
                  className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
                >
                  {sifreGorunur ? (
                    <EyeOffIcon className="size-4" />
                  ) : (
                    <EyeIcon className="size-4" />
                  )}
                </button>
              </div>
            </ErrorShakeField>
          </Field>
          <Field>
            <FieldLabel htmlFor="sifreTekrar">Şifre (tekrar)</FieldLabel>
            <ErrorShakeField error={hatalar.sifreTekrar} shakeNonce={shakeNonce}>
              <Input
                id="sifreTekrar"
                type={sifreGorunur ? "text" : "password"}
                value={sifreTekrar}
                onChange={(e) => setSifreTekrar(e.target.value)}
                autoComplete="new-password"
                className="h-10"
              />
            </ErrorShakeField>
          </Field>
        </div>

        {onerildi && (
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
            <KeyRoundIcon className="mt-0.5 size-4 shrink-0" />
            <div className="flex min-w-0 flex-col gap-1">
              <span>
                Şifre üretildi ve iki alana da yazıldı.{" "}
                <strong>Bir yere kaydedin</strong> — bu ekran bir daha açılmaz.
              </span>
              <button
                type="button"
                onClick={sifreyiKopyala}
                className="self-start text-xs font-medium underline underline-offset-4"
              >
                {kopyalandi ? "Kopyalandı ✓" : "Şifreyi kopyala"}
              </button>
            </div>
          </div>
        )}

        <Field>
          <Button type="submit" className="h-10" disabled={gonderiliyor}>
            {gonderiliyor ? "Oluşturuluyor..." : "Devam"}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  )
}
