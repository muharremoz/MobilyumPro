"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LayoutGrid, List, Package, Replace } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SearchSelect } from "@/components/ui/search-select";
import { ReceteKartlari } from "@/components/production/recete-kartlari";
import { cn } from "@/lib/utils";
import { modelKopyaVerisi, modelKopyala } from "@/lib/db/actions";
import type {
  Malzeme,
  Model,
  ReceteGrup,
  ReceteSatiri,
} from "@/lib/data";

/**
 * Model kopyalama penceresi.
 *
 * Eski kopyalama modelin yalnız kendi satırını çoğaltıyordu; modüller
 * paylaşımlı kaldığı için kopyada bir malzemeyi değiştirmek orijinal modeli
 * de bozuyordu. Burada model ve BÜTÜN modülleri yeni kayıt olarak doğuyor,
 * kullanıcı kaydetmeden önce malzemeleri değiştirebiliyor.
 *
 * Asıl kullanım: aynı ürünün başka renk/desen sürümünü çıkarmak. Bu yüzden
 * liste görünümünde malzemeler stok grubuna göre öbekleniyor ve "bütün ahşap
 * ürünleri şununla değiştir" tek hamlede yapılabiliyor.
 */

type Modul = {
  kaynakParcaId: string;
  /** Kaynak modüldeki ad — değişiklik sayımı buna göre. */
  kaynakAd: string;
  ad: string;
  miktar: number;
  recete: ReceteSatiri[];
  gruplar: ReceteGrup[];
};

/**
 * Modül adını yeni modele uyarlar: "DORA DOLAP" + yeni ad "IKON YATAK ODASI"
 * → "IKON DOLAP". Modül adı kaynak modelin ilk kelimesiyle başlıyorsa o
 * kelime yeni modelin ilk kelimesiyle değişir; başlamıyorsa ad korunur
 * (kullanıcı zaten elle düzenleyebiliyor).
 */
export function modulAdiUyarla(
  modulAd: string,
  eskiModelAd: string,
  yeniModelAd: string,
): string {
  const eskiOnEk = eskiModelAd.trim().split(/\s+/)[0] ?? "";
  const yeniOnEk = yeniModelAd.trim().split(/\s+/)[0] ?? "";
  if (!eskiOnEk || !yeniOnEk) return modulAd;
  const kucuk = (x: string) => x.toLocaleLowerCase("tr");
  const parcalar = modulAd.trim().split(/\s+/);
  if (parcalar.length === 0 || kucuk(parcalar[0]) !== kucuk(eskiOnEk))
    return modulAd;
  return [yeniOnEk, ...parcalar.slice(1)].join(" ");
}

