"use client";

import * as React from "react";
import {
  Plus,
  ChevronRight,
  MoreHorizontal,
  Pencil,
  Trash2,
  CornerDownRight,
  Info,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ListHeader } from "@/components/ui/list-header";
import { FormSheet } from "@/components/ui/form-sheet";
import { IconInput } from "@/components/ui/icon-input";
import { FolderOpenIcon } from "@/components/ui/icons/folder-open";
import { ScanTextIcon } from "@/components/ui/icons/scan-text";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { StokGrup } from "@/lib/data";
import { grupKaydet, grupSil } from "@/lib/db/actions";

/**
 * Stok grup ağacı — Tanımlamalar → Gruplar.
 * Sınırsız derinlik: grup → alt grup → alt-alt grup... Kodlar elle girilir
 * (örn. 150, AKS, 01). Satır menüsünden alt grup eklenir.
 */
export function GrupAgaci({ gruplar = [] }: { gruplar?: StokGrup[] }) {
  const [liste, setListe] = React.useState<StokGrup[]>(gruplar);
  const [acik, setAcik] = React.useState<Set<string>>(new Set());
  const [sheetAcik, setSheetAcik] = React.useState(false);
  // Düzenlenen grup ya da yeni grubun ekleneceği üst grup.
  const [duzenlenen, setDuzenlenen] = React.useState<StokGrup | null>(null);
  const [ustGrup, setUstGrup] = React.useState<StokGrup | null>(null);

  React.useEffect(() => setListe(gruplar), [gruplar]);

  // ustId → alt gruplar (kod sırasıyla)
  const altlar = React.useMemo(() => {
    const m = new Map<string | null, StokGrup[]>();
    for (const g of liste) {
      const arr = m.get(g.ustId) ?? [];
      arr.push(g);
      m.set(g.ustId, arr);
    }
    for (const arr of m.values())
      arr.sort((a, b) => a.kod.localeCompare(b.kod, "tr") || a.ad.localeCompare(b.ad, "tr"));
    return m;
  }, [liste]);

  function acKapa(id: string) {
    setAcik((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function yeniGrup(ust: StokGrup | null) {
    setDuzenlenen(null);
    setUstGrup(ust);
    setSheetAcik(true);
  }

  function duzenle(g: StokGrup) {
    setDuzenlenen(g);
    setUstGrup(null);
    setSheetAcik(true);
  }

  async function sil(g: StokGrup) {
    if ((altlar.get(g.id) ?? []).length > 0) {
      toast.error("Önce alt grupları silin.");
      return;
    }
    const onceki = liste;
    setListe((l) => l.filter((x) => x.id !== g.id));
    const res = await grupSil(g.id);
    if (!res.ok) {
      setListe(onceki);
      toast.error(res.error ?? "Grup silinemedi.");
      return;
    }
    toast.success("Grup silindi");
  }

  async function kaydet(degerler: { ad: string; kod: string }) {
    if (duzenlenen) {
      const onceki = liste;
      setListe((l) =>
        l.map((x) => (x.id === duzenlenen.id ? { ...x, ...degerler } : x)),
      );
      const res = await grupKaydet({ id: duzenlenen.id, ustId: null, ...degerler });
      if (!res.ok) {
        setListe(onceki);
        toast.error(res.error ?? "Grup kaydedilemedi.");
        return;
      }
      toast.success("Grup güncellendi");
      return;
    }
    const ustId = ustGrup?.id ?? null;
    const res = await grupKaydet({ ustId, ...degerler });
    if (!res.ok || !res.id) {
      toast.error(res.error ?? "Grup kaydedilemedi.");
      return;
    }
    setListe((l) => [...l, { id: res.id!, ustId, durum: "Aktif", ...degerler }]);
    if (ustId) setAcik((s) => new Set(s).add(ustId));
    toast.success("Grup eklendi");
  }

  function Satir({ grup, seviye }: { grup: StokGrup; seviye: number }) {
    const cocuklar = altlar.get(grup.id) ?? [];
    const acikMi = acik.has(grup.id);
    return (
      <>
        <div
          className="group flex cursor-pointer items-center gap-1 border-b px-2 py-1.5 transition-colors last:border-b-0 hover:bg-accent/50"
          style={{ paddingLeft: 8 + seviye * 22 }}
          onClick={() => cocuklar.length > 0 && acKapa(grup.id)}
        >
          {cocuklar.length > 0 ? (
            <ChevronRight
              className={cn(
                "size-4 shrink-0 text-muted-foreground transition-transform",
                acikMi && "rotate-90",
              )}
            />
          ) : (
            <span className="inline-flex w-4 shrink-0 justify-center">
              {seviye > 0 && (
                <CornerDownRight className="size-3 text-muted-foreground/40" />
              )}
            </span>
          )}
          <span className={cn("truncate text-sm", seviye === 0 && "font-medium")}>
            {grup.ad}
          </span>
          {cocuklar.length > 0 && (
            <span className="text-xs text-muted-foreground/60 tabular-nums">
              ({cocuklar.length})
            </span>
          )}
          <span className="ml-auto font-mono text-xs text-muted-foreground">
            {grup.kod}
          </span>
          <span onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="İşlemler"
                    className="opacity-0 group-hover:opacity-100 data-[popup-open]:opacity-100"
                  >
                    <MoreHorizontal className="size-4" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={() => yeniGrup(grup)}>
                  <Plus className="mr-2 size-4" /> Alt Grup Ekle
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => duzenle(grup)}>
                  <Pencil className="mr-2 size-4" /> Düzenle
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => sil(grup)}>
                  <Trash2 className="mr-2 size-4" /> Sil
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </span>
        </div>
        {acikMi &&
          cocuklar.map((c) => <Satir key={c.id} grup={c} seviye={seviye + 1} />)}
      </>
    );
  }

  const kokler = altlar.get(null) ?? [];

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-md border bg-card">
        <ListHeader title="Gruplar">
          <KodBilgisi />
          <Button size="sm" onClick={() => yeniGrup(null)}>
            <Plus className="size-4" /> Yeni Grup
          </Button>
        </ListHeader>
        {kokler.map((g) => (
          <Satir key={g.id} grup={g} seviye={0} />
        ))}
        {kokler.length === 0 && (
          <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
            Henüz grup yok. &quot;Yeni Grup&quot; ile başlayın.
          </div>
        )}
      </div>
      <span className="text-sm text-muted-foreground">{liste.length} grup</span>

      <GrupSheet
        open={sheetAcik}
        onOpenChange={setSheetAcik}
        duzenlenen={duzenlenen}
        ustGrup={ustGrup}
        onSave={kaydet}
      />
    </div>
  );
}

