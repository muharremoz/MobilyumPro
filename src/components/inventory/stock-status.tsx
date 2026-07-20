"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Boxes,
  AlertOctagon,
  ExternalLink,
  History,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ListHeader } from "@/components/ui/list-header";
import { OzetKart } from "@/components/ui/ozet-kart";
import {
  useKolonAyarlari,
  KolonAyarButonu,
  KolonAyarSheet,
  type KolonTanim,
  type ListeKolonAyariDegeri,
} from "@/components/ui/kolon-ayarlari";
import { SiralaFiltreBaslik } from "@/components/ui/kolon-filtre";
import { SatirMenu } from "@/components/ui/satir-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Model } from "@/lib/data";
import {
  stokDurumu,
  KRITIK_VARSAYILAN,
  STOK_DURUM_ETIKET,
  STOK_DURUM_RENK,
} from "@/lib/stok-durum";
import { useYonetici } from "@/components/yetki/yetki-baglam";

function durum(stok: number, minStok: number | undefined, esik: number) {
  const d = stokDurumu(stok, minStok, esik);
  return { etiket: STOK_DURUM_ETIKET[d], renk: STOK_DURUM_RENK[d] };
}

type SortKey = "id" | "ad" | "kategori" | "stok" | "durum";

/** Proje standardı kolon tanımları (kolon-ayarlari modülü). */
const TEMEL_KOLONLAR: KolonTanim[] = [
  { key: "id", label: "Kod", aciklama: "Model kodu." },
  { key: "ad", label: "Model", aciklama: "Modelin adı.", kilitli: true },
  { key: "kategori", label: "Kategori", aciklama: "Model kategorisi." },
  { key: "stok", label: "Stok", aciklama: "Eldeki miktar." },
  {
    key: "durum",
    label: "Durum",
    aciklama: "Stok durumu (Yeterli/Kritik/Tükendi).",
  },
];
const EK_KOLONLAR: KolonTanim[] = [];

