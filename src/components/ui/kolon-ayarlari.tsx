"use client";

import * as React from "react";
import { Columns3 } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { FormSheet } from "@/components/ui/form-sheet";
import { SheetClose, SheetFooter } from "@/components/ui/sheet";
import { MultiSearchSelect } from "@/components/ui/multi-search-select";
import { listeKolonKaydet } from "@/lib/db/actions";

/**
 * PROJE STANDARDI — Liste sütun ayarları.
 *
 * Her listede aynı özellik: ListHeader'a <KolonAyarButonu>, sayfa sonuna
 * <KolonAyarSheet>; görünürlük hesabı useKolonAyarlari hook'undan gelir.
 *
 * Kullanım (yeni bir listeye eklerken):
 *   1. Server page: getListeKolonAyari("<listeId>") + getKullanicilar() çek,
 *      mevcutKullaniciId ile birlikte listeye prop geç.
 *   2. Liste bileşeninde TEMEL/EK kolon tanımlarını yaz (KolonTanim[]).
 *   3. const kolon = useKolonAyarlari({ listeId, yol, temel, ek, ayar, mevcutKullaniciId });
 *   4. ListHeader içine {yonetici && <KolonAyarButonu kolon={kolon} />}
 *   5. Kök elemanın sonuna <KolonAyarSheet kolon={kolon} kullanicilar={...} />
 *   6. Başlık/hücrelerde kolon.temelGorunur(key) ve kolon.ekGorunur(key) ile
 *      koşullu render; colSpan = sabit kolonlar + kolon.gorunurTemelSayisi +
 *      görünür ek sayısı.
 */
export type KolonTanim = {
  key: string;
  label: string;
  aciklama: string;
  /** true ise kapatılamaz (listenin kimlik kolonu). */
  kilitli?: boolean;
};

export type ListeKolonAyariDegeri = {
  kolonlar: string[];
  kullanicilar: string[];
  gizliTemel: string[];
};

export function useKolonAyarlari({
  listeId,
  yol,
  temel,
  ek,
  ayar,
  mevcutKullaniciId = "",
}: {
  listeId: string;
  /** revalidatePath için liste sayfası yolu (ör. "/urunler"). */
  yol?: string;
  temel: KolonTanim[];
  ek: KolonTanim[];
  ayar?: ListeKolonAyariDegeri;
  mevcutKullaniciId?: string;
}) {
  const [ekSet, setEkSet] = React.useState<Set<string>>(
    () => new Set(ayar?.kolonlar ?? []),
  );
  const [kisiler, setKisiler] = React.useState<string[]>(() => [
    ...(ayar?.kullanicilar ?? []),
  ]);
  const [gizliTemel, setGizliTemel] = React.useState<Set<string>>(
    () => new Set(ayar?.gizliTemel ?? []),
  );
  const [acik, setAcik] = React.useState(false);

  const temelGorunur = (key: string) => !gizliTemel.has(key);
  const gorunurTemelSayisi = temel.filter((k) => temelGorunur(k.key)).length;
  // Ek kolonlar yalnızca seçili kullanıcılara görünür.
  const benGoruyorum =
    mevcutKullaniciId !== "" && kisiler.includes(mevcutKullaniciId);
  const ekGorunur = (key: string) => benGoruyorum && ekSet.has(key);

  async function ayarYaz(
    kolonlar: Set<string>,
    yeniKisiler: string[],
    gizli: Set<string>,
  ): Promise<void> {
    const oncekiK = new Set(ekSet);
    const oncekiU = [...kisiler];
    const oncekiG = new Set(gizliTemel);
    setEkSet(new Set(kolonlar));
    setKisiler([...yeniKisiler]);
    setGizliTemel(new Set(gizli));
    const res = await listeKolonKaydet(
      listeId,
      {
        kolonlar: ek.filter((k) => kolonlar.has(k.key)).map((k) => k.key),
        kullanicilar: yeniKisiler,
        gizliTemel: temel.filter((k) => gizli.has(k.key)).map((k) => k.key),
      },
      yol,
    );
    if (!res.ok) {
      setEkSet(oncekiK);
      setKisiler(oncekiU);
      setGizliTemel(oncekiG);
      toast.error(res.error ?? "Kolon ayarı kaydedilemedi.");
    }
  }

  /** Ek kolonu aç/kapat; hiç kullanıcı seçili değilse ayarı yapan eklenir. */
  async function ekDegis(key: string, aktif: boolean) {
    const k = new Set(ekSet);
    if (aktif) k.add(key);
    else k.delete(key);
    const yeniKisiler =
      aktif && kisiler.length === 0 && mevcutKullaniciId
        ? [mevcutKullaniciId]
        : kisiler;
    await ayarYaz(k, yeniKisiler, gizliTemel);
  }

  /** Temel kolonu aç/kapat (kilitliler hariç; herkes için geçerli). */
  async function temelDegis(key: string, aktif: boolean) {
    const g = new Set(gizliTemel);
    if (aktif) g.delete(key);
    else g.add(key);
    await ayarYaz(ekSet, kisiler, g);
  }

  async function kisilerDegis(ids: string[]) {
    await ayarYaz(ekSet, ids, gizliTemel);
  }

  return {
    temel,
    ek,
    acik,
    setAcik,
    ekSet,
    kisiler,
    temelGorunur,
    ekGorunur,
    gorunurTemelSayisi,
    ekDegis,
    temelDegis,
    kisilerDegis,
  };
}

