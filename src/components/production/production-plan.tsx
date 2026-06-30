"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Hammer,
  FileText,
  Plus,
  Trash2,
  ChevronDown,
  ShoppingCart,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { SearchSelect } from "@/components/ui/search-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatTL,
  type Model,
  type Depo,
  type Parca,
  type Malzeme,
  type UretimOncelik,
} from "@/lib/data";
import { malzemeYeterlilik, type MalzemeIhtiyac } from "@/lib/bom";
import { uretimEmriOlustur } from "@/lib/db/actions";

type Neden = "stok" | "siparis";
type Secim = { id: number; urunId: string; adet: string };
type MusteriSecim = { id: string; ad: string; sehir: string };

const ONCELIKLER: UretimOncelik[] = ["Düşük", "Normal", "Yüksek", "Acil"];

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-lg border bg-card p-3.5 shadow-sm">
      {children}
    </section>
  );
}

export function ProductionPlan({
  urunler,
  depolar,
  musteriler,
  parcalar,
  malzemeler,
}: {
  urunler: Model[];
  depolar: Depo[];
  musteriler: MusteriSecim[];
  parcalar: Parca[];
  malzemeler: Malzeme[];
}) {
  const router = useRouter();
  const modeller = React.useMemo(
    () => urunler.filter((u) => u.parcalar && u.parcalar.length > 0),
    [urunler],
  );
  const urunMap = React.useMemo(
    () => new Map(urunler.map((u) => [u.id, u])),
    [urunler],
  );
  const aktifDepolar = React.useMemo(
    () => depolar.filter((d) => d.durum === "Aktif"),
    [depolar],
  );

  const [neden, setNeden] = React.useState<Neden>("stok");
  const [depoId, setDepoId] = React.useState<string | null>(null);
  const [musteriId, setMusteriId] = React.useState<string | null>(null);
  const [termin, setTermin] = React.useState("");
  const [oncelik, setOncelik] = React.useState<UretimOncelik>("Normal");
  const [secimler, setSecimler] = React.useState<Secim[]>([]);
  const idRef = React.useRef(1);
  const [gorunen, setGorunen] = React.useState(5);

  const seciliIds = new Set(secimler.map((s) => s.urunId));
  const eklenebilir = modeller.filter((m) => !seciliIds.has(m.id));

  const yeterlilik = React.useMemo(() => {
    const birlesik: { parcaId: string; miktar: number }[] = [];
    for (const s of secimler) {
      const u = urunMap.get(s.urunId);
      const a = Number(s.adet);
      if (!u?.parcalar || !Number.isFinite(a) || a < 1) continue;
      for (const p of u.parcalar) {
        birlesik.push({ parcaId: p.parcaId, miktar: p.miktar * a });
      }
    }
    if (birlesik.length === 0) return null;
    return malzemeYeterlilik(birlesik, parcalar, malzemeler);
  }, [secimler, urunMap]);

  // Boş bir satır ekle (model henüz seçilmedi).
  function satirEkle() {
    setSecimler((arr) => [...arr, { id: idRef.current++, urunId: "", adet: "1" }]);
  }
  function modelSec(id: number, ad: string) {
    const m = modeller.find((x) => x.ad === ad);
    if (!m || seciliIds.has(m.id)) return;
    setSecimler((arr) =>
      arr.map((s) => (s.id === id ? { ...s, urunId: m.id } : s)),
    );
  }
  function adetGuncelle(id: number, deger: string) {
    const t = deger.replace(/[^\d]/g, "");
    setSecimler((arr) =>
      arr.map((s) =>
        s.id === id ? { ...s, adet: t === "" ? "" : String(Math.max(1, Number(t))) } : s,
      ),
    );
  }
  function sil(id: number) {
    setSecimler((arr) => arr.filter((s) => s.id !== id));
  }

  // Bir modelin tek başına (girilen adet için) malzemesi stokta yeterli mi?
  function modelDurum(urunId: string, adet: string): "yeterli" | "eksik" | null {
    const u = urunMap.get(urunId);
    const a = Number(adet);
    if (!u?.parcalar || !(a >= 1)) return null;
    const satir = u.parcalar.map((p) => ({
      parcaId: p.parcaId,
      miktar: p.miktar * a,
    }));
    return malzemeYeterlilik(satir, parcalar, malzemeler).yeterli
      ? "yeterli"
      : "eksik";
  }

  const dolu = secimler.filter((s) => s.urunId);
  const modelGecerli =
    dolu.length > 0 && dolu.every((s) => Number(s.adet) >= 1);
  const hedefGecerli = neden === "stok" ? depoId !== null : musteriId !== null;
  const yeterli = yeterlilik?.yeterli ?? false;
  const toplamAdet = secimler.reduce((t, s) => t + (Number(s.adet) || 0), 0);

  // Eksik malzeme seçimi (varsayılan: hepsi seçili).
  const eksikIds = (yeterlilik?.eksik ?? []).map((m) => m.malzeme.id);
  const eksikKey = eksikIds.join("|");
  const [seciliEksik, setSeciliEksik] = React.useState<Set<string>>(new Set());
  React.useEffect(() => {
    setSeciliEksik(new Set(eksikKey ? eksikKey.split("|") : []));
  }, [eksikKey]);

  const secilenEksik = (yeterlilik?.eksik ?? []).filter((m) =>
    seciliEksik.has(m.malzeme.id),
  );
  // Seçili eksiklerin tahmini satın alma maliyeti: (gerekli − stok) × birim fiyat.
  const eksikMaliyet = secilenEksik.reduce(
    (t, m) => t + (m.toplamMiktar - m.malzeme.stok) * m.malzeme.birimFiyat,
    0,
  );
  const tumuEksikSecili =
    eksikIds.length > 0 && eksikIds.every((id) => seciliEksik.has(id));
  const baziEksikSecili = eksikIds.some((id) => seciliEksik.has(id));

  function eksikSecimDegis(id: string, v: boolean) {
    setSeciliEksik((s) => {
      const n = new Set(s);
      if (v) n.add(id);
      else n.delete(id);
      return n;
    });
  }
  function tumEksikSec(v: boolean) {
    setSeciliEksik(v ? new Set(eksikIds) : new Set());
  }

  function satinAlmaOlustur() {
    if (secilenEksik.length === 0) {
      toast.error("Satın alma için en az bir eksik malzeme seçin.");
      return;
    }
    toast.success(
      `${secilenEksik.length} malzeme için satın alma talebi oluşturuldu (demo) — tahmini ${formatTL(eksikMaliyet)}`,
    );
  }

  const gonderEngel = !modelGecerli
    ? "En az bir model ekleyin"
    : !hedefGecerli
      ? neden === "stok"
        ? "Hedef depo seçin"
        : "Müşteri seçin"
      : !yeterli
        ? "Stok yetersiz — yalnız taslak kaydedebilirsiniz"
        : null;

  const [kaydediliyor, setKaydediliyor] = React.useState(false);

  async function olustur(durum: "Üretimde" | "Planlandı") {
    const gecerli = secimler
      .map((s) => ({ u: urunMap.get(s.urunId), adet: Number(s.adet) }))
      .filter((s) => s.u && s.adet >= 1);
    if (gecerli.length === 0) {
      toast.error("En az bir model ve adet girin.");
      return;
    }
    setKaydediliyor(true);
    try {
      const payload = gecerli.map((s) => ({
        urunId: s.u!.id,
        urunAd: s.u!.ad,
        adet: s.adet,
        durum,
        oncelik,
        termin: termin || undefined,
        musteri:
          neden === "siparis"
            ? musteriler.find((m) => m.id === musteriId)?.ad
            : undefined,
        hedefDepo: neden === "stok" ? depoId ?? undefined : undefined,
      }));
      const res = await uretimEmriOlustur(payload);
      if (!res.ok) {
        toast.error("Kaydedilemedi. Lütfen tekrar deneyin.");
        return;
      }
      toast.success(
        durum === "Üretimde"
          ? `${res.ids.length} üretim emri oluşturuldu.`
          : `${res.ids.length} taslak kaydedildi.`,
      );
      router.push("/uretim/emirler");
    } catch {
      toast.error("Kaydedilemedi. Lütfen tekrar deneyin.");
    } finally {
      setKaydediliyor(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5">
      {/* Üretim nedeni — nested kart */}
      <Panel>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Alan label="Üretim nedeni">
          <SearchSelect
            items={["Stok için", "Müşteri için"]}
            value={neden === "stok" ? "Stok için" : "Müşteri için"}
            onValueChange={(v) =>
              setNeden(v === "Müşteri için" ? "siparis" : "stok")
            }
            placeholder="Neden"
            searchPlaceholder="Ara..."
          />
        </Alan>

        {neden === "stok" ? (
          <Alan label="Hedef depo">
            <SearchSelect
              items={aktifDepolar.map((d) => `${d.ad} · ${d.sehir}`)}
              value={
                depoId
                  ? (() => {
                      const d = aktifDepolar.find((x) => x.id === depoId);
                      return d ? `${d.ad} · ${d.sehir}` : null;
                    })()
                  : null
              }
              onValueChange={(v) => {
                if (!v) return setDepoId(null);
                const ad = v.split(" · ")[0];
                setDepoId(aktifDepolar.find((x) => x.ad === ad)?.id ?? null);
              }}
              placeholder="Depo seç"
              searchPlaceholder="Depo ara..."
            />
          </Alan>
        ) : (
          <Alan label="Müşteri">
            <SearchSelect
              items={musteriler.map((m) => `${m.ad} · ${m.sehir}`)}
              value={
                musteriId
                  ? (() => {
                      const m = musteriler.find((x) => x.id === musteriId);
                      return m ? `${m.ad} · ${m.sehir}` : null;
                    })()
                  : null
              }
              onValueChange={(v) => {
                if (!v) return setMusteriId(null);
                const ad = v.split(" · ")[0];
                setMusteriId(musteriler.find((x) => x.ad === ad)?.id ?? null);
              }}
              placeholder="Müşteri seç"
              searchPlaceholder="Müşteri ara..."
            />
          </Alan>
        )}

        <Alan label="Termin tarihi">
          <Input
            type="date"
            value={termin}
            onChange={(e) => setTermin(e.target.value)}
            className="h-9"
          />
        </Alan>

        <Alan label="Öncelik">
          <SearchSelect
            items={ONCELIKLER}
            value={oncelik}
            onValueChange={(v) => setOncelik((v as UretimOncelik) ?? "Normal")}
            placeholder="Öncelik"
            searchPlaceholder="Ara..."
          />
        </Alan>
        </div>
      </Panel>

      {/* Üretim planı tablosu — nested kart */}
      <Panel>
        <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">Üretim Planı</h2>

        <Table className="table-fixed">
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-10">#</TableHead>
              <TableHead>Model</TableHead>
              <TableHead className="w-44">Kategori</TableHead>
              <TableHead className="w-36">Stok Durumu</TableHead>
              <TableHead className="w-32">Malzeme Durumu</TableHead>
              <TableHead className="w-24 text-right">Adet</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {secimler.map((s, i) => {
                const m = urunMap.get(s.urunId);
                const durum = modelDurum(s.urunId, s.adet);
                return (
                  <TableRow key={s.id}>
                    <TableCell className="text-muted-foreground tabular-nums">
                      {i + 1}
                    </TableCell>
                    <TableCell>
                      {s.urunId ? (
                        <span className="block truncate font-medium" title={m?.ad}>
                          {m?.ad}
                        </span>
                      ) : (
                        <SearchSelect
                          items={eklenebilir.map((x) => x.ad)}
                          value={null}
                          onValueChange={(v) => v && modelSec(s.id, v)}
                          placeholder="Model seç"
                          searchPlaceholder="Model ara..."
                          className="h-8 max-w-xs"
                        />
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {m?.kategori ?? "—"}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {m ? (
                        m.stok > 0 ? (
                          <span>
                            {m.stok.toLocaleString("tr-TR")}{" "}
                            <span className="text-xs text-muted-foreground">
                              adet
                            </span>
                          </span>
                        ) : (
                          <span className="text-rose-600">Tükendi</span>
                        )
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {durum === "eksik" ? (
                        <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                          Eksik var
                        </Badge>
                      ) : durum === "yeterli" ? (
                        <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">
                          Eksik yok
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        min={1}
                        value={s.adet}
                        aria-label="Adet"
                        onChange={(e) => adetGuncelle(s.id, e.target.value)}
                        onBlur={() => {
                          if (!(Number(s.adet) >= 1)) adetGuncelle(s.id, "1");
                        }}
                        className="ml-auto h-8 w-20 text-center tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-muted-foreground"
                        onClick={() => sil(s.id)}
                        aria-label="Sil"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>

        <button
          type="button"
          onClick={satirEkle}
          disabled={eklenebilir.length === 0}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-md border border-dashed py-2.5 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="size-4" /> Model ekle
        </button>
        </div>
      </Panel>

      {/* Malzeme ihtiyacı — nested kart */}
      {yeterlilik && (
        <Panel>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">Malzeme İhtiyacı</h2>
              {yeterli ? (
                <Badge variant="secondary" className="gap-1 bg-emerald-100 text-emerald-800">
                  <CheckCircle2 className="size-3" /> Stok yeterli
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1 bg-amber-100 text-amber-800">
                  <AlertTriangle className="size-3" /> {yeterlilik.eksik.length} malzeme eksik
                </Badge>
              )}
            </div>

            <MalzemeTablosu
              ihtiyac={yeterlilik.ihtiyac.slice(0, gorunen)}
              secim={
                yeterli
                  ? undefined
                  : {
                      has: (id) => seciliEksik.has(id),
                      toggle: eksikSecimDegis,
                      tumu: tumuEksikSecili,
                      bazi: baziEksikSecili,
                      tumSec: tumEksikSec,
                    }
              }
            />

            {gorunen < yeterlilik.ihtiyac.length && (
              <button
                type="button"
                onClick={() =>
                  setGorunen((g) => Math.min(g + 5, yeterlilik.ihtiyac.length))
                }
                className="mt-1 flex w-full items-center justify-center gap-2 rounded-md border border-dashed py-2 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted/40 hover:text-foreground"
              >
                <ChevronDown className="size-4" /> Devamını gör (
                {yeterlilik.ihtiyac.length - gorunen} kaldı)
              </button>
            )}

            {!yeterli && (
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1.5 rounded-md border border-amber-300/60 bg-amber-50/70 px-2.5 py-1.5">
                <AlertTriangle className="size-4 shrink-0 text-amber-600" />
                <span className="text-sm text-amber-900">
                  <strong>
                    {secilenEksik.length}/{yeterlilik.eksik.length}
                  </strong>{" "}
                  eksik seçili
                </span>
                <span className="text-xs text-muted-foreground">
                  tahmini maliyet{" "}
                  <span className="font-medium text-foreground">
                    {formatTL(eksikMaliyet)}
                  </span>
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={satinAlmaOlustur}
                  disabled={secilenEksik.length === 0}
                  className="ml-auto border-amber-300 bg-white text-amber-900 hover:bg-amber-100"
                >
                  <ShoppingCart className="size-3" /> Satın Alma Oluştur
                </Button>
              </div>
            )}

            <div className="mt-1 flex items-center justify-between border-t pt-2 text-sm">
              <span className="text-muted-foreground tabular-nums">
                {secimler.length} model · {toplamAdet} adet
              </span>
              <span className="font-semibold tabular-nums">
                {formatTL(yeterlilik.toplamMaliyet)}
              </span>
            </div>
          </div>
        </Panel>
      )}

      {/* Alt aksiyon */}
      <div className="flex flex-wrap items-center justify-end gap-3 border-t pt-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => olustur("Planlandı")}
            disabled={!modelGecerli || kaydediliyor}
          >
            <FileText className="size-4" /> Taslak Kaydet
          </Button>
          <Button
            onClick={() => olustur("Üretimde")}
            disabled={!!gonderEngel || kaydediliyor}
            title={gonderEngel ?? undefined}
          >
            <Hammer className="size-4" /> Üretime Gönder
          </Button>
        </div>
      </div>
    </div>
  );
}

function Alan({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function MalzemeTablosu({
  ihtiyac,
  secim,
}: {
  ihtiyac: MalzemeIhtiyac[];
  secim?: {
    has: (id: string) => boolean;
    toggle: (id: string, v: boolean) => void;
    tumu: boolean;
    bazi: boolean;
    tumSec: (v: boolean) => void;
  };
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-muted/40 hover:bg-muted/40">
          {secim && (
            <TableHead className="w-8">
              <Checkbox
                checked={secim.tumu}
                indeterminate={!secim.tumu && secim.bazi}
                onCheckedChange={(v) => secim.tumSec(v === true)}
                aria-label="Tüm eksikleri seç"
              />
            </TableHead>
          )}
          <TableHead className="w-10">#</TableHead>
          <TableHead>Malzeme</TableHead>
          <TableHead className="text-right">Gerekli</TableHead>
          <TableHead className="text-right">Stok</TableHead>
          <TableHead className="text-right">Tutar</TableHead>
          <TableHead>Durum</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {ihtiyac.map((m, i) => {
          const yetersiz = m.toplamMiktar > m.malzeme.stok;
          return (
            <TableRow key={m.malzeme.id}>
              {secim && (
                <TableCell>
                  {yetersiz ? (
                    <Checkbox
                      checked={secim.has(m.malzeme.id)}
                      onCheckedChange={(v) =>
                        secim.toggle(m.malzeme.id, v === true)
                      }
                      aria-label={m.malzeme.ad}
                    />
                  ) : (
                    <span className="block size-4" />
                  )}
                </TableCell>
              )}
              <TableCell className="text-muted-foreground tabular-nums">
                {i + 1}
              </TableCell>
              <TableCell className="font-medium">{m.malzeme.ad}</TableCell>
              <TableCell
                className={cn(
                  "text-right tabular-nums",
                  yetersiz && "font-medium text-rose-600",
                )}
              >
                {m.toplamMiktar.toLocaleString("tr-TR", { maximumFractionDigits: 2 })}{" "}
                {m.malzeme.birim}
              </TableCell>
              <TableCell className="text-right tabular-nums text-muted-foreground">
                {m.malzeme.stok.toLocaleString("tr-TR")} {m.malzeme.birim}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatTL(m.toplamFiyat)}
              </TableCell>
              <TableCell>
                <Badge
                  variant="secondary"
                  className={
                    yetersiz
                      ? "bg-rose-100 text-rose-800"
                      : "bg-emerald-100 text-emerald-800"
                  }
                >
                  {yetersiz ? "Eksik" : "Yeterli"}
                </Badge>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
