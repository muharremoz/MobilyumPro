import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { paraBiciminiOku } from "@/lib/db/para-bicim-sunucu";
import { paraFormatla } from "@/lib/para-bicim";
import { getMusterilerDetay } from "@/lib/db/queries";

function basHarfler(ad: string) {
  return ad
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default async function MusterilerPage() {
  const musteriler = await getMusterilerDetay();
  const bicim = await paraBiciminiOku();
  return (
    <>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Müşteri</TableHead>
                <TableHead>E-posta</TableHead>
                <TableHead>Şehir</TableHead>
                <TableHead className="text-right">Sipariş</TableHead>
                <TableHead className="text-right">Toplam Harcama</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {musteriler.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {basHarfler(m.ad)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{m.ad}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {m.email}
                  </TableCell>
                  <TableCell>{m.sehir}</TableCell>
                  <TableCell className="text-right">{m.siparisSayisi}</TableCell>
                  <TableCell className="text-right font-medium">
                    {paraFormatla(m.toplamHarcama, bicim)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
