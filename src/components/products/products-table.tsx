"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Trash2,
  ExternalLink,
  History,
  Layers,
  ShoppingCart,
  Power,
  Boxes,
  Banknote,
  Hammer,
  Hash,
  Type,
  Link2,
  CopyPlus,
  Download,
  FolderInput,
  Tags,
  Star,
  Archive,
  Plus,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ListHeader } from "@/components/ui/list-header";
import { SiralaFiltreBaslik } from "@/components/ui/kolon-filtre";
import { useSayfalama, SayfalamaKontrol } from "@/components/ui/sayfalama";
import { GorselHucre } from "@/components/ui/liste-gorsel";
import {
  useKolonAyarlari,
  KolonAyarButonu,
  KolonAyarSheet,
} from "@/components/ui/kolon-ayarlari";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { SatirMenu } from "@/components/ui/satir-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useOnay } from "@/components/ui/confirm-dialog";
import { formatTL, type Model } from "@/lib/data";
import { modelKaydet, modelSil } from "@/lib/db/actions";

const KATEGORILER = [
  "Oturma Grubu",
  "Yatak Odası",
  "Yemek Odası",
  "Çalışma",
  "Aksesuar",
];

type SortKey = "id" | "ad" | "kategori" | "fiyat" | "stok" | "durum";
type SortDir = "asc" | "desc";

function StokHucre({ stok }: { stok: number }) {
  return (
    <span
      className={cn(
        "tabular-nums",
        stok === 0 ? "text-rose-600" : stok <= 5 ? "text-amber-600" : "",
      )}
    >
      {stok}
    </span>
  );
}

/** Listeye eklenebilecek isteğe bağlı kolonlar; seçim ve gören kullanıcılar
 *  liste_ayar'da saklanır. */
