"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
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
  type YetkiMatrisi,
  type YetkiSeti,
} from "@/lib/yetki";
import type { KullaniciGorunum } from "@/lib/db/queries";
import {
  kullaniciYetkiSet,
  yetkiSetiKaydet,
  yetkiSetiSil,
  yetkiSetiUygula,
} from "@/lib/db/actions";

function yetkiVar(y: ModulYetki | undefined): boolean {
  return !!y && (y.isList || y.isAdd || y.isUpdate || y.isDelete);
}

/** Modül × bayrak tablosu (satır=menü, kolon=bayrak). Değişince onDegis. */
function YetkiTablosu({
  deger,
  onDegis,
}: {
  deger: Record<string, ModulYetki>;
  onDegis: (modul: string, yeni: ModulYetki) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead className="w-full min-w-40">Menü</TableHead>
            {YETKI_BAYRAKLARI.map((b) => (
              <TableHead
                key={b.key}
                title={b.aciklama}
                className="w-20 text-center whitespace-nowrap"
              >
                {b.label}
              </TableHead>
            ))}
            <TableHead className="w-20 text-center">Tümü</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {MODULLER.map((m) => {
            const y = deger[m.id] ?? BOS_YETKI;
            const hepsi = y.isList && y.isAdd && y.isUpdate && y.isDelete;
            const bazi = yetkiVar(y);
            return (
              <TableRow key={m.id}>
                <TableCell className="font-medium">{m.label}</TableCell>
                {YETKI_BAYRAKLARI.map((b) => (
                  <TableCell
                    key={b.key}
                    className="[&:has([role=checkbox])]:pr-2"
                  >
                    <div className="flex justify-center">
                      <Checkbox
                        checked={y[b.key]}
                        onCheckedChange={(v) =>
                          onDegis(m.id, { ...y, [b.key]: v === true })
                        }
                        aria-label={`${m.label} — ${b.label}`}
                      />
                    </div>
                  </TableCell>
                ))}
                <TableCell className="[&:has([role=checkbox])]:pr-2">
                  <div className="flex justify-center">
                    <Checkbox
                      checked={hepsi}
                      indeterminate={!hepsi && bazi}
                      onCheckedChange={(v) =>
                        onDegis(m.id, {
                          isList: v === true,
                          isAdd: v === true,
                          isUpdate: v === true,
                          isDelete: v === true,
                        })
                      }
                      aria-label={`${m.label} — tümü`}
                    />
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── Kullanıcı yetkileri sekmesi ──────────────────────────────────────────
function KullaniciSekmesi({
  kullanicilar,
  roller,
  rolYetkileri,
  kullaniciYetkileri,
  setler,
}: {
  kullanicilar: KullaniciGorunum[];
  roller: string[];
  rolYetkileri: YetkiMatrisi;
  kullaniciYetkileri: YetkiMatrisi;
  setler: YetkiSeti[];
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

  async function modulDegis(modul: string, yeni: ModulYetki) {
    if (!secili) return;
    const mevcut = matris[secili.id]?.[modul] ?? { ...BOS_YETKI };
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

  async function setUygula(ad: string) {
    if (!secili) return;
    const set = setler.find((s) => s.ad === ad);
    if (!set) return;
    const res = await yetkiSetiUygula(secili.id, set.id);
    if (!res.ok) {
      toast.error(res.error ?? "Set uygulanamadı.");
      return;
    }
    // Set bayraklarını yerelde de uygula (kopya).
    setMatris((m) => {
      const kul = { ...m[secili.id] };
      for (const [modul, y] of Object.entries(set.yetkiler)) {
        kul[modul] = { ...y };
      }
      return { ...m, [secili.id]: kul };
    });
    toast.success(`"${set.ad}" seti uygulandı`);
  }

  return (
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

      {/* Sağ: seçili kullanıcının modül × bayrak tablosu */}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {secili ? (
          <>
            {setler.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  Hazır set uygula:
                </span>
                <div className="w-56">
                  <SearchSelect
                    items={setler.map((s) => s.ad)}
                    value={null}
                    onValueChange={(v) => v && setUygula(v)}
                    placeholder="Set seç…"
                    searchPlaceholder="Set ara..."
                  />
                </div>
              </div>
            )}
            <YetkiTablosu
              deger={matris[secili.id] ?? {}}
              onDegis={modulDegis}
            />
          </>
        ) : (
          <p className="rounded-md border border-dashed p-10 text-center text-sm text-muted-foreground">
            Soldan bir kullanıcı seçin.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Yetki setleri sekmesi ────────────────────────────────────────────────
type Taslak = { id?: number; ad: string; yetkiler: Record<string, ModulYetki> };

function bosTaslak(): Taslak {
  return {
    ad: "",
    yetkiler: Object.fromEntries(
      MODULLER.map((m) => [m.id, { ...BOS_YETKI }]),
    ) as Record<string, ModulYetki>,
  };
}

function setTaslagi(s: YetkiSeti): Taslak {
  return {
    id: s.id,
    ad: s.ad,
    yetkiler: Object.fromEntries(
      MODULLER.map((m) => [m.id, s.yetkiler[m.id] ?? { ...BOS_YETKI }]),
    ) as Record<string, ModulYetki>,
  };
}

function SetSekmesi({ setler }: { setler: YetkiSeti[] }) {
  const router = useRouter();
  const [taslak, setTaslak] = React.useState<Taslak | null>(
    setler[0] ? setTaslagi(setler[0]) : null,
  );
  const [kaydediliyor, setKaydediliyor] = React.useState(false);

  // Prop değişince (router.refresh sonrası) seçili seti tazele.
  React.useEffect(() => {
    setTaslak((t) => {
      if (!t) return setler[0] ? setTaslagi(setler[0]) : null;
      if (t.id == null) return t; // düzenlenen yeni set — dokunma
      const g = setler.find((s) => s.id === t.id);
      return g ? setTaslagi(g) : setler[0] ? setTaslagi(setler[0]) : null;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setler]);

  function modulDegis(modul: string, yeni: ModulYetki) {
    setTaslak((t) =>
      t ? { ...t, yetkiler: { ...t.yetkiler, [modul]: yeni } } : t,
    );
  }

  async function kaydet() {
    if (!taslak) return;
    if (!taslak.ad.trim()) {
      toast.error("Set adı gerekli");
      return;
    }
    setKaydediliyor(true);
    const res = await yetkiSetiKaydet(taslak);
    setKaydediliyor(false);
    if (!res.ok) {
      toast.error(res.error ?? "Set kaydedilemedi.");
      return;
    }
    toast.success("Yetki seti kaydedildi");
    setTaslak((t) => (t ? { ...t, id: res.id } : t));
    router.refresh();
  }

  async function sil() {
    if (!taslak?.id) return;
    const res = await yetkiSetiSil(taslak.id);
    if (!res.ok) {
      toast.error(res.error ?? "Set silinemedi.");
      return;
    }
    toast.success("Yetki seti silindi");
    setTaslak(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3 lg:flex-row">
      {/* Sol: set listesi */}
      <div className="flex w-full shrink-0 flex-col gap-2 lg:w-72">
        <Button
          variant="outline"
          className="justify-start"
          onClick={() => setTaslak(bosTaslak())}
        >
          <Plus className="size-4" /> Yeni Set
        </Button>
        <div className="flex flex-col gap-2">
          {setler.map((s) => {
            const aktif = taslak?.id === s.id;
            const izinli = MODULLER.filter((m) =>
              yetkiVar(s.yetkiler[m.id]),
            ).length;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setTaslak(setTaslagi(s))}
                className={cn(
                  "flex items-center justify-between gap-2 rounded-md border bg-card p-3 text-left transition-colors",
                  aktif
                    ? "border-foreground/30 ring-1 ring-foreground/20"
                    : "hover:bg-muted/40",
                )}
              >
                <span className="truncate text-sm font-medium">{s.ad}</span>
                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
                  {izinli}/{MODULLER.length}
                </span>
              </button>
            );
          })}
          {setler.length === 0 && (
            <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
              Henüz set yok. &quot;Yeni Set&quot; ile oluştur.
            </p>
          )}
        </div>
      </div>

      {/* Sağ: set editörü */}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {taslak ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                value={taslak.ad}
                onChange={(e) =>
                  setTaslak((t) => (t ? { ...t, ad: e.target.value } : t))
                }
                placeholder="Set adı (ör. Depo Personeli)"
                className="h-9 max-w-xs"
              />
              <div className="ml-auto flex gap-2">
                {taslak.id != null && (
                  <Button
                    variant="outline"
                    className="text-rose-600"
                    onClick={sil}
                  >
                    <Trash2 className="size-4" /> Sil
                  </Button>
                )}
                <Button onClick={kaydet} disabled={kaydediliyor}>
                  <Save className="size-4" /> Kaydet
                </Button>
              </div>
            </div>
            <YetkiTablosu deger={taslak.yetkiler} onDegis={modulDegis} />
          </>
        ) : (
          <p className="rounded-md border border-dashed p-10 text-center text-sm text-muted-foreground">
            Bir set seçin ya da &quot;Yeni Set&quot; oluşturun.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Ana bileşen: sekme geçişi ────────────────────────────────────────────
export function Yetkilendirme({
  kullanicilar,
  roller,
  rolYetkileri,
  kullaniciYetkileri,
  setler,
}: {
  kullanicilar: KullaniciGorunum[];
  roller: string[];
  rolYetkileri: YetkiMatrisi;
  kullaniciYetkileri: YetkiMatrisi;
  setler: YetkiSeti[];
}) {
  const [sekme, setSekme] = React.useState<"kullanici" | "set">("kullanici");

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
        <div className="ml-2 flex rounded-lg border border-input p-0.5">
          {(
            [
              ["kullanici", "Kullanıcı Yetkileri"],
              ["set", "Yetki Setleri"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setSekme(k)}
              className={cn(
                "cursor-pointer rounded-md px-3 py-1 text-xs font-medium transition-colors",
                sekme === k
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {sekme === "kullanici" ? (
        <KullaniciSekmesi
          kullanicilar={kullanicilar}
          roller={roller}
          rolYetkileri={rolYetkileri}
          kullaniciYetkileri={kullaniciYetkileri}
          setler={setler}
        />
      ) : (
        <SetSekmesi setler={setler} />
      )}
    </div>
  );
}
