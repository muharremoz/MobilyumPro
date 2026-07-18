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
import { SearchSelect } from "@/components/ui/search-select";
import { useOnay } from "@/components/ui/confirm-dialog";
import type { Istasyon } from "@/lib/fabrika";
import type { Makine } from "@/lib/data";
import { istasyonKaydet, istasyonSil,
  makineKaydet, makineSil,
  silinebilirMi,
} from "@/lib/db/actions";
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

/** Makine ekleme/düzenleme formu. */
type MakineForm = {
  id?: number;
  ad: string;
  /** İstasyon slug'ı. */
  istasyon: string;
  sira: number;
  durum: "Aktif" | "Pasif";
};

const MAKINE_BOS: MakineForm = { ad: "", istasyon: "", sira: 1, durum: "Aktif" };

export function IstasyonTanim({
  istasyonlar = [],
  makineler = [],
}: {
  istasyonlar?: Istasyon[];
  /** İstasyonlara bağlı tezgahlar. */
  makineler?: Makine[];
}) {
  const { onayla, uyar, onayDialog } = useOnay();
  const [liste, setListe] = usePropAynasi(istasyonlar);
  const [acik, setAcik] = React.useState(false);
  const [form, setForm] = React.useState<Form>(BOS);
  const [makineListe, setMakineListe] = usePropAynasi(makineler);
  const [makineAcik, setMakineAcik] = React.useState(false);
  const [makineForm, setMakineForm] = React.useState<MakineForm>(MAKINE_BOS);

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
    // Onaydan önce: silinemeyecek kayıt için "emin misiniz?" sorma.
    const kontrol = await silinebilirMi("istasyon", [i.slug]);
    if (!kontrol.ok) {
      await uyar({
        title: "Silinemedi",
        description: kontrol.error ?? "İstasyon silinemez.",
        detaylar: kontrol.detaylar,
      });
      return;
    }
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
      await uyar({
        title: "Silinemedi",
        description: res.error ?? "İstasyon silinemedi.",
      });
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

  // ── Makineler ──────────────────────────────────────────────────────────
  const istasyonAdi = React.useCallback(
    (slug: string) => liste.find((i) => i.slug === slug)?.ad ?? slug,
    [liste],
  );

  /** İstasyon sırasına göre gruplanmış makineler (sahipsizler en sonda). */
  const makineGruplari = React.useMemo(() => {
    const gruplar = liste.map((i) => ({
      slug: i.slug,
      ad: i.ad,
      renk: i.renk,
      makineler: makineListe
        .filter((m) => m.istasyon === i.slug)
        .sort((a, b) => a.sira - b.sira || a.ad.localeCompare(b.ad, "tr")),
    }));
    // İstasyonu silinmiş/bilinmeyen makineler de görünsün.
    const bilinen = new Set(liste.map((i) => i.slug));
    const oksuz = makineListe.filter((m) => !bilinen.has(m.istasyon));
    if (oksuz.length > 0)
      gruplar.push({
        slug: "",
        ad: "İstasyonsuz",
        renk: "#94a3b8",
        makineler: oksuz,
      });
    return gruplar.filter((g) => g.makineler.length > 0);
  }, [liste, makineListe]);

  function makineYeni() {
    const ilk = liste[0]?.slug ?? "";
    setMakineForm({
      ...MAKINE_BOS,
      istasyon: ilk,
      sira: makineListe.filter((m) => m.istasyon === ilk).length + 1,
    });
    setMakineAcik(true);
  }
  function makineDuzenle(m: Makine) {
    setMakineForm({
      id: m.id,
      ad: m.ad,
      istasyon: m.istasyon,
      sira: m.sira,
      durum: m.durum,
    });
    setMakineAcik(true);
  }

  async function makineyiSil(m: Makine) {
    if (
      !(await onayla({
        title: `"${m.ad}" silinsin mi?`,
        description: "Bu kayıt kalıcı olarak silinecek. Bu işlem geri alınamaz.",
      }))
    )
      return;
    const onceki = makineListe;
    setMakineListe((l) => l.filter((x) => x.id !== m.id));
    const res = await makineSil(m.id);
    if (!res.ok) {
      setMakineListe(onceki);
      await uyar({
        title: "Silinemedi",
        description: res.error ?? "Makine silinemedi.",
      });
      return;
    }
    toast.success("Makine silindi");
  }

  async function makineKaydetGonder() {
    if (!makineForm.ad.trim()) {
      toast.error("Makine adı gerekli");
      return;
    }
    if (!makineForm.istasyon) {
      toast.error("İstasyon seçin");
      return;
    }
    const res = await makineKaydet({
      id: makineForm.id,
      ad: makineForm.ad.trim(),
      istasyon: makineForm.istasyon,
      sira: makineForm.sira,
      durum: makineForm.durum,
    });
    if (!res.ok || res.id === undefined) {
      toast.error(res.error ?? "Makine kaydedilemedi.");
      return;
    }
    const kayit: Makine = {
      id: res.id,
      ad: makineForm.ad.trim(),
      istasyon: makineForm.istasyon,
      sira: makineForm.sira,
      durum: makineForm.durum,
    };
    setMakineListe((l) =>
      l.some((x) => x.id === kayit.id)
        ? l.map((x) => (x.id === kayit.id ? kayit : x))
        : [...l, kayit],
    );
    setMakineAcik(false);
    toast.success(makineForm.id ? "Makine güncellendi" : "Makine eklendi");
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

      {/* Makineler — istasyona bağlı tezgahlar, istasyona göre gruplu. */}
      <div className="overflow-hidden rounded-md border bg-card">
        <ListHeader title="Makineler">
          <Button size="sm" onClick={makineYeni} disabled={liste.length === 0}>
            <Plus className="size-4" /> Yeni Makine
          </Button>
        </ListHeader>

        {makineGruplari.length === 0 ? (
          <div className="flex h-24 items-center justify-center px-3 text-center text-sm text-muted-foreground">
            {liste.length === 0
              ? "Önce istasyon tanımlayın; makineler istasyona bağlanır."
              : "Henüz makine yok. “Yeni Makine” ile başlayın."}
          </div>
        ) : (
          <div className="divide-y">
            {makineGruplari.map((g) => (
              <div key={g.slug || "istasyonsuz"}>
                <div className="flex items-center gap-2 bg-muted/40 px-3 py-1.5">
                  <span
                    className="size-2.5 shrink-0 rounded-full border"
                    style={{ backgroundColor: g.renk }}
                  />
                  <span className="min-w-0 flex-1 truncate text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {g.ad}
                  </span>
                  <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
                    {g.makineler.length} makine
                  </span>
                </div>
                <div className="divide-y">
                  {g.makineler.map((m) => (
                    <SatirMenu
                      key={m.id}
                      className="w-36"
                      aksiyonlar={[
                        {
                          etiket: "Düzenle",
                          ikon: Pencil,
                          onSecim: () => makineDuzenle(m),
                        },
                        {
                          etiket: "Sil",
                          ikon: Trash2,
                          tehlike: true,
                          ayracOnce: true,
                          onSecim: () => makineyiSil(m),
                        },
                      ]}
                    >
                      <div className="flex items-center gap-3 py-2 pl-9 pr-3">
                        <span className="w-6 shrink-0 text-center text-xs font-medium text-muted-foreground tabular-nums">
                          {m.sira}
                        </span>
                        <span
                          className={cn(
                            "min-w-0 flex-1 truncate text-sm",
                            m.durum === "Pasif"
                              ? "text-muted-foreground line-through"
                              : "font-medium",
                          )}
                        >
                          {m.ad}
                        </span>
                        <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                          {m.durum}
                        </span>
                      </div>
                    </SatirMenu>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <span className="text-sm text-muted-foreground">
        {makineListe.length} makine
      </span>

      <Dialog open={makineAcik} onOpenChange={setMakineAcik}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {makineForm.id ? "Makineyi Düzenle" : "Yeni Makine"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <label className="grid gap-1 text-xs font-medium">
              Ad
              <Input
                autoFocus
                placeholder="Örn. SAWTECH EBATLAMA"
                value={makineForm.ad}
                onChange={(e) =>
                  setMakineForm((f) => ({ ...f, ad: e.target.value }))
                }
              />
            </label>
            <div className="grid gap-1 text-xs font-medium">
              İstasyon
              <SearchSelect
                items={liste.map((i) => i.ad)}
                value={
                  makineForm.istasyon ? istasyonAdi(makineForm.istasyon) : null
                }
                onValueChange={(ad) =>
                  setMakineForm((f) => ({
                    ...f,
                    istasyon: liste.find((i) => i.ad === ad)?.slug ?? "",
                  }))
                }
                placeholder="İstasyon seçin"
              />
            </div>
            <div className="grid grid-cols-[5rem_1fr] gap-2">
              <label className="grid gap-1 text-xs font-medium">
                Sıra
                <Input
                  type="number"
                  value={makineForm.sira}
                  onChange={(e) =>
                    setMakineForm((f) => ({
                      ...f,
                      sira: Number(e.target.value) || 1,
                    }))
                  }
                />
              </label>
              <div className="grid gap-1 text-xs font-medium">
                Durum
                <SearchSelect
                  items={["Aktif", "Pasif"]}
                  value={makineForm.durum}
                  onValueChange={(v) =>
                    setMakineForm((f) => ({
                      ...f,
                      durum: v === "Pasif" ? "Pasif" : "Aktif",
                    }))
                  }
                  placeholder="Durum"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMakineAcik(false)}>
              İptal
            </Button>
            <Button onClick={makineKaydetGonder}>
              {makineForm.id ? "Kaydet" : "Ekle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