export function ModelKopyaDialog({
  model,
  acik,
  onKapat,
}: {
  model: Model | null;
  acik: boolean;
  onKapat: () => void;
}) {
  const router = useRouter();
  const [yukleniyor, setYukleniyor] = React.useState(false);
  const [kaydediliyor, setKaydediliyor] = React.useState(false);
  const [yeniAd, setYeniAd] = React.useState("");
  const [moduller, setModuller] = React.useState<Modul[]>([]);
  const [aktif, setAktif] = React.useState(0);
  const [gorunum, setGorunum] = React.useState<"kart" | "liste">("kart");
  const [malzemeler, setMalzemeler] = React.useState<Malzeme[]>([]);
  const [istasyonlar, setIstasyonlar] = React.useState<
    { slug: string; ad: string }[]
  >([]);
  // Kaynak reçeteler — "kaç satır değişti" sayımı için dokunulmadan saklanır.
  // Ref değil state: render sırasında okunuyor, sayaçlar buna göre çiziliyor.
  const [kaynakRecete, setKaynakRecete] = React.useState<
    Map<string, string[]>
  >(() => new Map());

  React.useEffect(() => {
    if (!acik || !model) return;
    let iptal = false;
    setYukleniyor(true);
    setYeniAd("");
    setAktif(0);
    modelKopyaVerisi(model.id)
      .then((res) => {
        if (iptal) return;
        if (!res.ok || !res.moduller) {
          toast.error(res.error ?? "Model bilgileri alınamadı");
          onKapat();
          return;
        }
        setKaynakRecete(
          new Map(
            res.moduller.map((m) => [
              m.parcaId,
              m.recete.map((r) => r.bilesen.ref),
            ]),
          ),
        );
        setModuller(
          res.moduller.map((m) => ({
            kaynakParcaId: m.parcaId,
            kaynakAd: m.ad,
            ad: m.ad,
            miktar: m.miktar,
            recete: m.recete,
            gruplar: m.gruplar,
          })),
        );
        setMalzemeler(res.malzemeler ?? []);
        setIstasyonlar(res.istasyonlar ?? []);
      })
      .finally(() => !iptal && setYukleniyor(false));
    return () => {
      iptal = true;
    };
  }, [acik, model, onKapat]);

  // Yeni ad yazıldıkça modül adları da uyarlanır; kullanıcı tek tek
  // düzeltmek zorunda kalmasın. Elle değiştirilen ad korunur.
  const elleDegisen = React.useRef<Set<number>>(new Set());
  React.useEffect(() => {
    if (!model || !yeniAd.trim()) return;
    setModuller((l) =>
      l.map((m, i) =>
        elleDegisen.current.has(i)
          ? m
          : { ...m, ad: modulAdiUyarla(m.kaynakAd, model.ad, yeniAd) },
      ),
    );
  }, [yeniAd, model]);

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

  const toplamSatir = moduller.reduce((t, m) => t + m.recete.length, 0);
  const degisenSatir = moduller.reduce((t, m) => {
    const kaynak = kaynakRecete.get(m.kaynakParcaId) ?? [];
    return (
      t +
      m.recete.filter((r, i) => (kaynak[i] ?? null) !== r.bilesen.ref).length
    );
  }, 0);

  const secili = moduller[aktif];

  function modulGuncelle(i: number, d: Partial<Modul>) {
    setModuller((l) => l.map((m, x) => (x === i ? { ...m, ...d } : m)));
  }

  /**
   * Bir stok grubundaki tüm satırların malzemesini değiştirir.
   * Kapsam: yalnız seçili modül ya da bütün modüller — renk değişikliği
   * genelde modelin tamamını ilgilendirdiği için ikincisi de gerekiyor.
   */
  function topluDegistir(grup: string, hedefId: string, tumu: boolean) {
    setModuller((l) =>
      l.map((m, i) => {
        if (!tumu && i !== aktif) return m;
        return {
          ...m,
          recete: m.recete.map((r) => {
            if (r.bilesen.tip !== "malzeme") return r;
            const mlz = malzemeMap.get(r.bilesen.ref);
            if ((mlz?.grup ?? "Grupsuz") !== grup) return r;
            return { ...r, bilesen: { tip: "malzeme", ref: hedefId } };
          }),
        };
      }),
    );
  }

  const adGecerli =
    yeniAd.trim().length > 0 &&
    yeniAd.trim().toLocaleLowerCase("tr") !==
      (model?.ad ?? "").toLocaleLowerCase("tr");

  async function kopyala() {
    if (!model || !adGecerli || kaydediliyor) return;
    setKaydediliyor(true);
    const res = await modelKopyala(
      model.id,
      yeniAd.trim(),
      moduller.map((m) => ({
        kaynakParcaId: m.kaynakParcaId,
        ad: m.ad.trim(),
        miktar: m.miktar,
        recete: m.recete,
        gruplar: m.gruplar,
      })),
    );
    setKaydediliyor(false);
    if (!res.ok || !res.id) {
      toast.error(res.error ?? "Kopyalanamadı");
      return;
    }
    toast.success(`${yeniAd.trim()} oluşturuldu (${moduller.length} modül)`);
    onKapat();
    router.push(`/urunler/${res.id}`);
  }

  return (
    <Dialog open={acik} onOpenChange={(a) => !a && onKapat()}>
      <DialogContent className="flex h-[92vh] max-h-[92vh] flex-col sm:max-w-7xl">
        <DialogHeader>
          <DialogTitle>Model Kopyala</DialogTitle>
          <DialogDescription>
            {model?.ad} modelinin tüm modülleri yeni kayıt olarak kopyalanır.
            Malzemeleri şimdi değiştirebilirsiniz; sonradan düzenlemek
            orijinali etkilemez.
          </DialogDescription>
        </DialogHeader>

        {/* Üst şerit: zorunlu yeni ad + sayaçlar */}
        <div className="flex flex-wrap items-end gap-3 rounded-md border bg-muted/20 px-3 py-2.5">
          <div className="min-w-64 flex-1">
            <label className="text-[11px] font-medium text-muted-foreground">
              Yeni Model Adı <span className="text-destructive">*</span>
            </label>
            <Input
              autoFocus
              value={yeniAd}
              onChange={(e) => setYeniAd(e.target.value)}
              placeholder={`Örn. ${model?.ad ?? ""} 2`}
              className={cn("mt-1 h-8", !adGecerli && yeniAd && "border-destructive")}
            />
          </div>
          <div className="flex items-center gap-4 pb-1">
            <Sayac etiket="Modül" deger={moduller.length} />
            <Sayac etiket="Malzeme satırı" deger={toplamSatir} />
            <Sayac
              etiket="Değiştirilen"
              deger={degisenSatir}
              vurgu={degisenSatir > 0}
            />
          </div>
        </div>

        {yukleniyor ? (
          <p className="flex-1 py-16 text-center text-sm text-muted-foreground">
            Modüller yükleniyor…
          </p>
        ) : (
          <div className="flex min-h-0 flex-1 gap-3">
            {/* Sol: modüller */}
            <div className="flex w-64 shrink-0 flex-col overflow-y-auto rounded-md border">
              <div className="border-b bg-muted/40 px-3 py-2 text-xs font-medium">
                Modüller
              </div>
              {moduller.length === 0 ? (
                <p className="p-3 text-xs text-muted-foreground">
                  Bu modele bağlı modül yok.
                </p>
              ) : (
                moduller.map((m, i) => {
                  const kaynak = kaynakRecete.get(m.kaynakParcaId) ?? [];
                  const degisen = m.recete.filter(
                    (r, x) => (kaynak[x] ?? null) !== r.bilesen.ref,
                  ).length;
                  return (
                    <button
                      key={m.kaynakParcaId}
                      type="button"
                      onClick={() => setAktif(i)}
                      className={cn(
                        "flex flex-col gap-1 border-b px-3 py-2 text-left transition-colors last:border-0",
                        i === aktif ? "bg-primary/[0.07]" : "hover:bg-muted/40",
                      )}
                    >
                      <div className="flex items-center gap-1.5">
                        <Package
                          className={cn(
                            "size-3.5 shrink-0",
                            i === aktif
                              ? "text-primary"
                              : "text-muted-foreground",
                          )}
                        />
                        <span className="truncate text-xs text-muted-foreground">
                          {m.kaynakAd}
                        </span>
                      </div>
                      {/* Yeni ad ayrı bir alan: kullanıcı hangi modülün neye
                          dönüştüğünü görmeli, sadece sonucu değil. */}
                      <Input
                        value={m.ad}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          elleDegisen.current.add(i);
                          modulGuncelle(i, { ad: e.target.value });
                        }}
                        className={cn(
                          "h-7 text-xs",
                          !m.ad.trim() && "border-destructive",
                        )}
                      />
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span>{m.recete.length} malzeme</span>
                        {degisen > 0 && (
                          <span className="rounded bg-amber-100 px-1 font-medium text-amber-800">
                            {degisen} değişti
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Sağ: seçili modülün reçetesi */}
            <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-md border">
              <div className="flex items-center gap-2 border-b bg-muted/40 px-3 py-2">
                <span className="truncate text-xs font-medium">
                  {secili?.ad || "—"}
                </span>
                <div className="ml-auto flex items-center gap-1">
                  <GorunumBtn
                    aktif={gorunum === "kart"}
                    ikon={LayoutGrid}
                    etiket="Kart"
                    onClick={() => setGorunum("kart")}
                  />
                  <GorunumBtn
                    aktif={gorunum === "liste"}
                    ikon={List}
                    etiket="Liste"
                    onClick={() => setGorunum("liste")}
                  />
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-3">
                {!secili ? (
                  <p className="text-xs text-muted-foreground">
                    Soldan bir modül seçin.
                  </p>
                ) : gorunum === "kart" ? (
                  <ReceteKartlari
                    gruplar={secili.gruplar}
                    satirlar={secili.recete}
                    onGruplar={(g) => modulGuncelle(aktif, { gruplar: g })}
                    onSatirlar={(s) => modulGuncelle(aktif, { recete: s })}
                    malzemeler={malzemeler}
                    malzemeSekmeleri={malzemeSekmeleri}
                    etiketToId={etiketToId}
                    malzemeEtiketi={malzemeEtiketi}
                    parcaAdlari={secili.gruplar.map((g) => g.ad)}
                    // Kopyalama penceresinde yeni tanım açılmıyor: amaç mevcut
                    // reçeteyi uyarlamak, yeni kart oluşturmak değil.
                    onYeniParca={() =>
                      toast.info("Yeni parça tanımı modül sayfasından eklenir")
                    }
                    onYeniMalzeme={() =>
                      toast.info("Yeni malzeme kartı malzeme sayfasından eklenir")
                    }
                    istasyonlar={istasyonlar.map((x) => ({
                      id: x.slug,
                      ad: x.ad,
                    }))}
                    ilkIstasyonSlug={istasyonlar[0]?.slug}
                  />
                ) : (
                  <ListeGorunum
                    satirlar={secili.recete}
                    malzemeMap={malzemeMap}
                    malzemeSekmeleri={malzemeSekmeleri}
                    etiketToId={etiketToId}
                    malzemeEtiketi={malzemeEtiketi}
                    malzemeler={malzemeler}
                    onSatir={(i, ref) =>
                      modulGuncelle(aktif, {
                        recete: secili.recete.map((r, x) =>
                          x === i
                            ? { ...r, bilesen: { tip: "malzeme", ref } }
                            : r,
                        ),
                      })
                    }
                    onToplu={topluDegistir}
                  />
                )}
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {!adGecerli && (
            <span className="mr-auto text-xs text-amber-700">
              Kopyalamak için kaynaktan farklı bir model adı girin.
            </span>
          )}
          <Button variant="outline" onClick={onKapat} disabled={kaydediliyor}>
            İptal
          </Button>
          <Button
            onClick={kopyala}
            disabled={!adGecerli || kaydediliyor || yukleniyor}
          >
            {kaydediliyor ? "Kopyalanıyor…" : "Kopyala"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Sayac({
  etiket,
  deger,
  vurgu,
}: {
  etiket: string;
  deger: number;
  vurgu?: boolean;
}) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] tracking-wide text-muted-foreground uppercase">
        {etiket}
      </span>
      <span
        className={cn(
          "text-base font-semibold tabular-nums",
          vurgu && "text-amber-700",
        )}
      >
        {deger}
      </span>
    </div>
  );
}

function GorunumBtn({
  aktif,
  ikon: Ikon,
  etiket,
  onClick,
}: {
  aktif: boolean;
  ikon: React.ComponentType<{ className?: string }>;
  etiket: string;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={aktif ? "secondary" : "ghost"}
      className="h-7 text-xs"
      onClick={onClick}
    >
      <Ikon className="size-3.5" /> {etiket}
    </Button>
  );
}

/**
 * Liste görünümü: reçete grupları olmadan düz satırlar.
 *
 * Üstte stok grubuna göre öbekler var — kopyalamanın asıl işi "bu modeldeki
 * bütün ahşabı şununla değiştir" olduğu için tek tek satır gezmek yerine
 * öbek başına tek seçim yetiyor.
 */
function ListeGorunum({
  satirlar,
  malzemeMap,
  malzemeSekmeleri,
  etiketToId,
  malzemeEtiketi,
  malzemeler,
  onSatir,
  onToplu,
}: {
  satirlar: ReceteSatiri[];
  malzemeMap: Map<string, Malzeme>;
  malzemeSekmeleri: { key: string; label: string; items: string[] }[];
  etiketToId: Map<string, string>;
  malzemeEtiketi: (m: Malzeme) => string;
  malzemeler: Malzeme[];
  onSatir: (index: number, ref: string) => void;
  onToplu: (grup: string, hedefId: string, tumu: boolean) => void;
}) {
  const [tumModuller, setTumModuller] = React.useState(true);

  const obekler = React.useMemo(() => {
    const m = new Map<string, number>();
    for (const s of satirlar) {
      if (s.bilesen.tip !== "malzeme") continue;
      const g = malzemeMap.get(s.bilesen.ref)?.grup ?? "Grupsuz";
      m.set(g, (m.get(g) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0], "tr"));
  }, [satirlar, malzemeMap]);

  return (
    <div className="flex flex-col gap-3">
      {/* Toplu değişim öbekleri */}
      {obekler.length > 0 && (
        <div className="rounded-md border bg-muted/20 p-3">
          <div className="mb-2 flex items-center gap-2">
            <Replace className="size-3.5 text-muted-foreground" />
            <span className="text-xs font-medium">Toplu Değiştir</span>
            <label className="ml-auto flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <input
                type="checkbox"
                checked={tumModuller}
                onChange={(e) => setTumModuller(e.target.checked)}
                className="size-3.5"
              />
              Tüm modüllerde uygula
            </label>
          </div>
          <div className="flex flex-col gap-2">
            {obekler.map(([grup, adet]) => (
              <div key={grup} className="flex items-center gap-2">
                <span className="w-44 shrink-0 truncate text-xs">
                  {grup}
                  <span className="ml-1 text-muted-foreground tabular-nums">
                    ({adet})
                  </span>
                </span>
                <div className="min-w-0 flex-1">
                  <SearchSelect
                    sekmeler={malzemeSekmeleri}
                    value={null}
                    onValueChange={(etiket) => {
                      const id = etiketToId.get(etiket ?? "");
                      if (!id) return;
                      onToplu(grup, id, tumModuller);
                    }}
                    placeholder={`${grup} satırlarını şununla değiştir…`}
                    className="h-8"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Düz satır listesi */}
      <div className="divide-y rounded-md border">
        {satirlar.length === 0 && (
          <p className="p-4 text-xs text-muted-foreground">
            Bu modülde malzeme yok.
          </p>
        )}
        {satirlar.map((s, i) => {
          const mlz =
            s.bilesen.tip === "malzeme"
              ? malzemeMap.get(s.bilesen.ref)
              : undefined;
          return (
            <div key={i} className="flex items-center gap-2 px-3 py-2">
              <span className="w-6 shrink-0 text-[11px] text-muted-foreground tabular-nums">
                {i + 1}
              </span>
              {/* Reçete grubu (parça) bilgisi kolonda kalıyor: liste
                  gruplamıyor ama satırın hangi parçaya ait olduğu kaybolmamalı. */}
              <span className="w-32 shrink-0 truncate text-[11px] text-muted-foreground">
                {s.grup?.trim() || "—"}
              </span>
              <div className="min-w-0 flex-1">
                <SearchSelect
                  sekmeler={malzemeSekmeleri}
                  value={
                    mlz
                      ? (malzemeler
                          .filter((m) => m.id === mlz.id)
                          .map(malzemeEtiketi)[0] ?? null)
                      : null
                  }
                  onValueChange={(etiket) => {
                    const id = etiketToId.get(etiket ?? "");
                    if (id) onSatir(i, id);
                  }}
                  placeholder="Malzeme seçin"
                  className="h-8"
                />
              </div>
              <span className="w-24 shrink-0 text-right text-xs tabular-nums">
                {s.miktar.toLocaleString("tr-TR", {
                  maximumFractionDigits: 4,
                })}
                <span className="ml-1 text-[10px] text-muted-foreground">
                  {mlz?.birim}
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
