"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FolderOpen, Pencil, Plus, Trash } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SatirMenu } from "@/components/ui/satir-menu";
import { useOnay } from "@/components/ui/confirm-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatTarih, type Proje } from "@/lib/data";
import { projeSil } from "@/lib/db/actions";

const DURUM_RENK: Record<string, string> = {
  Teklif: "bg-sky-100 text-sky-800",
  Kazanıldı: "bg-emerald-100 text-emerald-800",
  Kaybedildi: "bg-rose-100 text-rose-800",
  İptal: "bg-muted text-muted-foreground",
};

/**
 * Proje (teklif) listesi.
 *
 * Reddedilen teklif buradan tek hamlede silinir; proje verisi Model/Modül
 * listelerine hiç dokunmadığı için geriye çöp kayıt kalmaz.
 */
export function ProjeListe({
  projeler,
  cariAdlari,
}: {
  projeler: Proje[];
  cariAdlari: Record<string, string>;
}) {
  const router = useRouter();
  const { onayla, onayDialog } = useOnay();
  const [ara, setAra] = React.useState("");

  const gorunen = projeler.filter((p) =>
    `${p.id} ${p.ad} ${cariAdlari[p.cariId ?? ""] ?? ""}`
      .toLocaleLowerCase("tr")
      .includes(ara.toLocaleLowerCase("tr")),
  );

  async function sil(p: Proje) {
    const ok = await onayla({
      title: "Proje silinsin mi?",
      description: `${p.ad} ve ${p.satirlar.length} modülü kalıcı olarak silinecek.`,
      confirmLabel: "Sil",
      destructive: true,
    });
    if (!ok) return;
    const res = await projeSil(p.id);
    if (!res.ok) {
      toast.error(res.error ?? "Silinemedi");
      return;
    }
    toast.success("Proje silindi");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-lg font-semibold">Projeler</h1>
        <Input
          value={ara}
          onChange={(e) => setAra(e.target.value)}
          placeholder="Ara…"
          className="h-8 w-56"
        />
        <Button
          className="ml-auto"
          render={
            <Link href="/projeler/yeni">
              <Plus className="size-4" /> Yeni Proje
            </Link>
          }
        />
      </div>

      <div className="overflow-hidden rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-28">Kod</TableHead>
              <TableHead>Proje</TableHead>
              <TableHead className="w-52">Müşteri</TableHead>
              <TableHead className="w-24 text-right">Modül</TableHead>
              <TableHead className="w-28">Tarih</TableHead>
              <TableHead className="w-28">Durum</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {gorunen.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  {projeler.length === 0
                    ? "Henüz proje yok. Teklif hazırlarken buraya modülleri ekleyin; kalıcı kayıt oluşmaz."
                    : "Eşleşen proje yok."}
                </TableCell>
              </TableRow>
            )}
            {gorunen.map((p) => (
              <SatirMenu
                key={p.id}
                aksiyonlar={[
                  {
                    etiket: "Aç",
                    ikon: Pencil,
                    onSecim: () => router.push(`/projeler/${p.id}`),
                  },
                  {
                    etiket: "Sil",
                    ikon: Trash,
                    tehlike: true,
                    ayracOnce: true,
                    onSecim: () => sil(p),
                  },
                ]}
              >
                <TableRow
                  className="cursor-pointer"
                  onClick={() => router.push(`/projeler/${p.id}`)}
                >
                  <TableCell className="text-xs text-muted-foreground tabular-nums">
                    {p.id}
                  </TableCell>
                  <TableCell className="font-medium">
                    <span className="inline-flex items-center gap-1.5">
                      <FolderOpen className="size-3.5 text-muted-foreground" />
                      {p.ad}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">
                    {cariAdlari[p.cariId ?? ""] ?? "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {p.satirlar.length}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatTarih(p.tarih)}
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 text-[11px] font-medium",
                        DURUM_RENK[p.durum] ?? "bg-muted",
                      )}
                    >
                      {p.durum}
                    </span>
                  </TableCell>
                </TableRow>
              </SatirMenu>
            ))}
          </TableBody>
        </Table>
      </div>
      {onayDialog}
    </div>
  );
}
