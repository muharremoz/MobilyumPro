"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { motion } from "motion/react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ErrorShakeField } from "@/components/ui/error-shake"
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { SearchSelect } from "@/components/ui/search-select"
import { girisYap } from "@/lib/db/oturum-actions"

type Hatalar = {
  veritabani?: string
  kullanici?: string
  sifre?: string
}

export function LoginForm({
  veritabanlari,
  kullanicilar,
  className,
  ...props
}: React.ComponentProps<"form"> & {
  veritabanlari: string[]
  kullanicilar: { ad: string; kullaniciAdi: string }[]
}) {
  const router = useRouter()
  const [veritabani, setVeritabani] = React.useState<string | null>(
    veritabanlari[0] ?? null,
  )
  // Listede ad soyad görünür; giriş ise kullanıcı adıyla yapılır. Seçilen
  // etiketi kullanıcı adına çevirmek için etiket→ad eşlemesi tutulur.
  // Aynı ada sahip iki kişi olabilir; o durumda etikete kullanıcı adı eklenir
  // ki iki satır birbirinden ayırt edilebilsin.
  const secenekler = React.useMemo(() => {
    const sayac = new Map<string, number>()
    for (const k of kullanicilar)
      sayac.set(k.ad, (sayac.get(k.ad) ?? 0) + 1)
    return kullanicilar.map((k) => ({
      etiket: (sayac.get(k.ad) ?? 0) > 1 ? `${k.ad} (${k.kullaniciAdi})` : k.ad,
      kullaniciAdi: k.kullaniciAdi,
    }))
  }, [kullanicilar])

  const [kullanici, setKullanici] = React.useState<string | null>(null)
  const [hatalar, setHatalar] = React.useState<Hatalar>({})
  const [shakeNonce, setShakeNonce] = React.useState(0)
  const [gonderiliyor, setGonderiliyor] = React.useState(false)
  const [hatirla, setHatirla] = React.useState(false)
  const revertTimer = React.useRef<ReturnType<typeof setTimeout>>(undefined)

  function hataGoster(yeni: Hatalar) {
    setHatalar(yeni)
    setShakeNonce((n) => n + 1)
    // --revert-hold sonrasında hata durumu nötrüne döner.
    clearTimeout(revertTimer.current)
    revertTimer.current = setTimeout(() => setHatalar({}), 3000)
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const sifre = (form.elements.namedItem("sifre") as HTMLInputElement).value

    const yeni: Hatalar = {}
    if (!veritabani) yeni.veritabani = "Şirket seçin."
    if (!kullanici) yeni.kullanici = "Kullanıcı seçin."
    if (!sifre) yeni.sifre = "Şifre zorunludur."
    if (Object.keys(yeni).length > 0) {
      hataGoster(yeni)
      return
    }

    setGonderiliyor(true)
    const secili = secenekler.find((x) => x.etiket === kullanici)
    if (!secili) {
      hataGoster({ kullanici: "Kullanıcı seçin." })
      setGonderiliyor(false)
      return
    }
    const res = await girisYap(secili.kullaniciAdi, sifre, hatirla)
    setGonderiliyor(false)
    if (!res.ok) {
      // Hangi alanın yanlış olduğu söylenmez; ikisi de işaretlenir.
      hataGoster({ sifre: res.error ?? "Giriş yapılamadı." })
      return
    }
    // Oturum çerezi yazıldı; sunucu bileşenleri tazelensin diye refresh.
    router.replace("/")
    router.refresh()
  }

  return (
    <form
      className={cn("flex flex-col gap-6", className)}
      noValidate
      onSubmit={onSubmit}
      {...props}
    >
      <FieldGroup className="gap-4">
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            Tekrar hoş geldiniz
            <motion.span
              aria-hidden="true"
              className="inline-block origin-[70%_70%]"
              animate={{ rotate: [0, 16, -6, 14, -4, 10, 0] }}
              transition={{
                duration: 1.4,
                delay: 0.4,
                ease: "easeInOut",
                repeat: Infinity,
                repeatDelay: 5,
              }}
            >
              👋
            </motion.span>
          </h1>
          <p className="text-sm whitespace-nowrap text-muted-foreground">
            Şirket seçin ve bilgilerinizle giriş yapın
          </p>
        </div>
        <Field>
          <FieldLabel htmlFor="veritabani">Şirket</FieldLabel>
          <ErrorShakeField error={hatalar.veritabani} shakeNonce={shakeNonce}>
            <SearchSelect
              items={veritabanlari}
              value={veritabani}
              onValueChange={setVeritabani}
              placeholder="Şirket seçin"
              searchPlaceholder="Şirket ara..."
              emptyText="Şirket bulunamadı"
              className="h-10"
            />
          </ErrorShakeField>
        </Field>
        <Field>
          <FieldLabel htmlFor="kullanici">Kullanıcı</FieldLabel>
          <ErrorShakeField error={hatalar.kullanici} shakeNonce={shakeNonce}>
            <SearchSelect
              items={secenekler.map((x) => x.etiket)}
              value={kullanici}
              onValueChange={setKullanici}
              placeholder="Kullanıcı seçin"
              emptyText="Kullanıcı bulunamadı"
              className="h-10"
            />
          </ErrorShakeField>
        </Field>
        <Field>
          <FieldLabel htmlFor="password">Şifre</FieldLabel>
          <ErrorShakeField error={hatalar.sifre} shakeNonce={shakeNonce}>
            <Input
              id="password"
              name="sifre"
              type="password"
              autoComplete="current-password"
              className="h-10"
            />
          </ErrorShakeField>
        </Field>
        <div className="flex items-center justify-between gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox
              checked={hatirla}
              onCheckedChange={(v) => setHatirla(v === true)}
            />
            <span className="text-muted-foreground">Beni hatırla</span>
          </label>
          <a
            href="#"
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            Şifrenizi mi unuttunuz?
          </a>
        </div>
        <Field>
          <Button type="submit" className="h-10" disabled={gonderiliyor}>
            {gonderiliyor ? "Giriş yapılıyor..." : "Giriş Yap"}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  )
}
