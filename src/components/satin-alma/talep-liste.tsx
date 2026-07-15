"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Ban,
  Check,
  ChevronDown,
  Receipt,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ListHeader } from "@/components/ui/list-header";
import { SiralaFiltreBaslik } from "@/components/ui/kolon-filtre";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatTL,
  formatTarih,
  type SatinAlmaTalep,
  type TalepDurum,
} from "@/lib/data";
import { talepDurumGuncelle, talepSil } from "@/lib/db/actions";

const DURUM_RENK: Record<TalepDurum, string> = {
  Beklemede: "bg-amber-100 text-amber-800",
  Onaylandı: "bg-blue-100 text-blue-800",
  Reddedildi: "bg-rose-100 text-rose-800",
  "Siparişe Döndü": "bg-emerald-100 text-emerald-800",
};

const DURUMLAR: TalepDurum[] = [
  "Beklemede",
  "Onaylandı",
  "Reddedildi",
  "Siparişe Döndü",
];

type SortKey = "id" | "tarih" | "kaynak" | "tutar" | "durum";

export function TalepListe({ talepler }: { talepler: SatinAlmaTalep[] }) {
  const router = useRouter();
  const [noFiltre, setNoFiltre] = React.useState("");
  const [kaynak, setKaynak] = React.useState("Tümü");
  const [durum, setDurum] = React.useState("Tümü");
  const [sort, setSort] = React.useState<{ key: SortKey; dir: "asc" | "desc" }>(
    { key: "id", dir: "desc" },
  );
  // Kalem detayı açık talepler.
  const [aciklar, setAciklar] = React.useState<Set<string>>(new Set());
  const [mesgul, setMesgul] = React.useState<string | null>(null);

  const kaynaklar = React.useMemo(
    () => [...new Set(talepler.map((t) => t.kaynak))],
    [talepler],
  );

  const filtreli = React.useMemo(() => {
    const q = noFiltre.toLowerCase();
    const arr = talepler.filter(
      (t) =>
        t.id.toLowerCase().includes(q) &&
        (kaynak === "Tümü" || t.kaynak === kaynak) &&
        (durum === "Tümü" || t.durum === durum),
    );
    const yon = sort.dir === "asc" ? 1 : -1;
    return [...arr].sort((a, b) => {
      if (sort.key === "tutar") return (a.tahminiTutar - b.tahminiTutar) * yon;
      return String(a[sort.key]).localeCompare(String(b[sort.key]), "tr") * yon;
    });
  }, [talepler, noFiltre, kaynak, durum, sort]);

  const sira = (k: SortKey) => (sort.key === k ? sort.dir : null);
  const sirala = (k: SortKey) => (dir: "asc" | "desc") =>
    setSort({ key: k, dir });

  function detayToggle(id: string) {
    setAciklar((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  async function durumDegistir(id: string, d: "Onaylandı" | "Reddedildi") {
    setMesgul(id);
    const res = await talepDurumGuncelle(id, d);
    setMesgul(null);
    if (!res.ok) {
      toast.error(res.error ?? "Güncellenemedi.");
      return;
    }
    toast.success(d === "Onaylandı" ? "Talep onaylandı" : "Talep reddedildi");
    router.refresh();
  }

  async function sil(id: string) {
    setMesgul(id);
    const res = await talepSil(id);
    setMesgul(null);
    if (!res.ok) {
      toast.error(res.error ?? "Silinemedi.");
      return;
    }
    toast.success("Talep silindi");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-md border bg-card">
        <ListHeader title="Satın Alma Talepleri" />
        <Table>
          <TableHeader>
            <TableRow>
              <SiralaFiltreBaslik
                sira={sira("id")}
                onSirala={sirala("id")}
                filtre={{ tip: "metin", deger: noFiltre, onDeger: setNoFiltre }}
              >
                Talep No
              </SiralaFiltreBaslik>
              <SiralaFiltreBaslik sira={sira("tarih")} onSirala={sirala("tarih")}>
                Tarih
              </SiralaFiltreBaslik>
              <SiralaFiltreBaslik
                sira={sira("kaynak")}
                onSirala={sirala("kaynak")}
                filtre={{
                  tip: "liste",
                  secenekler: kaynaklar,
                  deger: kaynak,
                  onDeger: setKaynak,
                }}
              >
                Kaynak
              </SiralaFiltreBaslik>
              <TableHead className="text-right">Kalem</TableHead>
              <SiralaFiltreBaslik
                className="text-right"
                sira={sira("tutar")}
                onSirala={sirala("tutar")}
              >
                Tahmini Tutar
              </SiralaFiltreBaslik>
              <SiralaFiltreBaslik
                sira={sira("durum")}
                onSirala={sirala("durum")}
                filtre={{
                  tip: "liste",
                  secenekler: DURUMLAR,
                  deger: durum,
                  onDeger: setDurum,
                }}
              >
                Durum
              </SiralaFiltreBaslik>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtreli.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-muted-foreground"
                >
                  Talep yok. Üretim Planı&apos;nda eksik malzemeleri seçip
                  &quot;Satın Alma Talebi Oluştur&quot; ile başlayın.
                </TableCell>
              </TableRow>
            ) : (
              filtreli.map((t) => {
                const acik = aciklar.has(t.id);
                return (
                  <React.Fragment key={t.id}>
                    <ContextMenu>
                      <ContextMenuTrigger render={<TableRow />}>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {t.id}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatTarih(t.tarih)}
                        </TableCell>
                        <TableCell className="text-sm">{t.kaynak}</TableCell>
                        <TableCell className="text-right">
                          <button
                            type="button"
                            onClick={() => detayToggle(t.id)}
                            aria-expanded={acik}
                            className="inline-flex cursor-pointer items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                          >
                            {t.satirlar.length} kalem
                            <ChevronDown
                              className={cn(
                                "size-3 transition-transform",
                                acik && "rotate-180",
                              )}
                            />
                          </button>
                        </TableCell>
                        <TableCell className="text-right text-sm font-medium tabular-nums">
                          {formatTL(t.tahminiTutar)}
                        </TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1.5">
                            <Badge
                              variant="secondary"
                              className={DURUM_RENK[t.durum]}
                            >
                              {t.durum}
                            </Badge>
                            {t.alisId && (
                              <button
                                type="button"
                                onClick={() =>
                                  router.push(`/satin-alma/${t.alisId}`)
                                }
                                className="cursor-pointer font-mono text-[11px] text-muted-foreground underline-offset-2 hover:underline"
                              >
                                {t.alisId}
                              </button>
                            )}
                          </span>
                        </TableCell>
                      </ContextMenuTrigger>
                      <ContextMenuContent className="w-52">
                        {t.durum === "Beklemede" && (
                          <>
                            <ContextMenuItem
                              disabled={mesgul === t.id}
                              onClick={() => durumDegistir(t.id, "Onaylandı")}
                            >
                              <Check className="mr-2 size-4" /> Onayla
                            </ContextMenuItem>
                            <ContextMenuItem
                              disabled={mesgul === t.id}
                              onClick={() => durumDegistir(t.id, "Reddedildi")}
                            >
                              <Ban className="mr-2 size-4" /> Reddet
                            </ContextMenuItem>
                          </>
                        )}
                        {t.durum === "Onaylandı" && (
                          <ContextMenuItem
                            onClick={() =>
                              router.push(`/satin-alma/yeni?talep=${t.id}`)
                            }
                          >
                            <ShoppingCart className="mr-2 size-4" /> Alışa
                            Dönüştür
                          </ContextMenuItem>
                        )}
                        {t.alisId && (
                          <ContextMenuItem
                            onClick={() =>
                              router.push(`/satin-alma/${t.alisId}`)
                            }
                          >
                            <Receipt className="mr-2 size-4" /> Alış Fişini Gör
                          </ContextMenuItem>
                        )}
                        {t.durum !== "Siparişe Döndü" && (
                          <ContextMenuItem
                            variant="destructive"
                            disabled={mesgul === t.id}
                            onClick={() => sil(t.id)}
                          >
                            <Trash2 className="mr-2 size-4" /> Sil
                          </ContextMenuItem>
                        )}
                      </ContextMenuContent>
                    </ContextMenu>
                    {acik && (
                      <TableRow className="bg-muted/20 hover:bg-muted/20">
                        <TableCell colSpan={6} className="p-0">
                          <div className="flex flex-col gap-1 px-10 py-2">
                            {t.satirlar.map((s, i) => (
                              <div
                                key={`${s.malzemeId}-${i}`}
                                className="flex items-center gap-3 text-sm"
                              >
                                <span className="font-mono text-xs text-muted-foreground">
                                  {s.malzemeId}
                                </span>
                                <span className="font-medium">
                                  {s.malzemeAd}
                                </span>
                                <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                                  {s.miktar.toLocaleString("tr-TR", {
                                    maximumFractionDigits: 2,
                                  })}{" "}
                                  {s.birim}
                                </span>
                              </div>
                            ))}
                            {t.aciklama && (
                              <p className="mt-1 text-xs text-muted-foreground">
                                {t.aciklama}
                              </p>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      <span className="text-sm text-muted-foreground">
        {filtreli.length} talep
      </span>
    </div>
  );
}
