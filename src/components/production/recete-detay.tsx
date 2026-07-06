"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  AlertTriangle,
  ChevronRight,
  History,
  Plus,
  RotateCcw,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchSelect } from "@/components/ui/search-select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  formatTL,
  type Malzeme,
  type Model,
  type Parca,
  type ParcaKategori,
  type ReceteSatiri,
} from "@/lib/data";
import type { ReceteVersiyonGorunum } from "@/lib/db/queries";
import { parcaKaydet, receteGeriYukle } from "@/lib/db/actions";
import { receteMaliyeti } from "@/components/production/recete-liste";

const KATEGORILER: ParcaKategori[] = [
  "Karyola",
  "Komidin",
  "Şifonyer",
  "Gardırop",
  "Ayna",
  "Sehpa",
  "Koltuk",
  "Diğer",
];

function tarihYaz(iso: string): string {
  const d = new Date(iso);
  return (
    d.toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }) +
    " " +
    d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })
  );
}

export function ReceteDetay({
  recete,
  parcalar,
  malzemeler,
  modeller,
  versiyonlar: versiyonlarProp,
}: {
  /** null → yeni reçete oluşturma modu */
  recete: Parca | null;
  parcalar: Parca[];
  malzemeler: Malzeme[];
  modeller: Model[];
  versiyonlar: ReceteVersiyonGorunum[];
}) {
  const router = useRouter();
  const yeniMi = recete === null;

  const [ad, setAd] = React.useState(recete?.ad ?? "");
  const [kategori, setKategori] = React.useState<ParcaKategori>(
    recete?.kategori ?? "Diğer",
  );
  const [satirlar, setSatirlar] = React.useState<ReceteSatiri[]>(
    recete?.recete.map((r) => ({ ...r, bilesen: { ...r.bilesen } })) ?? [],
  );
  const [versiyonlar, setVersiyonlar] = React.useState(versiyonlarProp);
  const [acikAltlar, setAcikAltlar] = React.useState<Set<number>>(new Set());
  const [kaydetOnay, setKaydetOnay] = React.useState(false);
  const [degisiklikNotu, setDegisiklikNotu] = React.useState("");
  const [geriYukleNo, setGeriYukleNo] = React.useState<number | null>(null);
  const [kaydediliyor, setKaydediliyor] = React.useState(false);

  const malzemeMap = React.useMemo(
    () => new Map(malzemeler.map((m) => [m.id, m])),
    [malzemeler],
  );
  const parcaMap = React.useMemo(
    () => new Map(parcalar.map((p) => [p.id, p])),
    [parcalar],
  );

  // ── Kullanım (yayılma uyarısı + sağ kart) ─────────────────────────────
  const kullanim = React.useMemo(() => {
    if (!recete) return { modeller: [], receteler: [] as string[] };
    const mod: { ad: string; miktar: number }[] = [];
    for (const u of modeller)
      for (const ps of u.parcalar ?? [])
        if (ps.parcaId === recete.id) mod.push({ ad: u.ad, miktar: ps.miktar });
    const rec = parcalar
      .filter(
        (p) =>
          p.id !== recete.id &&
          p.recete.some(
            (r) => r.bilesen.tip === "parca" && r.bilesen.ref === recete.id,
          ),
      )
      .map((p) => p.ad);
    return { modeller: mod, receteler: rec };
  }, [recete, modeller, parcalar]);
  const etkiSayisi = kullanim.modeller.length + kullanim.receteler.length;

  // ── Kirli takibi ──────────────────────────────────────────────────────
  const kirli = React.useMemo(() => {
    if (yeniMi) return ad.trim() !== "" || satirlar.length > 0;
    if (!recete) return false;
    if (ad !== recete.ad || kategori !== recete.kategori) return true;
    const key = (r: ReceteSatiri[]) =>
      JSON.stringify(
        r.map((s) => [s.bilesen.tip, s.bilesen.ref, s.miktar, s.fire ?? 0]),
      );
    return key(satirlar) !== key(recete.recete);
  }, [ad, kategori, satirlar, recete, yeniMi]);

  // ── Maliyet özeti ─────────────────────────────────────────────────────
  const gecerli = satirlar.filter((s) => s.bilesen.ref);
  const toplam = receteMaliyeti(
    gecerli,
    malzemeMap,
    parcaMap,
    new Set(recete ? [recete.id] : []),
  );
  const satirTutari = (s: ReceteSatiri): number => {
    const brut = s.miktar * (1 + (s.fire ?? 0) / 100);
    if (s.bilesen.tip === "malzeme")
      return (malzemeMap.get(s.bilesen.ref)?.birimFiyat ?? 0) * brut;
    const alt = parcaMap.get(s.bilesen.ref);
    return alt
      ? receteMaliyeti(
          alt.recete,
          malzemeMap,
          parcaMap,
          new Set(recete ? [recete.id, alt.id] : [alt.id]),
        ) * brut
      : 0;
  };
  const malzemeToplami = gecerli
    .filter((s) => s.bilesen.tip === "malzeme")
    .reduce((t, s) => t + satirTutari(s), 0);
  const enPahali = [...gecerli]
    .map((s) => ({ s, tutar: satirTutari(s) }))
    .sort((a, b) => b.tutar - a.tutar)
    .slice(0, 3);

  const bilesenAd = (tip: "malzeme" | "parca", ref: string) =>
    tip === "malzeme"
      ? (malzemeMap.get(ref)?.ad ?? ref)
      : (parcaMap.get(ref)?.ad ?? ref);

  // ── Eylemler ──────────────────────────────────────────────────────────
  function satirEkle(tip: "malzeme" | "parca") {
    setSatirlar((s) => [...s, { bilesen: { tip, ref: "" }, miktar: 1 }]);
  }
  function satirGuncelle(i: number, degisim: Partial<ReceteSatiri>) {
    setSatirlar((s) => {
      const n = [...s];
      n[i] = { ...n[i], ...degisim };
      return n;
    });
  }

  async function kaydetUygula() {
    if (!ad.trim()) {
      toast.error("Reçete adı gerekli");
      return;
    }
    setKaydediliyor(true);
    const res = await parcaKaydet(
      {
        id: recete?.id,
        ad: ad.trim(),
        kategori,
        durum: recete?.durum ?? "Aktif",
        recete: gecerli,
      },
      degisiklikNotu || undefined,
    );
    setKaydediliyor(false);
    setKaydetOnay(false);
    setDegisiklikNotu("");
    if (!res.ok || !res.id) {
      toast.error(res.error ?? "Kaydedilemedi.");
      return;
    }
    toast.success("Reçete kaydedildi");
    if (yeniMi) router.replace(`/uretim/recete/${res.id}`);
    else router.refresh();
  }

  function kaydetTikla() {
    if (etkiSayisi > 0) setKaydetOnay(true);
    else void kaydetUygula();
  }

  async function geriYukle() {
    if (!recete || geriYukleNo === null) return;
    const no = geriYukleNo;
    setGeriYukleNo(null);
    const res = await receteGeriYukle(recete.id, no);
    if (!res.ok) {
      toast.error(res.error ?? "Geri yükleme başarısız.");
      return;
    }
    toast.success(`v${no} geri yüklendi`);
    router.refresh();
  }

  // ── Versiyon diff ─────────────────────────────────────────────────────
  function diff(
    yeni: ReceteVersiyonGorunum["satirlar"],
    eski: ReceteVersiyonGorunum["satirlar"] | undefined,
  ) {
    const key = (s: { tip: string; ref: string }) => `${s.tip}:${s.ref}`;
    const eskiMap = new Map((eski ?? []).map((s) => [key(s), s]));
    const yeniMap = new Map(yeni.map((s) => [key(s), s]));
    return {
      eklenen: yeni.filter((s) => !eskiMap.has(key(s))),
      cikan: (eski ?? []).filter((s) => !yeniMap.has(key(s))),
      degisen: yeni.filter((s) => {
        const e = eskiMap.get(key(s));
        return e && (e.miktar !== s.miktar || (e.fire ?? 0) !== (s.fire ?? 0));
      }),
    };
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Üst şerit */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          nativeButton={false}
          render={<Link href="/uretim/recete" aria-label="Reçetelere dön" />}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <Input
          placeholder="Reçete adı"
          value={ad}
          onChange={(e) => setAd(e.target.value)}
          className="w-64 font-medium"
        />
        <div className="w-40">
          <SearchSelect
            items={KATEGORILER}
            value={kategori}
            onValueChange={(v) => setKategori((v as ParcaKategori) ?? "Diğer")}
            placeholder="Kategori"
          />
        </div>
        <div className="ml-auto flex items-center gap-2">
          {etkiSayisi > 0 && (
            <span className="flex items-center gap-1 text-xs text-amber-600">
              <AlertTriangle className="size-3.5" /> {etkiSayisi} yerde
              kullanılıyor
            </span>
          )}
          <Button onClick={kaydetTikla} disabled={!kirli || kaydediliyor}>
            {kaydediliyor ? "Kaydediliyor..." : "Kaydet"}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 xl:flex-row">
        {/* ── Sol: bileşen grid'i ── */}
        <div className="min-w-0 flex-1">
          <div className="overflow-hidden rounded-md border bg-card">
            <div className="grid grid-cols-[88px_1fr_90px_56px_72px_100px_36px] items-center gap-2 border-b bg-[#fafafa] px-3 py-2 text-xs font-medium text-foreground">
              <span>Tip</span>
              <span>Bileşen</span>
              <span className="text-right">Miktar</span>
              <span>Birim</span>
              <span className="text-right">Fire %</span>
              <span className="text-right">Tutar</span>
              <span />
            </div>
            <div className="divide-y">
              {satirlar.map((s, i) => {
                const malzeme =
                  s.bilesen.tip === "malzeme"
                    ? malzemeMap.get(s.bilesen.ref)
                    : undefined;
                const alt =
                  s.bilesen.tip === "parca"
                    ? parcaMap.get(s.bilesen.ref)
                    : undefined;
                const acik = acikAltlar.has(i);
                return (
                  <React.Fragment key={i}>
                    <div className="grid grid-cols-[88px_1fr_90px_56px_72px_100px_36px] items-center gap-2 px-3 py-2">
                      <Badge
                        variant="secondary"
                        className={cn(
                          "justify-center",
                          s.bilesen.tip === "malzeme"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-violet-100 text-violet-800",
                        )}
                      >
                        {s.bilesen.tip === "malzeme" ? "Malzeme" : "Reçete"}
                      </Badge>
                      <div className="flex min-w-0 items-center gap-1">
                        {alt && (
                          <button
                            type="button"
                            aria-label={acik ? "Kapat" : "İçini göster"}
                            onClick={() =>
                              setAcikAltlar((a) => {
                                const n = new Set(a);
                                if (n.has(i)) n.delete(i);
                                else n.add(i);
                                return n;
                              })
                            }
                            className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-[#f2f2f2] hover:text-foreground"
                          >
                            <ChevronRight
                              className={cn(
                                "size-4 transition-transform",
                                acik && "rotate-90",
                              )}
                            />
                          </button>
                        )}
                        <div className="min-w-0 flex-1">
                          <SearchSelect
                            items={
                              s.bilesen.tip === "malzeme"
                                ? malzemeler.map((m) => m.ad)
                                : parcalar
                                    .filter((p) => p.id !== recete?.id)
                                    .map((p) => p.ad)
                            }
                            value={
                              s.bilesen.ref
                                ? bilesenAd(s.bilesen.tip, s.bilesen.ref)
                                : null
                            }
                            onValueChange={(adSecim) => {
                              const ref =
                                s.bilesen.tip === "malzeme"
                                  ? malzemeler.find((m) => m.ad === adSecim)?.id
                                  : parcalar.find((p) => p.ad === adSecim)?.id;
                              satirGuncelle(i, {
                                bilesen: { ...s.bilesen, ref: ref ?? "" },
                              });
                            }}
                            placeholder={
                              s.bilesen.tip === "malzeme"
                                ? "Malzeme seçin"
                                : "Reçete seçin"
                            }
                            className="h-8"
                          />
                        </div>
                      </div>
                      <Input
                        type="number"
                        min={0}
                        step="any"
                        value={s.miktar}
                        onChange={(e) =>
                          satirGuncelle(i, { miktar: Number(e.target.value) })
                        }
                        className="h-8 text-right tabular-nums"
                      />
                      <span className="text-xs text-muted-foreground">
                        {s.bilesen.tip === "malzeme"
                          ? (malzeme?.birim ?? "—")
                          : "adet"}
                      </span>
                      <Input
                        type="number"
                        min={0}
                        max={99}
                        step="any"
                        value={s.fire ?? ""}
                        placeholder="0"
                        onChange={(e) =>
                          satirGuncelle(i, {
                            fire: e.target.value
                              ? Number(e.target.value)
                              : undefined,
                          })
                        }
                        className="h-8 text-right tabular-nums"
                      />
                      <span className="text-right text-xs text-muted-foreground tabular-nums">
                        {formatTL(satirTutari(s))}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Satırı kaldır"
                        onClick={() =>
                          setSatirlar((x) => x.filter((_, j) => j !== i))
                        }
                      >
                        <X className="size-3.5" />
                      </Button>
                    </div>

                    {/* Alt reçete patlatması (salt okunur) */}
                    {alt && acik && (
                      <div className="bg-[#fafafa] px-3 py-2">
                        {alt.recete.length === 0 ? (
                          <p className="pl-9 text-xs text-muted-foreground">
                            Bu reçetenin bileşeni yok.
                          </p>
                        ) : (
                          <ul className="flex flex-col gap-1 pl-9">
                            {alt.recete.map((ar, j) => (
                              <li
                                key={j}
                                className="flex items-center justify-between text-xs text-muted-foreground"
                              >
                                <span className="truncate">
                                  {bilesenAd(ar.bilesen.tip, ar.bilesen.ref)}
                                  {ar.bilesen.tip === "parca" && " (reçete)"}
                                </span>
                                <span className="tabular-nums">
                                  {ar.miktar}
                                  {ar.fire ? ` (+%${ar.fire} fire)` : ""}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                        <Link
                          href={`/uretim/recete/${alt.id}`}
                          className="mt-1.5 inline-block pl-9 text-xs text-foreground underline-offset-4 hover:underline"
                        >
                          Reçeteyi aç →
                        </Link>
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
              {satirlar.length === 0 && (
                <p className="p-8 text-center text-sm text-muted-foreground">
                  Henüz bileşen yok — aşağıdan malzeme veya alt reçete ekleyin.
                </p>
              )}
            </div>
            <div className="flex items-center gap-1.5 border-t bg-[#fafafa] px-3 py-2">
              <Button variant="outline" size="sm" onClick={() => satirEkle("malzeme")}>
                <Plus className="size-3.5" /> Malzeme
              </Button>
              <Button variant="outline" size="sm" onClick={() => satirEkle("parca")}>
                <Plus className="size-3.5" /> Alt Reçete
              </Button>
            </div>
          </div>
        </div>

        {/* ── Sağ: özet kolonu ── */}
        <div className="flex w-full shrink-0 flex-col gap-3 xl:w-80">
          {/* Maliyet özeti */}
          <div className="rounded-md border bg-card p-4">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Maliyet Özeti
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">
              {formatTL(toplam)}
            </p>
            <div className="mt-3 flex flex-col gap-1.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Malzemeler</span>
                <span className="tabular-nums">{formatTL(malzemeToplami)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Alt reçeteler</span>
                <span className="tabular-nums">
                  {formatTL(toplam - malzemeToplami)}
                </span>
              </div>
            </div>
            {enPahali.length > 0 && (
              <>
                <div className="my-3 h-px bg-border" />
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  En Maliyetli
                </p>
                <ul className="mt-2 flex flex-col gap-1.5">
                  {enPahali.map(({ s, tutar }, i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between gap-2 text-sm"
                    >
                      <span className="truncate">
                        {bilesenAd(s.bilesen.tip, s.bilesen.ref)}
                      </span>
                      <span className="shrink-0 text-muted-foreground tabular-nums">
                        {toplam > 0 ? Math.round((tutar / toplam) * 100) : 0}%
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          {/* Kullanım */}
          {!yeniMi && (
            <div className="rounded-md border bg-card p-4">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Kullanım
              </p>
              {etkiSayisi === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  Henüz hiçbir model veya reçetede kullanılmıyor.
                </p>
              ) : (
                <ul className="mt-2 flex flex-col gap-1.5 text-sm">
                  {kullanim.modeller.map((m) => (
                    <li key={m.ad} className="flex items-center justify-between">
                      <span className="truncate">{m.ad}</span>
                      <span className="text-xs text-muted-foreground">
                        model · ×{m.miktar}
                      </span>
                    </li>
                  ))}
                  {kullanim.receteler.map((adx) => (
                    <li key={adx} className="flex items-center justify-between">
                      <span className="truncate">{adx}</span>
                      <span className="text-xs text-muted-foreground">
                        alt reçete
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Versiyon geçmişi */}
          {!yeniMi && (
            <div className="rounded-md border bg-card p-4">
              <p className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                <History className="size-3.5" /> Versiyon Geçmişi
              </p>
              <div className="mt-2 flex flex-col divide-y">
                {versiyonlar.map((v, i) => {
                  const onceki = versiyonlar[i + 1];
                  const d = diff(v.satirlar, onceki?.satirlar);
                  const guncel = i === 0;
                  return (
                    <div key={v.versiyonNo} className="py-2.5 first:pt-0 last:pb-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={guncel ? "default" : "secondary"}
                            className="tabular-nums"
                          >
                            v{v.versiyonNo}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {tarihYaz(v.tarih)}
                          </span>
                        </div>
                        {!guncel && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Bu versiyona dön"
                            title="Bu versiyona dön"
                            onClick={() => setGeriYukleNo(v.versiyonNo)}
                          >
                            <RotateCcw className="size-3.5" />
                          </Button>
                        )}
                      </div>
                      {v.aciklama && (
                        <p className="mt-1 text-xs text-muted-foreground italic">
                          {v.aciklama}
                        </p>
                      )}
                      <div className="mt-1 flex flex-col gap-0.5 text-xs">
                        {d.eklenen.map((s) => (
                          <span key={`e${s.ref}`} className="text-emerald-600">
                            + {bilesenAd(s.tip, s.ref)} × {s.miktar}
                          </span>
                        ))}
                        {d.cikan.map((s) => (
                          <span key={`c${s.ref}`} className="text-rose-600">
                            − {bilesenAd(s.tip, s.ref)} × {s.miktar}
                          </span>
                        ))}
                        {d.degisen.map((s) => {
                          const e = onceki?.satirlar.find(
                            (x) => x.tip === s.tip && x.ref === s.ref,
                          );
                          return (
                            <span key={`d${s.ref}`} className="text-amber-600">
                              ~ {bilesenAd(s.tip, s.ref)}: {e?.miktar}
                              {e?.fire ? ` (%${e.fire})` : ""} → {s.miktar}
                              {s.fire ? ` (%${s.fire})` : ""}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                {versiyonlar.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Henüz versiyon yok — ilk kayıtla v1 oluşur.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Yayılma uyarısı */}
      <Dialog open={kaydetOnay} onOpenChange={setKaydetOnay}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-1.5">
              <AlertTriangle className="size-4 text-amber-500" /> Değişiklik
              Yayılacak
            </DialogTitle>
            <DialogDescription>
              Bu reçete{" "}
              <strong>
                {kullanim.modeller.length} model ve{" "}
                {kullanim.receteler.length} reçetede
              </strong>{" "}
              kullanılıyor; maliyetleri bu değişiklikten etkilenecek.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Değişiklik notu (opsiyonel)"
            value={degisiklikNotu}
            onChange={(e) => setDegisiklikNotu(e.target.value)}
          />
          <DialogFooter className="p-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setKaydetOnay(false)}
            >
              İptal
            </Button>
            <Button size="sm" onClick={kaydetUygula} disabled={kaydediliyor}>
              {kaydediliyor ? "Kaydediliyor..." : "Kaydet ve Uygula"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Geri yükleme onayı */}
      <Dialog
        open={geriYukleNo !== null}
        onOpenChange={(v) => !v && setGeriYukleNo(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-1.5">
              <RotateCcw className="size-4 text-muted-foreground" /> Versiyona
              Dön
            </DialogTitle>
            <DialogDescription>
              Reçete v{geriYukleNo} sürümündeki haline döndürülecek. Bu işlem
              de yeni bir versiyon olarak kaydedilir; geçmiş kaybolmaz.
              {etkiSayisi > 0 && <> Değişiklik {etkiSayisi} yeri etkileyecek.</>}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="p-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setGeriYukleNo(null)}
            >
              İptal
            </Button>
            <Button size="sm" onClick={geriYukle}>
              <RotateCcw className="size-3.5" /> Geri Yükle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
