"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, FileText, Info, Receipt } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ListHeader } from "@/components/ui/list-header";
import { SiralaFiltreBaslik } from "@/components/ui/kolon-filtre";
import { SatirMenu } from "@/components/ui/satir-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatTL, formatTarih, type BekleyenSiparis } from "@/lib/data";
import { usePara } from "@/components/bicim-baglam";

type SortKey =
  "malzeme" | "firma" | "kalan" | "siparisTarihi" | "tahminiTeslim" | "durum";

export function SiparisListe({
  siparisler,
}: {
  siparisler: BekleyenSiparis[];
}) {
  const para = usePara();
  const router = useRouter();
  // Bilgi modalında gösterilen sipariş.
  const [bilgi, setBilgi] = React.useState<BekleyenSiparis | null>(null);
  const [malzemeF, setMalzemeF] = React.useState("");
  const [firmaF, setFirmaF] = React.useState("Tümü");
  const [durumF, setDurumF] = React.useState("Tümü");
  const [teslimF, setTeslimF] = React.useState("Tümü"); // Tümü | Geciken | Zamanında
  const [sort, setSort] = React.useState<{ key: SortKey; dir: "asc" | "desc" }>(
    { key: "tahminiTeslim", dir: "asc" },
  );
  const sira = (k: SortKey) => (sort.key === k ? sort.dir : null);
  const sirala = (k: SortKey) => (dir: "asc" | "desc") =>
    setSort({ key: k, dir });

  const firmalar = React.useMemo(
    () =>
      [...new Set(siparisler.map((s) => s.cariAd))].sort((a, b) =>
        a.localeCompare(b, "tr"),
      ),
    [siparisler],
  );

  const filtreli = React.useMemo(() => {
    const arr = siparisler.filter(
      (s) =>
        s.malzemeAd.toLowerCase().includes(malzemeF.toLowerCase()) &&
        (firmaF === "Tümü" || s.cariAd === firmaF) &&
        (durumF === "Tümü" || s.durum === durumF) &&
        (teslimF === "Tümü" ||
          (teslimF === "Geciken" ? s.gecikti : !s.gecikti)),
    );
    const yon = sort.dir === "asc" ? 1 : -1;
    return [...arr].sort((a, b) => {
      switch (sort.key) {
        case "kalan":
          return (a.kalan - b.kalan) * yon;
        case "firma":
          return a.cariAd.localeCompare(b.cariAd, "tr") * yon;
        case "durum":
          return a.durum.localeCompare(b.durum, "tr") * yon;
        case "siparisTarihi":
          return a.siparisTarihi.localeCompare(b.siparisTarihi) * yon;
        case "tahminiTeslim":
          return (
            (a.tahminiTeslim ?? "9999").localeCompare(
              b.tahminiTeslim ?? "9999",
            ) * yon
          );
        default:
          return a.malzemeAd.localeCompare(b.malzemeAd, "tr") * yon;
      }
    });
  }, [siparisler, malzemeF, firmaF, durumF, teslimF, sort]);

  const gecikenSayisi = siparisler.filter((s) => s.gecikti).length;

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-md border bg-card">
        <ListHeader title="Bekleyen Siparişler">
          {gecikenSayisi > 0 && (
            <Badge
              variant="secondary"
              className="mr-1 gap-1 bg-rose-100 text-rose-800"
            >
              <AlertTriangle className="size-3" /> {gecikenSayisi} geciken
            </Badge>
          )}
        </ListHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <SiralaFiltreBaslik
                sira={sira("malzeme")}
                onSirala={sirala("malzeme")}
                filtre={{ tip: "metin", deger: malzemeF, onDeger: setMalzemeF }}
              >
                Malzeme
              </SiralaFiltreBaslik>
              <SiralaFiltreBaslik
                sira={sira("firma")}
                onSirala={sirala("firma")}
                filtre={{
                  tip: "liste",
                  secenekler: firmalar,
                  deger: firmaF,
                  onDeger: setFirmaF,
                }}
              >
                Firma
              </SiralaFiltreBaslik>
              <TableHead className="text-right">Sipariş</TableHead>
              <TableHead className="text-right">Gelen</TableHead>
              <SiralaFiltreBaslik
                className="text-right"
                sira={sira("kalan")}
                onSirala={sirala("kalan")}
              >
                Bekleyen
              </SiralaFiltreBaslik>
              <TableHead className="text-right">Fiyat</TableHead>
              <SiralaFiltreBaslik
                sira={sira("siparisTarihi")}
                onSirala={sirala("siparisTarihi")}
              >
                Sipariş Tarihi
              </SiralaFiltreBaslik>
              <SiralaFiltreBaslik
                sira={sira("tahminiTeslim")}
                onSirala={sirala("tahminiTeslim")}
                filtre={{
                  tip: "liste",
                  secenekler: ["Geciken", "Zamanında"],
                  deger: teslimF,
                  onDeger: setTeslimF,
                }}
              >
                Tahmini Teslim
              </SiralaFiltreBaslik>
              <SiralaFiltreBaslik
                sira={sira("durum")}
                onSirala={sirala("durum")}
                filtre={{
                  tip: "liste",
                  secenekler: ["Sipariş Verildi", "Kısmi"],
                  deger: durumF,
                  onDeger: setDurumF,
                }}
              >
                Durum
              </SiralaFiltreBaslik>
              <TableHead className="w-32" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtreli.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={10}
                  className="h-24 text-center text-muted-foreground"
                >
                  Bekleyen sipariş yok. Talep detayında &quot;Sipariş Ver&quot;
                  ile firmaya sipariş verildiğinde burada listelenir.
                </TableCell>
              </TableRow>
            ) : (
              filtreli.map((s) => (
                <SatirMenu
                  key={`${s.satirId}-${s.siparisId}`}
                  aksiyonlar={[
                    {
                      etiket: `${s.cariAd} faturası gir`,
                      ikon: Receipt,
                      onSecim: () =>
                        router.push(
                          `/satin-alma/yeni?siparisFirma=${s.cariId}`,
                        ),
                    },
                    {
                      etiket: "Son alış bilgileri",
                      ikon: Info,
                      onSecim: () => setBilgi(s),
                    },
                    {
                      etiket: "Sipariş belgesini aç",
                      ikon: FileText,
                      gizli: !s.belgeId,
                      ayracOnce: true,
                      onSecim: () =>
                        router.push(`/satin-alma/siparis/${s.belgeId}`),
                    },
                    {
                      etiket: "Talebi aç",
                      ikon: FileText,
                      onSecim: () => router.push("/satin-alma/talepler"),
                    },
                  ]}
                >
                  <TableRow>
                    <TableCell className="font-medium">{s.malzemeAd}</TableCell>
                    <TableCell>{s.cariAd}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {s.siparisMiktar.toLocaleString("tr-TR", {
                        maximumFractionDigits: 2,
                      })}{" "}
                      {s.birim}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {s.tedarikEdilen.toLocaleString("tr-TR", {
                        maximumFractionDigits: 2,
                      })}{" "}
                      {s.birim}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums text-amber-700">
                      {s.kalan.toLocaleString("tr-TR", {
                        maximumFractionDigits: 2,
                      })}{" "}
                      {s.birim}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {s.siparisFiyat ? para(s.siparisFiyat) : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {s.siparisTarihi ? formatTarih(s.siparisTarihi) : "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {s.tahminiTeslim ? (
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 tabular-nums",
                            s.gecikti
                              ? "font-medium text-rose-600"
                              : "text-muted-foreground",
                          )}
                        >
                          {s.gecikti && <AlertTriangle className="size-3.5" />}
                          {formatTarih(s.tahminiTeslim)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={
                          s.durum === "Kısmi"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-blue-100 text-blue-800"
                        }
                      >
                        {s.durum}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            router.push(
                              `/satin-alma/yeni?siparisFirma=${s.cariId}`,
                            )
                          }
                          title={`${s.cariAd} faturası gir`}
                        >
                          <Receipt className="size-3.5" /> Fatura
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8"
                          onClick={() => setBilgi(s)}
                          title="Son alış bilgileri"
                        >
                          <Info className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                </SatirMenu>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <span className="text-sm text-muted-foreground">
        {filtreli.length} bekleyen sipariş
      </span>

      <BilgiDialog
        siparis={bilgi}
        onKapat={() => setBilgi(null)}
        onFatura={(cariId) =>
          router.push(`/satin-alma/yeni?siparisFirma=${cariId}`)
        }
      />
    </div>
  );
}

/** Özet satırı: etiket solda, değer sağda. */
function Satir({
  etiket,
  children,
}: {
  etiket: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <span className="shrink-0 text-xs text-muted-foreground">{etiket}</span>
      <span className="min-w-0 text-right text-sm font-medium">{children}</span>
    </div>
  );
}

/** Malzemenin son alış künyesi — listeyi şişirmemek için kolon yerine modal.
 *  Sipariş fiyatının son alışa göre farkını da gösterir. */
function BilgiDialog({
  siparis: s,
  onKapat,
  onFatura,
}: {
  siparis: BekleyenSiparis | null;
  onKapat: () => void;
  onFatura: (cariId: string) => void;
}) {
  const para = usePara();
  if (!s) return null;
  // Sipariş fiyatının son alışa göre farkı (referans).
  const fark =
    s.siparisFiyat != null && s.sonAlisFiyat
      ? (s.siparisFiyat - s.sonAlisFiyat) / s.sonAlisFiyat
      : null;
  const alisVar = s.sonAlisFiyat != null;

  return (
    <Dialog open onOpenChange={(o) => !o && onKapat()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Son Alış — {s.malzemeAd}</DialogTitle>
          <DialogDescription>
            Bu malzemenin en güncel alış kaydı.
          </DialogDescription>
        </DialogHeader>

        {alisVar ? (
          <div className="divide-y">
            <Satir etiket="Firma">{s.sonAlisCariAd ?? "—"}</Satir>
            <Satir etiket="Fiyat">{para(s.sonAlisFiyat!)}</Satir>
            <Satir etiket="Tarih">
              {s.sonAlisTarih ? formatTarih(s.sonAlisTarih) : "—"}
            </Satir>
            <Satir etiket="Bu siparişin fiyatı">
              {s.siparisFiyat != null ? para(s.siparisFiyat) : "—"}
              {fark != null && Math.abs(fark) >= 0.005 && (
                <span
                  className={cn(
                    "ml-1.5 font-normal",
                    fark > 0 ? "text-rose-600" : "text-emerald-600",
                  )}
                >
                  %
                  {Math.abs(fark * 100).toLocaleString("tr-TR", {
                    maximumFractionDigits: 1,
                  })}{" "}
                  {fark > 0 ? "yüksek" : "düşük"}
                </span>
              )}
            </Satir>
          </div>
        ) : (
          <p className="py-4 text-center text-sm text-muted-foreground">
            {s.malzemeAd} için alış kaydı yok.
          </p>
        )}

        <DialogFooter>
          <Button size="sm" variant="outline" onClick={onKapat}>
            Kapat
          </Button>
          <Button size="sm" onClick={() => onFatura(s.cariId)}>
            <Receipt className="size-3.5" /> Fatura Gir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
