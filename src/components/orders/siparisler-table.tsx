"use client";

import * as React from "react";

import { StatusBadge } from "@/components/status-badge";
import { ListHeader } from "@/components/ui/list-header";
import {
  useKolonAyarlari,
  KolonAyarButonu,
  KolonAyarSheet,
  type KolonTanim,
  type ListeKolonAyariDegeri,
} from "@/components/ui/kolon-ayarlari";
import { SiralaFiltreBaslik } from "@/components/ui/kolon-filtre";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatTL, formatTarih, type Siparis, type SiparisDurum } from "@/lib/data";
import { useYonetici } from "@/components/yetki/yetki-baglam";
import { usePara } from "@/components/bicim-baglam";

const durumlar: SiparisDurum[] = [
  "Beklemede",
  "Hazırlanıyor",
  "Kargoda",
  "Teslim Edildi",
  "İptal",
];

type SortKey = "id" | "musteri" | "tarih" | "urunAdedi" | "tutar" | "durum";

/** Proje standardı kolon tanımları (kolon-ayarlari modülü). */
const TEMEL_KOLONLAR: KolonTanim[] = [
  {
    key: "id",
    label: "Sipariş No",
    aciklama: "Siparişin numarası.",
    kilitli: true,
  },
  { key: "musteri", label: "Müşteri", aciklama: "Siparişi veren müşteri." },
  { key: "tarih", label: "Tarih", aciklama: "Sipariş tarihi." },
  { key: "urunAdedi", label: "Adet", aciklama: "Siparişteki ürün adedi." },
  { key: "tutar", label: "Tutar", aciklama: "Sipariş toplam tutarı." },
  { key: "durum", label: "Durum", aciklama: "Sipariş durumu." },
];
const EK_KOLONLAR: KolonTanim[] = [];

