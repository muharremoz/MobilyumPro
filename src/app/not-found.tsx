import Link from "next/link";

import { Button } from "@/components/ui/button";
import { HexagonPattern } from "@/components/ui/hexagon-pattern";

export default function NotFound() {
  return (
    <div className="relative flex h-svh flex-col items-center justify-center gap-6 overflow-hidden bg-white">
      <HexagonPattern
        radius={32}
        gap={6}
        className="fill-gray-400/10 stroke-gray-400/25 [mask-image:radial-gradient(ellipse_at_center,white,transparent_80%)]"
      />

      <div className="relative flex flex-col items-center gap-6 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.jpg"
          alt="MobilyumPro"
          className="size-10 rounded-full border"
        />
        <div className="flex items-center gap-4">
          <span className="text-5xl font-semibold tracking-tight text-[#171717]">
            404
          </span>
          <span className="h-10 w-px bg-[#ebebeb]" />
          <p className="text-sm text-muted-foreground">
            Aradığınız sayfa bulunamadı
            <br />
            veya taşınmış olabilir.
          </p>
        </div>
        <Button nativeButton={false} render={<Link href="/" />}>
          Panele Dön
        </Button>
      </div>

      <p className="absolute bottom-6 text-xs text-muted-foreground">
        © {new Date().getFullYear()} MobilyumPro · Mobilya Yönetim Paneli
      </p>
    </div>
  );
}
