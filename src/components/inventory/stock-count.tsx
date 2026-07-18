"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  ClipboardList,
  ClipboardCheck,
  Trash2,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ListHeader } from "@/components/ui/list-header";
import { OzetKart } from "@/components/ui/ozet-kart";
import { SatirMenu } from "@/components/ui/satir-menu";
import { FormSheet } from "@/components/ui/form-sheet";
import { AnimatedField } from "@/components/ui/animated-field";
import { SearchSelect } from "@/components/ui/search-select";
import { TarihSecici } from "@/components/ui/tarih-secici";
import { useOnay } from "@/components/ui/confirm-dialog";
import { usePropAynasi } from "@/hooks/use-prop-aynasi";
import { useYetki, useYonetici } from "@/components/yetki/yetki-baglam";
import {
  useKolonAyarlari,
  KolonAyarButonu,
  KolonAyarSheet,
  type KolonTanim,
  type ListeKolonAyariDegeri,
} from "@/components/ui/kolon-ayarlari";
import { SiralaFiltreBaslik } from "@/components/ui/kolon-filtre";
import { formatTarih, type Sayim, type SayimDetay } from "@/lib/data";
import {
  sayimOlustur,
  sayimSatirKaydet,
  sayimTamamla,
  sayimSil,
} from "@/lib/db/actions";
import { getSayimDetayAction } from "@/lib/db/sayim-actions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BoxesIcon } from "@/components/ui/icons/boxes";
import { CalendarDaysIcon } from "@/components/ui/icons/calendar-days";
import { AlignLeftIcon } from "@/components/ui/icons/align-left";

/**
 * Stok sayımı — fiili sayım belgesi.
 *
 * Fark, belge tamamlandığında stok düzeltmesi olarak DEFTERE yazılır; bakiye
 * doğrudan güncellenmez. Böylece her düzeltmenin izi kalır ve ledger tek
 * kaynak olmayı sürdürür.
 */

const DURUM_RENK: Record<string, string> = {
  Taslak: "bg-amber-100 text-amber-800",
  Tamamlandı: "bg-emerald-100 text-emerald-800",
  İptal: "bg-rose-100 text-rose-800",
};

type SortKey = "id" | "tarih" | "depo" | "durum";

const TEMEL_KOLONLAR: KolonTanim[] = [
  { key: "id", label: "Sayım No", aciklama: "Belge numarası.", kilitli: true },
  { key: "tarih", label: "Tarih", aciklama: "Sayım tarihi." },
  { key: "depo", label: "Depo", aciklama: "Sayımın yapıldığı depo." },
  { key: "ilerleme", label: "İlerleme", aciklama: "Sayılan / toplam satır." },
  { key: "fark", label: "Net Fark", aciklama: "Sayılan satırların net farkı." },
  { key: "durum", label: "Durum", aciklama: "Taslak / Tamamlandı." },
  { key: "sorumlu", label: "Sorumlu", aciklama: "Sayımı açan kullanıcı." },
];

const sayiYaz = (n: number, hane = 3) =>
  n.toLocaleString("tr-TR", { maximumFractionDigits: hane });

