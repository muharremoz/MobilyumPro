import { GalleryVerticalEndIcon } from "lucide-react"
import { redirect } from "next/navigation"

import { KurulumForm } from "@/components/kurulum-form"
import { kurulumGerekli } from "@/lib/db/kurulum"

// Kullanıcı sayısı her istekte okunur; build'de "kurulum gerekli" diye donmasın.
export const dynamic = "force-dynamic"

export default async function KurulumPage() {
  // Sayfanın kapısı: bir kullanıcı bile varsa burası kalıcı olarak kapanır.
  // (Action'ın kendi denetimi ayrıca var — bu yalnız ekranı gizler.)
  if (!(await kurulumGerekli())) redirect("/login")

  return (
    <div className="flex min-h-svh flex-col gap-4 bg-white p-6 md:p-10">
      <div className="flex items-center gap-2 font-medium">
        <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <GalleryVerticalEndIcon className="size-4" />
        </div>
        MobilyumPro
      </div>
      <div className="flex flex-1 items-center justify-center">
        <div className="w-full max-w-md">
          <KurulumForm />
        </div>
      </div>
    </div>
  )
}
