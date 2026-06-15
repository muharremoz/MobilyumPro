import Link from "next/link";
import {
  Banknote,
  ShoppingCart,
  Sofa,
  Users,
  AlertTriangle,
  ArrowUpRight,
} from "lucide-react";

import { SheetTest } from "@/components/sheet-test";
import { AlertTest } from "@/components/alert-test";
import { StatusBadge } from "@/components/status-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { haftalikSatis, formatTL, formatTarih } from "@/lib/data";
import { getDashboardOzet, getSiparisler } from "@/lib/db/queries";

export default async function DashboardPage() {
  const [ozet, siparisler] = await Promise.all([
    getDashboardOzet(),
    getSiparisler(),
  ]);

  const kartlar = [
    {
      baslik: "Toplam Ciro",
      deger: formatTL(ozet.toplamCiro),
      alt: "İptaller hariç",
      icon: Banknote,
    },
    {
      baslik: "Siparişler",
      deger: ozet.siparisSayisi.toString(),
      alt: "Tüm zamanlar",
      icon: ShoppingCart,
    },
    {
      baslik: "Ürünler",
      deger: ozet.urunSayisi.toString(),
      alt: "Katalogda",
      icon: Sofa,
    },
    {
      baslik: "Müşteriler",
      deger: ozet.musteriSayisi.toString(),
      alt: "Kayıtlı",
      icon: Users,
    },
  ];

  const sonSiparisler = siparisler.slice(0, 5);
  const maxSatis = Math.max(...haftalikSatis.map((g) => g.tutar));

  return (
    <>
      <div className="mb-5 flex justify-end gap-2">
        <AlertTest />
        <SheetTest />
      </div>

      {/* Özet kartları */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kartlar.map((k) => (
          <Card key={k.baslik}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {k.baslik}
              </CardTitle>
              <k.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{k.deger}</div>
              <p className="text-xs text-muted-foreground">{k.alt}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Stok uyarısı */}
      {(ozet.kritikStok > 0 || ozet.tukenenStok > 0) && (
        <Card className="mt-4 border-amber-300/60 bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <p className="text-sm">
              <span className="font-medium">{ozet.kritikStok}</span> ürün kritik
              stokta,{" "}
              <span className="font-medium">{ozet.tukenenStok}</span> ürün tükendi.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="ml-auto"
              nativeButton={false}
              render={<Link href="/stok" />}
            >
              Stok yönetimi
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {/* Haftalık satış grafiği */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Haftalık Satış</CardTitle>
            <CardDescription>Son 7 gün</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-44 items-end justify-between gap-2">
              {haftalikSatis.map((g) => (
                <div
                  key={g.gun}
                  className="flex flex-1 flex-col items-center gap-2"
                >
                  <div
                    className="w-full rounded-t bg-primary/80 transition-all hover:bg-primary"
                    style={{ height: `${(g.tutar / maxSatis) * 100}%` }}
                    title={formatTL(g.tutar)}
                  />
                  <span className="text-xs text-muted-foreground">{g.gun}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Son siparişler */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Son Siparişler</CardTitle>
              <CardDescription>En güncel 5 sipariş</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              nativeButton={false}
              render={<Link href="/siparisler" />}
            >
              Tümü <ArrowUpRight className="ml-1 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sipariş</TableHead>
                  <TableHead>Müşteri</TableHead>
                  <TableHead>Tarih</TableHead>
                  <TableHead className="text-right">Tutar</TableHead>
                  <TableHead>Durum</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sonSiparisler.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.id}</TableCell>
                    <TableCell>{s.musteri}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatTarih(s.tarih)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatTL(s.tutar)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge durum={s.durum} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
