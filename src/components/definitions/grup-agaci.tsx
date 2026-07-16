"use client";

import * as React from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Info,
  Folder,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

import { Reorder, useDragControls } from "motion/react";
import { GripVertical } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ListHeader } from "@/components/ui/list-header";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { IconInput } from "@/components/ui/icon-input";
import { FolderOpenIcon } from "@/components/ui/icons/folder-open";
import { ScanTextIcon } from "@/components/ui/icons/scan-text";
import { SatirMenu } from "@/components/ui/satir-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useOnay } from "@/components/ui/confirm-dialog";
import type { StokGrup } from "@/lib/data";
import { grupKaydet, grupSil, grupSiraKaydet } from "@/lib/db/actions";

/**
 * Stok grup ağacı — Tanımlamalar → Gruplar.
 * Sınırsız derinlik: grup → alt grup → alt-alt grup... Kodlar elle girilir
 * (örn. 150, AKS, 01). Satır menüsünden alt grup eklenir.
 */
/**
 * Sürüklenebilir grup satırı (modül seviyesi → drag durumu stabil kalır).
 * Sol taraftaki tutamaçtan sürüklenir; karta tıklama alt sütunu açar.
 */
function GrupSatiri({
  grup,
  ustGrupMu,
  seciliMi,
  onSec,
  onYeniAlt,
  onDuzenle,
  onSil,
}: {
  grup: StokGrup;
  ustGrupMu: boolean;
  seciliMi: boolean;
  onSec: () => void;
  onYeniAlt: () => void;
  onDuzenle: () => void;
  onSil: () => void;
}) {
  const controls = useDragControls();
  const renk = kodRenk(grup.kod);
  return (
    <Reorder.Item
      as="div"
      value={grup}
      dragListener={false}
      dragControls={controls}
      className="select-none"
    >
      <SatirMenu
        className="w-40"
        aksiyonlar={[
          { etiket: "Alt Grup Ekle", ikon: Plus, onSecim: onYeniAlt },
          { etiket: "Düzenle", ikon: Pencil, onSecim: onDuzenle },
          {
            etiket: "Sil",
            ikon: Trash2,
            tehlike: true,
            ayracOnce: true,
            onSecim: onSil,
          },
        ]}
      >
      <div
        onClick={onSec}
        className={cn(
          "group flex cursor-pointer items-center gap-1.5 rounded-md border bg-card px-2 py-1.5 transition-colors",
          seciliMi
            ? "border-foreground/25 bg-accent"
            : "hover:border-foreground/15 hover:bg-accent/40",
        )}
      >
        <span
          role="button"
          aria-label="Sürükle"
          onPointerDown={(e) => {
            e.stopPropagation();
            controls.start(e);
          }}
          className="shrink-0 cursor-grab touch-none text-muted-foreground/30 opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
        >
          <GripVertical className="size-4" />
        </span>
        {ustGrupMu ? (
          <Folder className={cn("size-4 shrink-0", renk.ikon)} />
        ) : (
          <span className="flex size-4 shrink-0 items-center justify-center">
            <span className="size-1.5 rounded-full bg-muted-foreground/40" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium leading-tight">
            {grup.ad}
          </div>
          <div className="mt-0.5 flex items-center gap-1.5">
            <span
              className={cn(
                "inline-flex shrink-0 justify-center rounded px-1 py-px font-mono text-[10px] font-medium",
                renk.rozet,
              )}
            >
              {grup.kod}
            </span>
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {grup.kullanim ?? 0} kullanım
            </span>
          </div>
        </div>
        {ustGrupMu && (
          <ChevronRight className="size-4 shrink-0 text-muted-foreground/50" />
        )}
      </div>
      </SatirMenu>
    </Reorder.Item>
  );
}

export function GrupAgaci({ gruplar = [] }: { gruplar?: StokGrup[] }) {
  const { onayla, onayDialog } = useOnay();
  const [liste, setListe] = React.useState<StokGrup[]>(gruplar);
  // Sütunlu (Finder) gezinme yolu — seçili grup id'leri (kök → derin).
  const [yolIds, setYolIds] = React.useState<string[]>([]);
  const [sheetAcik, setSheetAcik] = React.useState(false);
  // Düzenlenen grup ya da yeni grubun ekleneceği üst grup.
  const [duzenlenen, setDuzenlenen] = React.useState<StokGrup | null>(null);
  const [ustGrup, setUstGrup] = React.useState<StokGrup | null>(null);

  React.useEffect(() => setListe(gruplar), [gruplar]);

  // ustId → alt gruplar (sürükle-bırak sırasıyla; eşitse kod)
  const altlar = React.useMemo(() => {
    const m = new Map<string | null, StokGrup[]>();
    for (const g of liste) {
      const arr = m.get(g.ustId) ?? [];
      arr.push(g);
      m.set(g.ustId, arr);
    }
    for (const arr of m.values())
      arr.sort(
        (a, b) =>
          (a.sira ?? 0) - (b.sira ?? 0) ||
          a.kod.localeCompare(b.kod, "tr") ||
          a.ad.localeCompare(b.ad, "tr"),
      );
    return m;
  }, [liste]);

  // Sürükleme sırasında yerel sıra anında; kalıcı yazma bitişte (debounce).
  const siraTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  function kolonSirala(yeni: StokGrup[]) {
    const siraMap = new Map(yeni.map((g, i) => [g.id, i]));
    setListe((l) =>
      l.map((g) => (siraMap.has(g.id) ? { ...g, sira: siraMap.get(g.id)! } : g)),
    );
    const ids = yeni.map((g) => g.id);
    if (siraTimer.current) clearTimeout(siraTimer.current);
    siraTimer.current = setTimeout(() => void grupSiraKaydet(ids), 500);
  }

  const byId = React.useMemo(
    () => new Map(liste.map((g) => [g.id, g])),
    [liste],
  );

  /** Bir kolondaki grubu seç → o kolona kadar yolu koru, seçileni ekle. */
  function sec(g: StokGrup, kolon: number) {
    setYolIds((prev) => [...prev.slice(0, kolon), g.id]);
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
    if (
      !(await onayla({
        title: `"${g.ad}" silinsin mi?`,
        description: "Bu kayıt kalıcı olarak silinecek. Bu işlem geri alınamaz.",
      }))
    )
      return;
    const onceki = liste;
    setListe((l) => l.filter((x) => x.id !== g.id));
    setYolIds((prev) => {
      const i = prev.indexOf(g.id);
      return i === -1 ? prev : prev.slice(0, i);
    });
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
    toast.success("Grup eklendi");
  }

  // Takip eden sütunlar: kök + seçili yoldaki her grubun alt grupları.
  const kolonlar: { ust: StokGrup | null; items: StokGrup[] }[] = [
    { ust: null, items: altlar.get(null) ?? [] },
  ];
  for (const id of yolIds) {
    const g = byId.get(id);
    if (!g) break;
    kolonlar.push({ ust: g, items: altlar.get(id) ?? [] });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-md border bg-card">
        <ListHeader title="Gruplar">
          <KodBilgisi />
          <Button size="sm" onClick={() => yeniGrup(null)}>
            <Plus className="size-4" /> Yeni Grup
          </Button>
        </ListHeader>

        {(altlar.get(null) ?? []).length === 0 ? (
          <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
            Henüz grup yok. &quot;Yeni Grup&quot; ile başlayın.
          </div>
        ) : (
          <div className="flex max-h-[32rem] overflow-x-auto">
            {kolonlar.map((kolon, ki) => (
              <div
                key={ki}
                className={cn(
                  "flex max-h-[32rem] w-64 shrink-0 flex-col",
                  ki > 0 && "border-l",
                )}
              >
                <div className="flex shrink-0 items-center justify-between gap-2 px-3 pt-2 pb-1">
                  <span className="truncate text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                    {kolon.ust ? kolon.ust.ad : "Kök Gruplar"}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Grup ekle"
                    title={kolon.ust ? "Alt grup ekle" : "Kök grup ekle"}
                    onClick={() => yeniGrup(kolon.ust)}
                  >
                    <Plus className="size-4" />
                  </Button>
                </div>
                <div className="flex flex-1 flex-col overflow-y-auto px-2 pb-2">
                  {kolon.items.length > 0 ? (
                    <Reorder.Group
                      as="div"
                      axis="y"
                      values={kolon.items}
                      onReorder={kolonSirala}
                      className="flex flex-col gap-1.5"
                    >
                      {kolon.items.map((g) => (
                        <GrupSatiri
                          key={g.id}
                          grup={g}
                          ustGrupMu={(altlar.get(g.id) ?? []).length > 0}
                          seciliMi={yolIds[ki] === g.id}
                          onSec={() => sec(g, ki)}
                          onYeniAlt={() => yeniGrup(g)}
                          onDuzenle={() => duzenle(g)}
                          onSil={() => sil(g)}
                        />
                      ))}
                    </Reorder.Group>
                  ) : (
                    <button
                      type="button"
                      onClick={() => yeniGrup(kolon.ust)}
                      className="flex items-center justify-center gap-1.5 rounded-md border border-dashed py-6 text-xs text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground"
                    >
                      <Plus className="size-3.5" /> Alt grup ekle
                    </button>
                  )}
                </div>
              </div>
            ))}
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
      {onayDialog}
    </div>
  );
}

/** Grup koduna göre renk (Tekdüzen Hesap Planı: 150/151/152/153/157). */
function kodRenk(kod: string): { rozet: string; ikon: string } {
  const k = kod.trim();
  if (k.startsWith("150"))
    return { rozet: "bg-blue-100 text-blue-700", ikon: "text-blue-500" };
  if (k.startsWith("151"))
    return { rozet: "bg-violet-100 text-violet-700", ikon: "text-violet-500" };
  if (k.startsWith("152"))
    return { rozet: "bg-emerald-100 text-emerald-700", ikon: "text-emerald-500" };
  if (k.startsWith("153"))
    return { rozet: "bg-amber-100 text-amber-700", ikon: "text-amber-500" };
  if (k.startsWith("157"))
    return { rozet: "bg-slate-100 text-slate-700", ikon: "text-slate-500" };
  return { rozet: "bg-muted text-muted-foreground", ikon: "text-muted-foreground" };
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {duzenlenen
              ? "Grubu Düzenle"
              : ustGrup
                ? `Alt Grup — ${ustGrup.ad}`
                : "Yeni Grup"}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-2.5">
          {ustGrup && (
            <p className="rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              Üst grup:{" "}
              <span className="font-medium text-foreground">{ustGrup.ad}</span>{" "}
              <span className="font-mono">({ustGrup.kod})</span>
            </p>
          )}
          <IconInput
            label="Grup Adı"
            icon={FolderOpenIcon}
            placeholder="Örn. Yatak Odası"
            value={ad}
            onChange={(e) => setAd(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                kaydet();
              }
            }}
          />
          <IconInput
            label="Grup Kodu"
            icon={ScanTextIcon}
            placeholder="Örn. 152 veya YTK"
            value={kod}
            onChange={(e) => setKod(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                kaydet();
              }
            }}
          />
          <p className="text-xs text-muted-foreground">
            İpucu: üst gruplarda muhasebe hesap kodu (150 malzeme, 152 mamul,
            153 ticari mal...), ara seviyede sıra (01, 02...), malzeme
            altlarında kısaltma (AKS, ALU...) yaygındır. Detay için listedeki{" "}
            <Info className="inline size-3 align-[-1px]" /> simgesine bakın.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            İptal
          </Button>
          <Button onClick={kaydet}>{duzenlenen ? "Kaydet" : "Ekle"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
