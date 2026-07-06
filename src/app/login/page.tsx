import { GalleryVerticalEndIcon } from "lucide-react"

import { LoginForm } from "@/components/login-form"
import { LoginTanitim } from "@/components/login-tanitim"
import { getKullanicilar, getVeritabanlari } from "@/lib/db/queries"

// Şirket/kullanıcı listeleri her istekte sunucudan okunur (build'de donmasın).
export const dynamic = "force-dynamic"

// DB'de henüz kullanıcı yoksa combobox mock adlarla dolar.
const MOCK_KULLANICILAR = ["muharrem.oz", "ahmet.yilmaz", "ayse.demir"]

export default async function LoginPage() {
  const [veritabanlari, kullaniciListesi] = await Promise.all([
    getVeritabanlari(),
    getKullanicilar().catch(() => []),
  ])
  const kullanicilar =
    kullaniciListesi.length > 0
      ? kullaniciListesi.map((k) => k.kullaniciAdi)
      : MOCK_KULLANICILAR
  return (
    <div className="grid min-h-svh bg-white lg:grid-cols-2">
      {/* Sol: giriş formu */}
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <a href="#" className="flex items-center gap-2 font-medium">
            <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <GalleryVerticalEndIcon className="size-4" />
            </div>
            MobilyumPro
          </a>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <LoginForm
              veritabanlari={veritabanlari}
              kullanicilar={kullanicilar}
            />
          </div>
        </div>
        <p className="text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} MobilyumPro · Mobilya Yönetim Paneli
        </p>
      </div>

      {/* Sağ: tam tasarımlı tanıtım paneli — 4 yandan boşluklu, 6px köşeli kart */}
      <div className="hidden p-4 lg:block">
        <LoginTanitim className="rounded-md" />
      </div>
    </div>
  )
}
