"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Boxes, Pencil, Plus, Trash } from "lucide-react";
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
import { modulSablonSil } from "@/lib/db/actions";
import type { ModulSablon } from "@/lib/data";

/**
 * Modül şablonları listesi.
 *
 * Şablon = bir dolabın iskeleti. Projede teklif hazırlarken buradan seçilip
 * yalnız ölçü ve kapak sayısı giriliyor; parçalar formüllerden türüyor.
 */
export function SablonListe({ sablonlar }: { sablonlar: ModulSablon[] }) {
  const router = useRouter();
  const { onayla, onayDialog } = useOnay();
  const [ara, setAra] = React.useState("");

  const gorunen = sablonlar.filter((s) =>
    `${s.id} ${s.ad}`.toLocaleLowerCase("tr").includes(ara.toLocaleLowerCase("tr")),
  );

  async function sil(s: ModulSablon) {
    const ok = await onayla({
      title: "Şablon silinsin mi?",
      description: `${s.ad} ve ${s.parcalar.length} parçası kalıcı olarak silinecek.`,
      confirmLabel: "Sil",
      destructive: true,
    });
    if (!ok) return;
    const res = await modulSablonSil(s.id);
    if (!res.ok) {
      toast.error(res.error ?? "Silinemedi");
      return;
    }
    toast.success("Şablon silindi");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-lg font-semibold">Modül Şablonları</h1>
        <Input
          value={ara}
          onChange={(e) => setAra(e.target.value)}
          placeholder="Ara…"
          className="h-8 w-56"
        />
        <Button
          className="ml-auto"
          render={
            <Link href="/modul-sablonlari/yeni">
              <Plus className="size-4" /> Yeni Şablon
            </Link>
          }
        />
      </div>

      <div className="overflow-hidden rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-28">Kod</TableHead>
              <TableHead>Ad</TableHead>
              <TableHead className="w-24 text-right">Parça</TableHead>
              <TableHead className="w-48">Varsayılan ölçü</TableHead>
              <TableHead className="w-24">Durum</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {gorunen.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  {sablonlar.length === 0
                    ? "Henüz şablon yok. Bir dolap iskeleti tanımlayın; teklif hazırlarken yalnız ölçü girmeniz yetecek."
                    : "Eşleşen şablon yok."}
                </TableCell>
              </TableRow>
            )}
            {gorunen.map((s) => (
              <SatirMenu
                key={s.id}
                aksiyonlar={[
                  {
                    etiket: "Düzenle",
                    ikon: Pencil,
                    onSecim: () => router.push(`/modul-sablonlari/${s.id}`),
                  },
                  {
                    etiket: "Sil",
                    ikon: Trash,
                    tehlike: true,
                    ayracOnce: true,
                    onSecim: () => sil(s),
                  },
                ]}
              >
                <TableRow
                  className="cursor-pointer"
                  onClick={() => router.push(`/modul-sablonlari/${s.id}`)}
                >
                  <TableCell className="text-xs text-muted-foreground tabular-nums">
                    {s.id}
                  </TableCell>
                  <TableCell className="font-medium">
                    <span className="inline-flex items-center gap-1.5">
                      <Boxes className="size-3.5 text-muted-foreground" />
                      {s.ad}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {s.parcalar.length}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground tabular-nums">
                    {s.varsayilanEn && s.varsayilanBoy
                      ? `${s.varsayilanEn} × ${s.varsayilanBoy}${
                          s.varsayilanDerinlik
                            ? ` × ${s.varsayilanDerinlik}`
                            : ""
                        } mm`
                      : "—"}
                  </TableCell>
                  <TableCell className="text-xs">{s.durum}</TableCell>
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
