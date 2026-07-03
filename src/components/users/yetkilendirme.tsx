"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { SearchSelect } from "@/components/ui/search-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BOS_YETKI,
  MODULLER,
  YETKI_BAYRAKLARI,
  type ModulYetki,
  type YetkiBayrak,
  type YetkiMatrisi,
} from "@/lib/yetki";
import type { KullaniciGorunum } from "@/lib/db/queries";
import { kullaniciYetkiSet } from "@/lib/db/actions";

function yetkiVar(y: ModulYetki | undefined): boolean {
  return !!y && (y.isList || y.isAdd || y.isUpdate || y.isDelete || y.isOrderList);
}

/**
 * Kullanıcı bazlı yetkilendirme: solda kullanıcılar (rol filtreli), sağda
 * seçili kullanıcının modül × bayrak tablosu. Her satır bir menü, her kolon
 * bir yetki bayrağı (Liste / Ekle / Güncelle / Sil / Diğer İşlemler).
 * Checkbox değişince anında kaydedilir (optimistic + rollback).
 *
 * Başlangıç: kullanıcının kendi kaydı → rolünün varsayılanı (rol_yetki) → boş.
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
  const [matris, setMatris] = React.useState<YetkiMatrisi>(() => {
    const m: YetkiMatrisi = {};
    for (const k of kullanicilar) {
      const rolVarsayilan = rolYetkileri[k.rol] ?? {};
      const kendi = kullaniciYetkileri[k.id] ?? {};
      m[k.id] = Object.fromEntries(
        MODULLER.map((mod) => [
          mod.id,
          kendi[mod.id] ?? rolVarsayilan[mod.id] ?? { ...BOS_YETKI },
        ]),
      ) as Record<string, ModulYetki>;
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

  React.useEffect(() => {
    if (!filtreli.some((k) => k.id === seciliId)) {
      setSeciliId(filtreli[0]?.id ?? null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rolFiltre]);

  const izinliSayisi = (id: string) =>
    MODULLER.filter((m) => yetkiVar(matris[id]?.[m.id])).length;

  async function bayrakDegis(
    modul: string,
    bayrak: YetkiBayrak,
    deger: boolean,
  ) {
    if (!secili) return;
    const mevcut = matris[secili.id]?.[modul] ?? { ...BOS_YETKI };
    const yeni: ModulYetki = { ...mevcut, [bayrak]: deger };
    // Optimistic
    setMatris((m) => ({
      ...m,
      [secili.id]: { ...m[secili.id], [modul]: yeni },
    }));
    const res = await kullaniciYetkiSet(secili.id, modul, yeni);
    if (!res.ok) {
      setMatris((m) => ({
        ...m,
        [secili.id]: { ...m[secili.id], [modul]: mevcut },
      }));
      toast.error(res.error ?? "Yetki kaydedilemedi.");
    }
  }

  // Satırdaki tüm bayrakları aç/kapa (hepsi seçili mi → tersine çevir).
  async function satirTopluDegis(modul: string, hepsi: boolean) {
    if (!secili) return;
    const mevcut = matris[secili.id]?.[modul] ?? { ...BOS_YETKI };
    const yeni: ModulYetki = {
      isList: hepsi,
      isAdd: hepsi,
      isUpdate: hepsi,
      isDelete: hepsi,
      isOrderList: hepsi,
    };
    setMatris((m) => ({
      ...m,
      [secili.id]: { ...m[secili.id], [modul]: yeni },
    }));
    const res = await kullaniciYetkiSet(secili.id, modul, yeni);
    if (!res.ok) {
      setMatris((m) => ({
        ...m,
        [secili.id]: { ...m[secili.id], [modul]: mevcut },
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

        {/* Sağ: modül × bayrak tablosu */}
        <div className="min-w-0 flex-1">
          {secili ? (
            <div className="overflow-x-auto rounded-md border bg-card">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="min-w-40">Menü</TableHead>
                    {YETKI_BAYRAKLARI.map((b) => (
                      <TableHead
                        key={b.key}
                        title={b.aciklama}
                        className="text-center whitespace-nowrap"
                      >
                        {b.label}
                      </TableHead>
                    ))}
                    <TableHead className="w-10 text-center">Tümü</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MODULLER.map((m) => {
                    const y = matris[secili.id]?.[m.id] ?? BOS_YETKI;
                    const hepsiSecili =
                      y.isList &&
                      y.isAdd &&
                      y.isUpdate &&
                      y.isDelete &&
                      y.isOrderList;
                    const baziSecili = yetkiVar(y);
                    return (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">{m.label}</TableCell>
                        {YETKI_BAYRAKLARI.map((b) => (
                          <TableCell key={b.key} className="text-center">
                            <Checkbox
                              checked={y[b.key]}
                              onCheckedChange={(v) =>
                                bayrakDegis(m.id, b.key, v === true)
                              }
                              aria-label={`${m.label} — ${b.label}`}
                            />
                          </TableCell>
                        ))}
                        <TableCell className="text-center">
                          <Checkbox
                            checked={hepsiSecili}
                            indeterminate={!hepsiSecili && baziSecili}
                            onCheckedChange={(v) =>
                              satirTopluDegis(m.id, v === true)
                            }
                            aria-label={`${m.label} — tümü`}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
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
