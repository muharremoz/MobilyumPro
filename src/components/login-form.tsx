"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { SearchSelect } from "@/components/ui/search-select"

export function LoginForm({
  veritabanlari,
  className,
  ...props
}: React.ComponentProps<"form"> & { veritabanlari: string[] }) {
  const [veritabani, setVeritabani] = React.useState<string | null>(
    veritabanlari[0] ?? null,
  )
  return (
    <form className={cn("flex flex-col gap-6", className)} {...props}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Hesabınıza giriş yapın</h1>
          <p className="text-sm text-balance text-muted-foreground">
            Veritabanını seçip kullanıcı bilgilerinizi girin
          </p>
        </div>
        <Field>
          <FieldLabel htmlFor="veritabani">Veritabanı</FieldLabel>
          <SearchSelect
            items={veritabanlari}
            value={veritabani}
            onValueChange={setVeritabani}
            placeholder="Veritabanı seçin"
            searchPlaceholder="Veritabanı ara..."
            emptyText="Veritabanı bulunamadı"
            className="h-10"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="kullanici">Kullanıcı</FieldLabel>
          <Input
            id="kullanici"
            type="text"
            placeholder="kullanıcı adı"
            className="h-10"
            required
          />
        </Field>
        <Field>
          <div className="flex items-center">
            <FieldLabel htmlFor="password">Şifre</FieldLabel>
            <a
              href="#"
              className="ml-auto text-sm underline-offset-4 hover:underline"
            >
              Şifrenizi mi unuttunuz?
            </a>
          </div>
          <Input id="password" type="password" className="h-10" required />
        </Field>
        <Field>
          <Button type="submit" className="h-10">
            Giriş Yap
          </Button>
        </Field>
      </FieldGroup>
    </form>
  )
}
