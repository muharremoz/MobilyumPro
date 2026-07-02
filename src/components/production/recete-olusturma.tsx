"use client";

import * as React from "react";
import {
  Search,
  Plus,
  X,
  Copy,
  Trash2,
  History,
  Boxes,
  AlertTriangle,
  RotateCcw,
  Check,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchSelect } from "@/components/ui/search-select";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  formatTL,
  type Malzeme,
  type Model,
  type Parca,
  type ParcaKategori,
  type ReceteSatiri,
} from "@/lib/data";
import type { ReceteVersiyonGorunum } from "@/lib/db/queries";
import {
  parcaKaydet,
  parcaSil,
  receteGeriYukle,
  receteKopyala,
} from "@/lib/db/actions";

const KATEGORILER: ParcaKategori[] = [
  "Karyola",
  "Komidin",
  "Şifonyer",
  "Gardırop",
  "Ayna",
  "Sehpa",
  "Koltuk",
  "Diğer",
];

type Sekme = "bilesenler" | "gecmis" | "kullanim";

type Taslak = {
  ad: string;
  kategori: ParcaKategori;
  durum: "Aktif" | "Pasif";
  satirlar: ReceteSatiri[];
};

function tarihYaz(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }) +
    " " +
    d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

export function ReceteOlusturma({
  parcalar,
  malzemeler,
  modeller,
  versiyonlar: versiyonlarProp,
}: {
  parcalar: Parca[];
  malzemeler: Malzeme[];
  modeller: Model[];
  versiyonlar: Record<string, ReceteVersiyonGorunum[]>;
}) {
  const [liste, setListe] = React.useState<Parca[]>(parcalar);
  const [versiyonlar, setVersiyonlar] = React.useState(versiyonlarProp);
  const [arama, setArama] = React.useState("");
  const [seciliId, setSeciliId] = React.useState<string | null>(
    parcalar[0]?.id ?? null,
  );
  const [taslak, setTaslak] = React.useState<Taslak | null>(null);
  const [yeniMi, setYeniMi] = React.useState(false);
  const [sekme, setSekme] = React.useState<Sekme>("bilesenler");

  // Dialoglar
  const [kopyaKaynak, setKopyaKaynak] = React.useState<Parca | null>(null);
  const [kopyaAd, setKopyaAd] = React.useState("");
  const [kaydetOnay, setKaydetOnay] = React.useState(false);
  const [degisiklikNotu, setDegisiklikNotu] = React.useState("");
  const [geriYukleNo, setGeriYukleNo] = React.useState<number | null>(null);
  const [kaydediliyor, setKaydediliyor] = React.useState(false);

  const malzemeMap = React.useMemo(
    () => new Map(malzemeler.map((m) => [m.id, m])),
    [malzemeler],
  );
  const parcaMap = React.useMemo(
    () => new Map(liste.map((p) => [p.id, p])),
    [liste],
  );

  const secili = seciliId ? (parcaMap.get(seciliId) ?? null) : null;

  // Seçim değişince taslağı kur.
  React.useEffect(() => {
    if (yeniMi) return;
    if (!secili) {
      setTaslak(null);
      return;
    }
    setTaslak({
      ad: secili.ad,
      kategori: secili.kategori,
      durum: secili.durum,
      satirlar: secili.recete.map((r) => ({ ...r, bilesen: { ...r.bilesen } })),
    });
    setSekme("bilesenler");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seciliId, yeniMi]);

  // ── Kullanım: modellerde + başka reçetelerde ──────────────────────────
  const kullanim = React.useMemo(() => {
    const m = new Map<
      string,
      { modeller: { ad: string; miktar: number }[]; receteler: string[] }
    >();
    for (const p of liste) m.set(p.id, { modeller: [], receteler: [] });
    for (const u of modeller) {
      for (const ps of u.parcalar ?? []) {
        m.get(ps.parcaId)?.modeller.push({ ad: u.ad, miktar: ps.miktar });
      }
    }
    for (const p of liste) {
      for (const r of p.recete) {
        if (r.bilesen.tip === "parca") {
          m.get(r.bilesen.ref)?.receteler.push(p.ad);
        }
      }
    }
    return m;
  }, [liste, modeller]);

  // ── Maliyet (özyinelemeli; döngü korumalı) ────────────────────────────
  const maliyetHesapla = React.useCallback(
    (satirlar: ReceteSatiri[], gezilen = new Set<string>()): number => {
      let toplam = 0;
      for (const s of satirlar) {
        if (s.bilesen.tip === "malzeme") {
          toplam +=
            (malzemeMap.get(s.bilesen.ref)?.birimFiyat ?? 0) * s.miktar;
        } else if (!gezilen.has(s.bilesen.ref)) {
          const alt = parcaMap.get(s.bilesen.ref);
          if (alt) {
            const g = new Set(gezilen);
            g.add(s.bilesen.ref);
            toplam += maliyetHesapla(alt.recete, g) * s.miktar;
          }
        }
      }
      return toplam;
    },
    [malzemeMap, parcaMap],
  );

  const bilesenAd = (tip: "malzeme" | "parca", ref: string) =>
    tip === "malzeme"
      ? (malzemeMap.get(ref)?.ad ?? ref)
      : (parcaMap.get(ref)?.ad ?? ref);

  // ── Liste + filtre ────────────────────────────────────────────────────
  const filtreli = liste.filter((p) =>
    p.ad.toLowerCase().includes(arama.toLowerCase()),
  );

  // ── Kirli mi? ─────────────────────────────────────────────────────────
  const kirli = React.useMemo(() => {
    if (!taslak) return false;
    if (yeniMi) return true;
    if (!secili) return false;
    if (taslak.ad !== secili.ad || taslak.kategori !== secili.kategori)
      return true;
    const a = JSON.stringify(
      taslak.satirlar.map((s) => [s.bilesen.tip, s.bilesen.ref, s.miktar]),
    );
    const b = JSON.stringify(
      secili.recete.map((s) => [s.bilesen.tip, s.bilesen.ref, s.miktar]),
    );
    return a !== b;
  }, [taslak, secili, yeniMi]);

  const etkilenen = secili ? kullanim.get(secili.id) : undefined;
  const etkiSayisi = yeniMi
    ? 0
    : (etkilenen?.modeller.length ?? 0) + (etkilenen?.receteler.length ?? 0);

  // ── Eylemler ──────────────────────────────────────────────────────────
  function yeniRecete() {
    setYeniMi(true);
    setSeciliId(null);
    setSekme("bilesenler");
    setTaslak({ ad: "", kategori: "Diğer", durum: "Aktif", satirlar: [] });
  }

  function satirEkle(tip: "malzeme" | "parca") {
    setTaslak((t) =>
      t
        ? {
            ...t,
            satirlar: [
              ...t.satirlar,
              { bilesen: { tip, ref: "" }, miktar: 1 },
            ],
          }
        : t,
    );
  }

  async function kaydetUygula() {
    if (!taslak) return;
    if (!taslak.ad.trim()) {
      toast.error("Reçete adı gerekli");
      return;
    }
    const gecerli = taslak.satirlar.filter((s) => s.bilesen.ref);
    setKaydediliyor(true);
    const res = await parcaKaydet(
      {
        id: yeniMi ? undefined : (seciliId ?? undefined),
        ad: taslak.ad.trim(),
        kategori: taslak.kategori,
        durum: taslak.durum,
        recete: gecerli,
      },
      degisiklikNotu || undefined,
    );
    setKaydediliyor(false);
    setKaydetOnay(false);
    setDegisiklikNotu("");
    if (!res.ok || !res.id) {
      toast.error(res.error ?? "Kaydedilemedi.");
      return;
    }
    const id = res.id;
    const yeniParca: Parca = {
      id,
      ad: taslak.ad.trim(),
      kategori: taslak.kategori,
      durum: taslak.durum,
      recete: gecerli,
    };
    setListe((l) => {
      const i = l.findIndex((x) => x.id === id);
      if (i >= 0) {
        const n = [...l];
        n[i] = yeniParca;
        return n;
      }
      return [yeniParca, ...l];
    });
    // Versiyon geçmişini yerelde senkronla (satırlar değiştiyse).
    setVersiyonlar((v) => {
      const eski = v[id] ?? [];
      const snapshot = gecerli.map((s) => ({
        tip: s.bilesen.tip,
        ref: s.bilesen.ref,
        miktar: s.miktar,
      }));
      if (
        eski[0] &&
        JSON.stringify(eski[0].satirlar) === JSON.stringify(snapshot)
      )
        return v;
      return {
        ...v,
        [id]: [
          {
            versiyonNo: (eski[0]?.versiyonNo ?? 0) + 1,
            tarih: new Date().toISOString(),
            aciklama: degisiklikNotu || undefined,
            satirlar: snapshot,
          },
          ...eski,
        ],
      };
    });
    setYeniMi(false);
    setSeciliId(id);
    toast.success("Reçete kaydedildi");
  }

  function kaydetTikla() {
    if (etkiSayisi > 0) setKaydetOnay(true); // yayılma uyarısı
    else void kaydetUygula();
  }

  async function kopyala() {
    if (!kopyaKaynak) return;
    const res = await receteKopyala(kopyaKaynak.id, kopyaAd);
    if (!res.ok || !res.id) {
      toast.error(res.error ?? "Kopyalanamadı.");
      return;
    }
    const yeni: Parca = {
      ...kopyaKaynak,
      id: res.id,
      ad: kopyaAd.trim() || `${kopyaKaynak.ad} (kopya)`,
      recete: kopyaKaynak.recete.map((r) => ({
        ...r,
        bilesen: { ...r.bilesen },
      })),
    };
    setListe((l) => [yeni, ...l]);
    setVersiyonlar((v) => ({
      ...v,
      [res.id!]: [
        {
          versiyonNo: 1,
          tarih: new Date().toISOString(),
          aciklama: `"${kopyaKaynak.ad}" reçetesinden kopyalandı`,
          satirlar: yeni.recete.map((s) => ({
            tip: s.bilesen.tip,
            ref: s.bilesen.ref,
            miktar: s.miktar,
          })),
        },
      ],
    }));
    setKopyaKaynak(null);
    setYeniMi(false);
    setSeciliId(res.id);
    toast.success("Reçete kopyalandı");
  }

  async function sil(p: Parca) {
    const res = await parcaSil([p.id]);
    if (!res.ok) {
      toast.error(res.error ?? "Silinemedi.");
      return;
    }
    setListe((l) => l.filter((x) => x.id !== p.id));
    if (seciliId === p.id) setSeciliId(null);
    toast.success("Reçete silindi");
  }

  async function geriYukle() {
    if (!seciliId || geriYukleNo === null) return;
    const hedef = versiyonlar[seciliId]?.find(
      (v) => v.versiyonNo === geriYukleNo,
    );
    setGeriYukleNo(null);
    if (!hedef) return;
    const res = await receteGeriYukle(seciliId, hedef.versiyonNo);
    if (!res.ok) {
      toast.error(res.error ?? "Geri yükleme başarısız.");
      return;
    }
    const satirlar: ReceteSatiri[] = hedef.satirlar.map((s) => ({
      bilesen: { tip: s.tip, ref: s.ref },
      miktar: s.miktar,
    }));
    setListe((l) =>
      l.map((p) => (p.id === seciliId ? { ...p, recete: satirlar } : p)),
    );
    setTaslak((t) => (t ? { ...t, satirlar } : t));
    setVersiyonlar((v) => ({
      ...v,
      [seciliId]: [
        {
          versiyonNo: (v[seciliId]?.[0]?.versiyonNo ?? 0) + 1,
          tarih: new Date().toISOString(),
          aciklama: `v${hedef.versiyonNo} sürümüne geri dönüldü`,
          satirlar: hedef.satirlar,
        },
        ...(v[seciliId] ?? []),
      ],
    }));
    toast.success(`v${hedef.versiyonNo} geri yüklendi`);
  }

  // ── Diff (versiyon karşılaştırma) ─────────────────────────────────────
  function diff(
    yeni: ReceteVersiyonGorunum["satirlar"],
    eski: ReceteVersiyonGorunum["satirlar"] | undefined,
  ) {
    const key = (s: { tip: string; ref: string }) => `${s.tip}:${s.ref}`;
    const eskiMap = new Map((eski ?? []).map((s) => [key(s), s]));
    const yeniMap = new Map(yeni.map((s) => [key(s), s]));
    const eklenen = yeni.filter((s) => !eskiMap.has(key(s)));
    const cikan = (eski ?? []).filter((s) => !yeniMap.has(key(s)));
    const degisen = yeni.filter((s) => {
      const e = eskiMap.get(key(s));
      return e && e.miktar !== s.miktar;
    });
    return { eklenen, cikan, degisen };
  }

  const seciliVersiyonlar = seciliId ? (versiyonlar[seciliId] ?? []) : [];

  // Alt reçete seçenekleri: kendisi hariç (döngü koruması).
  const altReceteSecenekleri = liste
    .filter((p) => p.id !== seciliId)
    .map((p) => p.ad);
  const malzemeSecenekleri = malzemeler.map((m) => m.ad);

  return (
    <div className="flex flex-col gap-3 lg:flex-row">
      {/* ── Sol: reçete listesi ── */}
      <div className="flex w-full shrink-0 flex-col gap-2 lg:w-72">
        <div className="flex gap-1.5">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Reçete ara..."
              value={arama}
              onChange={(e) => setArama(e.target.value)}
              className="h-8 pl-8"
            />
          </div>
          <Button size="sm" onClick={yeniRecete}>
            Yeni
          </Button>
        </div>
        <div className="flex flex-col gap-2">
          {yeniMi && (
            <div className="rounded-md border border-dashed border-foreground/30 bg-card p-3">
              <p className="text-sm font-medium">
                {taslak?.ad.trim() || "Yeni Reçete"}
              </p>
              <p className="text-xs text-muted-foreground">kaydedilmedi</p>
            </div>
          )}
          {filtreli.map((p) => {
            const aktif = !yeniMi && p.id === seciliId;
            const kul = kullanim.get(p.id);
            const kulSayi =
              (kul?.modeller.length ?? 0) + (kul?.receteler.length ?? 0);
            return (
              <ContextMenu key={p.id}>
                <ContextMenuTrigger
                  render={
                    <button
                      type="button"
                      onClick={() => {
                        setYeniMi(false);
                        setSeciliId(p.id);
                      }}
                      className={cn(
                        "cursor-pointer rounded-md border bg-card p-3 text-left transition-colors",
                        aktif
                          ? "border-foreground/30 ring-1 ring-foreground/20"
                          : "hover:bg-muted/40",
                      )}
                    />
                  }
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium">{p.ad}</span>
                    <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                      {formatTL(maliyetHesapla(p.recete))}
                    </span>
                  </div>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                    {p.kategori} · {p.recete.length} bileşen
                    {kulSayi > 0 && (
                      <Badge
                        variant="secondary"
                        className="px-1.5 py-0 text-[10px]"
                      >
                        {kulSayi} yerde
                      </Badge>
                    )}
                  </p>
                </ContextMenuTrigger>
                <ContextMenuContent className="w-44">
                  <ContextMenuItem
                    onClick={() => {
                      setKopyaAd(`${p.ad} (kopya)`);
                      setKopyaKaynak(p);
                    }}
                  >
                    <Copy className="mr-2 size-4" /> Kopyala
                  </ContextMenuItem>
                  <ContextMenuItem
                    variant="destructive"
                    onClick={() => sil(p)}
                  >
                    <Trash2 className="mr-2 size-4" /> Sil
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            );
          })}
          {filtreli.length === 0 && !yeniMi && (
            <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
              Reçete bulunamadı.
            </p>
          )}
        </div>
      </div>

      {/* ── Sağ: editör ── */}
      <div className="min-w-0 flex-1">
        {taslak ? (
          <div className="overflow-hidden rounded-md border bg-card">
            {/* Başlık */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-1.5">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Reçete adı"
                  value={taslak.ad}
                  onChange={(e) =>
                    setTaslak((t) => (t ? { ...t, ad: e.target.value } : t))
                  }
                  className="h-8 w-56 font-medium"
                />
                <div className="w-36">
                  <SearchSelect
                    items={KATEGORILER}
                    value={taslak.kategori}
                    onValueChange={(v) =>
                      setTaslak((t) =>
                        t
                          ? { ...t, kategori: (v as ParcaKategori) ?? "Diğer" }
                          : t,
                      )
                    }
                    placeholder="Kategori"
                    className="h-8"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                {etkiSayisi > 0 && (
                  <span className="flex items-center gap-1 text-xs text-amber-600">
                    <AlertTriangle className="size-3.5" />
                    {etkiSayisi} yerde kullanılıyor
                  </span>
                )}
                <Button size="sm" onClick={kaydetTikla} disabled={!kirli || kaydediliyor}>
                  {kaydediliyor ? "Kaydediliyor..." : "Kaydet"}
                </Button>
              </div>
            </div>

            {/* Sekmeler */}
            <div className="flex items-center gap-0.5 border-b px-2 py-1">
              {(
                [
                  ["bilesenler", "Bileşenler", Boxes],
                  ["gecmis", "Geçmiş", History],
                  ["kullanim", "Kullanım", Copy],
                ] as const
              ).map(([id, label, Icon]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSekme(id)}
                  className={cn(
                    "flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    sekme === id
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="size-3.5" />
                  {label}
                  {id === "gecmis" && seciliVersiyonlar.length > 0 && (
                    <span className="text-[10px] text-muted-foreground">
                      v{seciliVersiyonlar[0].versiyonNo}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* ── Bileşenler ── */}
            {sekme === "bilesenler" && (
              <div className="flex flex-col">
                <div className="divide-y">
                  {taslak.satirlar.map((s, i) => {
                    const malzeme =
                      s.bilesen.tip === "malzeme"
                        ? malzemeMap.get(s.bilesen.ref)
                        : undefined;
                    const birimMaliyet =
                      s.bilesen.tip === "malzeme"
                        ? (malzeme?.birimFiyat ?? 0)
                        : maliyetHesapla(
                            parcaMap.get(s.bilesen.ref)?.recete ?? [],
                            new Set([seciliId ?? ""]),
                          );
                    return (
                      <div
                        key={i}
                        className="flex flex-wrap items-center gap-2 px-3 py-2"
                      >
                        <Badge
                          variant="secondary"
                          className={cn(
                            "w-20 justify-center",
                            s.bilesen.tip === "malzeme"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-violet-100 text-violet-800",
                          )}
                        >
                          {s.bilesen.tip === "malzeme" ? "Malzeme" : "Reçete"}
                        </Badge>
                        <div className="min-w-44 flex-1">
                          <SearchSelect
                            items={
                              s.bilesen.tip === "malzeme"
                                ? malzemeSecenekleri
                                : altReceteSecenekleri
                            }
                            value={
                              s.bilesen.ref
                                ? bilesenAd(s.bilesen.tip, s.bilesen.ref)
                                : null
                            }
                            onValueChange={(ad) => {
                              const ref =
                                s.bilesen.tip === "malzeme"
                                  ? malzemeler.find((m) => m.ad === ad)?.id
                                  : liste.find((p) => p.ad === ad)?.id;
                              setTaslak((t) => {
                                if (!t) return t;
                                const n = [...t.satirlar];
                                n[i] = {
                                  ...n[i],
                                  bilesen: { ...n[i].bilesen, ref: ref ?? "" },
                                };
                                return { ...t, satirlar: n };
                              });
                            }}
                            placeholder={
                              s.bilesen.tip === "malzeme"
                                ? "Malzeme seçin"
                                : "Reçete seçin"
                            }
                            searchPlaceholder="Ara..."
                            className="h-8"
                          />
                        </div>
                        <Input
                          type="number"
                          min={0}
                          step="any"
                          value={s.miktar}
                          onChange={(e) =>
                            setTaslak((t) => {
                              if (!t) return t;
                              const n = [...t.satirlar];
                              n[i] = { ...n[i], miktar: Number(e.target.value) };
                              return { ...t, satirlar: n };
                            })
                          }
                          className="h-8 w-20 text-right tabular-nums"
                        />
                        <span className="w-10 text-xs text-muted-foreground">
                          {s.bilesen.tip === "malzeme"
                            ? (malzeme?.birim ?? "—")
                            : "adet"}
                        </span>
                        <span className="w-24 text-right text-xs text-muted-foreground tabular-nums">
                          {formatTL(birimMaliyet * s.miktar)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Satırı kaldır"
                          onClick={() =>
                            setTaslak((t) =>
                              t
                                ? {
                                    ...t,
                                    satirlar: t.satirlar.filter(
                                      (_, j) => j !== i,
                                    ),
                                  }
                                : t,
                            )
                          }
                        >
                          <X className="size-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                  {taslak.satirlar.length === 0 && (
                    <p className="p-6 text-center text-sm text-muted-foreground">
                      Henüz bileşen yok — aşağıdan malzeme veya alt reçete
                      ekleyin.
                    </p>
                  )}
                </div>
                {/* Alt bar: satır ekle + toplam */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/30 px-3 py-2">
                  <div className="flex gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => satirEkle("malzeme")}
                    >
                      <Plus className="size-3.5" /> Malzeme
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => satirEkle("parca")}
                    >
                      <Plus className="size-3.5" /> Alt Reçete
                    </Button>
                  </div>
                  <p className="text-sm">
                    Toplam maliyet:{" "}
                    <span className="font-semibold tabular-nums">
                      {formatTL(
                        maliyetHesapla(
                          taslak.satirlar.filter((s) => s.bilesen.ref),
                          new Set(seciliId ? [seciliId] : []),
                        ),
                      )}
                    </span>
                  </p>
                </div>
              </div>
            )}

            {/* ── Geçmiş ── */}
            {sekme === "gecmis" && (
              <div className="divide-y">
                {seciliVersiyonlar.map((v, i) => {
                  const onceki = seciliVersiyonlar[i + 1];
                  const d = diff(v.satirlar, onceki?.satirlar);
                  const guncel = i === 0;
                  return (
                    <div key={v.versiyonNo} className="px-3 py-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={guncel ? "default" : "secondary"}
                            className="tabular-nums"
                          >
                            v{v.versiyonNo}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {tarihYaz(v.tarih)}
                          </span>
                          {guncel && (
                            <span className="text-xs text-emerald-600">
                              güncel
                            </span>
                          )}
                        </div>
                        {!guncel && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setGeriYukleNo(v.versiyonNo)}
                          >
                            <RotateCcw className="size-3.5" /> Bu Versiyona Dön
                          </Button>
                        )}
                      </div>
                      {v.aciklama && (
                        <p className="mt-1 text-xs text-muted-foreground italic">
                          {v.aciklama}
                        </p>
                      )}
                      <div className="mt-1.5 flex flex-col gap-0.5 text-xs">
                        {d.eklenen.map((s) => (
                          <span key={`e${s.ref}`} className="text-emerald-600">
                            + {bilesenAd(s.tip, s.ref)} × {s.miktar}
                          </span>
                        ))}
                        {d.cikan.map((s) => (
                          <span key={`c${s.ref}`} className="text-rose-600">
                            − {bilesenAd(s.tip, s.ref)} × {s.miktar}
                          </span>
                        ))}
                        {d.degisen.map((s) => {
                          const e = onceki?.satirlar.find(
                            (x) => x.tip === s.tip && x.ref === s.ref,
                          );
                          return (
                            <span key={`d${s.ref}`} className="text-amber-600">
                              ~ {bilesenAd(s.tip, s.ref)}: {e?.miktar} →{" "}
                              {s.miktar}
                            </span>
                          );
                        })}
                        {!onceki &&
                          d.eklenen.length === 0 &&
                          v.satirlar.length === 0 && (
                            <span className="text-muted-foreground">
                              boş reçete
                            </span>
                          )}
                      </div>
                    </div>
                  );
                })}
                {seciliVersiyonlar.length === 0 && (
                  <p className="p-6 text-center text-sm text-muted-foreground">
                    Henüz versiyon geçmişi yok — ilk kayıtla v1 oluşur.
                  </p>
                )}
              </div>
            )}

            {/* ── Kullanım ── */}
            {sekme === "kullanim" && (
              <div className="divide-y">
                {(etkilenen?.modeller ?? []).map((m) => (
                  <div
                    key={m.ad}
                    className="flex items-center justify-between px-3 py-2.5 text-sm"
                  >
                    <span>{m.ad}</span>
                    <span className="text-xs text-muted-foreground">
                      model · ×{m.miktar}
                    </span>
                  </div>
                ))}
                {(etkilenen?.receteler ?? []).map((ad) => (
                  <div
                    key={ad}
                    className="flex items-center justify-between px-3 py-2.5 text-sm"
                  >
                    <span>{ad}</span>
                    <span className="text-xs text-muted-foreground">
                      alt reçete olarak
                    </span>
                  </div>
                ))}
                {etkiSayisi === 0 && (
                  <p className="p-6 text-center text-sm text-muted-foreground">
                    Bu reçete henüz hiçbir model veya reçetede kullanılmıyor.
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          <p className="rounded-md border border-dashed p-10 text-center text-sm text-muted-foreground">
            Soldan bir reçete seçin veya yeni oluşturun.
          </p>
        )}
      </div>

      {/* ── Kopyala dialogu ── */}
      <Dialog
        open={kopyaKaynak !== null}
        onOpenChange={(v) => !v && setKopyaKaynak(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-1.5">
              <Copy className="size-4 text-muted-foreground" /> Reçeteyi Kopyala
            </DialogTitle>
            <DialogDescription>
              &quot;{kopyaKaynak?.ad}&quot; tüm bileşenleriyle yeni bir reçete
              olarak kopyalanır.
            </DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            placeholder="Yeni reçete adı"
            value={kopyaAd}
            onChange={(e) => setKopyaAd(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void kopyala();
              }
            }}
          />
          <DialogFooter className="p-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setKopyaKaynak(null)}
            >
              İptal
            </Button>
            <Button size="sm" onClick={kopyala} disabled={!kopyaAd.trim()}>
              <Check className="size-3.5" /> Kopyala
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Yayılma uyarısı ── */}
      <Dialog open={kaydetOnay} onOpenChange={setKaydetOnay}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-1.5">
              <AlertTriangle className="size-4 text-amber-500" /> Değişiklik
              Yayılacak
            </DialogTitle>
            <DialogDescription>
              Bu reçete{" "}
              <strong>
                {etkilenen?.modeller.length ?? 0} model ve{" "}
                {etkilenen?.receteler.length ?? 0} reçetede
              </strong>{" "}
              kullanılıyor. Kaydedince hepsinin maliyeti bu değişiklikten
              etkilenecek.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Değişiklik notu (opsiyonel)"
            value={degisiklikNotu}
            onChange={(e) => setDegisiklikNotu(e.target.value)}
          />
          <DialogFooter className="p-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setKaydetOnay(false)}
            >
              İptal
            </Button>
            <Button size="sm" onClick={kaydetUygula} disabled={kaydediliyor}>
              {kaydediliyor ? "Kaydediliyor..." : "Kaydet ve Uygula"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Geri yükleme onayı ── */}
      <Dialog
        open={geriYukleNo !== null}
        onOpenChange={(v) => !v && setGeriYukleNo(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-1.5">
              <RotateCcw className="size-4 text-muted-foreground" /> Versiyona
              Dön
            </DialogTitle>
            <DialogDescription>
              Reçete v{geriYukleNo} sürümündeki haline döndürülecek. Bu işlem de
              yeni bir versiyon olarak kaydedilir, geçmiş kaybolmaz.
              {etkiSayisi > 0 && (
                <> Değişiklik {etkiSayisi} yeri etkileyecek.</>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="p-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setGeriYukleNo(null)}
            >
              İptal
            </Button>
            <Button size="sm" onClick={geriYukle}>
              <RotateCcw className="size-3.5" /> Geri Yükle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
