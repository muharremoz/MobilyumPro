"use client";

import * as React from "react";
import { Plus, Pencil, Trash2, GripVertical } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ListHeader } from "@/components/ui/list-header";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SatirMenu } from "@/components/ui/satir-menu";
import { useOnay } from "@/components/ui/confirm-dialog";
import type { Istasyon } from "@/lib/fabrika";
import { istasyonKaydet, istasyonSil } from "@/lib/db/actions";
import { usePropAynasi } from "@/hooks/use-prop-aynasi";

type Form = {
  id?: string;
  ad: string;
  sira: number;
  renk: string;
  konum: { x: number; z: number; g: number; d: number };
};

const BOS: Form = {
  ad: "",
  sira: 1,
  renk: "#3b82f6",
  konum: { x: 12, z: 2, g: 6, d: 5 },
};

export function IstasyonTanim({
  istasyonlar = [],
}: {
  istasyonlar?: Istasyon[];
}) {
  const { onayla, onayDialog } = useOnay();
  const [liste, setListe] = usePropAynasi(istasyonlar);
  const [acik, setAcik] = React.useState(false);
  const [form, setForm] = React.useState<Form>(BOS);

  function yeni() {
    setForm({ ...BOS, sira: liste.length + 1 });
    setAcik(true);
  }
  function duzenle(i: Istasyon) {
    setForm({
      id: i.slug,
      ad: i.ad,
      sira: i.sira ?? 1,
      renk: i.renk,
      konum: { ...i.konum },
    });
    setAcik(true);
  }

  async function sil(i: Istasyon) {
    if (
      !(await onayla({
        title: `"${i.ad}" silinsin mi?`,
        description: "Bu kayıt kalıcı olarak silinecek. Bu işlem geri alınamaz.",
      }))
    )
      return;
    const onceki = liste;
    setListe((l) => l.filter((x) => x.slug !== i.slug));
    const res = await istasyonSil(i.slug);
    if (!res.ok) {
      setListe(onceki);
      toast.error(res.error ?? "İstasyon silinemedi.");
      return;
    }
    toast.success("İstasyon silindi");
  }

  async function kaydet() {
    if (!form.ad.trim()) {
      toast.error("İstasyon adı gerekli");
      return;
    }
    const res = await istasyonKaydet({
      id: form.id,
      ad: form.ad.trim(),
      sira: form.sira,
      renk: form.renk,
      konum: form.konum,
    });
    if (!res.ok || !res.id) {
      toast.error(res.error ?? "İstasyon kaydedilemedi.");
      return;
    }
    const kayit: Istasyon = {
      slug: res.id,
      ad: form.ad.trim(),
      sira: form.sira,
      renk: form.renk,
      konum: form.konum,
      durum: "Aktif",
    };
    setListe((l) => {
      const varMi = l.some((x) => x.slug === res.id);
      const yeni = varMi
        ? l.map((x) => (x.slug === res.id ? kayit : x))
        : [...l, kayit];
      return [...yeni].sort((a, b) => (a.sira ?? 0) - (b.sira ?? 0));
    });
    setAcik(false);
    toast.success(form.id ? "İstasyon güncellendi" : "İstasyon eklendi");
  }

  const setKonum = (k: keyof Form["konum"]) => (v: string) =>
    setForm((f) => ({ ...f, konum: { ...f.konum, [k]: Number(v) || 0 } }));

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-md border bg-card">
        <ListHeader title="Üretim İstasyonları">
          <Button size="sm" onClick={yeni}>
            <Plus className="size-4" /> Yeni İstasyon
          </Button>
        </ListHeader>

        {liste.length === 0 ? (
          <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
            Henüz istasyon yok. &quot;Yeni İstasyon&quot; ile başlayın.
          </div>
        ) : (
          <div className="divide-y">
            {liste.map((i) => (
              <SatirMenu
                key={i.slug}
                className="w-36"
                aksiyonlar={[
                  {
                    etiket: "Düzenle",
                    ikon: Pencil,
                    onSecim: () => duzenle(i),
                  },
                  {
                    etiket: "Sil",
                    ikon: Trash2,
                    tehlike: true,
                    ayracOnce: true,
                    onSecim: () => sil(i),
                  },
                ]}
              >
              <div className="group flex items-center gap-3 px-3 py-2.5">
                <GripVertical className="size-4 shrink-0 text-muted-foreground/40" />
                <span className="w-6 shrink-0 text-center text-xs font-medium text-muted-foreground tabular-nums">
                  {i.sira}
                </span>
                <span
                  className="size-4 shrink-0 rounded-full border"
                  style={{ backgroundColor: i.renk }}
                />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {i.ad}
                </span>
                <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                  {i.slug}
                </span>
                <span className="hidden shrink-0 text-[11px] text-muted-foreground tabular-nums sm:inline">
                  {i.konum.g}×{i.konum.d} m
                </span>
              </div>
              </SatirMenu>
            ))}
          </div>
        )}
      </div>
      <span className="text-sm text-muted-foreground">
        {liste.length} istasyon · rota sırayla ilerler
      </span>

      <Dialog open={acik} onOpenChange={setAcik}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {form.id ? "İstasyonu Düzenle" : "Yeni İstasyon"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-[1fr_5rem_4rem] gap-2">
              <label className="grid gap-1 text-xs font-medium">
                Ad
                <Input
                  autoFocus
                  placeholder="Örn. Kesim"
                  value={form.ad}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, ad: e.target.value }))
                  }
                />
              </label>
              <label className="grid gap-1 text-xs font-medium">
                Sıra
                <Input
                  type="number"
                  value={form.sira}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, sira: Number(e.target.value) || 1 }))
                  }
                />
              </label>
              <label className="grid gap-1 text-xs font-medium">
                Renk
                <input
                  type="color"
                  value={form.renk}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, renk: e.target.value }))
                  }
                  className="h-9 w-full cursor-pointer rounded-md border bg-transparent"
                />
              </label>
            </div>
            <div className="grid gap-1">
              <span className="text-xs font-medium text-muted-foreground">
                3D fabrika konumu (plan, metre)
              </span>
              <div className="grid grid-cols-4 gap-2">
                {(
                  [
                    ["x", "X (sol)"],
                    ["z", "Z (üst)"],
                    ["g", "Genişlik"],
                    ["d", "Derinlik"],
                  ] as const
                ).map(([k, etiket]) => (
                  <label key={k} className="grid gap-1 text-[11px] text-muted-foreground">
                    {etiket}
                    <Input
                      type="number"
                      value={form.konum[k]}
                      onChange={(e) => setKonum(k)(e.target.value)}
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAcik(false)}>
              İptal
            </Button>
            <Button onClick={kaydet}>{form.id ? "Kaydet" : "Ekle"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {onayDialog}
    </div>
  );
}
