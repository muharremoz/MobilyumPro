"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Calculator, Plus, Trash } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchSelect } from "@/components/ui/search-select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { modulSablonKaydet } from "@/lib/db/actions";
import {
  BOS_DEGISKENLER,
  FORMUL_DEGISKENLERI,
  adetHesapla,
  formulHesapla,
  type FormulDegiskenleri,
} from "@/lib/formul";
import {
  satirMiktari,
  type KenarSecim,
  type Malzeme,
  type ModulSablon,
  type SablonParca,
} from "@/lib/data";

/**
 * Modül şablonu formu.
 *
 * Şablon, bir dolabın iskeletidir: parçaları hep aynıdır (alt, üst, sağ, sol,
 * arkalık, kapak) ama ölçüleri modülün ölçüsünden ve kapak sayısından türer.
 * Bu yüzden ölçü alanları sayı değil FORMÜL.
 *
 * Formülün doğru olup olmadığı ancak sonucuna bakılarak anlaşılır; bu yüzden
 * sağda deneme ölçüleriyle canlı bir önizleme var. Yalnız "kaydet, sonra
 * projede dene" akışı, hatalı formülü teklif hazırlarken buldururdu.
 */

const BOS_PARCA: SablonParca = {
  ad: "",
  sira: 0,
  adetFormul: "1",
  enFormul: "en",
  boyFormul: "boy",
  malzemeler: [],
};

/** Yeni şablonda başlangıç parçaları — her gövdede bunlar var. */
const ISKELET: Omit<SablonParca, "sira">[] = [
  {
    ad: "ALT",
    adetFormul: "1",
    enFormul: "en - 2*kalinlik",
    boyFormul: "derinlik",
    bant: { sag: true },
    malzemeler: [],
  },
  {
    ad: "ÜST",
    adetFormul: "1",
    enFormul: "en - 2*kalinlik",
    boyFormul: "derinlik",
    bant: { sag: true },
    malzemeler: [],
  },
  {
    ad: "SOL YAN",
    adetFormul: "1",
    enFormul: "derinlik",
    boyFormul: "boy",
    bant: { sag: true },
    malzemeler: [],
  },
  {
    ad: "SAĞ YAN",
    adetFormul: "1",
    enFormul: "derinlik",
    boyFormul: "boy",
    bant: { sag: true },
    malzemeler: [],
  },
  {
    ad: "ARKALIK",
    adetFormul: "1",
    enFormul: "en - 2*kalinlik",
    boyFormul: "boy - 2*kalinlik",
    malzemeler: [],
  },
  {
    ad: "KAPAK",
    adetFormul: "kapakSayisi",
    enFormul: "(en - 2*kalinlik) / kapakSayisi",
    boyFormul: "boy - 2*kalinlik",
    bant: { ust: true, alt: true, sol: true, sag: true },
    malzemeler: [],
  },
];

