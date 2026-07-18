import { GalleryVerticalEndIcon } from "lucide-react"

import { DestekTalebi } from "@/components/destek-talebi"
import { LoginForm } from "@/components/login-form"
import { LoginTanitim } from "@/components/login-tanitim"
import { getKullanicilar, getVeritabanlari } from "@/lib/db/queries"

// Şirket/kullanıcı listeleri her istekte sunucudan okunur (build'de donmasın).
export const dynamic = "force-dynamic"

export default async function LoginPage() {
  // Kullanıcı listesi giriş öncesi gönderilir — fabrika içi panelde vardiya
  // personeli adını yazmak yerine seçsin diye. Bunun bedeli: kullanıcı adları
  // giriş yapılmadan görünür. Panel internete açılırsa burası elle yazılan
  // alana dönmeli (kullanıcı numaralandırma).
  const [veritabanlari, kullanicilar] = await Promise.all([
    getVeritabanlari(),
    getKullanicilar().catch(() => []),
  ])
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
              kullanicilar={kullanicilar
                .filter((k) => k.durum === "Aktif")
                .map((k) => ({ ad: k.adSoyad, kullaniciAdi: k.kullaniciAdi }))}
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

      {/* Sağ altta destek talebi butonu + modalı */}
      <DestekTalebi />
    </div>
  )
}
