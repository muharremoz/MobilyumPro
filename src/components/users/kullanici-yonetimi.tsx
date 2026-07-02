"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { KullanicilarTable } from "@/components/users/kullanicilar-table";
import { YetkiMatrisiPanel } from "@/components/users/yetki-matrisi";
import type { KullaniciGorunum } from "@/lib/db/queries";
import type { YetkiMatrisi } from "@/lib/yetki";

/** Kullanıcılar & Roller sayfası: sekmeli — Kullanıcılar | Yetkiler. */
export function KullaniciYonetimi({
  kullanicilar,
  roller,
  departmanlar,
  yetkiler,
}: {
  kullanicilar: KullaniciGorunum[];
  roller: string[];
  departmanlar: string[];
  yetkiler: YetkiMatrisi;
}) {
  const [sekme, setSekme] = React.useState<"kullanicilar" | "yetkiler">(
    "kullanicilar",
  );

  const sekmeCls = (aktif: boolean) =>
    cn(
      "cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
      aktif
        ? "bg-background text-foreground shadow-xs"
        : "text-muted-foreground hover:text-foreground",
    );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex w-fit items-center gap-0.5 rounded-lg bg-muted p-0.5">
        <button
          type="button"
          className={sekmeCls(sekme === "kullanicilar")}
          onClick={() => setSekme("kullanicilar")}
        >
          Kullanıcılar
        </button>
        <button
          type="button"
          className={sekmeCls(sekme === "yetkiler")}
          onClick={() => setSekme("yetkiler")}
        >
          Yetkiler
        </button>
      </div>

      {sekme === "kullanicilar" ? (
        <KullanicilarTable
          kullanicilar={kullanicilar}
          roller={roller}
          departmanlar={departmanlar}
        />
      ) : (
        <YetkiMatrisiPanel roller={roller} matris={yetkiler} />
      )}
    </div>
  );
}
