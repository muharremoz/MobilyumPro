import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  return (
    <form className={cn("flex flex-col gap-6", className)} {...props}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Hesabınıza giriş yapın</h1>
          <p className="text-sm text-balance text-muted-foreground">
            Giriş yapmak için e-posta adresinizi girin
          </p>
        </div>
        <Field>
          <FieldLabel htmlFor="email">E-posta</FieldLabel>
          <Input id="email" type="email" placeholder="ornek@mail.com" required />
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