export function SablonForm({
  sablon,
  malzemeler,
  istasyonlar = [],
}: {
  sablon: ModulSablon | null;
  malzemeler: Malzeme[];
  istasyonlar?: { slug: string; ad: string }[];
}) {
  const router = useRouter();
  const yeniMi = sablon === null;
  const [kaydediliyor, setKaydediliyor] = React.useState(false);

  const [ad, setAd] = React.useState(sablon?.ad ?? "");
  const [aciklama, setAciklama] = React.useState(sablon?.aciklama ?? "");
  const [durum, setDurum] = React.useState<"Aktif" | "Pasif">(
    sablon?.durum ?? "Aktif",
  );
  const [varsayilan, setVarsayilan] = React.useState<FormulDegiskenleri>({
    en: sablon?.varsayilanEn ?? 1000,
    boy: sablon?.varsayilanBoy ?? 2000,
    derinlik: sablon?.varsayilanDerinlik ?? 500,
    kalinlik: sablon?.varsayilanKalinlik ?? 18,
    kapakSayisi: sablon?.varsayilanKapak ?? 2,
    rafSayisi: sablon?.varsayilanRaf ?? 0,
    cekmeceSayisi: sablon?.varsayilanCekmece ?? 0,
  });
  const [parcalar, setParcalar] = React.useState<SablonParca[]>(() =>
    sablon
      ? sablon.parcalar.map((p) => ({ ...p, bant: { ...p.bant } }))
      : ISKELET.map((p, i) => ({ ...p, sira: i + 1 })),
  );
  // Önizleme ölçüleri varsayılanlardan başlar ama ayrı tutulur: kullanıcı
  // "3 kapaklıda ne oluyor" diye denerken şablonun varsayılanı bozulmamalı.
  const [deneme, setDeneme] = React.useState<FormulDegiskenleri>({
    ...BOS_DEGISKENLER,
    ...varsayilan,
  });

  const malzemeMap = React.useMemo(
    () => new Map(malzemeler.map((m) => [m.id, m])),
    [malzemeler],
  );
  const malzemeEtiketi = React.useCallback(
    (m: Malzeme) => `${m.grup ?? "Grupsuz"} · ${m.ad}`,
    [],
  );
  const malzemeSekmeleri = React.useMemo(() => {
    const gruplar = new Map<string, string[]>();
    for (const m of malzemeler) {
      const g = m.grup ?? "Grupsuz";
      const arr = gruplar.get(g) ?? [];
      arr.push(malzemeEtiketi(m));
      gruplar.set(g, arr);
    }
    return [
      { key: "__tum", label: "Tümü", items: malzemeler.map(malzemeEtiketi) },
      ...[...gruplar.entries()]
        .sort((a, b) => a[0].localeCompare(b[0], "tr"))
        .map(([g, items]) => ({ key: g, label: g, items })),
    ];
  }, [malzemeler, malzemeEtiketi]);
  const etiketToId = React.useMemo(
    () => new Map(malzemeler.map((m) => [malzemeEtiketi(m), m.id])),
    [malzemeler, malzemeEtiketi],
  );

  function parcaGuncelle(i: number, d: Partial<SablonParca>) {
    setParcalar((l) => l.map((p, x) => (x === i ? { ...p, ...d } : p)));
  }

  async function kaydet() {
    if (!ad.trim()) {
      toast.error("Şablon adı gerekli");
      return;
    }
    setKaydediliyor(true);
    const res = await modulSablonKaydet({
      id: sablon?.id,
      ad: ad.trim(),
      aciklama: aciklama.trim() || undefined,
      durum,
      varsayilanEn: varsayilan.en || undefined,
      varsayilanBoy: varsayilan.boy || undefined,
      varsayilanDerinlik: varsayilan.derinlik || undefined,
      varsayilanKalinlik: varsayilan.kalinlik || undefined,
      varsayilanKapak: varsayilan.kapakSayisi || undefined,
      varsayilanRaf: varsayilan.rafSayisi || undefined,
      varsayilanCekmece: varsayilan.cekmeceSayisi || undefined,
      parcalar: parcalar
        .filter((p) => p.ad.trim())
        .map((p, i) => ({ ...p, sira: i + 1 })),
    });
    setKaydediliyor(false);
    if (!res.ok) {
      toast.error(res.error ?? "Kaydedilemedi");
      return;
    }
    toast.success(yeniMi ? "Şablon oluşturuldu" : "Şablon güncellendi");
    router.push("/modul-sablonlari");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-lg font-semibold">
          {yeniMi ? "Yeni Modül Şablonu" : ad || sablon?.ad}
        </h1>
        {!yeniMi && (
          <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
            {sablon?.id}
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => router.push("/modul-sablonlari")}
          >
            İptal
          </Button>
          <Button onClick={kaydet} disabled={kaydediliyor}>
            {kaydediliyor ? "Kaydediliyor…" : "Kaydet"}
          </Button>
        </div>
      </div>

      {/* Genel */}
      <div className="grid gap-3 rounded-md border bg-card p-4 sm:grid-cols-4">
        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-[11px] font-medium text-muted-foreground">
            Şablon Adı <span className="text-destructive">*</span>
          </span>
          <Input
            value={ad}
            onChange={(e) => setAd(e.target.value)}
            placeholder="Örn. DOLAP"
            className="h-8"
          />
        </label>
        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-[11px] font-medium text-muted-foreground">
            Açıklama
          </span>
          <Input
            value={aciklama}
            onChange={(e) => setAciklama(e.target.value)}
            className="h-8"
          />
        </label>
        <label className="flex items-center gap-2 sm:col-span-4">
          <Switch
            checked={durum === "Aktif"}
            onCheckedChange={(a) => setDurum(a ? "Aktif" : "Pasif")}
          />
          <span className="text-xs">Aktif</span>
        </label>
      </div>

      {/* Varsayılan ölçüler */}
      <div className="rounded-md border bg-card p-4">
        <p className="mb-2 text-xs font-medium">
          Varsayılan Ölçüler
          <span className="ml-2 font-normal text-muted-foreground">
            Projeye eklenirken forma önerilen başlangıç değerleri
          </span>
        </p>
        <DegiskenSatiri deger={varsayilan} onDeger={setVarsayilan} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        {/* Parçalar */}
        <div className="flex flex-col gap-2">
          {parcalar.map((p, i) => (
            <ParcaKarti
              key={i}
              parca={p}
              deneme={deneme}
              malzemeler={malzemeler}
              malzemeMap={malzemeMap}
              malzemeSekmeleri={malzemeSekmeleri}
              etiketToId={etiketToId}
              malzemeEtiketi={malzemeEtiketi}
              istasyonlar={istasyonlar}
              onDegis={(d) => parcaGuncelle(i, d)}
              onSil={() => setParcalar((l) => l.filter((_, j) => j !== i))}
            />
          ))}
          <Button
            variant="outline"
            size="sm"
            className="w-fit"
            onClick={() =>
              setParcalar((l) => [...l, { ...BOS_PARCA, sira: l.length + 1 }])
            }
          >
            <Plus className="size-4" /> Parça ekle
          </Button>
        </div>

        {/* Canlı önizleme */}
        <div className="flex h-fit flex-col gap-2 rounded-md border bg-muted/20 p-3 lg:sticky lg:top-4">
          <div className="flex items-center gap-1.5">
            <Calculator className="size-4 text-muted-foreground" />
            <span className="text-xs font-medium">Deneme</span>
            <button
              type="button"
              onClick={() => setDeneme({ ...BOS_DEGISKENLER, ...varsayilan })}
              className="ml-auto text-[11px] text-muted-foreground underline-offset-2 hover:underline"
            >
              varsayılanlara dön
            </button>
          </div>
          <DegiskenSatiri deger={deneme} onDeger={setDeneme} dar />
          <div className="mt-1 overflow-hidden rounded border bg-card">
            <div className="grid grid-cols-[1fr_44px_64px_64px] gap-1 border-b bg-muted/40 px-2 py-1 text-[10px] font-medium text-muted-foreground">
              <span>Parça</span>
              <span className="text-right">Adet</span>
              <span className="text-right">En</span>
              <span className="text-right">Boy</span>
            </div>
            {parcalar.filter((p) => p.ad.trim()).length === 0 ? (
              <p className="p-3 text-[11px] text-muted-foreground">
                Parça ekleyin, sonuçlar burada görünecek.
              </p>
            ) : (
              parcalar
                .filter((p) => p.ad.trim())
                .map((p, i) => {
                  const adet = adetHesapla(p.adetFormul, deneme);
                  const en = formulHesapla(p.enFormul, deneme);
                  const boy = formulHesapla(p.boyFormul, deneme);
                  const hata = !adet.ok || !en.ok || !boy.ok;
                  return (
                    <div
                      key={i}
                      className={cn(
                        "grid grid-cols-[1fr_44px_64px_64px] gap-1 border-b px-2 py-1 text-[11px] tabular-nums last:border-0",
                        hata && "bg-destructive/5",
                      )}
                    >
                      <span className="truncate">{p.ad}</span>
                      <span className="text-right">
                        {adet.ok ? adet.deger : "—"}
                      </span>
                      <span className="text-right">
                        {en.ok ? Math.round(en.deger) : "—"}
                      </span>
                      <span className="text-right">
                        {boy.ok ? Math.round(boy.deger) : "—"}
                      </span>
                    </div>
                  );
                })
            )}
          </div>
          <p className="text-[10px] text-muted-foreground">
            Kullanılabilir değişkenler: {FORMUL_DEGISKENLERI.join(", ")}
          </p>
        </div>
      </div>
    </div>
  );
}

/** en / boy / derinlik / kalınlık / kapak / raf / çekmece giriş satırı. */
function DegiskenSatiri({
  deger,
  onDeger,
  dar,
}: {
  deger: FormulDegiskenleri;
  onDeger: (d: FormulDegiskenleri) => void;
  dar?: boolean;
}) {
  const alanlar: { k: keyof FormulDegiskenleri; etiket: string }[] = [
    { k: "en", etiket: "En" },
    { k: "boy", etiket: "Boy" },
    { k: "derinlik", etiket: "Derinlik" },
    { k: "kalinlik", etiket: "Kalınlık" },
    { k: "kapakSayisi", etiket: "Kapak" },
    { k: "rafSayisi", etiket: "Raf" },
    { k: "cekmeceSayisi", etiket: "Çekmece" },
  ];
  return (
    <div className={cn("grid gap-2", dar ? "grid-cols-3" : "sm:grid-cols-7")}>
      {alanlar.map(({ k, etiket }) => (
        <label key={k} className="flex flex-col gap-1">
          <span className="text-[10px] text-muted-foreground">{etiket}</span>
          <Input
            type="number"
            min={0}
            value={deger[k]}
            onChange={(e) =>
              onDeger({ ...deger, [k]: Number(e.target.value) || 0 })
            }
            className="h-8 text-right tabular-nums"
          />
        </label>
      ))}
    </div>
  );
}

/** Tek şablon parçası: formüller + kenar bandı + malzemeler. */
function ParcaKarti({
  parca,
  deneme,
  malzemeler,
  malzemeMap,
  malzemeSekmeleri,
  etiketToId,
  malzemeEtiketi,
  istasyonlar,
  onDegis,
  onSil,
}: {
  parca: SablonParca;
  deneme: FormulDegiskenleri;
  malzemeler: Malzeme[];
  malzemeMap: Map<string, Malzeme>;
  malzemeSekmeleri: { key: string; label: string; items: string[] }[];
  etiketToId: Map<string, string>;
  malzemeEtiketi: (m: Malzeme) => string;
  istasyonlar: { slug: string; ad: string }[];
  onDegis: (d: Partial<SablonParca>) => void;
  onSil: () => void;
}) {
  const bant = parca.bant ?? {};
  const en = formulHesapla(parca.enFormul, deneme);
  const boy = formulHesapla(parca.boyFormul, deneme);

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="flex flex-wrap items-center gap-2 border-b bg-primary/[0.06] px-3 py-2">
        <Input
          value={parca.ad}
          onChange={(e) => onDegis({ ad: e.target.value })}
          placeholder="Parça adı (örn. KAPAK)"
          className="h-8 w-56 font-medium"
        />
        <Button
          variant="ghost"
          size="icon-sm"
          className="ml-auto size-7 text-muted-foreground hover:text-destructive"
          onClick={onSil}
          aria-label="Parçayı kaldır"
        >
          <Trash className="size-3.5" />
        </Button>
      </div>

      <div className="grid gap-2 px-3 py-2.5 sm:grid-cols-4">
        <FormulAlani
          etiket="Adet"
          deger={parca.adetFormul}
          onDeger={(v) => onDegis({ adetFormul: v })}
          sonuc={adetHesapla(parca.adetFormul, deneme)}
        />
        <FormulAlani
          etiket="En (mm)"
          deger={parca.enFormul}
          onDeger={(v) => onDegis({ enFormul: v })}
          sonuc={en}
        />
        <FormulAlani
          etiket="Boy (mm)"
          deger={parca.boyFormul}
          onDeger={(v) => onDegis({ boyFormul: v })}
          sonuc={boy}
        />
        <FormulAlani
          etiket="Kalınlık (mm)"
          deger={parca.kalinlikFormul ?? ""}
          onDeger={(v) => onDegis({ kalinlikFormul: v })}
          sonuc={
            parca.kalinlikFormul?.trim()
              ? formulHesapla(parca.kalinlikFormul, deneme)
              : undefined
          }
          isteğeBagli
        />
      </div>

      {/* Kenar bandı */}
      <div className="flex flex-wrap items-center gap-1.5 border-t px-3 py-2">
        <span className="text-[11px] text-muted-foreground">Bantlı kenar:</span>
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
              "rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors",
              bant[k]
                ? "border-primary bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            {etiket}
          </button>
        ))}
      </div>

      {/* Malzemeler */}
      <div className="flex flex-col gap-1.5 border-t bg-muted/10 px-3 py-2">
        {parca.malzemeler.map((m, i) => {
          const mlz = malzemeMap.get(m.malzemeId);
          // Miktar önizlemesi: m² alandan, metre bant uzunluğundan — projede
          // hesaplanacak değerin aynısı, kullanıcı burada görebilsin.
          const miktar = satirMiktari(
            mlz?.birim,
            {
              ad: parca.ad,
              sira: 0,
              netEn: en.ok ? en.deger : undefined,
              netBoy: boy.ok ? boy.deger : undefined,
            },
            parca.bant,
          );
          return (
            <div key={i} className="flex flex-wrap items-center gap-1.5">
              <div className="min-w-52 flex-1">
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
                          ? { ...x, malzemeId: etiketToId.get(etiket ?? "") ?? "" }
                          : x,
                      ),
                    })
                  }
                  placeholder="Malzeme seçin"
                  className="h-8"
                />
              </div>
              <span className="w-24 shrink-0 text-right text-[11px] text-muted-foreground tabular-nums">
                {miktar == null
                  ? (m.sabitMiktar ?? 1)
                  : Number(miktar.toFixed(4))}{" "}
                {mlz?.birim}
              </span>
              <label className="flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground">
                Fire
                <Input
                  type="number"
                  min={0}
                  value={m.fire ?? 0}
                  onChange={(e) =>
                    onDegis({
                      malzemeler: parca.malzemeler.map((x, j) =>
                        j === i ? { ...x, fire: Number(e.target.value) } : x,
                      ),
                    })
                  }
                  className="h-8 w-16 text-right tabular-nums"
                />
                %
              </label>
              <div className="w-36 shrink-0">
                <SearchSelect
                  items={istasyonlar.map((x) => x.ad)}
                  value={
                    istasyonlar.find((x) => x.slug === m.istasyon)?.ad ?? null
                  }
                  onValueChange={(adSecim) =>
                    onDegis({
                      malzemeler: parca.malzemeler.map((x, j) =>
                        j === i
                          ? {
                              ...x,
                              istasyon: istasyonlar.find(
                                (o) => o.ad === adSecim,
                              )?.slug,
                            }
                          : x,
                      ),
                    })
                  }
                  placeholder="İstasyon"
                  className="h-8"
                />
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                className="size-7 text-muted-foreground hover:text-destructive"
                onClick={() =>
                  onDegis({
                    malzemeler: parca.malzemeler.filter((_, j) => j !== i),
                  })
                }
                aria-label="Malzemeyi kaldır"
              >
                <Trash className="size-3.5" />
              </Button>
            </div>
          );
        })}
        <Button
          variant="outline"
          size="sm"
          className="h-7 w-fit text-xs"
          onClick={() =>
            onDegis({
              malzemeler: [...parca.malzemeler, { malzemeId: "", fire: 0 }],
            })
          }
        >
          <Plus className="size-3" /> Malzeme ekle
        </Button>
      </div>
    </div>
  );
}

/** Formül girişi + anlık sonucu/hatası. */
function FormulAlani({
  etiket,
  deger,
  onDeger,
  sonuc,
  isteğeBagli,
}: {
  etiket: string;
  deger: string;
  onDeger: (v: string) => void;
  sonuc?: { ok: true; deger: number } | { ok: false; hata: string };
  isteğeBagli?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] text-muted-foreground">{etiket}</span>
      <Input
        value={deger}
        onChange={(e) => onDeger(e.target.value)}
        placeholder={isteğeBagli ? "boş = modül kalınlığı" : "formül"}
        className={cn(
          "h-8 font-mono text-xs",
          sonuc && !sonuc.ok && "border-destructive",
        )}
      />
      <span
        className={cn(
          "text-[10px] tabular-nums",
          sonuc && !sonuc.ok ? "text-destructive" : "text-muted-foreground",
        )}
      >
        {!sonuc
          ? isteğeBagli
            ? "—"
            : ""
          : sonuc.ok
            ? `= ${Math.round(sonuc.deger * 100) / 100}`
            : sonuc.hata}
      </span>
    </label>
  );
}