export function SiparislerTable({
  siparisler,
  kolonAyari,
  kullanicilar = [],
  mevcutKullaniciId = "",
}: {
  siparisler: Siparis[];
  kolonAyari?: ListeKolonAyariDegeri;
  kullanicilar?: { id: string; ad: string }[];
  mevcutKullaniciId?: string;
}) {
  const para = usePara();
  // Kolon ayarı tüm kullanıcıları etkiler; yalnız yöneticiye açık.
  const yonetici = useYonetici();
  // Kolon filtreleri (başlık popover'larından)
  const [noFiltre, setNoFiltre] = React.useState("");
  const [musteriFiltre, setMusteriFiltre] = React.useState("");
  const [adetAralik, setAdetAralik] = React.useState({ min: "", max: "" });
  const [tutarAralik, setTutarAralik] = React.useState({ min: "", max: "" });
  const [durum, setDurum] = React.useState("Tümü");
  const [sort, setSort] = React.useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "tarih",
    dir: "desc",
  });

  // Sütun ayarları — proje standardı (ui/kolon-ayarlari).
  const kolon = useKolonAyarlari({
    listeId: "siparisler",
    yol: "/siparisler",
    temel: TEMEL_KOLONLAR,
    ek: EK_KOLONLAR,
    ayar: kolonAyari,
    mevcutKullaniciId,
  });

  const filtreli = React.useMemo(() => {
    const qNo = noFiltre.toLowerCase();
    const qMusteri = musteriFiltre.toLowerCase();
    const arada = (n: number, min: string, max: string) =>
      (min === "" || n >= Number(min)) && (max === "" || n <= Number(max));
    const arr = siparisler.filter((s) => {
      const no = s.id.toLowerCase().includes(qNo);
      const musteri = s.musteri.toLowerCase().includes(qMusteri);
      const adet = arada(s.urunAdedi, adetAralik.min, adetAralik.max);
      const tutar = arada(s.tutar, tutarAralik.min, tutarAralik.max);
      const dur = durum === "Tümü" || s.durum === durum;
      return no && musteri && adet && tutar && dur;
    });
    const yon = sort.dir === "asc" ? 1 : -1;
    return [...arr].sort((a, b) => {
      const x = a[sort.key];
      const y = b[sort.key];
      if (typeof x === "number" && typeof y === "number") return (x - y) * yon;
      return String(x).localeCompare(String(y), "tr") * yon;
    });
  }, [siparisler, noFiltre, musteriFiltre, adetAralik, tutarAralik, durum, sort]);

  // Kolon başlığı sıralama yardımcıları — SiralaFiltreBaslik (proje standardı).
  const sira = (k: SortKey) => (sort.key === k ? sort.dir : null);
  const sirala = (k: SortKey) => (dir: "asc" | "desc") =>
    setSort({ key: k, dir });

  return (
    <div className="flex flex-col gap-3">
      {/* Tablo — proje standardı liste kartı */}
      <div className="overflow-hidden rounded-md border bg-card">
        <ListHeader title="Siparişler">
          {yonetici && <KolonAyarButonu kolon={kolon} />}
        </ListHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <SiralaFiltreBaslik
                sira={sira("id")}
                onSirala={sirala("id")}
                filtre={{ tip: "metin", deger: noFiltre, onDeger: setNoFiltre }}
              >
                Sipariş No
              </SiralaFiltreBaslik>
              {kolon.temelGorunur("musteri") && (
                <SiralaFiltreBaslik
                  sira={sira("musteri")}
                  onSirala={sirala("musteri")}
                  filtre={{
                    tip: "metin",
                    deger: musteriFiltre,
                    onDeger: setMusteriFiltre,
                  }}
                >
                  Müşteri
                </SiralaFiltreBaslik>
              )}
              {kolon.temelGorunur("tarih") && (
                <SiralaFiltreBaslik sira={sira("tarih")} onSirala={sirala("tarih")}>
                  Tarih
                </SiralaFiltreBaslik>
              )}
              {kolon.temelGorunur("urunAdedi") && (
                <SiralaFiltreBaslik
                  className="text-right"
                  sira={sira("urunAdedi")}
                  onSirala={sirala("urunAdedi")}
                  filtre={{
                    tip: "sayi",
                    min: adetAralik.min,
                    max: adetAralik.max,
                    onDegis: (min, max) => setAdetAralik({ min, max }),
                  }}
                >
                  Adet
                </SiralaFiltreBaslik>
              )}
              {kolon.temelGorunur("tutar") && (
                <SiralaFiltreBaslik
                  className="text-right"
                  sira={sira("tutar")}
                  onSirala={sirala("tutar")}
                  filtre={{
                    tip: "sayi",
                    min: tutarAralik.min,
                    max: tutarAralik.max,
                    onDegis: (min, max) => setTutarAralik({ min, max }),
                  }}
                >
                  Tutar
                </SiralaFiltreBaslik>
              )}
              {kolon.temelGorunur("durum") && (
                <SiralaFiltreBaslik
                  sira={sira("durum")}
                  onSirala={sirala("durum")}
                  filtre={{
                    tip: "liste",
                    secenekler: durumlar,
                    deger: durum,
                    onDeger: setDurum,
                  }}
                >
                  Durum
                </SiralaFiltreBaslik>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtreli.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.id}</TableCell>
                {kolon.temelGorunur("musteri") && (
                  <TableCell>{s.musteri}</TableCell>
                )}
                {kolon.temelGorunur("tarih") && (
                  <TableCell className="text-muted-foreground">
                    {formatTarih(s.tarih)}
                  </TableCell>
                )}
                {kolon.temelGorunur("urunAdedi") && (
                  <TableCell className="text-right tabular-nums">
                    {s.urunAdedi}
                  </TableCell>
                )}
                {kolon.temelGorunur("tutar") && (
                  <TableCell className="text-right tabular-nums">
                    {para(s.tutar)}
                  </TableCell>
                )}
                {kolon.temelGorunur("durum") && (
                  <TableCell>
                    <StatusBadge durum={s.durum} />
                  </TableCell>
                )}
              </TableRow>
            ))}
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

      <div className="text-sm text-muted-foreground">
        {filtreli.length} sipariş
      </div>

      {/* Sütun ayarları sheet'i — proje standardı */}
      <KolonAyarSheet kolon={kolon} kullanicilar={kullanicilar} />
    </div>
  );
}
