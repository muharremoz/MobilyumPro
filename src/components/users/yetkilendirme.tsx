"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SearchSelect } from "@/components/ui/search-select";
import {
  ERISIMLER,
  MODULLER,
  type Erisim,
  type YetkiMatrisi,
} from "@/lib/yetki";
import type { KullaniciGorunum } from "@/lib/db/queries";
import { kullaniciYetkiSet } from "@/lib/db/actions";

const ERISIM_ETIKET: Record<Erisim, string> = {
  Tam: "Tam İzinli",
  Görüntüleme: "Görüntüleyebilir",
  Yok: "İzin Yok",
};

/**
 * Kullanıcı bazlı yetkilendirme: solda kullanıcı kartları (rol filtreli),
 * sağda seçili kullanıcının modül kartları (Tam İzinli / Görüntüleyebilir /
 * İzin Yok). Seçim anında kaydedilir.
 *
 * Başlangıç değerleri: kullanıcının kendi kaydı varsa o, yoksa rolünün
 * varsayılanı (rol_yetki), o da yoksa "Yok".
 */
export function Yetkilendirme({
  kullanicilar,
  roller,
  rolYetkileri,
  kullaniciYetkileri,
}: {
  kullanicilar: KullaniciGorunum[];
  roller: string[];
  rolYetkileri: YetkiMatrisi;
  kullaniciYetkileri: YetkiMatrisi;
}) {
  // kullaniciId → (modul → erisim): rol varsayılanı + kullanıcı kayıtları.
  const [matris, setMatris] = React.useState<YetkiMatrisi>(() => {
    const m: YetkiMatrisi = {};
    for (const k of kullanicilar) {
      const rolVarsayilan = rolYetkileri[k.rol] ?? {};
      const kendi = kullaniciYetkileri[k.id] ?? {};
      m[k.id] = Object.fromEntries(
        MODULLER.map((mod) => [
          mod.id,
          kendi[mod.id] ?? rolVarsayilan[mod.id] ?? "Yok",
        ]),
      ) as Record<string, Erisim>;
    }
    return m;
  });
  const [rolFiltre, setRolFiltre] = React.useState("Tümü");
  const [seciliId, setSeciliId] = React.useState<string | null>(
    kullanicilar[0]?.id ?? null,
  );

  const filtreli = kullanicilar.filter(
    (k) => rolFiltre === "Tümü" || k.rol === rolFiltre,
  );
  const secili = kullanicilar.find((k) => k.id === seciliId) ?? null;

  // Filtre seçiliyi dışarıda bırakırsa ilk görünene geç.
  React.useEffect(() => {
    if (!filtreli.some((k) => k.id === seciliId)) {
      setSeciliId(filtreli[0]?.id ?? null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rolFiltre]);

  const izinliSayisi = (id: string) =>
    MODULLER.filter((m) => (matris[id]?.[m.id] ?? "Yok") !== "Yok").length;

  async function erisimSec(modul: string, erisim: Erisim) {
    if (!secili) return;
    const onceki = matris[secili.id]?.[modul] ?? "Yok";
    if (onceki === erisim) return;
    // Optimistic: önce uygula, hata olursa geri al.
    setMatris((m) => ({
      ...m,
      [secili.id]: { ...m[secili.id], [modul]: erisim },
    }));
    const res = await kullaniciYetkiSet(secili.id, modul, erisim);
    if (!res.ok) {
      setMatris((m) => ({
        ...m,
        [secili.id]: { ...m[secili.id], [modul]: onceki },
      }));
      toast.error(res.error ?? "Yetki kaydedilemedi.");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          nativeButton={false}
          render={<Link href="/kullanicilar" aria-label="Kullanıcılara dön" />}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-base font-semibold">Yetkilendirmeler</h1>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row">
        {/* Sol: kullanıcılar */}
        <div className="flex w-full shrink-0 flex-col gap-2 lg:w-72">
          <SearchSelect
            items={["Tümü", ...roller]}
            value={rolFiltre}
            onValueChange={(v) => setRolFiltre(v ?? "Tümü")}
            placeholder="Rol filtresi"
            searchPlaceholder="Rol ara..."
          />
          <div className="flex flex-col gap-2">
            {filtreli.map((k) => {
              const aktif = k.id === seciliId;
              return (
                <button
                  key={k.id}
                  type="button"
                  onClick={() => setSeciliId(k.id)}
                  className={cn(
                    "cursor-pointer rounded-md border bg-card p-3 text-left transition-colors",
                    aktif
                      ? "border-foreground/30 ring-1 ring-foreground/20"
                      : "hover:bg-muted/40",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium">
                      {k.adSoyad}
                    </span>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums",
                        izinliSayisi(k.id) === 0
                          ? "bg-rose-100 text-rose-700"
                          : "bg-emerald-100 text-emerald-700",
                      )}
                    >
                      {izinliSayisi(k.id)}/{MODULLER.length}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {k.rol}
                    {k.departman ? ` · ${k.departman}` : ""}
                  </p>
                </button>
              );
            })}
            {filtreli.length === 0 && (
              <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
                Bu rolde kullanıcı yok.
              </p>
            )}
          </div>
        </div>

        {/* Sağ: modül kartları */}
        <div className="min-w-0 flex-1">
          {secili ? (
            <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
              {MODULLER.map((m) => {
                const deger = matris[secili.id]?.[m.id] ?? "Yok";
                return (
                  <div
                    key={m.id}
                    className="rounded-md border bg-card p-3"
                  >
                    <p className="text-sm font-medium">{m.label}</p>
                    <div className="mt-2.5 flex flex-col gap-1">
                      {ERISIMLER.slice()
                        .reverse() // Tam → Görüntüleme → Yok sırası
                        .map((e) => {
                          const aktif = deger === e;
                          return (
                            <button
                              key={e}
                              type="button"
                              onClick={() => erisimSec(m.id, e)}
                              className={cn(
                                "flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-1.5 text-left text-xs font-medium transition-colors",
                                aktif
                                  ? e === "Tam"
                                    ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                                    : e === "Görüntüleme"
                                      ? "border-blue-300 bg-blue-50 text-blue-700"
                                      : "border-rose-300 bg-rose-50 text-rose-700"
                                  : "border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                              )}
                            >
                              <span
                                className={cn(
                                  "size-2 rounded-full",
                                  e === "Tam"
                                    ? "bg-emerald-500"
                                    : e === "Görüntüleme"
                                      ? "bg-blue-500"
                                      : "bg-rose-500",
                                  !aktif && "opacity-30",
                                )}
                              />
                              {ERISIM_ETIKET[e]}
                            </button>
                          );
                        })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="rounded-md border border-dashed p-10 text-center text-sm text-muted-foreground">
              Soldan bir kullanıcı seçin.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