/** Kod mantığı bilgilendirmesi — sektör alışkanlığı (Tekdüzen Hesap Planı). */
const HESAP_KODLARI: [string, string][] = [
  ["150", "İlk Madde ve Malzeme"],
  ["151", "Yarı Mamuller (parçalar)"],
  ["152", "Mamuller (bitmiş ürün)"],
  ["153", "Ticari Mallar"],
  ["157", "Diğer Stoklar (paket vb.)"],
];

function KodBilgisi() {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="ghost" size="icon-sm" aria-label="Kod mantığı">
            <Info className="size-4 text-muted-foreground" />
          </Button>
        }
      />
      <PopoverContent align="end" className="w-80 gap-0 p-3 text-left">
        <p className="text-sm font-semibold">Grup kodu nasıl verilir?</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Kodlar serbesttir; sektörde yaygın kullanım üç türü birlikte
          kullanır:
        </p>

        <p className="mt-2.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          1 · Muhasebe hesap kodu
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Üst gruplarda ve yapraklarda, stoğun bağlandığı Tekdüzen Hesap Planı
          kodu kullanılır:
        </p>
        <div className="mt-1.5 overflow-hidden rounded-md border">
          {HESAP_KODLARI.map(([kod, ad]) => (
            <div
              key={kod}
              className="flex items-center gap-2 border-b px-2 py-1 text-xs last:border-b-0"
            >
              <span className="font-mono font-medium">{kod}</span>
              <span className="text-muted-foreground">{ad}</span>
            </div>
          ))}
        </div>

        <p className="mt-2.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          2 · Sıra numarası
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Ara seviyelerde basit sıra: Yatak Odası <span className="font-mono">01</span>,
          Yemek Odası <span className="font-mono">02</span>... Stok kodu
          üretiminde segment olur (örn. <span className="font-mono">152.01</span>).
        </p>

        <p className="mt-2.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          3 · Kısaltma
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Malzeme altlarında anımsatıcı kısaltma:{" "}
          <span className="font-mono">AKS</span> (Aksesuar),{" "}
          <span className="font-mono">ALU</span> (Alüminyum),{" "}
          <span className="font-mono">KBN</span> (Kenarbant)...
        </p>
      </PopoverContent>
    </Popover>
  );
}

function GrupSheet({
  open,
  onOpenChange,
  duzenlenen,
  ustGrup,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  duzenlenen: StokGrup | null;
  ustGrup: StokGrup | null;
  onSave: (v: { ad: string; kod: string }) => void;
}) {
  const [ad, setAd] = React.useState("");
  const [kod, setKod] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setAd(duzenlenen?.ad ?? "");
    setKod(duzenlenen?.kod ?? "");
  }, [open, duzenlenen]);

  function kaydet() {
    if (!ad.trim()) {
      toast.error("Grup adı gerekli");
      return;
    }
    if (!kod.trim()) {
      toast.error("Grup kodu gerekli");
      return;
    }
    onSave({ ad: ad.trim(), kod: kod.trim() });
    onOpenChange(false);
  }

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={
        duzenlenen
          ? "Grubu Düzenle"
          : ustGrup
            ? `Alt Grup — ${ustGrup.ad}`
            : "Yeni Grup"
      }
      icon={FolderOpenIcon}
      onSave={kaydet}
    >
      <div className="grid gap-2.5">
        {ustGrup && (
          <p className="rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            Üst grup: <span className="font-medium text-foreground">{ustGrup.ad}</span>{" "}
            <span className="font-mono">({ustGrup.kod})</span>
          </p>
        )}
        <IconInput
          label="Grup Adı"
          icon={FolderOpenIcon}
          placeholder="Örn. Yatak Odası"
          value={ad}
          onChange={(e) => setAd(e.target.value)}
        />
        <IconInput
          label="Grup Kodu"
          icon={ScanTextIcon}
          placeholder="Örn. 152 veya YTK"
          value={kod}
          onChange={(e) => setKod(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          İpucu: üst gruplarda muhasebe hesap kodu (150 malzeme, 152 mamul,
          153 ticari mal...), ara seviyede sıra (01, 02...), malzeme
          altlarında kısaltma (AKS, ALU...) yaygındır. Detay için listedeki{" "}
          <Info className="inline size-3 align-[-1px]" /> simgesine bakın.
        </p>
      </div>
    </FormSheet>
  );
}
