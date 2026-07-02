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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

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
          <Select value={veritabani} onValueChange={setVeritabani}>
            <SelectTrigger id="veritabani" className="w-full">
              <SelectValue placeholder="Veritabanı seçin" />
            </SelectTrigger>
            <SelectContent>
              {veritabanlari.map((v) => (
                <SelectItem key={v} value={v}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor="kullanici">Kullanıcı</FieldLabel>
          <Input id="kullanici" type="text" placeholder="kullanıcı adı" required />
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
          <Input id="password" type="password" required />
        </Field>
        <Field>
          <Button type="submit">Giriş Yap</Button>
        </Field>
      </FieldGroup>
    </form>
  )
}
