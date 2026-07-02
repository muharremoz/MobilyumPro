import { GalleryVerticalEndIcon } from "lucide-react"

import { LoginForm } from "@/components/login-form"
import { LoginUpdates } from "@/components/login-updates"
import { HexagonPattern } from "@/components/ui/hexagon-pattern"
import { getVeritabanlari } from "@/lib/db/queries"

// Veritabanı listesi her istekte sunucudan okunur (build'de donmasın).
export const dynamic = "force-dynamic"

export default async function LoginPage() {
  const veritabanlari = await getVeritabanlari()
  return (
    <div className="grid min-h-svh bg-white lg:grid-cols-2">
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
            <LoginForm veritabanlari={veritabanlari} />
          </div>
        </div>
        <p className="text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} MobilyumPro · Mobilya Yönetim Paneli
        </p>
      </div>
      <div className="relative hidden overflow-hidden bg-white lg:block">
        <HexagonPattern
          radius={32}
          gap={6}
          className="fill-gray-400/15 stroke-gray-400/35 [mask-image:radial-gradient(ellipse_at_center,white,transparent_95%)]"
        />
        <div className="absolute inset-0 flex items-center justify-center p-10">
          <LoginUpdates />
        </div>
      </div>
    </div>
  )
}
