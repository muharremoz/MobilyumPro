"use client"

import * as React from "react"
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
import { SearchSelect } from "@/components/ui/search-select"

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
  kullanicilar: string[]
}) {
  const [veritabani, setVeritabani] = React.useState<string | null>(
    veritabanlari[0] ?? null,
  )
  const [kullanici, setKullanici] = React.useState<string | null>(null)
  const [hatalar, setHatalar] = React.useState<Hatalar>({})
  const [shakeNonce, setShakeNonce] = React.useState(0)
  const revertTimer = React.useRef<ReturnType<typeof setTimeout>>(undefined)

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const sifre = (form.elements.namedItem("sifre") as HTMLInputElement).value

    const yeni: Hatalar = {}
    if (!veritabani) yeni.veritabani = "Şirket seçin."
    if (!kullanici) yeni.kullanici = "Kullanıcı seçin."
    if (!sifre) yeni.sifre = "Şifre zorunludur."

    setHatalar(yeni)
    if (Object.keys(yeni).length > 0) {
      setShakeNonce((n) => n + 1)
      // --revert-hold sonrasında hata durumu nötrüne döner.
      clearTimeout(revertTimer.current)
      revertTimer.current = setTimeout(() => setHatalar({}), 3000)
      return
    }

    // TODO: gerçek kimlik doğrulama (seçilen veritabanına bağlanma)
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
              items={kullanicilar}
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
            <Input id="password" name="sifre" type="password" className="h-10" />
          </ErrorShakeField>
        </Field>
        <Field>
          <Button type="submit" className="h-10">
            Giriş Yap
          </Button>
          <a
            href="#"
            className="text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            Şifrenizi mi unuttunuz?
          </a>
        </Field>
      </FieldGroup>
    </form>
  )
}