export function StockCount({
  sayimlar = [],
  depolar = [],
  gruplar = [],
  kolonAyari,
  kullanicilar = [],
  mevcutKullaniciId = "",
}: {
  sayimlar?: Sayim[];
  depolar?: string[];
  gruplar?: string[];
  kolonAyari?: ListeKolonAyariDegeri;
  kullanicilar?: { id: string; ad: string }[];
  mevcutKullaniciId?: string;
} = {}) {
  const router = useRouter();
  const { onayla, onayDialog } = useOnay();
  // Kolon ayarı tüm kullanıcıları etkiler; yalnız yöneticiye açık.
  const yonetici = useYonetici();
  const yetki = useYetki("stok");
  const [liste] = usePropAynasi(sayimlar);

  const [durumF, setDurumF] = React.useState("Tümü");
  const [sort, setSort] = React.useState<{
    key: SortKey;
    dir: "asc" | "desc";
  }>({ key: "id", dir: "desc" });

  const [yeniAcik, setYeniAcik] = React.useState(false);
  const [detay, setDetay] = React.useState<SayimDetay | null>(null);
  const [detayAcik, setDetayAcik] = React.useState(false);

  const kolon = useKolonAyarlari({
    listeId: "sayim",
    yol: "/stok-yonetimi?bolum=sayim",
    temel: TEMEL_KOLONLAR,
    ek: [],
    ayar: kolonAyari,
    mevcutKullaniciId,
  });

  const filtreli = React.useMemo(() => {
    const arr = liste.filter((s) => durumF === "Tümü" || s.durum === durumF);
    const yon = sort.dir === "asc" ? 1 : -1;
    return [...arr].sort(
      (a, b) =>
        String(a[sort.key]).localeCompare(String(b[sort.key]), "tr") * yon,
    );
  }, [liste, durumF, sort]);

  const taslak = liste.filter((s) => s.durum === "Taslak").length;
  const tamam = liste.filter((s) => s.durum === "Tamamlandı").length;

  const sira = (k: SortKey) => (sort.key === k ? sort.dir : null);
  const sirala = (k: SortKey) => (dir: "asc" | "desc") =>
    setSort({ key: k, dir });

  async function detayAc(id: string) {
    const d = await getSayimDetayAction(id);
    if (!d) {
      toast.error("Sayım açılamadı.");
      return;
    }
    setDetay(d);
    setDetayAcik(true);
  }

  async function sil(s: Sayim) {
    const ok = await onayla({
      title: "Sayım silinsin mi?",
      description: `${s.id} — taslak sayım kalıcı olarak silinecek.`,
      confirmLabel: "Sil",
      destructive: true,
    });
    if (!ok) return;
    const res = await sayimSil(s.id);
    if (!res.ok) {
      toast.error(res.error ?? "Silinemedi.");
      return;
    }
    toast.success("Sayım silindi");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <OzetKart
          ikon={ClipboardList}
          etiket="Toplam Sayım"
          deger={liste.length}
        />
        <OzetKart
          ikon={Pencil}
          etiket="Taslak"
          deger={taslak}
          ton={taslak > 0 ? "amber" : "primary"}
          alt="sayımı sürüyor"
        />
        <OzetKart
          ikon={ClipboardCheck}
          etiket="Tamamlanan"
          deger={tamam}
          ton={tamam > 0 ? "emerald" : "primary"}
          alt="deftere işlendi"
        />
      </div>

      <div className="overflow-hidden rounded-md border bg-card">
        <ListHeader
          title="Sayımlar"
          filtreler={
            durumF !== "Tümü"
              ? [
                  {
                    etiket: "Durum",
                    deger: durumF,
                    onKaldir: () => setDurumF("Tümü"),
                  },
                ]
              : undefined
          }
        >
          {yonetici && <KolonAyarButonu kolon={kolon} />}
          {yetki.isAdd && (
            <Button size="sm" onClick={() => setYeniAcik(true)}>
              <Plus className="size-4" /> Yeni Sayım
            </Button>
          )}
        </ListHeader>

        <Table>
          <TableHeader>
            <TableRow>
              {kolon.temelGorunur("id") && (
                <SiralaFiltreBaslik
                  sira={sira("id")}
                  onSirala={sirala("id")}
                >
                  Sayım No
                </SiralaFiltreBaslik>
              )}
              {kolon.temelGorunur("tarih") && (
                <SiralaFiltreBaslik
                  sira={sira("tarih")}
                  onSirala={sirala("tarih")}
                >
                  Tarih
                </SiralaFiltreBaslik>
              )}
              {kolon.temelGorunur("depo") && (
                <SiralaFiltreBaslik
                  sira={sira("depo")}
                  onSirala={sirala("depo")}
                >
                  Depo
                </SiralaFiltreBaslik>
              )}
              {kolon.temelGorunur("ilerleme") && (
                <TableHead>İlerleme</TableHead>
              )}
              {kolon.temelGorunur("fark") && (
                <TableHead>Net Fark</TableHead>
              )}
              {kolon.temelGorunur("durum") && (
                <SiralaFiltreBaslik
                  sira={sira("durum")}
                  onSirala={sirala("durum")}
                  filtre={{
                    tip: "liste",
                    secenekler: ["Tümü", "Taslak", "Tamamlandı"],
                    deger: durumF,
                    onDeger: setDurumF,
                  }}
                >
                  Durum
                </SiralaFiltreBaslik>
              )}
              {kolon.temelGorunur("sorumlu") && (
                <TableHead>Sorumlu</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtreli.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={kolon.gorunurTemelSayisi}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  Henüz sayım yok. “Yeni Sayım” ile başlayın.
                </TableCell>
              </TableRow>
            ) : (
              filtreli.map((s) => (
                <SatirMenu
                  key={s.id}
                  aksiyonlar={[
                    {
                      etiket:
                        s.durum === "Taslak" ? "Say / Düzenle" : "Görüntüle",
                      ikon: ClipboardList,
                      onSecim: () => detayAc(s.id),
                    },
                    {
                      etiket: "Sil",
                      ikon: Trash2,
                      tehlike: true,
                      ayracOnce: true,
                      // Tamamlanmış sayım silinmez: düzeltmeleri deftere işlendi.
                      gizli: !yetki.isDelete || s.durum !== "Taslak",
                      onSecim: () => sil(s),
                    },
                  ]}
                >
                  <TableRow
                    className="cursor-pointer"
                    onClick={() => detayAc(s.id)}
                  >
                    {kolon.temelGorunur("id") && (
                      <TableCell className="font-mono text-xs">
                        {s.id}
                      </TableCell>
                    )}
                    {kolon.temelGorunur("tarih") && (
                      <TableCell className="text-sm">
                        {formatTarih(s.tarih)}
                      </TableCell>
                    )}
                    {kolon.temelGorunur("depo") && (
                      <TableCell className="text-sm">{s.depo}</TableCell>
                    )}
                    {kolon.temelGorunur("ilerleme") && (
                      <TableCell className="text-sm tabular-nums">
                        {s.sayilanAdet} / {s.satirAdet}
                      </TableCell>
                    )}
                    {kolon.temelGorunur("fark") && (
                      <TableCell
                        className={`text-sm tabular-nums ${
                          Math.abs(s.netFark) < 0.0005
                            ? "text-muted-foreground"
                            : s.netFark > 0
                              ? "text-emerald-600"
                              : "text-rose-600"
                        }`}
                      >
                        {s.sayilanAdet === 0
                          ? "—"
                          : `${s.netFark > 0 ? "+" : ""}${sayiYaz(s.netFark)}`}
                      </TableCell>
                    )}
                    {kolon.temelGorunur("durum") && (
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={DURUM_RENK[s.durum] ?? ""}
                        >
                          {s.durum}
                        </Badge>
                      </TableCell>
                    )}
                    {kolon.temelGorunur("sorumlu") && (
                      <TableCell className="text-sm text-muted-foreground">
                        {s.sorumlu ?? "—"}
                      </TableCell>
                    )}
                  </TableRow>
                </SatirMenu>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <span className="text-sm text-muted-foreground">
        {filtreli.length} sayım
      </span>

      <YeniSayimSheet
        acik={yeniAcik}
        onAcikDegis={setYeniAcik}
        depolar={depolar}
        gruplar={gruplar}
        onOlustu={(id) => {
          setYeniAcik(false);
          router.refresh();
          detayAc(id);
        }}
      />

      {detay && (
        <SayimDetaySheet
          acik={detayAcik}
          onAcikDegis={setDetayAcik}
          detay={detay}
          duzenlenebilir={yetki.isUpdate && detay.durum === "Taslak"}
          onDegisti={async () => {
            const t = await getSayimDetayAction(detay.id);
            if (t) setDetay(t);
            router.refresh();
          }}
        />
      )}

      <KolonAyarSheet kolon={kolon} kullanicilar={kullanicilar} />
      {onayDialog}
    </div>
  );
}

/** Yeni sayım belgesi — kapsam seçilir, satırlar sunucuda doldurulur. */
function YeniSayimSheet({
  acik,
  onAcikDegis,
  depolar,
  gruplar,
  onOlustu,
}: {
  acik: boolean;
  onAcikDegis: (v: boolean) => void;
  depolar: string[];
  gruplar: string[];
  onOlustu: (id: string) => void;
}) {
  const bugun = React.useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);
  const [depo, setDepo] = React.useState<string | null>(null);
  const [tarih, setTarih] = React.useState(bugun);
  const [grup, setGrup] = React.useState<string | null>(null);
  const [aciklama, setAciklama] = React.useState("");
  const [kaydediliyor, setKaydediliyor] = React.useState(false);

  React.useEffect(() => {
    if (!acik) return;
    setDepo(depolar[0] ?? null);
    setTarih(bugun);
    setGrup(null);
    setAciklama("");
  }, [acik, depolar, bugun]);

  async function kaydet() {
    if (!depo) {
      toast.error("Depo seçin.");
      return;
    }
    setKaydediliyor(true);
    const res = await sayimOlustur({
      depo,
      tarih,
      aciklama: aciklama.trim() || undefined,
      gruplar: grup ? [grup] : undefined,
    });
    setKaydediliyor(false);
    if (!res.ok || !res.id) {
      toast.error(res.error ?? "Sayım oluşturulamadı.");
      return;
    }
    toast.success(`${res.id} oluşturuldu`);
    onOlustu(res.id);
  }

  return (
    <FormSheet
      open={acik}
      onOpenChange={onAcikDegis}
      title="Yeni Sayım"
      icon={BoxesIcon}
      onSave={kaydet}
      saveLabel={kaydediliyor ? "Oluşturuluyor..." : "Oluştur"}
      contentClassName="flex flex-col gap-4"
    >
      <AnimatedField label="Depo" icon={BoxesIcon}>
        <SearchSelect
          items={depolar}
          value={depo}
          onValueChange={setDepo}
          placeholder="Depo seçin"
        />
      </AnimatedField>
      <AnimatedField label="Tarih" icon={CalendarDaysIcon}>
        <TarihSecici deger={tarih} onChange={setTarih} temizlenebilir={false} />
      </AnimatedField>
      <AnimatedField label="Kapsam" icon={BoxesIcon}>
        <SearchSelect
          items={gruplar}
          value={grup}
          onValueChange={setGrup}
          placeholder="Tüm aktif kartlar"
          temizlenebilir
        />
      </AnimatedField>
      <AnimatedField label="Açıklama" icon={AlignLeftIcon}>
        <Input
          placeholder="Örn. yıl sonu sayımı"
          value={aciklama}
          onChange={(e) => setAciklama(e.target.value)}
        />
      </AnimatedField>
      <p className="text-xs text-muted-foreground">
        Belge açıldığında kartların o anki miktarları satırlara kopyalanır.
        Fark, sayım tamamlanınca stok hareketi olarak yazılır.
      </p>
    </FormSheet>
  );
}

/** Sayım satırları — fiili miktar girilir, fark canlı hesaplanır. */
function SayimDetaySheet({
  acik,
  onAcikDegis,
  detay,
  duzenlenebilir,
  onDegisti,
}: {
  acik: boolean;
  onAcikDegis: (v: boolean) => void;
  detay: SayimDetay;
  duzenlenebilir: boolean;
  onDegisti: () => void;
}) {
  const { onayla, onayDialog } = useOnay();
  const [arama, setArama] = React.useState("");
  const [tamamlaniyor, setTamamlaniyor] = React.useState(false);
  // Girilen değerler yerel tutulur; kaydetme alandan çıkınca yapılır ki
  // her tuşta sunucuya gidilmesin.
  const [girdi, setGirdi] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (!acik) return;
    setArama("");
    setGirdi(
      Object.fromEntries(
        detay.satirlar.map((s) => [
          s.stokId,
          s.sayilan != null ? String(s.sayilan) : "",
        ]),
      ),
    );
  }, [acik, detay]);

  const gorunur = detay.satirlar.filter((s) =>
    s.stokAd.toLocaleLowerCase("tr").includes(arama.toLocaleLowerCase("tr")),
  );

  async function satirKaydet(stokId: string, ham: string) {
    const t = ham.trim().replace(",", ".");
    const sayi = t === "" ? null : Number(t);
    if (sayi != null && (!Number.isFinite(sayi) || sayi < 0)) {
      toast.error("Geçersiz miktar.");
      return;
    }
    const res = await sayimSatirKaydet(detay.id, stokId, sayi);
    if (!res.ok) {
      toast.error(res.error ?? "Kaydedilemedi.");
      return;
    }
    onDegisti();
  }

  async function tamamla() {
    const sayilan = detay.satirlar.filter((s) => s.sayilan != null);
    const farkli = sayilan.filter(
      (s) => Math.abs((s.sayilan ?? 0) - s.sistem) >= 0.0005,
    );
    const ok = await onayla({
      title: "Sayım tamamlansın mı?",
      description:
        `${sayilan.length} satır sayıldı, ${farkli.length} tanesinde fark var. ` +
        "Farklar stok hareketi olarak yazılacak ve sayım kilitlenecek.",
      confirmLabel: "Tamamla",
    });
    if (!ok) return;
    setTamamlaniyor(true);
    const res = await sayimTamamla(detay.id);
    setTamamlaniyor(false);
    if (!res.ok) {
      toast.error(res.error ?? "Tamamlanamadı.");
      return;
    }
    toast.success(`Sayım tamamlandı — ${res.duzeltilen ?? 0} kart düzeltildi`);
    onDegisti();
    onAcikDegis(false);
  }

  return (
    <FormSheet
      open={acik}
      onOpenChange={onAcikDegis}
      title={`${detay.id} · ${detay.depo}`}
      icon={BoxesIcon}
      sheetClassName="data-[side=right]:sm:max-w-2xl"
      contentClassName="flex flex-col gap-3"
      footer={
        <div className="flex items-center justify-between gap-2 border-t p-4">
          <span className="text-xs text-muted-foreground">
            {detay.sayilanAdet} / {detay.satirAdet} sayıldı
          </span>
          {duzenlenebilir ? (
            <Button onClick={tamamla} disabled={tamamlaniyor}>
              <ClipboardCheck className="size-4" />
              {tamamlaniyor ? "Tamamlanıyor..." : "Sayımı Tamamla"}
            </Button>
          ) : (
            <Badge
              variant="secondary"
              className={DURUM_RENK[detay.durum] ?? ""}
            >
              {detay.durum}
            </Badge>
          )}
        </div>
      }
    >
      <Input
        placeholder="Malzeme ara..."
        value={arama}
        onChange={(e) => setArama(e.target.value)}
      />
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Malzeme</TableHead>
              <TableHead>Kayıtlı</TableHead>
              <TableHead>Sayılan</TableHead>
              <TableHead>Fark</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {gorunur.map((s) => {
              const ham = girdi[s.stokId] ?? "";
              const sayi =
                ham.trim() === "" ? null : Number(ham.replace(",", "."));
              const fark = sayi != null && Number.isFinite(sayi) ? sayi - s.sistem : null;
              return (
                <TableRow key={s.stokId}>
                  <TableCell className="text-sm">{s.stokAd}</TableCell>
                  <TableCell className="text-sm tabular-nums text-muted-foreground">
                    {sayiYaz(s.sistem)} {s.birim}
                  </TableCell>
                  <TableCell className="w-32">
                    <Input
                      inputMode="decimal"
                      placeholder="—"
                      disabled={!duzenlenebilir}
                      value={ham}
                      onChange={(e) =>
                        setGirdi((g) => ({ ...g, [s.stokId]: e.target.value }))
                      }
                      onBlur={(e) => {
                        const yeni = e.target.value;
                        const eski = s.sayilan != null ? String(s.sayilan) : "";
                        // Değişmediyse sunucuya gitme.
                        if (yeni.trim() === eski.trim()) return;
                        satirKaydet(s.stokId, yeni);
                      }}
                      className="h-8 text-right tabular-nums"
                    />
                  </TableCell>
                  <TableCell
                    className={`text-sm tabular-nums ${
                      fark == null || Math.abs(fark) < 0.0005
                        ? "text-muted-foreground"
                        : fark > 0
                          ? "text-emerald-600"
                          : "text-rose-600"
                    }`}
                  >
                    {fark == null
                      ? "—"
                      : `${fark > 0 ? "+" : ""}${sayiYaz(fark)}`}
                  </TableCell>
                </TableRow>
              );
            })}
            {gorunur.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="py-8 text-center text-sm text-muted-foreground"
                >
                  Eşleşen malzeme yok.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {onayDialog}
    </FormSheet>
  );
}