export function StockStatus({
  urunler,
  kolonAyari,
  kullanicilar = [],
  mevcutKullaniciId = "",
  // Eşik sunucudan gelir (kritik_stok_esigi); bu bileşen istemcide çalıştığı
  // için parametreyi kendisi okuyamaz.
  kritikEsik = KRITIK_VARSAYILAN,
}: {
  urunler: Model[];
  kolonAyari?: ListeKolonAyariDegeri;
  kullanicilar?: { id: string; ad: string }[];
  mevcutKullaniciId?: string;
  kritikEsik?: number;
}) {
  // Kolon ayarı tüm kullanıcıları etkiler; yalnız yöneticiye açık.
  const yonetici = useYonetici();
  const router = useRouter();
  // Kolon filtreleri (başlık popover'larından)
  const [metinFiltre, setMetinFiltre] = React.useState({ id: "", ad: "" });
  const [kategoriF, setKategoriF] = React.useState("Tümü");
  const [stokAralik, setStokAralik] = React.useState({ min: "", max: "" });
  const [filt, setFilt] = React.useState("Tümü");
  const [sort, setSort] = React.useState<{ key: SortKey; dir: "asc" | "desc" }>(
    { key: "stok", dir: "asc" },
  );

  // Sütun ayarları — proje standardı (ui/kolon-ayarlari).
  const kolon = useKolonAyarlari({
    listeId: "stok-durumu",
    yol: "/stok-yonetimi",
    temel: TEMEL_KOLONLAR,
    ek: EK_KOLONLAR,
    ayar: kolonAyari,
    mevcutKullaniciId,
  });

  const kategoriler = React.useMemo(
    () => [...new Set(urunler.map((u) => u.kategori))],
    [urunler],
  );

  const filtreli = React.useMemo(() => {
    const arada = (n: number, min: string, max: string) =>
      (min === "" || n >= Number(min)) && (max === "" || n <= Number(max));
    const arr = urunler.filter((u) => {
      const kod = u.id.toLowerCase().includes(metinFiltre.id.toLowerCase());
      const ad = u.ad.toLowerCase().includes(metinFiltre.ad.toLowerCase());
      const k = kategoriF === "Tümü" || u.kategori === kategoriF;
      const s = arada(u.stok, stokAralik.min, stokAralik.max);
      let dur = true;
      if (filt === "Tükendi") dur = stokDurumu(u.stok, u.minStok, kritikEsik) === "tukendi";
      else if (filt === "Kritik") dur = stokDurumu(u.stok, u.minStok, kritikEsik) === "kritik";
      else if (filt === "Yeterli") dur = stokDurumu(u.stok, u.minStok, kritikEsik) === "yeterli";
      return kod && ad && k && s && dur;
    });
    const yon = sort.dir === "asc" ? 1 : -1;
    return [...arr].sort((a, b) => {
      if (sort.key === "stok") return (a.stok - b.stok) * yon;
      if (sort.key === "durum")
        return (
          durum(a.stok, a.minStok, kritikEsik).etiket.localeCompare(
            durum(b.stok, b.minStok, kritikEsik).etiket,
            "tr",
          ) * yon
        );
      const x = a[sort.key];
      const y = b[sort.key];
      return String(x).localeCompare(String(y), "tr") * yon;
    });
  }, [urunler, metinFiltre, kategoriF, stokAralik, filt, sort]);

  const kritik = urunler.filter(
    (u) => stokDurumu(u.stok, u.minStok, kritikEsik) === "kritik",
  ).length;
  const tukenen = urunler.filter(
    (u) => stokDurumu(u.stok, u.minStok, kritikEsik) === "tukendi",
  ).length;
  const toplamAdet = urunler.reduce((t, u) => t + u.stok, 0);

  // Kolon başlığı sıralama yardımcıları — SiralaFiltreBaslik (proje standardı).
  const sira = (k: SortKey) => (sort.key === k ? sort.dir : null);
  const sirala = (k: SortKey) => (dir: "asc" | "desc") =>
    setSort({ key: k, dir });

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <OzetKart
          ikon={Boxes}
          etiket="Toplam Stok"
          deger={toplamAdet.toLocaleString("tr-TR")}
          alt={`${urunler.length} kalem`}
        />
        <OzetKart
          ikon={AlertTriangle}
          etiket="Kritik Stok"
          deger={kritik}
          ton={kritik > 0 ? "amber" : "primary"}
          alt="min. stok altı"
        />
        <OzetKart
          ikon={AlertOctagon}
          etiket="Tükenen"
          deger={tukenen}
          ton={tukenen > 0 ? "rose" : "primary"}
          alt="stoğu sıfır"
        />
      </div>

      {/* Tablo — proje standardı liste kartı */}
      <div className="overflow-hidden rounded-md border bg-card">
        <ListHeader title="Stok Durumu">
          {yonetici && <KolonAyarButonu kolon={kolon} />}
        </ListHeader>
        <Table>
          <TableHeader>
            <TableRow>
              {kolon.temelGorunur("id") && (
                <SiralaFiltreBaslik
                  sira={sira("id")}
                  onSirala={sirala("id")}
                  filtre={{
                    tip: "metin",
                    deger: metinFiltre.id,
                    onDeger: (v) => setMetinFiltre((f) => ({ ...f, id: v })),
                  }}
                >
                  Kod
                </SiralaFiltreBaslik>
              )}
              <SiralaFiltreBaslik
                sira={sira("ad")}
                onSirala={sirala("ad")}
                filtre={{
                  tip: "metin",
                  deger: metinFiltre.ad,
                  onDeger: (v) => setMetinFiltre((f) => ({ ...f, ad: v })),
                }}
              >
                Model
              </SiralaFiltreBaslik>
              {kolon.temelGorunur("kategori") && (
                <SiralaFiltreBaslik
                  sira={sira("kategori")}
                  onSirala={sirala("kategori")}
                  filtre={{
                    tip: "liste",
                    secenekler: kategoriler,
                    deger: kategoriF,
                    onDeger: setKategoriF,
                  }}
                >
                  Kategori
                </SiralaFiltreBaslik>
              )}
              {kolon.temelGorunur("stok") && (
                <SiralaFiltreBaslik
                  className="text-right"
                  sira={sira("stok")}
                  onSirala={sirala("stok")}
                  filtre={{
                    tip: "sayi",
                    min: stokAralik.min,
                    max: stokAralik.max,
                    onDegis: (min, max) => setStokAralik({ min, max }),
                  }}
                >
                  Stok
                </SiralaFiltreBaslik>
              )}
              {kolon.temelGorunur("durum") && (
                <SiralaFiltreBaslik
                  sira={sira("durum")}
                  onSirala={sirala("durum")}
                  filtre={{
                    tip: "liste",
                    secenekler: ["Yeterli", "Kritik", "Tükendi"],
                    deger: filt,
                    onDeger: setFilt,
                  }}
                >
                  Durum
                </SiralaFiltreBaslik>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtreli.map((u) => {
              const d = durum(u.stok, u.minStok, kritikEsik);
              return (
                <SatirMenu
                  key={u.id}
                  aksiyonlar={[
                    {
                      etiket: "Kartı aç",
                      ikon: ExternalLink,
                      onSecim: () => router.push(`/urunler/${u.id}`),
                    },
                    {
                      etiket: "Hareketleri gör",
                      ikon: History,
                      onSecim: () =>
                        router.push("/stok-yonetimi?bolum=hareketler"),
                    },
                  ]}
                >
                  <TableRow>
                    {kolon.temelGorunur("id") && (
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {u.id}
                      </TableCell>
                    )}
                    <TableCell className="font-medium">{u.ad}</TableCell>
                    {kolon.temelGorunur("kategori") && (
                      <TableCell className="text-muted-foreground">
                        {u.kategori}
                      </TableCell>
                    )}
                    {kolon.temelGorunur("stok") && (
                      <TableCell className="text-right tabular-nums font-medium">
                        {u.stok}
                      </TableCell>
                    )}
                    {kolon.temelGorunur("durum") && (
                      <TableCell>
                        <Badge variant="secondary" className={d.renk}>
                          {d.etiket}
                        </Badge>
                      </TableCell>
                    )}
                  </TableRow>
                </SatirMenu>
              );
            })}
            {filtreli.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={kolon.gorunurTemelSayisi}
                  className="h-24 text-center text-muted-foreground"
                >
                  Kayıt bulunamadı.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <span className="text-sm text-muted-foreground">
        {filtreli.length} model
      </span>

      {/* Sütun ayarları sheet'i — proje standardı */}
      <KolonAyarSheet kolon={kolon} kullanicilar={kullanicilar} />
    </div>
  );
}

