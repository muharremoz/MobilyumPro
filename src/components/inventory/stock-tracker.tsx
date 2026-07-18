"use client";

import * as React from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Repeat,
  TrendingUp,
  TrendingDown,
  Boxes,
  Calendar,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { SearchSelect } from "@/components/ui/search-select";
import { OzetKart } from "@/components/ui/ozet-kart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatTarih,
  type StokHareket,
  type StokHareketTuru,
  type Model,
  type Malzeme,
} from "@/lib/data";

type Tip = "Model" | "Malzeme";

const TUR_RENK: Record<StokHareketTuru, string> = {
  Giriş: "bg-emerald-100 text-emerald-800",
  Çıkış: "bg-rose-100 text-rose-800",
  Transfer: "bg-blue-100 text-blue-800",
};

const TUR_ICON: Record<StokHareketTuru, React.ReactNode> = {
  Giriş: <ArrowDownToLine className="size-3.5" />,
  Çıkış: <ArrowUpFromLine className="size-3.5" />,
  Transfer: <Repeat className="size-3.5" />,
};

export function StockTracker({
  hareketler: tumHareketler,
  urunler,
  malzemeler,
}: {
  hareketler: StokHareket[];
  urunler: Model[];
  malzemeler: Malzeme[];
}) {
  const [tip, setTip] = React.useState<Tip>("Model");
  const [secimId, setSecimId] = React.useState<string | null>(null);

  // Tip değişince seçimi sıfırla
  React.useEffect(() => {
    setSecimId(null);
  }, [tip]);

  const oge =
    tip === "Model"
      ? urunler.find((u) => u.id === secimId)
      : malzemeler.find((m) => m.id === secimId);

  const mevcutStok =
    oge && "stok" in oge ? oge.stok : 0;

  // Seçili öğenin hareketleri + her hareket sonrası kalan bakiye.
  // Mantık: mevcut stok bilinen — geriye doğru net delta'yı çıkarıp
  // başlangıç bakiyesini buluyoruz, sonra ileri sayım ile her satırın
  // o anki bakiyesini hesaplıyoruz. (Transfer net stoğu değiştirmez.)
  const hareketler: (StokHareket & { bakiye: number })[] = React.useMemo(() => {
    if (!secimId) return [];
    const refTip = tip === "Model" ? "model" : "malzeme";
    const eskiYeni = tumHareketler
      .filter((h) => h.ref.tip === refTip && h.ref.id === secimId)
      .sort((a, b) => a.tarih.localeCompare(b.tarih));
    const netDelta = eskiYeni.reduce((t, h) => {
      if (h.tur === "Giriş") return t + h.miktar;
      if (h.tur === "Çıkış") return t - h.miktar;
      return t;
    }, 0);
    let bakiye = mevcutStok - netDelta;
    const ileri = eskiYeni.map((h) => {
      if (h.tur === "Giriş") bakiye += h.miktar;
      else if (h.tur === "Çıkış") bakiye -= h.miktar;
      return { ...h, bakiye };
    });
    return ileri.reverse(); // gösterimde yeni → eski
    // tumHareketler şart: Transfer net stoğu değiştirmediği için mevcutStok
    // aynı kalır ve yeni transfer listeye hiç düşmezdi.
  }, [tip, secimId, mevcutStok, tumHareketler]);

  // Toplamlar — Giriş ekle, Çıkış çıkar, Transfer (depo değişimi) net 0
  const ozet = React.useMemo(() => {
    let giris = 0;
    let cikis = 0;
    let transfer = 0;
    for (const h of hareketler) {
      if (h.tur === "Giriş") giris += h.miktar;
      else if (h.tur === "Çıkış") cikis += h.miktar;
      else transfer += h.miktar;
    }
    return {
      giris,
      cikis,
      transfer,
      sonHareket: hareketler[0]?.tarih,
    };
  }, [hareketler]);

  const birim =
    tip === "Model"
      ? "adet"
      : oge && "birim" in oge
        ? oge.birim
        : "";

  // Seçilebilir öğelerin listesi
  const items =
    tip === "Model"
      ? urunler.filter((u) => u.durum === "Aktif").map((u) => u.ad)
      : malzemeler.filter((m) => m.durum === "Aktif").map((m) => m.ad);

  function onSelect(v: string | null) {
    if (!v) {
      setSecimId(null);
      return;
    }
    if (tip === "Model") {
      const u = urunler.find((x) => x.ad === v);
      setSecimId(u?.id ?? null);
    } else {
      const m = malzemeler.find((x) => x.ad === v);
      setSecimId(m?.id ?? null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Üst seçim çubuğu */}
      <div className="flex flex-wrap items-end gap-3 rounded-md border bg-card p-3">
        <div className="grid gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Tip
          </label>
          <div className="flex gap-1 rounded-lg border bg-card p-1">
            {(["Model", "Malzeme"] as Tip[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTip(t)}
                className={cn(
                  "cursor-pointer rounded-md px-3 py-1.5 text-sm transition-colors",
                  tip === t
                    ? "bg-accent font-medium text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="grid min-w-64 flex-1 gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            {tip} seç
          </label>
          <SearchSelect
            items={items}
            value={oge?.ad ?? null}
            onValueChange={onSelect}
            placeholder={`${tip} seç`}
            searchPlaceholder={`${tip} ara...`}
          />
        </div>
      </div>

      {!oge && (
        <div className="rounded-md border bg-card p-8 text-center text-sm text-muted-foreground">
          Hareketleri görüntülemek için yukarıdan bir {tip.toLowerCase()} seçin.
        </div>
      )}

      {oge && (
        <>
          {/* Özet kartları */}
          <div className="grid gap-3 sm:grid-cols-4">
            <OzetKart
              ikon={Boxes}
              etiket="Mevcut Stok"
              deger={`${mevcutStok} ${birim}`}
              // Negatif stok bir tutarsızlık işaretidir; sessizce geçmesin.
              ton={mevcutStok < 0 ? "rose" : "primary"}
            />
            <OzetKart
              ikon={TrendingUp}
              etiket="Toplam Giriş"
              deger={`${ozet.giris} ${birim}`}
              ton="emerald"
            />
            <OzetKart
              ikon={TrendingDown}
              etiket="Toplam Çıkış"
              deger={`${ozet.cikis} ${birim}`}
              ton="rose"
            />
            <OzetKart
              ikon={Calendar}
              etiket="Son Hareket"
              deger={ozet.sonHareket ? formatTarih(ozet.sonHareket) : "—"}
              // Tarih sayı değil; büyük punto kart içinde taşmasın.
              className="[&_.tabular-nums]:text-lg"
            />
          </div>

          {/* Hareket tablosu */}
          <div className="overflow-hidden rounded-md border bg-card">
            <div className="border-b px-4 py-2 text-sm font-medium">
              {oge.ad}{" "}
              <span className="ml-1 font-normal text-muted-foreground">
                · {hareketler.length} hareket
              </span>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Belge</TableHead>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Tür</TableHead>
                  <TableHead className="text-right">Miktar</TableHead>
                  <TableHead>Birim</TableHead>
                  <TableHead>Depo</TableHead>
                  <TableHead className="text-right">Bakiye</TableHead>
                  <TableHead>Açıklama</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hareketler.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {h.id}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatTarih(h.tarih)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={TUR_RENK[h.tur]}>
                        <span className="mr-1 inline-flex items-center">
                          {TUR_ICON[h.tur]}
                        </span>
                        {h.tur}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right tabular-nums",
                        h.tur === "Giriş" && "text-emerald-600",
                        h.tur === "Çıkış" && "text-rose-600",
                      )}
                    >
                      {h.tur === "Giriş"
                        ? `+${h.miktar}`
                        : h.tur === "Çıkış"
                          ? `−${h.miktar}`
                          : h.miktar}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {h.birim}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {h.depo}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {h.bakiye.toLocaleString("tr-TR", {
                        maximumFractionDigits: 2,
                      })}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {h.aciklama}
                    </TableCell>
                  </TableRow>
                ))}
                {hareketler.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Bu {tip.toLowerCase()} için kayıtlı hareket yok.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}

