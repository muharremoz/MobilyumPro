"use client";

import * as React from "react";
import { LifeBuoy, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ErrorShakeField } from "@/components/ui/error-shake";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";
import { Textarea } from "@/components/ui/textarea";

const KONULAR = ["Giriş sorunu", "Hata bildirimi", "Öneri", "Diğer"];

type Hatalar = { adSoyad?: string; email?: string; mesaj?: string };

/**
 * Login sayfası destek talebi — sağ altta sabit buton, modal form.
 * Şimdilik mock: gönderim sadece toast gösterir.
 */
export function DestekTalebi() {
  const [acik, setAcik] = React.useState(false);
  const [adSoyad, setAdSoyad] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [konu, setKonu] = React.useState<string | null>(KONULAR[0]);
  const [mesaj, setMesaj] = React.useState("");
  const [hatalar, setHatalar] = React.useState<Hatalar>({});
  const [shakeNonce, setShakeNonce] = React.useState(0);
  const revertTimer = React.useRef<ReturnType<typeof setTimeout>>(undefined);

  React.useEffect(() => {
    if (!acik) return;
    setAdSoyad("");
    setEmail("");
    setKonu(KONULAR[0]);
    setMesaj("");
    setHatalar({});
  }, [acik]);

  function gonder() {
    const yeni: Hatalar = {};
    if (!adSoyad.trim()) yeni.adSoyad = "Ad soyad zorunludur.";
    if (!email.trim()) yeni.email = "E-posta zorunludur.";
    if (!mesaj.trim()) yeni.mesaj = "Mesaj zorunludur.";

    setHatalar(yeni);
    if (Object.keys(yeni).length > 0) {
      setShakeNonce((n) => n + 1);
      clearTimeout(revertTimer.current);
      revertTimer.current = setTimeout(() => setHatalar({}), 3000);
      return;
    }

    // TODO: gerçek destek kanalına gönderilecek (şimdilik mock)
    setAcik(false);
    toast.success("Destek talebiniz alındı", {
      description: "En kısa sürede size dönüş yapacağız.",
    });
  }

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setAcik(true)}
        className="fixed right-4 bottom-4 z-20 gap-2 rounded-full shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_8px_16px_-6px_rgba(0,0,0,0.15)]"
      >
        <LifeBuoy className="size-4" /> Destek
      </Button>

      <Dialog open={acik} onOpenChange={setAcik}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LifeBuoy className="size-4 text-muted-foreground" /> Destek
              Talebi
            </DialogTitle>
            <DialogDescription>
              Sorununuzu veya önerinizi yazın; ekibimiz e-posta ile dönüş
              yapar.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="destek-ad">Ad Soyad</Label>
                <ErrorShakeField error={hatalar.adSoyad} shakeNonce={shakeNonce}>
                  <Input
                    id="destek-ad"
                    placeholder="Adınız Soyadınız"
                    value={adSoyad}
                    onChange={(e) => setAdSoyad(e.target.value)}
                  />
                </ErrorShakeField>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="destek-email">E-posta</Label>
                <ErrorShakeField error={hatalar.email} shakeNonce={shakeNonce}>
                  <Input
                    id="destek-email"
                    type="email"
                    placeholder="ornek@mail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </ErrorShakeField>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Konu</Label>
              <SearchSelect
                items={KONULAR}
                value={konu}
                onValueChange={setKonu}
                placeholder="Konu seçin"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="destek-mesaj">Mesajınız</Label>
              <ErrorShakeField error={hatalar.mesaj} shakeNonce={shakeNonce}>
                <Textarea
                  id="destek-mesaj"
                  placeholder="Yaşadığınız sorunu kısaca anlatın..."
                  rows={4}
                  value={mesaj}
                  onChange={(e) => setMesaj(e.target.value)}
                />
              </ErrorShakeField>
            </div>
          </div>

          <DialogFooter className="p-2">
            <Button size="sm" variant="outline" onClick={() => setAcik(false)}>
              İptal
            </Button>
            <Button size="sm" onClick={gonder}>
              <Send className="size-3.5" /> Gönder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
