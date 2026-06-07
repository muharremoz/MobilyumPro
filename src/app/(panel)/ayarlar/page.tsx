import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function AyarlarPage() {
  return (
    <>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Mağaza Bilgileri</CardTitle>
          <CardDescription>Genel mağaza ayarları. (Demo)</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="magaza">Mağaza Adı</Label>
            <Input id="magaza" defaultValue="MobilyumPro" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="eposta">İletişim E-postası</Label>
            <Input id="eposta" type="email" defaultValue="info@mobilyumpro.com" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="tel">Telefon</Label>
            <Input id="tel" defaultValue="+90 212 000 00 00" />
          </div>
          <div>
            <Button>Kaydet</Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
