"use client";

import * as React from "react";
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
import { rolYetkiKaydet } from "@/lib/db/actions";

/** Bir rolün modül bazlı erişim matrisi: Yok / Görüntüleme / Tam. */
export function YetkiMatrisiPanel({
  roller,
  matris,
}: {
  roller: string[];
  matris: YetkiMatrisi;
}) {
  const [kayitli, setKayitli] = React.useState<YetkiMatrisi>(matris);
  const [rol, setRol] = React.useState<string | null>(roller[0] ?? null);
  const [taslak, setTaslak] = React.useState<Record<string, Erisim>>({});
  const [kaydediliyor, setKaydediliyor] = React.useState(false);

  // Rol değişince taslağı kayıtlı değerlerden kur (kaydı olmayan modül: Yok).
  React.useEffect(() => {
    const mevcut = (rol && kayitli[rol]) || {};
    setTaslak(
      Object.fromEntries(
        MODULLER.map((m) => [m.id, mevcut[m.id] ?? "Yok"]),
      ) as Record<string, Erisim>,
    );
  }, [rol, kayitli]);

  const kirli =
    rol !== null &&
    MODULLER.some((m) => (kayitli[rol]?.[m.id] ?? "Yok") !== taslak[m.id]);

  async function kaydet() {
    if (!rol) return;
    setKaydediliyor(true);
    const res = await rolYetkiKaydet(rol, taslak);
    setKaydediliyor(false);
    if (res.ok) {
      setKayitli((k) => ({ ...k, [rol]: { ...taslak } }));
      toast.success(`"${rol}" yetkileri kaydedildi`);
    } else {
      toast.error(res.error ?? "Yetkiler kaydedilemedi.");
    }
  }

  function hepsi(erisim: Erisim) {
    setTaslak(
      Object.fromEntries(MODULLER.map((m) => [m.id, erisim])) as Record<
        string,
        Erisim
      >,
    );
  }

  return (
    <div className="overflow-hidden rounded-md border bg-card">
      {/* Başlık */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-1.5">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold">Yetkiler</h2>
          <div className="w-44">
            <SearchSelect
              items={roller}
              value={rol}
              onValueChange={setRol}
              placeholder="Rol seçin"
              searchPlaceholder="Rol ara..."
              className="h-7"
            />
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="sm" onClick={() => hepsi("Görüntüleme")}>
            Tümü Görüntüleme
          </Button>
          <Button variant="ghost" size="sm" onClick={() => hepsi("Tam")}>
            Tümü Tam
          </Button>
          <Button size="sm" onClick={kaydet} disabled={!kirli || kaydediliyor}>
            {kaydediliyor ? "Kaydediliyor..." : "Kaydet"}
          </Button>
        </div>
      </div>

      {/* Matris */}
      <div className="divide-y">
        {MODULLER.map((m) => {
          const secili = taslak[m.id] ?? "Yok";
          const degisti = rol && (kayitli[rol]?.[m.id] ?? "Yok") !== secili;
          return (
            <div
              key={m.id}
              className="flex items-center justify-between gap-3 px-3 py-2"
            >
              <span className="flex items-center gap-2 text-sm">
                {m.label}
                {degisti && (
                  <span className="size-1.5 rounded-full bg-amber-500" />
                )}
              </span>
              <div className="flex rounded-lg border border-input p-0.5">
                {ERISIMLER.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setTaslak((t) => ({ ...t, [m.id]: e }))}
                    className={cn(
                      "cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                      secili === e
                        ? e === "Yok"
                          ? "bg-rose-100 text-rose-700"
                          : e === "Görüntüleme"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-emerald-100 text-emerald-700"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
