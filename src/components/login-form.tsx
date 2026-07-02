"use client"

import * as React from "react"

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
  className,
  ...props
}: React.ComponentProps<"form"> & { veritabanlari: string[] }) {
  const [veritabani, setVeritabani] = React.useState<string | null>(
    veritabanlari[0] ?? null,
  )
  const [hatalar, setHatalar] = React.useState<Hatalar>({})
  const [shakeNonce, setShakeNonce] = React.useState(0)
  const revertTimer = React.useRef<ReturnType<typeof setTimeout>>(undefined)

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const kullanici = (
      form.elements.namedItem("kullanici") as HTMLInputElement
    ).value.trim()
    const sifre = (form.elements.namedItem("sifre") as HTMLInputElement).value

    const yeni: Hatalar = {}
    if (!veritabani) yeni.veritabani = "Veritabanı seçin."
    if (!kullanici) yeni.kullanici = "Kullanıcı adı zorunludur."
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
          <h1 className="text-2xl font-bold">Hesabınıza giriş yapın</h1>
          <p className="text-sm text-balance text-muted-foreground">
            Veritabanını seçip kullanıcı bilgilerinizi girin
          </p>
        </div>
        <Field>
          <FieldLabel htmlFor="veritabani">Veritabanı</FieldLabel>
          <ErrorShakeField error={hatalar.veritabani} shakeNonce={shakeNonce}>
            <SearchSelect
              items={veritabanlari}
              value={veritabani}
              onValueChange={setVeritabani}
              placeholder="Veritabanı seçin"
              searchPlaceholder="Veritabanı ara..."
              emptyText="Veritabanı bulunamadı"
              className="h-10"
            />
          </ErrorShakeField>
        </Field>
        <Field>
          <FieldLabel htmlFor="kullanici">Kullanıcı</FieldLabel>
          <ErrorShakeField error={hatalar.kullanici} shakeNonce={shakeNonce}>
            <Input
              id="kullanici"
              name="kullanici"
              type="text"
              placeholder="kullanıcı adı"
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
