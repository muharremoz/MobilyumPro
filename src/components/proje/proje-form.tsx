"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Minus, Package, Plus, Trash } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchSelect } from "@/components/ui/search-select";
import { cn } from "@/lib/utils";
import { usePara } from "@/components/bicim-baglam";
import { projeKaydet } from "@/lib/db/actions";
import { COGALAN_PARCALAR, parcalariTuret } from "@/lib/proje-iskelet";
import {
  satirMiktari,
  type KenarSecim,
  type Malzeme,
  type Proje,
  type ProjeParca,
  type ProjeSatir,
} from "@/lib/data";

/**
 * Proje teklif ekranı.
 *
 * Fabrika büyük bir iş (otel gibi) için teklif verirken, sırf maliyet çıksın
 * diye onlarca modül ve yüzlerce parçayı sisteme tanımlıyordu; teklif
 * reddedilince hepsi çöp veri olarak kalıyordu. Burada hiçbir kalıcı Model
 * veya Modül kaydı oluşmaz — proje silinince iz kalmaz.
 *
 * Düzen: SOLDA modüller (dolap, komidin), SAĞDA seçili modülün parçaları
 * kutu olarak. Kapak sayısı artırıldığında kapak ve arkalık kutuları
 * kendiliğinden çoğalır; bir dolabın alt/üst/yanları zaten hep aynıdır.
 */

const BOS_SATIR = (sira: number): ProjeSatir => ({
  ad: "",
  sira,
  adet: 1,
  en: 1000,
  boy: 2000,
  derinlik: 560,
  kalinlik: 18,
  kapakSayisi: 1,
  rafSayisi: 0,
  cekmeceSayisi: 0,
  parcalar: [],
});

const DURUMLAR: Proje["durum"][] = [
  "Teklif",
  "Kazanıldı",
  "Kaybedildi",
  "İptal",
];

