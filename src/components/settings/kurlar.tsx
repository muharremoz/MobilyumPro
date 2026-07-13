"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, TrendingUp } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ListHeader } from "@/components/ui/list-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Kur } from "@/lib/data";
import { kurlariGuncelle } from "@/lib/db/actions";

const KUR_BAYRAK: Record<string, string> = {
  USD: "🇺🇸",
  EUR: "🇪🇺",
  GBP: "🇬🇧",
  CHF: "🇨🇭",
};

function sayi(n: number) {
  return n.toLocaleString("tr-TR", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });
}

export function Kurlar({ kurlar = [] }: { kurlar?: Kur[] }) {
  const router = useRouter();
  const [guncelleniyor, setGuncelleniyor] = React.useState(false);

  const sonGuncelleme = kurlar[0]?.guncelleme
    ? new Date(kurlar[0].guncelleme).toLocaleString("tr-TR")
    : null;
  const bulten = kurlar[0]?.tarih;

  async function guncelle() {
    setGuncelleniyor(true);
    const res = await kurlariGuncelle();
    setGuncelleniyor(false);
    if (!res.ok) {
      toast.error(res.error ?? "Kurlar güncellenemedi.");
      return;
    }
    toast.success(`Kurlar güncellendi (${res.tarih} · ${res.adet} döviz)`);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-md border bg-card">
        <ListHeader title="Döviz Kurları">
          {bulten && (
            <span className="text-xs text-muted-foreground">
              TCMB bülteni: {bulten}
            </span>
          )}
          <Button size="sm" onClick={guncelle} disabled={guncelleniyor}>
            <RefreshCw
              className={guncelleniyor ? "size-4 animate-spin" : "size-4"}
            />
            {guncelleniyor ? "Güncelleniyor..." : "TCMB'den Güncelle"}
          </Button>
        </ListHeader>

        {kurlar.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <TrendingUp className="size-6 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              Henüz kur çekilmedi. &quot;TCMB&apos;den Güncelle&quot; ile başlayın.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Döviz</TableHead>
                <TableHead className="text-right">Alış</TableHead>
                <TableHead className="text-right">Satış</TableHead>
                <TableHead className="text-right">Efektif Alış</TableHead>
                <TableHead className="text-right">Efektif Satış</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {kurlar.map((k) => (
                <TableRow key={k.kod}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-base leading-none">
                        {KUR_BAYRAK[k.kod] ?? "💱"}
                      </span>
                      <div className="min-w-0">
                        <div className="font-mono text-sm font-medium">
                          {k.kod}
                        </div>
                        <div className="truncate text-[11px] text-muted-foreground">
                          {k.birim > 1 ? `${k.birim} ` : ""}
                          {k.ad}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {sayi(k.forexAlis)}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {sayi(k.forexSatis)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground tabular-nums">
                    {sayi(k.banknoteAlis)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground tabular-nums">
                    {sayi(k.banknoteSatis)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
      {sonGuncelleme && (
        <span className="text-xs text-muted-foreground">
          Son çekilme: {sonGuncelleme} · Kaynak: TCMB (tcmb.gov.tr). Rakamlar 1
          birim döviz için TL karşılığıdır.
        </span>
      )}
    </div>
  );
}
