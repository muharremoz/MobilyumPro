import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatTarih } from "@/lib/data";
import { paraBiciminiOku } from "@/lib/db/para-bicim-sunucu";
import { paraFormatla } from "@/lib/para-bicim";
import { getAlis } from "@/lib/db/queries";

/** Alış detayı — salt okunur (alış silme/düzenleme v1'de yok). */
export default async function AlisDetayRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // "yeni" zaten ayrı route — buraya düşmemesi gerek ama emniyet için.
  if (id === "yeni") notFound();
  const alis = await getAlis(id);
  if (!alis) notFound();
  const bicim = await paraBiciminiOku();

  return (
    <div className="flex flex-col gap-3">
      {/* Üst şerit */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          nativeButton={false}
          render={<Link href="/satin-alma" aria-label="Satın almalara dön" />}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-sm font-medium">Alış Detayı</h1>
        <span className="rounded border bg-muted/50 px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
          {alis.id}
        </span>
      </div>

      {/* Bilgi kartı */}
      <div className="rounded-md border bg-card p-4">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm md:grid-cols-3 xl:grid-cols-6">
          <div>
            <dt className="text-xs text-muted-foreground">Belge</dt>
            <dd className="mt-0.5 font-mono text-xs">{alis.id}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Tedarikçi</dt>
            <dd className="mt-0.5">
              <Link
                href={`/cari/${alis.cariId}`}
                className="font-medium underline-offset-2 hover:underline"
              >
                {alis.cariAd}
              </Link>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Tarih</dt>
            <dd className="mt-0.5">{formatTarih(alis.tarih)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Depo</dt>
            <dd className="mt-0.5">{alis.depo}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Belge No</dt>
            <dd className="mt-0.5">
              {alis.belgeNo ?? <span className="text-muted-foreground">—</span>}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Toplam</dt>
            <dd className="mt-0.5 font-semibold tabular-nums">
              {paraFormatla(alis.toplam, bicim)}
            </dd>
          </div>
          {alis.aciklama && (
            <div className="col-span-full">
              <dt className="text-xs text-muted-foreground">Açıklama</dt>
              <dd className="mt-0.5 text-muted-foreground">{alis.aciklama}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* Satırlar */}
      <div className="overflow-hidden rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Malzeme</TableHead>
              <TableHead className="text-right">Miktar</TableHead>
              <TableHead>Birim</TableHead>
              <TableHead className="text-right">Birim Fiyat</TableHead>
              <TableHead className="text-right">Tutar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {alis.satirlar.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.malzemeAd}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {s.miktar}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {s.birim}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {paraFormatla(s.birimFiyat, bicim)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {paraFormatla(s.miktar * s.birimFiyat, bicim)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <p className="text-sm text-muted-foreground">
        Stok girişi ve cari işlemi bu kayıtla oluşturuldu.
      </p>
    </div>
  );
}
