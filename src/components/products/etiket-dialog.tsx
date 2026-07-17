"use client";

import * as React from "react";
import { X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { IconInput } from "@/components/ui/icon-input";
import { modelEtiketGuncelle } from "@/lib/db/actions";

/**
 * Model etiketi düzenleme diyaloğu. Serbest metin etiketler; çip olarak
 * gösterilir, Enter ya da virgülle eklenir. Kaydedince tek virgüllü kolona
 * yazılır (motor: modelEtiketGuncelle).
 */
export function EtiketDialog({
  hedef,
  onKapat,
  onUygulandi,
}: {
  hedef: { id: string; ad: string; etiketler?: string[] } | null;
  onKapat: () => void;
  onUygulandi: (id: string, etiketler: string[]) => void;
}) {
  const [etiketler, setEtiketler] = React.useState<string[]>([]);
  const [giris, setGiris] = React.useState("");
  const [kaydediliyor, setKaydediliyor] = React.useState(false);

  // Hedef değişince formu render sırasında sıfırla (proje standardı, effect değil).
  const hedefId = hedef?.id ?? null;
  const [oncekiId, setOncekiId] = React.useState<string | null>(null);
  if (hedefId !== oncekiId) {
    setOncekiId(hedefId);
    setEtiketler(hedef?.etiketler ?? []);
    setGiris("");
    setKaydediliyor(false);
  }

  function ekle(ham: string) {
    const yeni = ham.trim();
    if (!yeni || yeni.includes(",")) return;
    // Büyük/küçük harf duyarsız tekilleştirme.
    if (etiketler.some((e) => e.toLocaleLowerCase("tr") === yeni.toLocaleLowerCase("tr"))) {
      setGiris("");
      return;
    }
    setEtiketler((l) => [...l, yeni]);
    setGiris("");
  }

  function kaldir(e: string) {
    setEtiketler((l) => l.filter((x) => x !== e));
  }

  function girisDegis(v: string) {
    // Virgülle ayrılmış yapıştırmayı da ayır.
    if (v.includes(",")) {
      const parcalar = v.split(",");
      const son = parcalar.pop() ?? "";
      parcalar.forEach(ekle);
      setGiris(son);
    } else {
      setGiris(v);
    }
  }

  async function uygula() {
    if (!hedef || kaydediliyor) return;
    // Girişte bekleyen metin varsa onu da dahil et.
    const nihai = giris.trim() && !giris.includes(",")
      ? [...etiketler, giris.trim()]
      : etiketler;
    setKaydediliyor(true);
    const res = await modelEtiketGuncelle(hedef.id, nihai);
    if (res.ok) {
      const temiz = [...new Set(nihai.map((e) => e.trim()).filter(Boolean))];
      onUygulandi(hedef.id, temiz);
      toast.success(`${hedef.ad} etiketleri güncellendi`);
      onKapat();
    } else {
      setKaydediliyor(false);
      toast.error(res.error ?? "Güncellenemedi.");
    }
  }

  return (
    <Dialog open={hedef !== null} onOpenChange={(o) => !o && onKapat()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Etiketler</DialogTitle>
          <DialogDescription>
            {hedef?.ad} — Enter ya da virgülle ekleyin.
          </DialogDescription>
        </DialogHeader>

        {etiketler.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {etiketler.map((e) => (
              <Badge key={e} variant="secondary" className="gap-1 pr-1">
                {e}
                <button
                  type="button"
                  onClick={() => kaldir(e)}
                  className="rounded-sm opacity-60 hover:opacity-100"
                  aria-label={`${e} etiketini kaldır`}
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}

        <IconInput
          label="Yeni Etiket"
          value={giris}
          autoFocus
          placeholder="Örn. çok satan, kampanya"
          onChange={(e) => girisDegis(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              ekle(giris);
            } else if (e.key === "Backspace" && giris === "" && etiketler.length) {
              // Boş girişte Backspace son etiketi siler.
              setEtiketler((l) => l.slice(0, -1));
            }
          }}
        />

        <DialogFooter>
          <DialogClose render={<Button variant="outline">İptal</Button>} />
          <Button onClick={uygula} disabled={kaydediliyor}>
            {kaydediliyor ? "Kaydediliyor…" : "Kaydet"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
