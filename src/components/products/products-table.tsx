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
  Plus,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ListHeader } from "@/components/ui/list-header";
import { filtreCipleri } from "@/components/ui/filtre-cipleri";
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
import { formatTL, type Model, type UretimOncelik } from "@/lib/data";
import { csvIndir, type CsvKolon } from "@/lib/disa-aktar";
import {
  modelSil,
  modelDurumGuncelle,
  modelKategoriGuncelle,
  modelFavoriGuncelle,
  silinebilirMi,
} from "@/lib/db/actions";
import { StokDuzeltDialog } from "./stok-duzelt-dialog";
import { FiyatGuncelleDialog } from "./fiyat-guncelle-dialog";
import { ModelKopyaDialog } from "@/components/products/model-kopya-dialog";
import { UretimeGonderDialog } from "./uretime-gonder-dialog";
import { EtiketDialog } from "./etiket-dialog";
import { useYetki, useYonetici } from "@/components/yetki/yetki-baglam";
import { usePara } from "@/components/bicim-baglam";

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


export function ProductsTable({
  urunler,
  initialKategori,
  kolonAyari,
  kullanicilar = [],
  mevcutKullaniciId = "",
  // "Üretime Gönder" penceresinin parametre kaynaklı varsayılanları.
  varsayilanOncelik,
  varsayilanTermin,
}: {
  urunler: Model[];
  varsayilanOncelik?: UretimOncelik;
  varsayilanTermin?: string;
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
}) {
  const para = usePara();
  // Kolon ayarı tüm kullanıcıları etkiler; yalnız yöneticiye açık.
  const yonetici = useYonetici();
  const yetki = useYetki("uretim-plan");
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
  const [duzeltHedef, setDuzeltHedef] = React.useState<Model | null>(null);
  const [fiyatHedef, setFiyatHedef] = React.useState<Model | null>(null);
  const [uretimHedef, setUretimHedef] = React.useState<Model | null>(null);
  const [etiketHedef, setEtiketHedef] = React.useState<Model | null>(null);
  const router = useRouter();
  const { onayla, uyar, onayDialog } = useOnay();

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

  // Başlıktaki aktif filtre çipleri — proje standardı (ui/filtre-cipleri).
  const cip = filtreCipleri(liste);
  cip.metin("Kod", metinFiltre.id, (u) => u.id, () =>
    setMetinFiltre((f) => ({ ...f, id: "" })),
  );
  cip.metin("Model", metinFiltre.ad, (u) => u.ad, () =>
    setMetinFiltre((f) => ({ ...f, ad: "" })),
  );
  cip.liste("Kategori", kategori, (u) => u.kategori, () => setKategori("Tümü"));
  cip.liste("Durum", durum, (u) => u.durum, () => setDurum("Tümü"));
  cip.sayi("Fiyat", sayiFiltre.fiyat, (u) => u.fiyat, () =>
    setSayiFiltre((f) => ({ ...f, fiyat: { min: "", max: "" } })),
  );
  cip.sayi("Stok", sayiFiltre.stok, (u) => u.stok, () =>
    setSayiFiltre((f) => ({ ...f, stok: { min: "", max: "" } })),
  );

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
    // Onaydan önce: silinemeyecek kayıt için "emin misiniz?" sorma.
    const kontrol = await silinebilirMi("stok", ids);
    if (!kontrol.ok) {
      await uyar({
        title: "Silinemedi",
        description: kontrol.error ?? "Model silinemez.",
        detaylar: kontrol.detaylar,
      });
      return;
    }
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
      await uyar({
        title: "Silinemedi",
        description: res.error ?? "Silinemedi.",
      });
    }
  }

  // Kopyalama artık pencerede yapılıyor: modeli tek satır olarak çoğaltmak,
  // modülleri paylaşımlı bıraktığı için kopyada malzeme değiştirmek orijinali
  // de bozuyordu.
  const [kopyaModel, setKopyaModel] = React.useState<Model | null>(null);

  // Context menü yardımcıları
  function panoyaKopyala(text: string, etiket: string) {
    navigator.clipboard?.writeText(text);
    toast.success(`${etiket} kopyalandı`);
  }
  // İyimser güncelleme + DB'ye yaz; hata olursa eski hâle döndür. (Önceden bu
  // iki işlem yalnız yerel state'i değiştirip toast atıyordu — sayfa yenilenince
  // değişiklik kayboluyordu.)
  async function durumDegistir(u: Model) {
    const yeni: Model["durum"] = u.durum === "Aktif" ? "Pasif" : "Aktif";
    setListe((l) => l.map((x) => (x.id === u.id ? { ...x, durum: yeni } : x)));
    const res = await modelDurumGuncelle(u.id, yeni);
    if (res.ok) {
      toast.success(`${u.ad} ${yeni === "Pasif" ? "pasif" : "aktif"} yapıldı`);
    } else {
      setListe((l) =>
        l.map((x) => (x.id === u.id ? { ...x, durum: u.durum } : x)),
      );
      toast.error(res.error ?? "Durum güncellenemedi.");
    }
  }
  async function kategoriyeTasi(u: Model, k: string) {
    const eski = u.kategori;
    setListe((l) => l.map((x) => (x.id === u.id ? { ...x, kategori: k } : x)));
    const res = await modelKategoriGuncelle(u.id, k);
    if (res.ok) {
      toast.success(`"${k}" kategorisine taşındı`);
    } else {
      setListe((l) =>
        l.map((x) => (x.id === u.id ? { ...x, kategori: eski } : x)),
      );
      toast.error(res.error ?? "Taşınamadı.");
    }
  }
  // Stok düzeltme uygulandığında listedeki eldeki miktarı yerinde güncelle
  // (server action revalidate ediyor; bu anlık geri bildirim içindir).
  function stokDuzeltmeUygulandi(id: string, yeniMiktar: number) {
    setListe((l) => l.map((u) => (u.id === id ? { ...u, stok: yeniMiktar } : u)));
  }
  function fiyatUygulandi(id: string, yeniFiyat: number) {
    setListe((l) => l.map((u) => (u.id === id ? { ...u, fiyat: yeniFiyat } : u)));
  }
  async function favoriDegistir(u: Model) {
    const yeni = !u.favori;
    setListe((l) =>
      l.map((x) => (x.id === u.id ? { ...x, favori: yeni || undefined } : x)),
    );
    const res = await modelFavoriGuncelle(u.id, yeni);
    if (res.ok) {
      toast.success(yeni ? `${u.ad} favorilere eklendi` : `${u.ad} favoriden çıkarıldı`);
    } else {
      setListe((l) =>
        l.map((x) => (x.id === u.id ? { ...x, favori: u.favori } : x)),
      );
      toast.error(res.error ?? "Güncellenemedi.");
    }
  }
  function etiketUygulandi(id: string, etiketler: string[]) {
    setListe((l) =>
      l.map((u) =>
        u.id === id
          ? { ...u, etiketler: etiketler.length ? etiketler : undefined }
          : u,
      ),
    );
  }

  /**
   * CSV dışa aktarma. Kolonlar GÖRÜNÜR olanlarla sınırlı: ekranda gizlediğiniz
   * kolon dosyaya da girmez. Satırlar filtrelenmiş/sıralanmış hâliyle gider.
   */
  function disaAktar(satirlar: Model[], ad: string) {
    if (satirlar.length === 0) {
      toast.error("Dışa aktarılacak kayıt yok.");
      return;
    }
    const kolonlar: CsvKolon<Model>[] = [];
    if (temelGorunur("kod")) kolonlar.push({ baslik: "Kod", deger: (u) => u.id });
    kolonlar.push({ baslik: "Model", deger: (u) => u.ad });
    if (temelGorunur("kategori"))
      kolonlar.push({ baslik: "Kategori", deger: (u) => u.kategori });
    if (temelGorunur("fiyat"))
      kolonlar.push({ baslik: "Fiyat", deger: (u) => u.fiyat });
    if (temelGorunur("stok"))
      kolonlar.push({ baslik: "Stok", deger: (u) => u.stok });
    for (const k of gorunurEk)
      kolonlar.push({
        baslik: k.label,
        // Ek kolonların hücresi JSX üretiyor; CSV için ham alanı okuruz.
        deger: (u) => (u as unknown as Record<string, string>)[k.key] ?? "",
      });
    if (temelGorunur("durum"))
      kolonlar.push({ baslik: "Durum", deger: (u) => u.durum });

    csvIndir(ad, satirlar, kolonlar);
    toast.success(`${satirlar.length} model dışa aktarıldı.`);
  }

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
            className="ml-auto"
            onClick={() =>
              disaAktar(
                liste.filter((u) => secili.has(u.id)),
                "modeller-secili",
              )
            }
          >
            <Download className="size-3.5" /> Seçilenleri dışa aktar
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-rose-600"
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
        <ListHeader title="Modeller" filtreler={cip.sonuc()}>
          {yonetici && <KolonAyarButonu kolon={kolon} />}
          {/* Filtrelenmiş listeyi aktarır — satır menüsünde değil, çünkü tek
              satırı dışa aktarmak anlamsız (AGENTS.md: menüdeki aksiyonlar
              satırın yapabildikleridir). */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => disaAktar(filtreli, "modeller")}
            disabled={filtreli.length === 0}
          >
            <Download className="size-4" /> Dışa Aktar
          </Button>
          {yetki.isAdd && (
            <Button
              size="sm"
              nativeButton={false}
              render={<Link href="/urunler/yeni" />}
            >
              <Plus className="size-4" /> Yeni Model
            </Button>
          )}
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
                    onSecim: () => setKopyaModel(u),
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
                        onSecim: () => setDuzeltHedef(u),
                      },
                      {
                        etiket: "Fiyat Güncelle",
                        ikon: Banknote,
                        onSecim: () => setFiyatHedef(u),
                      },
                      {
                        etiket: "Üretime Gönder",
                        ikon: Hammer,
                        onSecim: () => setUretimHedef(u),
                      },
                      {
                        etiket: "Etiketler",
                        ikon: Tags,
                        onSecim: () => setEtiketHedef(u),
                      },
                      {
                        etiket: u.favori ? "Favoriden Çıkar" : "Favorile",
                        ikon: Star,
                        onSecim: () => favoriDegistir(u),
                      },
                    ],
                  },
                  {
                    etiket: "Sil",
                    gizli: !yetki.isDelete,
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
                  <TableCell className="font-medium">
                    <span className="inline-flex items-center gap-1.5">
                      {u.favori && (
                        <Star className="size-3.5 shrink-0 fill-amber-400 text-amber-400" />
                      )}
                      {u.ad}
                    </span>
                  </TableCell>
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
                      {para(u.fiyat)}
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

      <StokDuzeltDialog
        hedef={
          duzeltHedef
            ? { id: duzeltHedef.id, ad: duzeltHedef.ad, stok: duzeltHedef.stok }
            : null
        }
        onKapat={() => setDuzeltHedef(null)}
        onUygulandi={stokDuzeltmeUygulandi}
      />

      <FiyatGuncelleDialog
        hedef={
          fiyatHedef
            ? { id: fiyatHedef.id, ad: fiyatHedef.ad, fiyat: fiyatHedef.fiyat }
            : null
        }
        onKapat={() => setFiyatHedef(null)}
        onUygulandi={fiyatUygulandi}
      />

      <UretimeGonderDialog
        hedef={uretimHedef ? { id: uretimHedef.id, ad: uretimHedef.ad } : null}
        onKapat={() => setUretimHedef(null)}
        varsayilanOncelik={varsayilanOncelik}
        varsayilanTermin={varsayilanTermin}
      />

      <EtiketDialog
        hedef={
          etiketHedef
            ? {
                id: etiketHedef.id,
                ad: etiketHedef.ad,
                etiketler: etiketHedef.etiketler,
              }
            : null
        }
        onKapat={() => setEtiketHedef(null)}
        onUygulandi={etiketUygulandi}
      />

      <ModelKopyaDialog
        model={kopyaModel}
        acik={kopyaModel !== null}
        onKapat={() => setKopyaModel(null)}
      />
    </div>
  );
}