const EK_KOLONLAR: {
  key: string;
  label: string;
  aciklama: string;
  sag?: boolean;
  hucre: (u: Model) => React.ReactNode;
}[] = [
  {
    key: "marka",
    label: "Marka",
    aciklama: "Modelin üretici markası (Tanımlamalar → Markalar).",
    hucre: (u) => u.marka ?? <span className="text-muted-foreground">—</span>,
  },
  {
    key: "barkod",
    label: "Barkod",
    aciklama: "Modelin barkod numarası; etiket ve hızlı arama için.",
    hucre: (u) =>
      u.barkod ? (
        <span className="font-mono text-xs text-muted-foreground">
          {u.barkod}
        </span>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    key: "minStok",
    label: "Min. Stok",
    aciklama: "Kritik stok eşiği; stok bu değerin altına düşünce uyarılır.",
    sag: true,
    hucre: (u) =>
      u.minStok != null ? (
        <span className="tabular-nums">{u.minStok}</span>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    key: "agirlik",
    label: "Ağırlık",
    aciklama: "Birim ağırlık (kg); sevkiyat ve yük hesapları için.",
    sag: true,
    hucre: (u) =>
      u.agirlik != null ? (
        <span className="tabular-nums">{u.agirlik} kg</span>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
];

/** Listenin temel kolonları — Model (kimlik) hariç aç/kapa yapılabilir;
 *  gizleme herkes için geçerlidir (liste_ayar.gizliTemel). */
const TEMEL_KOLONLAR: {
  key: string;
  label: string;
  aciklama: string;
  kilitli?: boolean;
}[] = [
  {
    key: "kod",
    label: "Kod",
    aciklama: "Model kodu (URN-####); benzersiz kimlik.",
  },
  { key: "model", label: "Model", aciklama: "Modelin adı.", kilitli: true },
  {
    key: "kategori",
    label: "Kategori",
    aciklama: "Modelin bağlı olduğu kategori.",
  },
  { key: "fiyat", label: "Fiyat", aciklama: "Satış fiyatı (TL)." },
  {
    key: "stok",
    label: "Stok",
    aciklama: "Eldeki adet; kritik seviyede renklenir.",
  },
  { key: "durum", label: "Durum", aciklama: "Aktif/Pasif satış durumu." },
];

/** Kopya için geçici kod (kayıt sırasında kullanılır). */
function kopyaId(onEk: string, taban: number, aralik: number) {
  return `${onEk}-${Math.floor(taban + Math.random() * aralik)}`;
}

export function ProductsTable({
  urunler,
  initialKategori,
  kolonAyari,
  kullanicilar = [],
  mevcutKullaniciId = "",
  yonetici = true, // TODO: oturum altyapısı gelince gerçek rolden gelecek
}: {
  urunler: Model[];
  initialKategori?: string;
  /** Seçili ek kolonlar + gören kullanıcılar + gizlenen temel kolonlar (liste_ayar). */
  kolonAyari?: {
    kolonlar: string[];
    kullanicilar: string[];
    gizliTemel: string[];
  };
  /** Kullanıcı combobox'ı için liste. */
  kullanicilar?: { id: string; ad: string }[];
  /** Görünürlük hesabında "ben" (TODO: oturumdan gelecek). */
  mevcutKullaniciId?: string;
  yonetici?: boolean;
}) {
  const [liste, setListe] = React.useState<Model[]>(urunler);
  // Sütun ayarları — proje standardı (ui/kolon-ayarlari).
  const kolon = useKolonAyarlari({
    listeId: "urunler",
    yol: "/urunler",
    temel: TEMEL_KOLONLAR,
    ek: EK_KOLONLAR,
    ayar: kolonAyari,
    mevcutKullaniciId,
  });
  const temelGorunur = kolon.temelGorunur;
  const gorunurEk = EK_KOLONLAR.filter((k) => kolon.ekGorunur(k.key));
  const gorunurTemelSayisi = kolon.gorunurTemelSayisi;
  const [kategori, setKategori] = React.useState(initialKategori ?? "Tümü");
  const [durum, setDurum] = React.useState("Tümü");
  // Sütun başlığı popover'larından gelen kolon-bazlı filtreler
  const [metinFiltre, setMetinFiltre] = React.useState({ id: "", ad: "" });
  const [sayiFiltre, setSayiFiltre] = React.useState<
    Record<"fiyat" | "stok", { min: string; max: string }>
  >({ fiyat: { min: "", max: "" }, stok: { min: "", max: "" } });
  const [sort, setSort] = React.useState<{ key: SortKey; dir: SortDir }>({
    key: "id",
    dir: "asc",
  });
  const [secili, setSecili] = React.useState<Set<string>>(new Set());
  const router = useRouter();
  const { onayla, onayDialog } = useOnay();

  // Filtre + sıralama
  const filtreli = React.useMemo(() => {
    const arada = (n: number, min: string, max: string) =>
      (min === "" || n >= Number(min)) && (max === "" || n <= Number(max));
    const arr = liste.filter((u) => {
      const kat = kategori === "Tümü" || u.kategori === kategori;
      const dur = durum === "Tümü" || u.durum === durum;
      const kod = u.id.toLowerCase().includes(metinFiltre.id.toLowerCase());
      const ad = u.ad.toLowerCase().includes(metinFiltre.ad.toLowerCase());
      const fiy = arada(u.fiyat, sayiFiltre.fiyat.min, sayiFiltre.fiyat.max);
      const stk = arada(u.stok, sayiFiltre.stok.min, sayiFiltre.stok.max);
      return kat && dur && kod && ad && fiy && stk;
    });
    const yon = sort.dir === "asc" ? 1 : -1;
    return [...arr].sort((a, b) => {
      const x = a[sort.key];
      const y = b[sort.key];
      if (typeof x === "number" && typeof y === "number") return (x - y) * yon;
      return String(x).localeCompare(String(y), "tr") * yon;
    });
  }, [liste, kategori, durum, metinFiltre, sayiFiltre, sort]);

  const sayfalama = useSayfalama(filtreli, "urunler");
  const { sayfalik, setSayfa } = sayfalama;
  // Filtre değişince sayfayı başa al
  React.useEffect(() => {
    setSayfa(1);
  }, [kategori, durum, metinFiltre, sayiFiltre, setSayfa]);

  const sayfaIds = sayfalik.map((u) => u.id);
  const tumuSecili =
    sayfaIds.length > 0 && sayfaIds.every((id) => secili.has(id));
  const baziSecili = sayfaIds.some((id) => secili.has(id));

  function secimDegis(id: string, deger: boolean) {
    setSecili((s) => {
      const n = new Set(s);
      if (deger) n.add(id);
      else n.delete(id);
      return n;
    });
  }

  function tumunuSec(deger: boolean) {
    setSecili((s) => {
      const n = new Set(s);
      sayfaIds.forEach((id) => (deger ? n.add(id) : n.delete(id)));
      return n;
    });
  }

  async function sil(ids: string[]) {
    const tekAd =
      ids.length === 1 ? liste.find((u) => u.id === ids[0])?.ad : null;
    if (
      !(await onayla({
        title:
          ids.length === 1
            ? `"${tekAd ?? "Model"}" silinsin mi?`
            : `${ids.length} model silinsin mi?`,
        description:
          "Bu kayıt kalıcı olarak silinecek. Bu işlem geri alınamaz.",
      }))
    )
      return;
    const kaldirilan = liste.filter((u) => ids.includes(u.id));
    setListe((l) => l.filter((u) => !ids.includes(u.id)));
    setSecili((s) => {
      const n = new Set(s);
      ids.forEach((id) => n.delete(id));
      return n;
    });
    const res = await modelSil(ids);
    if (res.ok) {
      toast.success(`${ids.length} model silindi`);
    } else {
      setListe((l) => [...kaldirilan, ...l]);
      toast.error(res.error ?? "Silinemedi.");
    }
  }

  async function kopyala(u: Model) {
    const kopya: Model = {
      ...u,
      id: kopyaId("URN", 1000, 9000),
      ad: `${u.ad} (kopya)`,
    };
    setListe((l) => [kopya, ...l]);
    await modelKaydet(kopya);
    toast.success("Model kopyalandı");
  }

  // Context menü yardımcıları
  function panoyaKopyala(text: string, etiket: string) {
    navigator.clipboard?.writeText(text);
    toast.success(`${etiket} kopyalandı`);
  }
  function durumDegistir(u: Model) {
    setListe((l) =>
      l.map((x) =>
        x.id === u.id
          ? { ...x, durum: x.durum === "Aktif" ? "Pasif" : "Aktif" }
          : x,
      ),
    );
    toast.success(`${u.ad} ${u.durum === "Aktif" ? "pasif" : "aktif"} yapıldı`);
  }
  function kategoriyeTasi(u: Model, k: string) {
    setListe((l) =>
      l.map((x) =>
        x.id === u.id ? { ...x, kategori: k as Model["kategori"] } : x,
      ),
    );
    toast.success(`"${k}" kategorisine taşındı`);
  }
  const yakinda = (ad: string) => toast.success(`${ad} (yakında)`);

  // Kolon başlığı sıralama yardımcıları — SiralaFiltreBaslik (proje standardı).
  const sira = (k: SortKey) => (sort.key === k ? sort.dir : null);
  const sirala = (k: SortKey) => (dir: SortDir) => setSort({ key: k, dir });

  return (
    <div className="flex flex-col gap-3">
      {/* Toplu işlem çubuğu */}
      {secili.size > 0 && (
        <div className="flex items-center gap-3 rounded-md border bg-muted/50 px-3 py-2 text-sm">
          <span className="font-medium">{secili.size} model seçili</span>
          <Button
            variant="outline"
            size="sm"
            className="ml-auto text-rose-600"
            onClick={() => sil([...secili])}
          >
            <Trash2 className="size-3.5" /> Seçilenleri sil
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSecili(new Set())}
          >
            Temizle
          </Button>
        </div>
      )}

      {/* Tablo */}
      <div className="overflow-hidden rounded-md border bg-card">
        <ListHeader title="Modeller">
          {yonetici && <KolonAyarButonu kolon={kolon} />}
          <Button
            size="sm"
            nativeButton={false}
            render={<Link href="/urunler/yeni" />}
          >
            <Plus className="size-4" /> Yeni Model
          </Button>
        </ListHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={tumuSecili}
                  indeterminate={!tumuSecili && baziSecili}
                  onCheckedChange={(v) => tumunuSec(v === true)}
                  aria-label="Tümünü seç"
                />
              </TableHead>
              {temelGorunur("kod") && (
                <SiralaFiltreBaslik
                  sira={sira("id")}
                  onSirala={sirala("id")}
                  filtre={{
                    tip: "metin",
                    deger: metinFiltre.id,
                    onDeger: (v) => setMetinFiltre((f) => ({ ...f, id: v })),
                  }}
                >
                  Kod
                </SiralaFiltreBaslik>
              )}
              <TableHead className="w-14">Görsel</TableHead>
              <SiralaFiltreBaslik
                sira={sira("ad")}
                onSirala={sirala("ad")}
                filtre={{
                  tip: "metin",
                  deger: metinFiltre.ad,
                  onDeger: (v) => setMetinFiltre((f) => ({ ...f, ad: v })),
                }}
              >
                Model
              </SiralaFiltreBaslik>
              {temelGorunur("kategori") && (
                <SiralaFiltreBaslik
                  sira={sira("kategori")}
                  onSirala={sirala("kategori")}
                  filtre={{
                    tip: "liste",
                    secenekler: KATEGORILER,
                    deger: kategori,
                    onDeger: setKategori,
                  }}
                >
                  Kategori
                </SiralaFiltreBaslik>
              )}
              {temelGorunur("fiyat") && (
                <SiralaFiltreBaslik
                  className="text-right"
                  sira={sira("fiyat")}
                  onSirala={sirala("fiyat")}
                  filtre={{
                    tip: "sayi",
                    min: sayiFiltre.fiyat.min,
                    max: sayiFiltre.fiyat.max,
                    onDegis: (min, max) =>
                      setSayiFiltre((f) => ({ ...f, fiyat: { min, max } })),
                  }}
                >
                  Fiyat
                </SiralaFiltreBaslik>
              )}
              {temelGorunur("stok") && (
                <SiralaFiltreBaslik
                  className="text-right"
                  sira={sira("stok")}
                  onSirala={sirala("stok")}
                  filtre={{
                    tip: "sayi",
                    min: sayiFiltre.stok.min,
                    max: sayiFiltre.stok.max,
                    onDegis: (min, max) =>
                      setSayiFiltre((f) => ({ ...f, stok: { min, max } })),
                  }}
                >
                  Stok
                </SiralaFiltreBaslik>
              )}
              {gorunurEk.map((k) => (
                <TableHead key={k.key} className={cn(k.sag && "text-right")}>
                  {k.label}
                </TableHead>
              ))}
              {temelGorunur("durum") && (
                <SiralaFiltreBaslik
                  sira={sira("durum")}
                  onSirala={sirala("durum")}
                  filtre={{
                    tip: "liste",
                    secenekler: ["Aktif", "Pasif"],
                    deger: durum,
                    onDeger: setDurum,
                  }}
                >
                  Durum
                </SiralaFiltreBaslik>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sayfalik.map((u) => (
              <SatirMenu
                key={u.id}
                className="w-52"
                aksiyonlar={[
                  {
                    etiket: "Aç",
                    ikon: ExternalLink,
                    kisayol: "⏎",
                    onSecim: () => router.push(`/urunler/${u.id}`),
                  },
                  {
                    etiket: "Çoğalt",
                    ikon: CopyPlus,
                    onSecim: () => kopyala(u),
                  },
                  {
                    etiket: u.durum === "Aktif" ? "Pasif Yap" : "Aktif Yap",
                    ikon: Power,
                    onSecim: () => durumDegistir(u),
                  },
                  {
                    etiket: "Kopyala",
                    ikon: Hash,
                    altAksiyonlar: [
                      {
                        etiket: "Kod",
                        ikon: Hash,
                        onSecim: () => panoyaKopyala(u.id, "Kod"),
                      },
                      {
                        etiket: "Ad",
                        ikon: Type,
                        onSecim: () => panoyaKopyala(u.ad, "Ad"),
                      },
                      {
                        etiket: "Bağlantı",
                        ikon: Link2,
                        onSecim: () =>
                          panoyaKopyala(
                            `${window.location.origin}/urunler/${u.id}`,
                            "Bağlantı",
                          ),
                      },
                    ],
                  },
                  {
                    etiket: "Git",
                    ikon: ExternalLink,
                    altAksiyonlar: [
                      {
                        etiket: "Stok Hareketleri",
                        ikon: History,
                        onSecim: () =>
                          router.push("/stok-yonetimi?bolum=takip"),
                      },
                      {
                        etiket: "Üretim Reçetesi",
                        ikon: Layers,
                        onSecim: () => router.push("/uretim/recete"),
                      },
                      {
                        etiket: "Siparişler",
                        ikon: ShoppingCart,
                        onSecim: () => router.push("/siparisler"),
                      },
                    ],
                  },
                  {
                    etiket: "Diğer İşlemler",
                    ikon: Boxes,
                    altAksiyonlar: [
                      {
                        etiket: "Kategoriye Taşı",
                        ikon: FolderInput,
                        altAksiyonlar: KATEGORILER.map((k) => ({
                          etiket: k,
                          onSecim: () => kategoriyeTasi(u, k),
                        })),
                      },
                      {
                        etiket: "Stok Düzelt",
                        ikon: Boxes,
                        onSecim: () => yakinda("Stok düzelt"),
                      },
                      {
                        etiket: "Fiyat Güncelle",
                        ikon: Banknote,
                        onSecim: () => yakinda("Fiyat güncelle"),
                      },
                      {
                        etiket: "Üretime Gönder",
                        ikon: Hammer,
                        onSecim: () => yakinda("Üretime gönder"),
                      },
                      {
                        etiket: "Etiket Ekle",
                        ikon: Tags,
                        onSecim: () => yakinda("Etiket ekle"),
                      },
                      {
                        etiket: "Favorile",
                        ikon: Star,
                        onSecim: () => yakinda("Favorile"),
                      },
                      {
                        etiket: "Arşivle",
                        ikon: Archive,
                        onSecim: () => yakinda("Arşivle"),
                      },
                      {
                        etiket: "Dışa Aktar",
                        ikon: Download,
                        onSecim: () => yakinda("Dışa aktar"),
                      },
                    ],
                  },
                  {
                    etiket: "Sil",
                    ikon: Trash2,
                    tehlike: true,
                    ayracOnce: true,
                    onSecim: () => sil([u.id]),
                  },
                ]}
              >
                <TableRow
                  data-state={secili.has(u.id) ? "selected" : undefined}
                  className="cursor-pointer"
                  onClick={() => router.push(`/urunler/${u.id}`)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={secili.has(u.id)}
                      onCheckedChange={(v) => secimDegis(u.id, v === true)}
                      aria-label={`${u.ad} seç`}
                    />
                  </TableCell>
                  {temelGorunur("kod") && (
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {u.id}
                    </TableCell>
                  )}
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <GorselHucre gorseller={u.gorseller} alt={u.ad} />
                  </TableCell>
                  <TableCell className="font-medium">{u.ad}</TableCell>
                  {temelGorunur("kategori") && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() =>
                          setKategori((k) =>
                            k === u.kategori ? "Tümü" : u.kategori,
                          )
                        }
                        title="Bu kategoriye göre filtrele"
                        className="-mx-1 cursor-pointer rounded-[5px] px-1 transition-colors hover:bg-accent hover:text-accent-foreground"
                      >
                        {u.kategori}
                      </button>
                    </TableCell>
                  )}
                  {temelGorunur("fiyat") && (
                    <TableCell className="text-right tabular-nums">
                      {formatTL(u.fiyat)}
                    </TableCell>
                  )}
                  {temelGorunur("stok") && (
                    <TableCell className="text-right">
                      <StokHucre stok={u.stok} />
                    </TableCell>
                  )}
                  {gorunurEk.map((k) => (
                    <TableCell
                      key={k.key}
                      className={cn(k.sag && "text-right")}
                    >
                      {k.hucre(u)}
                    </TableCell>
                  ))}
                  {temelGorunur("durum") && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() =>
                          setDurum((d) => (d === u.durum ? "Tümü" : u.durum))
                        }
                        title="Bu duruma göre filtrele"
                        className="cursor-pointer"
                      >
                        <Badge
                          variant={
                            u.durum === "Aktif" ? "default" : "secondary"
                          }
                        >
                          {u.durum}
                        </Badge>
                      </button>
                    </TableCell>
                  )}
                </TableRow>
              </SatirMenu>
            ))}
            {sayfalik.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={2 + gorunurTemelSayisi + gorunurEk.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  Sonuç bulunamadı.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Sayfalama */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {filtreli.length} model
          {secili.size > 0 ? ` · ${secili.size} seçili` : ""}
        </span>
        <SayfalamaKontrol sayfalama={sayfalama} />
      </div>

      {/* Sütun ayarları sheet'i — proje standardı */}
      <KolonAyarSheet kolon={kolon} kullanicilar={kullanicilar} />
      {onayDialog}
    </div>
  );
}
