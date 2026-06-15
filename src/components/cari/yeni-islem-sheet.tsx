"use client";

import * as React from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormSheet } from "@/components/ui/form-sheet";
import {
  SheetClose,
  SheetFooter,
} from "@/components/ui/sheet";
import { CartIcon } from "@/components/ui/icons/cart";
import {
  type CariIslem,
  type CariIslemTuru,
  type ParaBirimi,
} from "@/lib/data";

type TurAyari = {
  tur: CariIslemTuru;
  baslik: string;
  aciklama: string;
};

const TURLER: TurAyari[] = [
  {
    tur: "Tahsilat",
    baslik: "Tahsilat",
    aciklama: "Cariden para alındı",
  },
  {
    tur: "Ödeme",
    baslik: "Ödeme",
    aciklama: "Cariye ödeme yapıldı",
  },
  {
    tur: "Borç",
    baslik: "Borçlandır",
    aciklama: "Satış faturası kesildi (cari bize borçlu)",
  },
  {
    tur: "Alacak",
    baslik: "Alacaklandır",
    aciklama: "Alış faturası geldi (biz cariye borçluyuz)",
  },
];

const TUR_NESTED_BG =
  "repeating-linear-gradient(45deg, rgba(91,79,65,0.035) 0px, rgba(91,79,65,0.035) 1px, transparent 1px, transparent 4px)";

export function YeniIslemSheet({
  open,
  onOpenChange,
  paraBirimi,
  onEkle,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  paraBirimi: ParaBirimi;
  onEkle: (i: Omit<CariIslem, "id" | "cariId">) => void;
}) {
  const bugun = new Date().toISOString().slice(0, 10);
  const [secilen, setSecilen] = React.useState<CariIslemTuru | null>(null);
  const [tarih, setTarih] = React.useState(bugun);
  const [tutar, setTutar] = React.useState("");
  const [belge, setBelge] = React.useState("");
  const [aciklama, setAciklama] = React.useState("");

  // Sheet her açıldığında sıfırla
  React.useEffect(() => {
    if (open) {
      setSecilen(null);
      setTarih(bugun);
      setTutar("");
      setBelge("");
      setAciklama("");
    }
  }, [open, bugun]);

  const secilenAyar = TURLER.find((t) => t.tur === secilen);

  function ekle() {
    if (!secilen) return;
    const n = Number(tutar);
    if (!n || n <= 0) {
      toast.error("Geçerli bir tutar girin");
      return;
    }
    onEkle({
      tur: secilen,
      tarih,
      tutar: n,
      belge: belge.trim() || undefined,
      aciklama: aciklama.trim() || "—",
    });
    onOpenChange(false);
  }

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={secilen ? `Yeni ${secilen}` : "Yeni İşlem"}
      icon={CartIcon}
      footer={
        secilen ? (
          <SheetFooter className="mt-1 flex-row items-center gap-2 rounded-md border bg-card p-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSecilen(null)}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-4" /> İşlemlere dön
            </Button>
            <div className="ml-auto flex gap-2">
              <SheetClose render={<Button variant="outline">İptal</Button>} />
              <Button onClick={ekle}>Ekle</Button>
            </div>
          </SheetFooter>
        ) : (
          <SheetFooter className="mt-1 flex-row justify-end gap-2 rounded-md border bg-card p-2">
            <SheetClose render={<Button variant="outline">Kapat</Button>} />
          </SheetFooter>
        )
      }
    >
      {!secilen ? (
        // ─── Adım 1: Tür seçimi ──────────────────────────────────
        <div className="grid gap-2.5">
          <p className="text-sm text-muted-foreground">
            Ne tür bir işlem ekleyeceksiniz?
          </p>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {TURLER.map((t) => (
              <button
                key={t.tur}
                type="button"
                onClick={() => setSecilen(t.tur)}
                className="group cursor-pointer rounded-lg border-white bg-[#f5f5f5] p-1.5 text-left transition-opacity hover:opacity-95"
                style={{ backgroundImage: TUR_NESTED_BG }}
              >
                <div className="rounded-md border bg-card p-3 transition-colors group-hover:bg-muted/40">
                  <div className="text-sm font-semibold text-foreground">
                    {t.baslik}
                  </div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    {t.aciklama}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        // ─── Adım 2: Form ────────────────────────────────────────
        <div className="grid gap-3">
          {/* Seçili tür rozet — nested kart stili */}
          {secilenAyar && (
            <div
              className="rounded-lg border-white bg-[#f5f5f5] p-1.5"
              style={{ backgroundImage: TUR_NESTED_BG }}
            >
              <div className="rounded-md border bg-card p-2.5">
                <div className="text-sm font-semibold text-foreground">
                  {secilenAyar.baslik}
                </div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">
                  {secilenAyar.aciklama}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2.5">
            <div className="grid gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Tarih
              </label>
              <Input
                type="date"
                value={tarih}
                onChange={(e) => setTarih(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="grid gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Tutar
              </label>
              <div className="relative">
                <Input
                  type="number"
                  value={tutar}
                  onChange={(e) => setTutar(e.target.value)}
                  placeholder="0"
                  autoFocus
                  className="h-9 pr-10 text-right tabular-nums"
                />
                <span className="absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground">
                  {paraBirimi}
                </span>
              </div>
            </div>
          </div>

          <div className="grid gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Belge No
            </label>
            <Input
              value={belge}
              onChange={(e) => setBelge(e.target.value)}
              placeholder="Fatura / Dekont no (opsiyonel)"
              className="h-9"
            />
          </div>

          <div className="grid gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Açıklama
            </label>
            <textarea
              rows={3}
              value={aciklama}
              onChange={(e) => setAciklama(e.target.value)}
              placeholder="İşlem açıklaması..."
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  ekle();
                }
              }}
              className="w-full resize-none rounded-md border border-input bg-transparent px-3 py-1.5 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30"
            />
          </div>
        </div>
      )}
    </FormSheet>
  );
}
