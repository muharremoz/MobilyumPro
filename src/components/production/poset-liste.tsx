"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Plus, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Poset } from "@/lib/data";
import { posetSil } from "@/lib/db/actions";

export function PosetListe({ posetler }: { posetler: Poset[] }) {
  const router = useRouter();
  const [liste, setListe] = React.useState<Poset[]>(posetler);
  const [arama, setArama] = React.useState("");

  React.useEffect(() => setListe(posetler), [posetler]);

  const filtreli = liste.filter(
    (p) =>
      p.ad.toLowerCase().includes(arama.toLowerCase()) ||
      p.id.toLowerCase().includes(arama.toLowerCase()),
  );

  async function sil(id: string) {
    const onceki = liste;
    setListe((l) => l.filter((x) => x.id !== id));
    const res = await posetSil([id]);
    if (!res.ok) {
      setListe(onceki);
      toast.error(res.error ?? "Poşet silinemedi");
      return;
    }
    toast.success("Poşet silindi");
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Poşet veya kod ara..."
            value={arama}
            onChange={(e) => setArama(e.target.value)}
            className="h-9 pl-9"
          />
        </div>
        <Button
          className="ml-auto"
          nativeButton={false}
          render={<Link href="/uretim/poset/yeni" />}
        >
          <Plus className="size-4" /> Yeni Poşet
        </Button>
      </div>

      <div className="overflow-hidden rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kod</TableHead>
              <TableHead>Poşet</TableHead>
              <TableHead>Açıklama</TableHead>
              <TableHead className="text-right">Malzeme</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtreli.map((p) => (
              <TableRow
                key={p.id}
                className="cursor-pointer"
                onClick={() => router.push(`/uretim/poset/${p.id}`)}
              >
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {p.id}
                </TableCell>
                <TableCell className="font-medium">{p.ad}</TableCell>
                <TableCell className="text-muted-foreground">
                  {p.aciklama ?? "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {p.malzemeler.length}
                </TableCell>
                <TableCell>
                  <Badge variant={p.durum === "Aktif" ? "default" : "secondary"}>
                    {p.durum}
                  </Badge>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="İşlemler"
                        >
                          <MoreHorizontal className="size-4" />
                        </Button>
                      }
                    />
                    <DropdownMenuContent align="end" className="w-36">
                      <DropdownMenuItem
                        onClick={() => router.push(`/uretim/poset/${p.id}`)}
                      >
                        <Pencil className="mr-2 size-4" /> Düzenle
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => sil(p.id)}
                      >
                        <Trash2 className="mr-2 size-4" /> Sil
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {filtreli.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-muted-foreground"
                >
                  Poşet bulunamadı.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <span className="text-sm text-muted-foreground">
        {filtreli.length} poşet
      </span>
    </div>
  );
}