export type KolonAyarlariApi = ReturnType<typeof useKolonAyarlari>;

/** ListHeader'a konulan "Sütunlar" butonu. */
export function KolonAyarButonu({
  kolon,
  className,
}: {
  kolon: KolonAyarlariApi;
  className?: string;
}) {
  return (
    <Button
      variant="outline"
      className={className}
      onClick={() => kolon.setAcik(true)}
    >
      <Columns3 className="size-4" /> Sütunlar
    </Button>
  );
}

/** Sütun ayarları sheet'i — kullanıcı seçimi + tüm kolonların toggle listesi. */
export function KolonAyarSheet({
  kolon,
  kullanicilar = [],
}: {
  kolon: KolonAyarlariApi;
  kullanicilar?: { id: string; ad: string }[];
}) {
  return (
    <FormSheet
      open={kolon.acik}
      onOpenChange={kolon.setAcik}
      title="Liste Sütunları"
      footer={
        <SheetFooter className="mt-1 flex-row justify-end gap-2 rounded-md border bg-card p-2">
          <SheetClose render={<Button variant="outline">Kapat</Button>} />
        </SheetFooter>
      }
    >
      <div className="grid gap-2.5">
        <p className="text-xs text-muted-foreground">
          {kolon.ek.length > 0
            ? "Seçim anında uygulanır. Seçtiğiniz ek sütunlar aşağıdaki kullanıcıların listesinde görünür."
            : "Seçim anında uygulanır ve herkes için geçerlidir."}
        </p>

        {/* Tek kullanıcı seçimi — yalnızca ek sütunu olan listelerde */}
        {kolon.ek.length > 0 && (
          <div className="grid gap-1.5 rounded-md border p-3">
            <span className="text-sm font-medium">Kullanıcılar</span>
            <MultiSearchSelect
              items={kullanicilar.map((k) => k.ad)}
              value={kolon.kisiler.map(
                (id) => kullanicilar.find((k) => k.id === id)?.ad ?? id,
              )}
              onValueChange={(adlar) =>
                kolon.kisilerDegis(
                  adlar.map(
                    (ad) => kullanicilar.find((k) => k.ad === ad)?.id ?? ad,
                  ),
                )
              }
              placeholder="Kullanıcı seç…"
            />
          </div>
        )}

        {/* Tüm sütunlar tek listede: kilitliler hariç aç/kapa */}
        <div className="overflow-hidden rounded-md border">
          {kolon.temel.map((k) => (
            <label
              key={k.key}
              className={cn(
                "flex items-center justify-between gap-3 border-b px-3 py-2 last:border-b-0",
                k.kilitli ? "cursor-default" : "cursor-pointer",
              )}
            >
              <span className="min-w-0">
                <span className="block text-sm font-medium">{k.label}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {k.aciklama}
                </span>
              </span>
              <Switch
                checked={k.kilitli || kolon.temelGorunur(k.key)}
                disabled={k.kilitli}
                onCheckedChange={(v) =>
                  !k.kilitli && kolon.temelDegis(k.key, v === true)
                }
                aria-label={`${k.label} kolonu`}
                className="shrink-0 data-checked:bg-emerald-600"
              />
            </label>
          ))}
          {kolon.ek.map((k) => (
            <label
              key={k.key}
              className="flex cursor-pointer items-center justify-between gap-3 border-b px-3 py-2 last:border-b-0"
            >
              <span className="min-w-0">
                <span className="block text-sm font-medium">{k.label}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {k.aciklama}
                </span>
              </span>
              <Switch
                checked={kolon.ekSet.has(k.key)}
                onCheckedChange={(v) => kolon.ekDegis(k.key, v === true)}
                aria-label={`${k.label} kolonunu göster`}
                className="shrink-0 data-checked:bg-emerald-600"
              />
            </label>
          ))}
        </div>
      </div>
    </FormSheet>
  );
}
