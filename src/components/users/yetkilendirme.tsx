"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Save, Search } from "lucide-react";
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
  CARI_TAM,
  type ModulYetki,
  type YetkiMatrisi,
  type YetkiSeti,
  type CariYetki,
} from "@/lib/yetki";
import type { Cari } from "@/lib/data";
import type { KullaniciGorunum } from "@/lib/db/queries";
import {
  kullaniciYetkiSet,
  yetkiSetiKaydet,
  yetkiSetiSil,
  yetkiSetiUygula,
  cariYetkiAyarla,
} from "@/lib/db/actions";

function yetkiVar(y: ModulYetki | undefined): boolean {
  return !!y && (y.isList || y.isAdd || y.isUpdate || y.isDelete);
}

// ─── Ortak UI parçaları ───────────────────────────────────────────────────
function SayiRozet({ deger, toplam }: { deger: number; toplam: number }) {
  const ton =
    deger === 0
      ? "bg-rose-500"
      : deger === toplam
        ? "bg-emerald-500"
        : "bg-amber-500";
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border bg-background px-2 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
      <span className={cn("size-1.5 rounded-full", ton)} />
      {deger}/{toplam}
    </span>
  );
}

/** Sol listedeki seçilebilir satır (avatar + başlık + alt başlık + rozet). */
function SecimSatiri({
  baslik,
  altBaslik,
  rozet,
  aktif,
  onClick,
}: {
  baslik: string;
  altBaslik?: string;
  rozet?: React.ReactNode;
  aktif: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full cursor-pointer items-center gap-3 rounded-lg border px-2.5 py-2 text-left transition-colors",
        aktif
          ? "border-border bg-muted/60"
          : "border-transparent hover:bg-muted/40",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{baslik}</div>
        {altBaslik && (
          <div className="truncate text-xs text-muted-foreground">
            {altBaslik}
          </div>
        )}
      </div>
      {rozet}
    </button>
  );
}

/** Seçili kullanıcı başlığı (sağ panelin üstünde). */
function KullaniciBaslik({ k }: { k: KullaniciGorunum }) {
  return (
    <div className="min-w-0">
      <div className="truncate text-sm font-medium">{k.adSoyad}</div>
      <div className="truncate text-xs text-muted-foreground">
        {k.rol}
        {k.departman ? ` · ${k.departman}` : ""}
      </div>
    </div>
  );
}