export function ProjeForm({
  proje,
  malzemeler,
  cariler,
  modulAdlari,
}: {
  proje: Proje | null;
  malzemeler: Malzeme[];
  cariler: { id: string; ad: string }[];
  /** Tanımlamalar → Parçalar: modül adı buradan seçilir. */
  modulAdlari: string[];
}) {
  const router = useRouter();
  const para = usePara();
  const yeniMi = proje === null;
  const [kaydediliyor, setKaydediliyor] = React.useState(false);

  const [ad, setAd] = React.useState(proje?.ad ?? "");
  const [cariId, setCariId] = React.useState(proje?.cariId ?? "");
  const [durum, setDurum] = React.useState<Proje["durum"]>(
    proje?.durum ?? "Teklif",
  );
  const [aciklama, setAciklama] = React.useState(proje?.aciklama ?? "");
  const [dokumanlar, setDokumanlar] = React.useState(proje?.dokumanlar ?? []);
  const [satirlar, setSatirlar] = React.useState<ProjeSatir[]>(
    proje?.satirlar ?? [],
  );
  const [aktif, setAktif] = React.useState(0);

  const malzemeMap = React.useMemo(
    () => new Map(malzemeler.map((m) => [m.id, m])),
    [malzemeler],
  );
  const malzemeEtiketi = React.useCallback(
    (m: Malzeme) => `${m.grup ?? "Grupsuz"} · ${m.ad}`,
    [],
  );
  const malzemeSekmeleri = React.useMemo(() => {
    const g = new Map<string, string[]>();
    for (const m of malzemeler) {
      const k = m.grup ?? "Grupsuz";
      const arr = g.get(k) ?? [];
      arr.push(malzemeEtiketi(m));
      g.set(k, arr);
    }
    return [
      { key: "__tum", label: "Tümü", items: malzemeler.map(malzemeEtiketi) },
      ...[...g.entries()]
        .sort((a, b) => a[0].localeCompare(b[0], "tr"))
        .map(([k, items]) => ({ key: k, label: k, items })),
    ];
  }, [malzemeler, malzemeEtiketi]);
  const etiketToId = React.useMemo(
    () => new Map(malzemeler.map((m) => [malzemeEtiketi(m), m.id])),
    [malzemeler, malzemeEtiketi],
  );

  /** Bir parçanın malzeme maliyeti (miktar ölçüden türer). */
  const parcaMaliyeti = React.useCallback(
    (p: ProjeParca) =>
      p.malzemeler.reduce((t, m) => {
        const mlz = malzemeMap.get(m.malzemeId);
        if (!mlz) return t;
        const hesap = satirMiktari(
          mlz.birim,
          { ad: p.ad, sira: p.sira, netEn: p.en, netBoy: p.boy },
          p.bant,
        );
        const miktar = hesap ?? m.miktar ?? 1;
        return t + miktar * (1 + (m.fire ?? 0) / 100) * mlz.birimFiyat * p.adet;
      }, 0),
    [malzemeMap],
  );

  const satirMaliyeti = React.useCallback(
    (s: ProjeSatir) =>
      s.parcalar.reduce((t, p) => t + parcaMaliyeti(p), 0) * (s.adet || 1),
    [parcaMaliyeti],
  );
  const toplamMaliyet = satirlar.reduce((t, s) => t + satirMaliyeti(s), 0);

  function satirGuncelle(i: number, d: Partial<ProjeSatir>) {
    setSatirlar((l) =>
      l.map((s, x) => {
        if (x !== i) return s;
        const yeni = { ...s, ...d };
        // Ölçü ya da kapak/raf sayısı değişince kutular yeniden türetilir;
        // elle düzeltilmiş kutular korunur.
        const olcuDegisti =
          d.en !== undefined ||
          d.boy !== undefined ||
          d.derinlik !== undefined ||
          d.kalinlik !== undefined ||
          d.kapakSayisi !== undefined ||
          d.rafSayisi !== undefined;
        if (!olcuDegisti) return yeni;
        return {
          ...yeni,
          parcalar: parcalariTuret(
            {
              en: yeni.en ?? 0,
              boy: yeni.boy ?? 0,
              derinlik: yeni.derinlik ?? 0,
              kalinlik: yeni.kalinlik ?? 18,
              kapakSayisi: yeni.kapakSayisi,
              rafSayisi: yeni.rafSayisi,
              cekmeceSayisi: yeni.cekmeceSayisi,
            },
            yeni.parcalar,
          ),
        };
      }),
    );
  }

  function modulEkle() {
    const yeni = BOS_SATIR(satirlar.length + 1);
    yeni.parcalar = parcalariTuret({
      en: yeni.en!,
      boy: yeni.boy!,
      derinlik: yeni.derinlik!,
      kalinlik: yeni.kalinlik!,
      kapakSayisi: yeni.kapakSayisi,
      rafSayisi: yeni.rafSayisi,
      cekmeceSayisi: 0,
    });
    setSatirlar((l) => [...l, yeni]);
    setAktif(satirlar.length);
  }

  async function kaydet() {
    if (!ad.trim()) {
      toast.error("Proje adı gerekli");
      return;
    }
    setKaydediliyor(true);
    const res = await projeKaydet({
      id: proje?.id,
      ad: ad.trim(),
      cariId: cariId || undefined,
      durum,
      aciklama: aciklama.trim() || undefined,
      dokumanlar,
      satirlar: satirlar.map((s, i) => ({ ...s, sira: i + 1 })),
    });
    setKaydediliyor(false);
    if (!res.ok) {
      toast.error(res.error ?? "Kaydedilemedi");
      return;
    }
    toast.success(yeniMi ? "Proje oluşturuldu" : "Proje güncellendi");
    router.push("/projeler");
    router.refresh();
  }

  const secili = satirlar[aktif];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-lg font-semibold">
          {yeniMi ? "Yeni Proje" : ad || proje?.ad}
        </h1>
        {!yeniMi && (
          <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
            {proje?.id}
          </span>
        )}
        <div className="ml-auto flex items-center gap-3">
          <div className="text-right">
            <p className="text-[10px] tracking-wide text-muted-foreground uppercase">
              Tahmini Maliyet
            </p>
            <p className="text-base font-semibold tabular-nums">
              {para(toplamMaliyet)}
            </p>
          </div>
          <Button variant="outline" onClick={() => router.push("/projeler")}>
            İptal
          </Button>
          <Button onClick={kaydet} disabled={kaydediliyor}>
            {kaydediliyor ? "Kaydediliyor…" : "Kaydet"}
          </Button>
        </div>
      </div>

      {/* Proje künyesi */}
      <div className="grid gap-3 rounded-md border bg-card p-3 sm:grid-cols-4">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-muted-foreground">
            Proje Adı <span className="text-destructive">*</span>
          </span>
          <Input
            value={ad}
            onChange={(e) => setAd(e.target.value)}
            placeholder="Örn. X OTELİ"
            className="h-8"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-muted-foreground">
            Müşteri
          </span>
          <SearchSelect
            items={cariler.map((c) => c.ad)}
            value={cariler.find((c) => c.id === cariId)?.ad ?? null}
            onValueChange={(v) =>
              setCariId(cariler.find((c) => c.ad === v)?.id ?? "")
            }
            temizlenebilir
            placeholder="Müşteri seçin"
            className="h-8"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-muted-foreground">
            Durum
          </span>
          <SearchSelect
            items={DURUMLAR}
            value={durum}
            onValueChange={(v) => setDurum((v as Proje["durum"]) ?? "Teklif")}
            placeholder="Durum"
            className="h-8"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-muted-foreground">
            Açıklama
          </span>
          <Input
            value={aciklama}
            onChange={(e) => setAciklama(e.target.value)}
            className="h-8"
          />
        </label>
      </div>

      {/* Teklif dosyaları */}
      <div className="rounded-md border bg-card p-3">
        <p className="mb-2 text-xs font-medium">Teklif Dosyaları</p>
        <div className="flex flex-col gap-1.5">
          {dokumanlar.map((d, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <Input
                value={d.ad}
                onChange={(e) =>
                  setDokumanlar((l) =>
                    l.map((x, j) => (j === i ? { ...x, ad: e.target.value } : x)),
                  )
                }
                placeholder="Dosya adı"
                className="h-8 w-56"
              />
              <Input
                value={d.url}
                onChange={(e) =>
                  setDokumanlar((l) =>
                    l.map((x, j) =>
                      j === i ? { ...x, url: e.target.value } : x,
                    ),
                  )
                }
                placeholder="Bağlantı / dosya yolu"
                className="h-8 flex-1"
              />
              <Button
                variant="ghost"
                size="icon-sm"
                className="size-7 text-muted-foreground hover:text-destructive"
                onClick={() =>
                  setDokumanlar((l) => l.filter((_, j) => j !== i))
                }
                aria-label="Kaldır"
              >
                <Trash className="size-3.5" />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            className="h-7 w-fit text-xs"
            onClick={() =>
              setDokumanlar((l) => [...l, { ad: "", url: "", tip: "Doküman" }])
            }
          >
            <Plus className="size-3" /> Dosya ekle
          </Button>
        </div>
      </div>

      {/* Modüller ve parçaları */}
      <div className="grid min-h-0 gap-3 lg:grid-cols-[320px_1fr]">
        {/* SOL: modül kartları */}
        <div className="flex flex-col gap-2">
          {satirlar.map((s, i) => (
            <ModulKarti
              key={i}
              satir={s}
              aktif={i === aktif}
              modulAdlari={modulAdlari}
              maliyet={satirMaliyeti(s)}
              para={para}
              onSec={() => setAktif(i)}
              onDegis={(d) => satirGuncelle(i, d)}
              onSil={() => {
                setSatirlar((l) => l.filter((_, j) => j !== i));
                setAktif(0);
              }}
            />
          ))}
          <Button variant="outline" size="sm" className="w-fit" onClick={modulEkle}>
            <Plus className="size-4" /> Modül ekle
          </Button>
        </div>

        {/* SAĞ: seçili modülün parça kutuları */}
        <div className="rounded-md border bg-card p-3">
          {!secili ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Soldan modül ekleyin; parçalar burada kutu olarak açılacak.
            </p>
          ) : (
            <>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium">
                  {secili.ad || "Adsız modül"}
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {secili.parcalar.length} parça
                </span>
                <span className="ml-auto text-xs text-muted-foreground">
                  Kapak sayısı arttıkça kapak ve arkalık kutuları kendiliğinden
                  eklenir.
                </span>
              </div>
              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {secili.parcalar.map((p, pi) => (
                  <ParcaKutusu
                    key={pi}
                    parca={p}
                    malzemeler={malzemeler}
                    malzemeMap={malzemeMap}
                    malzemeSekmeleri={malzemeSekmeleri}
                    etiketToId={etiketToId}
                    malzemeEtiketi={malzemeEtiketi}
                    maliyet={parcaMaliyeti(p)}
                    para={para}
                    onDegis={(d) =>
                      satirGuncelle(aktif, {
                        parcalar: secili.parcalar.map((x, j) =>
                          j === pi ? { ...x, ...d, elleDegisti: true } : x,
                        ),
                      })
                    }
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** Sol sütundaki modül kartı: ad + ölçüler + kapak/raf sayacı. */
function ModulKarti({
  satir,
  aktif,
  modulAdlari,
  maliyet,
  para,
  onSec,
  onDegis,
  onSil,
}: {
  satir: ProjeSatir;
  aktif: boolean;
  modulAdlari: string[];
  maliyet: number;
  para: (n: number) => string;
  onSec: () => void;
  onDegis: (d: Partial<ProjeSatir>) => void;
  onSil: () => void;
}) {
  return (
    <div
      onClick={onSec}
      className={cn(
        "cursor-pointer overflow-hidden rounded-lg border bg-card transition-colors",
        aktif ? "border-primary" : "hover:border-muted-foreground/30",
      )}
    >
      <div className="flex items-center gap-2 border-b bg-primary/[0.06] px-2 py-1.5">
        <Package className="size-3.5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1" onClick={(e) => e.stopPropagation()}>
          <SearchSelect
            items={modulAdlari}
            value={satir.ad || null}
            onValueChange={(v) => onDegis({ ad: v ?? "" })}
            placeholder="Modül seçin"
            className="h-7"
          />
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          className="size-6 text-muted-foreground hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onSil();
          }}
          aria-label="Modülü kaldır"
        >
          <Trash className="size-3" />
        </Button>
      </div>

      <div
        className="grid grid-cols-4 gap-1.5 px-2 py-2"
        onClick={(e) => e.stopPropagation()}
      >
        <OlcuAlani
          etiket="En"
          deger={satir.en}
          onDeger={(v) => onDegis({ en: v })}
        />
        <OlcuAlani
          etiket="Boy"
          deger={satir.boy}
          onDeger={(v) => onDegis({ boy: v })}
        />
        <OlcuAlani
          etiket="Derinlik"
          deger={satir.derinlik}
          onDeger={(v) => onDegis({ derinlik: v })}
        />
        <OlcuAlani
          etiket="Kalınlık"
          deger={satir.kalinlik}
          onDeger={(v) => onDegis({ kalinlik: v })}
        />
      </div>

      <div
        className="flex flex-wrap items-center gap-3 border-t px-2 py-2"
        onClick={(e) => e.stopPropagation()}
      >
        <Sayac
          etiket="Kapak"
          deger={satir.kapakSayisi}
          enAz={1}
          onDeger={(v) => onDegis({ kapakSayisi: v })}
        />
        <Sayac
          etiket="Raf"
          deger={satir.rafSayisi}
          onDeger={(v) => onDegis({ rafSayisi: v })}
        />
        <Sayac
          etiket="Adet"
          deger={satir.adet}
          enAz={1}
          onDeger={(v) => onDegis({ adet: v })}
        />
        <span className="ml-auto text-xs font-medium tabular-nums">
          {para(maliyet)}
        </span>
      </div>
    </div>
  );
}

function OlcuAlani({
  etiket,
  deger,
  onDeger,
}: {
  etiket: string;
  deger?: number;
  onDeger: (v: number) => void;
}) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-[10px] text-muted-foreground">{etiket}</span>
      <Input
        type="number"
        min={0}
        value={deger ?? ""}
        onChange={(e) => onDeger(Number(e.target.value) || 0)}
        className="h-7 px-1.5 text-right text-xs tabular-nums"
      />
    </label>
  );
}

/** +/- sayaç — kapak sayısını yazmak yerine tıklayarak artırmak için. */
function Sayac({
  etiket,
  deger,
  enAz = 0,
  onDeger,
}: {
  etiket: string;
  deger: number;
  enAz?: number;
  onDeger: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-[11px] text-muted-foreground">{etiket}</span>
      <div className="flex items-center rounded-md border">
        <button
          type="button"
          onClick={() => onDeger(Math.max(enAz, deger - 1))}
          disabled={deger <= enAz}
          className="grid size-6 place-items-center text-muted-foreground transition-colors hover:bg-muted disabled:opacity-30"
          aria-label={`${etiket} azalt`}
        >
          <Minus className="size-3" />
        </button>
        <span className="w-6 text-center text-xs font-medium tabular-nums">
          {deger}
        </span>
        <button
          type="button"
          onClick={() => onDeger(deger + 1)}
          className="grid size-6 place-items-center text-muted-foreground transition-colors hover:bg-muted"
          aria-label={`${etiket} artır`}
        >
          <Plus className="size-3" />
        </button>
      </div>
    </div>
  );
}

/** Sağdaki parça kutusu: ölçüler + kenar bandı + malzeme. */
function ParcaKutusu({
  parca,
  malzemeler,
  malzemeMap,
  malzemeSekmeleri,
  etiketToId,
  malzemeEtiketi,
  maliyet,
  para,
  onDegis,
}: {
  parca: ProjeParca;
  malzemeler: Malzeme[];
  malzemeMap: Map<string, Malzeme>;
  malzemeSekmeleri: { key: string; label: string; items: string[] }[];
  etiketToId: Map<string, string>;
  malzemeEtiketi: (m: Malzeme) => string;
  maliyet: number;
  para: (n: number) => string;
  onDegis: (d: Partial<ProjeParca>) => void;
}) {
  const bant = parca.bant ?? {};
  const otomatik = COGALAN_PARCALAR.some((x) => parca.ad.startsWith(x));
  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-muted/10 p-2.5">
      <div className="flex items-center gap-1.5">
        <span className="truncate text-xs font-semibold">{parca.ad}</span>
        {otomatik && (
          <span className="rounded bg-primary/10 px-1 text-[9px] font-medium text-primary">
            otomatik
          </span>
        )}
        {parca.elleDegisti && (
          <span className="rounded bg-amber-100 px-1 text-[9px] font-medium text-amber-800">
            elle
          </span>
        )}
        <span className="ml-auto text-[11px] tabular-nums">{para(maliyet)}</span>
      </div>

      <div className="grid grid-cols-4 gap-1">
        <OlcuAlani
          etiket="Adet"
          deger={parca.adet}
          onDeger={(v) => onDegis({ adet: Math.max(1, v) })}
        />
        <OlcuAlani
          etiket="En"
          deger={parca.en}
          onDeger={(v) => onDegis({ en: v })}
        />
        <OlcuAlani
          etiket="Boy"
          deger={parca.boy}
          onDeger={(v) => onDegis({ boy: v })}
        />
        <OlcuAlani
          etiket="Kalınlık"
          deger={parca.kalinlik}
          onDeger={(v) => onDegis({ kalinlik: v })}
        />
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <span className="text-[10px] text-muted-foreground">Bant:</span>
        {(
          [
            ["ust", "Üst"],
            ["alt", "Alt"],
            ["sol", "Sol"],
            ["sag", "Sağ"],
          ] as [keyof KenarSecim, string][]
        ).map(([k, etiket]) => (
          <button
            key={k}
            type="button"
            onClick={() => onDegis({ bant: { ...bant, [k]: !bant[k] } })}
            className={cn(
              "rounded border px-1.5 py-0.5 text-[10px] font-medium transition-colors",
              bant[k]
                ? "border-primary bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            {etiket}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-1">
        {parca.malzemeler.map((m, i) => {
          const mlz = malzemeMap.get(m.malzemeId);
          const hesap = satirMiktari(
            mlz?.birim,
            { ad: parca.ad, sira: parca.sira, netEn: parca.en, netBoy: parca.boy },
            parca.bant,
          );
          return (
            <div key={i} className="flex items-center gap-1">
              <div className="min-w-0 flex-1">
                <SearchSelect
                  sekmeler={malzemeSekmeleri}
                  value={
                    mlz
                      ? (malzemeler
                          .filter((x) => x.id === mlz.id)
                          .map(malzemeEtiketi)[0] ?? null)
                      : null
                  }
                  onValueChange={(etiket) =>
                    onDegis({
                      malzemeler: parca.malzemeler.map((x, j) =>
                        j === i
                          ? {
                              ...x,
                              malzemeId: etiketToId.get(etiket ?? "") ?? "",
                            }
                          : x,
                      ),
                    })
                  }
                  placeholder="Malzeme"
                  className="h-7"
                />
              </div>
              <span className="w-16 shrink-0 text-right text-[10px] text-muted-foreground tabular-nums">
                {hesap == null ? (m.miktar ?? 1) : Number(hesap.toFixed(3))}{" "}
                {mlz?.birim}
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                className="size-6 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() =>
                  onDegis({
                    malzemeler: parca.malzemeler.filter((_, j) => j !== i),
                  })
                }
                aria-label="Malzemeyi kaldır"
              >
                <Trash className="size-3" />
              </Button>
            </div>
          );
        })}
        <Button
          variant="outline"
          size="sm"
          className="h-6 w-fit text-[10px]"
          onClick={() =>
            onDegis({
              malzemeler: [
                ...parca.malzemeler,
                { malzemeId: "", miktar: 1, fire: 0 },
              ],
            })
          }
        >
          <Plus className="size-3" /> Malzeme
        </Button>
      </div>
    </div>
  );
}
