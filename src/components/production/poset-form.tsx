"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { SearchSelect } from "@/components/ui/search-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Poset, PosetSatiri, Malzeme } from "@/lib/data";
import { posetKaydet } from "@/lib/db/actions";

export function PosetForm({
  poset,
  malzemeler,
}: {
  poset: Poset | null;
  malzemeler: Malzeme[];
}) {
  const router = useRouter();
  const duzenleme = !!poset;
  const [ad, setAd] = React.useState(poset?.ad ?? "");
  const [aciklama, setAciklama] = React.useState(poset?.aciklama ?? "");
  const [durum, setDurum] = React.useState<"Aktif" | "Pasif">(
    poset?.durum ?? "Aktif",
  );
  const [satirlar, setSatirlar] = React.useState<PosetSatiri[]>(
    poset?.malzemeler ? [...poset.malzemeler] : [],
  );
  const [kaydediliyor, setKaydediliyor] = React.useState(false);

  const malzemeMap = React.useMemo(
    () => new Map(malzemeler.map((m) => [m.id, m])),
    [malzemeler],
  );

  function satirEkle() {
    setSatirlar((s) => [...s, { malzemeId: "", miktar: 1 }]);
  }
  function satirMalzeme(i: number, ad: string | null) {
    if (!ad) return;
    const m = malzemeler.find((x) => x.ad === ad);
    if (!m) return;
    setSatirlar((s) =>
      s.map((x, j) => (j === i ? { ...x, malzemeId: m.id } : x)),
    );
  }
  function satirMiktar(i: number, v: string) {
    const n = Number(v);
    setSatirlar((s) =>
      s.map((x, j) => (j === i ? { ...x, miktar: isNaN(n) ? 0 : n } : x)),
    );
  }
  function satirSil(i: number) {
    setSatirlar((s) => s.filter((_, j) => j !== i));
  }

  async function kaydet() {
    if (!ad.trim()) {
      toast.error("Poşet adı gerekli");
      return;
    }
    setKaydediliyor(true);
    const res = await posetKaydet({
      id: poset?.id ?? "",
      ad: ad.trim(),
      aciklama: aciklama.trim() || undefined,
      durum,
      malzemeler: satirlar.filter((s) => s.malzemeId),
    });
    setKaydediliyor(false);
    if (!res.ok) {
      toast.error(res.error ?? "Poşet kaydedilemedi");
      return;
    }
    toast.success(duzenleme ? "Poşet güncellendi" : "Poşet eklendi");
    router.push("/uretim/poset");
  }

  const aktifMalzeme = malzemeler.filter((m) => m.durum === "Aktif");

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      {/* Başlık */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon-sm"
          nativeButton={false}
          render={<Link href="/uretim/poset" aria-label="Poşetlere dön" />}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="flex-1 text-xl font-semibold tracking-tight">
          {duzenleme ? "Poşeti Düzenle" : "Yeni Poşet"}
        </h1>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href="/uretim/poset" />}
        >
          İptal
        </Button>
        <Button onClick={kaydet} disabled={kaydediliyor}>
          <Save className="size-4" /> Kaydet
        </Button>
      </div>

      {/* Genel bilgiler */}
      <div className="grid gap-4 rounded-lg border bg-card p-4">
        <div className="grid gap-2">
          <label className="text-sm font-medium">Poşet Adı</label>
          <Input
            placeholder="Örn. Komidin Montaj Poşeti"
            value={ad}
            onChange={(e) => setAd(e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium">Açıklama</label>
          <textarea
            rows={2}
            placeholder="Kısa açıklama..."
            value={aciklama}
            onChange={(e) => setAciklama(e.target.value)}
            className="w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30"
          />
        </div>
        <label className="flex cursor-pointer items-center justify-between gap-3">
          <span className="text-sm font-medium">Durum</span>
          <span className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{durum}</span>
            <Switch
              checked={durum === "Aktif"}
              onCheckedChange={(v) => setDurum(v === true ? "Aktif" : "Pasif")}
              className="data-checked:bg-emerald-600"
            />
          </span>
        </label>
      </div>

      {/* İçerik: malzemeler */}
      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">İçerik</h2>
          <span className="text-xs text-muted-foreground">
            {satirlar.filter((s) => s.malzemeId).length} malzeme
          </span>
        </div>
        <div className="overflow-hidden rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="text-xs font-medium text-muted-foreground">
                  Malzeme
                </TableHead>
                <TableHead className="w-24 text-right text-xs font-medium text-muted-foreground">
                  Miktar
                </TableHead>
                <TableHead className="w-16 text-xs font-medium text-muted-foreground">
                  Birim
                </TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {satirlar.map((s, i) => {
                const m = s.malzemeId ? malzemeMap.get(s.malzemeId) : undefined;
                const seciliBaskaIds = new Set(
                  satirlar
                    .filter((_, j) => j !== i)
                    .map((x) => x.malzemeId)
                    .filter(Boolean),
                );
                const items = aktifMalzeme
                  .filter((x) => !seciliBaskaIds.has(x.id))
                  .map((x) => x.ad);
                return (
                  <TableRow key={i} className="border-b last:border-0">
                    <TableCell>
                      <SearchSelect
                        items={items}
                        value={m?.ad ?? null}
                        onValueChange={(v) => satirMalzeme(i, v)}
                        placeholder="Malzeme seç"
                        searchPlaceholder="Malzeme ara..."
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        value={s.miktar}
                        onChange={(e) => satirMiktar(i, e.target.value)}
                        className="h-8 w-20 text-right tabular-nums"
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {m?.birim ?? ""}
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => satirSil(i)}
                        aria-label="Sil"
                        className="inline-flex size-7 cursor-pointer items-center justify-center rounded-md text-rose-600 hover:bg-rose-50"
                      >
                        <Trash className="size-3.5" />
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {satirlar.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="h-16 text-center text-sm text-muted-foreground"
                  >
                    Henüz malzeme eklenmedi.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <button
          type="button"
          onClick={satirEkle}
          disabled={
            satirlar.filter((s) => s.malzemeId).length >= aktifMalzeme.length
          }
          className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-md border border-dashed py-2 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="size-3.5" /> Malzeme ekle
        </button>
      </div>
    </div>
  );
}