function BosDurum({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-40 items-center justify-center rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
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
    <div className="overflow-x-auto rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="border-b bg-muted/30 hover:bg-muted/30">
            <TableHead className="h-9 w-full min-w-40 text-xs font-medium text-muted-foreground">
              Menü
            </TableHead>
            {YETKI_BAYRAKLARI.map((b) => (
              <TableHead
                key={b.key}
                title={b.aciklama}
                className="h-9 w-20 text-center text-xs font-medium whitespace-nowrap text-muted-foreground"
              >
                {b.label}
              </TableHead>
            ))}
            <TableHead className="h-9 w-20 text-center text-xs font-medium text-muted-foreground">
              Tümü
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {MODULLER.map((m) => {
            const y = deger[m.id] ?? BOS_YETKI;
            const hepsi = y.isList && y.isAdd && y.isUpdate && y.isDelete;
            const bazi = yetkiVar(y);
            return (
              <TableRow key={m.id} className="border-b last:border-0">
                <TableCell className="py-2.5 font-medium">{m.label}</TableCell>
                {YETKI_BAYRAKLARI.map((b) => (
                  <TableCell
                    key={b.key}
                    className="py-2.5 [&:has([role=checkbox])]:pr-2"
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
                <TableCell className="py-2.5 [&:has([role=checkbox])]:pr-2">
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

/** Sol panel kabuğu: rol filtresi + kaydırılabilir liste. */
function SolPanel({ children }: { children: React.ReactNode }) {
  return (
    <aside className="flex w-full shrink-0 flex-col gap-2 lg:w-64">
      {children}
    </aside>
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
    <div className="flex flex-col gap-4 lg:flex-row">
      <SolPanel>
        <SearchSelect
          items={["Tümü", ...roller]}
          value={rolFiltre}
          onValueChange={(v) => setRolFiltre(v ?? "Tümü")}
          placeholder="Rol filtresi"
          searchPlaceholder="Rol ara..."
        />
        <div className="flex flex-col gap-1">
          {filtreli.map((k) => (
            <SecimSatiri
              key={k.id}
              aktif={k.id === seciliId}
              onClick={() => setSeciliId(k.id)}
              baslik={k.adSoyad}
              altBaslik={`${k.rol}${k.departman ? ` · ${k.departman}` : ""}`}
              rozet={
                <SayiRozet
                  deger={izinliSayisi(k.id)}
                  toplam={MODULLER.length}
                />
              }
            />
          ))}
          {filtreli.length === 0 && (
            <BosDurum>Bu rolde kullanıcı yok.</BosDurum>
          )}
        </div>
      </SolPanel>

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        {secili ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <KullaniciBaslik k={secili} />
              {setler.length > 0 && (
                <div className="w-56">
                  <SearchSelect
                    items={setler.map((s) => s.ad)}
                    value={null}
                    onValueChange={(v) => v && setUygula(v)}
                    placeholder="Hazır set uygula…"
                    searchPlaceholder="Set ara..."
                  />
                </div>
              )}
            </div>
            <YetkiTablosu deger={matris[secili.id] ?? {}} onDegis={modulDegis} />
          </>
        ) : (
          <BosDurum>Soldan bir kullanıcı seçin.</BosDurum>
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

  React.useEffect(() => {
    setTaslak((t) => {
      if (!t) return setler[0] ? setTaslagi(setler[0]) : null;
      if (t.id == null) return t;
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
    <div className="flex flex-col gap-4 lg:flex-row">
      <SolPanel>
        <Button
          variant="outline"
          className="justify-start"
          onClick={() => setTaslak(bosTaslak())}
        >
          <Plus className="size-4" /> Yeni Set
        </Button>
        <div className="flex flex-col gap-1">
          {setler.map((s) => {
            const izinli = MODULLER.filter((m) =>
              yetkiVar(s.yetkiler[m.id]),
            ).length;
            return (
              <SecimSatiri
                key={s.id}
                aktif={taslak?.id === s.id}
                onClick={() => setTaslak(setTaslagi(s))}
                baslik={s.ad}
                altBaslik={`${izinli} modül`}
                rozet={<SayiRozet deger={izinli} toplam={MODULLER.length} />}
              />
            );
          })}
          {setler.length === 0 && (
            <BosDurum>
              Henüz set yok. &quot;Yeni Set&quot; ile oluştur.
            </BosDurum>
          )}
        </div>
      </SolPanel>

      <div className="flex min-w-0 flex-1 flex-col gap-3">
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
          <BosDurum>Bir set seçin ya da &quot;Yeni Set&quot; oluşturun.</BosDurum>
        )}
      </div>
    </div>
  );
}

// ─── Cari erişimi sekmesi (Görüntüle / İşlem Yap ayrı; varsayılan ikisi açık) ─
function CariErisimSekmesi({
  kullanicilar,
  roller,
  cariler,
  yetkiler,
}: {
  kullanicilar: KullaniciGorunum[];
  roller: string[];
  cariler: Cari[];
  yetkiler: Record<string, Record<string, CariYetki>>;
}) {
  const [matris, setMatris] = React.useState<
    Record<string, Record<string, CariYetki>>
  >(() => {
    const m: Record<string, Record<string, CariYetki>> = {};
    for (const k of kullanicilar) {
      m[k.id] = {};
      for (const c of cariler) {
        m[k.id][c.id] = yetkiler[k.id]?.[c.id] ?? { ...CARI_TAM };
      }
    }
    return m;
  });
  const [rolFiltre, setRolFiltre] = React.useState("Tümü");
  const [seciliId, setSeciliId] = React.useState<string | null>(
    kullanicilar[0]?.id ?? null,
  );
  const [arama, setArama] = React.useState("");
  const [tipFiltre, setTipFiltre] = React.useState("Tümü");

  const filtreliKul = kullanicilar.filter(
    (k) => rolFiltre === "Tümü" || k.rol === rolFiltre,
  );
  const secili = kullanicilar.find((k) => k.id === seciliId) ?? null;

  React.useEffect(() => {
    if (!filtreliKul.some((k) => k.id === seciliId)) {
      setSeciliId(filtreliKul[0]?.id ?? null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rolFiltre]);

  const yetkiAl = (uid: string, cid: string): CariYetki =>
    matris[uid]?.[cid] ?? CARI_TAM;

  const gorunurSayisi = (uid: string) =>
    cariler.filter((c) => yetkiAl(uid, c.id).goruntule).length;

  const filtreliCari = cariler.filter((c) => {
    const q = arama.toLowerCase();
    const eslesme =
      c.ad.toLowerCase().includes(q) || c.id.toLowerCase().includes(q);
    const tip = tipFiltre === "Tümü" || c.tip === tipFiltre;
    return eslesme && tip;
  });

  async function tekDegis(cariId: string, alan: keyof CariYetki, deger: boolean) {
    if (!secili) return;
    const onceki = yetkiAl(secili.id, cariId);
    const yeni: CariYetki = { ...onceki, [alan]: deger };
    setMatris((m) => ({
      ...m,
      [secili.id]: { ...m[secili.id], [cariId]: yeni },
    }));
    const res = await cariYetkiAyarla(
      secili.id,
      cariId,
      yeni.goruntule,
      yeni.islemYap,
    );
    if (!res.ok) {
      setMatris((m) => ({
        ...m,
        [secili.id]: { ...m[secili.id], [cariId]: onceki },
      }));
      toast.error(res.error ?? "Cari yetkisi kaydedilemedi.");
    }
  }

  const KOLONLAR = [
    ["goruntule", "Görüntüle"],
    ["islemYap", "İşlem Yap"],
  ] as const;

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <SolPanel>
        <SearchSelect
          items={["Tümü", ...roller]}
          value={rolFiltre}
          onValueChange={(v) => setRolFiltre(v ?? "Tümü")}
          placeholder="Rol filtresi"
          searchPlaceholder="Rol ara..."
        />
        <div className="flex flex-col gap-1">
          {filtreliKul.map((k) => (
            <SecimSatiri
              key={k.id}
              aktif={k.id === seciliId}
              onClick={() => setSeciliId(k.id)}
              baslik={k.adSoyad}
              altBaslik={`${k.rol}${k.departman ? ` · ${k.departman}` : ""}`}
              rozet={
                <SayiRozet deger={gorunurSayisi(k.id)} toplam={cariler.length} />
              }
            />
          ))}
          {filtreliKul.length === 0 && (
            <BosDurum>Bu rolde kullanıcı yok.</BosDurum>
          )}
        </div>
      </SolPanel>

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        {secili ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <KullaniciBaslik k={secili} />
              <div className="flex w-full items-center gap-2 sm:w-auto">
                <div className="relative flex-1 sm:w-56">
                  <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Cari veya kod ara..."
                    value={arama}
                    onChange={(e) => setArama(e.target.value)}
                    className="h-9 pl-9"
                  />
                </div>
                <div className="w-36 shrink-0">
                  <SearchSelect
                    items={["Tümü", "Müşteri", "Tedarikçi"]}
                    value={tipFiltre}
                    onValueChange={(v) => setTipFiltre(v ?? "Tümü")}
                    placeholder="Hesap tipi"
                    searchPlaceholder="Tip ara..."
                  />
                </div>
              </div>
            </div>
            <div className="overflow-x-auto rounded-lg border bg-card">
              <Table>
                <TableHeader>
                  <TableRow className="border-b bg-muted/30 hover:bg-muted/30">
                    <TableHead className="h-9 text-xs font-medium text-muted-foreground">
                      Kod
                    </TableHead>
                    <TableHead className="h-9 w-full text-xs font-medium text-muted-foreground">
                      Cari Adı
                    </TableHead>
                    <TableHead className="h-9 text-xs font-medium whitespace-nowrap text-muted-foreground">
                      Hesap Tipi
                    </TableHead>
                    {KOLONLAR.map(([alan, label]) => (
                      <TableHead
                        key={alan}
                        className="h-9 w-28 text-center text-xs font-medium whitespace-nowrap text-muted-foreground"
                      >
                        {label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtreliCari.map((c) => {
                    const y = yetkiAl(secili.id, c.id);
                    return (
                      <TableRow key={c.id} className="border-b last:border-0">
                        <TableCell className="py-2.5 font-mono text-xs text-muted-foreground">
                          {c.id}
                        </TableCell>
                        <TableCell className="py-2.5 font-medium">
                          {c.ad}
                        </TableCell>
                        <TableCell className="py-2.5 whitespace-nowrap">
                          <span className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
                            {c.tip}
                          </span>
                        </TableCell>
                        {KOLONLAR.map(([alan, label]) => (
                          <TableCell
                            key={alan}
                            className="py-2.5 [&:has([role=checkbox])]:pr-2"
                          >
                            <div className="flex justify-center">
                              <Checkbox
                                checked={y[alan]}
                                onCheckedChange={(v) =>
                                  tekDegis(c.id, alan, v === true)
                                }
                                aria-label={`${c.ad} — ${label}`}
                              />
                            </div>
                          </TableCell>
                        ))}
                      </TableRow>
                    );
                  })}
                  {filtreliCari.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="h-20 text-center text-muted-foreground"
                      >
                        Cari bulunamadı.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <span className="text-xs text-muted-foreground">
              {gorunurSayisi(secili.id)}/{cariler.length} cari görüntülenebilir
            </span>
          </>
        ) : (
          <BosDurum>Soldan bir kullanıcı seçin.</BosDurum>
        )}
      </div>
    </div>
  );
}

// ─── Ana bileşen: başlık + underline sekmeler ─────────────────────────────
const SEKMELER = [
  ["kullanici", "Menü İzinleri"],
  ["cari", "Cari Hesap İzinleri"],
  ["set", "Yetki Setleri"],
] as const;

export function Yetkilendirme({
  kullanicilar,
  roller,
  rolYetkileri,
  kullaniciYetkileri,
  setler,
  cariler,
  cariYetkileri,
}: {
  kullanicilar: KullaniciGorunum[];
  roller: string[];
  rolYetkileri: YetkiMatrisi;
  kullaniciYetkileri: YetkiMatrisi;
  setler: YetkiSeti[];
  cariler: Cari[];
  cariYetkileri: Record<string, Record<string, CariYetki>>;
}) {
  const [sekme, setSekme] = React.useState<"kullanici" | "set" | "cari">(
    "kullanici",
  );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      {/* Underline sekmeler */}
      <div className="border-b">
        <nav className="-mb-px flex gap-5">
          {SEKMELER.map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setSekme(k)}
              className={cn(
                "cursor-pointer border-b-2 px-0.5 pt-1 pb-2.5 text-sm transition-colors",
                sekme === k
                  ? "border-foreground font-medium text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* İçerik */}
      {sekme === "kullanici" && (
        <KullaniciSekmesi
          kullanicilar={kullanicilar}
          roller={roller}
          rolYetkileri={rolYetkileri}
          kullaniciYetkileri={kullaniciYetkileri}
          setler={setler}
        />
      )}
      {sekme === "set" && <SetSekmesi setler={setler} />}
      {sekme === "cari" && (
        <CariErisimSekmesi
          kullanicilar={kullanicilar}
          roller={roller}
          cariler={cariler}
          yetkiler={cariYetkileri}
        />
      )}
    </div>
  );
}
