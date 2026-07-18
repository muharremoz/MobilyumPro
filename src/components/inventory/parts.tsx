"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Trash2,
  ExternalLink,
  CopyPlus,
  Power,
  Hash,
  Type,
  Link2,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { SearchSelect } from "@/components/ui/search-select";
import { ListHeader } from "@/components/ui/list-header";
import { filtreCipleri } from "@/components/ui/filtre-cipleri";
import { useSayfalama, SayfalamaKontrol } from "@/components/ui/sayfalama";
import { GorselHucre } from "@/components/ui/liste-gorsel";
import {
  useKolonAyarlari,
  KolonAyarButonu,
  KolonAyarSheet,
  type KolonTanim,
  type ListeKolonAyariDegeri,
} from "@/components/ui/kolon-ayarlari";
import { SiralaFiltreBaslik } from "@/components/ui/kolon-filtre";
import { useOnay } from "@/components/ui/confirm-dialog";
import { SatirMenu } from "@/components/ui/satir-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { type Parca, type Malzeme, type ParcaKategori } from "@/lib/data";
import { flattenParca } from "@/lib/bom";
import { parcaKaydet, parcaSil,
  silinebilirMi,
} from "@/lib/db/actions";

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
type SortKey = "id" | "ad" | "kategori" | "recete" | "durum";

/** Proje standardı kolon tanımları (kolon-ayarlari modülü). */
const TEMEL_KOLONLAR: KolonTanim[] = [
  { key: "id", label: "Kod", aciklama: "Parça kodu (PRC-####)." },
  { key: "ad", label: "Parça", aciklama: "Parçanın adı.", kilitli: true },
  { key: "kategori", label: "Kategori", aciklama: "Parça kategorisi." },
  { key: "recete", label: "Reçete", aciklama: "Reçetedeki satır sayısı." },
  {
    key: "malzeme",
    label: "Malzeme",
    aciklama: "Alt-parçalar çözülmüş toplam malzeme çeşidi.",
  },
  { key: "durum", label: "Durum", aciklama: "Aktif/Pasif durumu." },
];
const EK_KOLONLAR: KolonTanim[] = [];

/** Kopya için geçici kod (kayıt sırasında kullanılır). */
function kopyaId(onEk: string, taban: number, aralik: number) {
  return `${onEk}-${Math.floor(taban + Math.random() * aralik)}`;
}

export function Parts({
  parcalar,
  malzemeler,
  kolonAyari,
  kullanicilar = [],
  mevcutKullaniciId = "",
  yonetici = true, // TODO: oturum altyapısı gelince gerçek rolden gelecek
}: {
  parcalar: Parca[];
  malzemeler: Malzeme[];
  kolonAyari?: ListeKolonAyariDegeri;
  kullanicilar?: { id: string; ad: string }[];
  mevcutKullaniciId?: string;
  yonetici?: boolean;
}) {
  const [liste, setListe] = React.useState<Parca[]>(parcalar);
  // Kolon filtreleri (başlık popover'larından)
  const [metinFiltre, setMetinFiltre] = React.useState({ id: "", ad: "" });
  const [kategori, setKategori] = React.useState("Tümü");
  const [durum, setDurum] = React.useState("Tümü");
  const [receteAralik, setReceteAralik] = React.useState({ min: "", max: "" });
  const [sort, setSort] = React.useState<{ key: SortKey; dir: "asc" | "desc" }>(
    { key: "id", dir: "asc" },
  );
  const [secili, setSecili] = React.useState<Set<string>>(new Set());
  const router = useRouter();
  const { onayla, uyar, onayDialog } = useOnay();

  // Sütun ayarları — proje standardı (ui/kolon-ayarlari).
  const kolon = useKolonAyarlari({
    listeId: "parcalar",
    yol: "/stok-yonetimi",
    temel: TEMEL_KOLONLAR,
    ek: EK_KOLONLAR,
    ayar: kolonAyari,
    mevcutKullaniciId,
  });

  const filtreli = React.useMemo(() => {
    const arada = (n: number, min: string, max: string) =>
      (min === "" || n >= Number(min)) && (max === "" || n <= Number(max));
    const arr = liste.filter((p) => {
      const kod = p.id.toLowerCase().includes(metinFiltre.id.toLowerCase());
      const ad = p.ad.toLowerCase().includes(metinFiltre.ad.toLowerCase());
      const k = kategori === "Tümü" || p.kategori === kategori;
      const d = durum === "Tümü" || p.durum === durum;
      const r = arada(p.recete.length, receteAralik.min, receteAralik.max);
      return kod && ad && k && d && r;
    });
    const yon = sort.dir === "asc" ? 1 : -1;
    return [...arr].sort((a, b) => {
      if (sort.key === "recete")
        return (a.recete.length - b.recete.length) * yon;
      const x = a[sort.key];
      const y = b[sort.key];
      return String(x).localeCompare(String(y), "tr") * yon;
    });
  }, [liste, metinFiltre, kategori, durum, receteAralik, sort]);

  const sayfalama = useSayfalama(filtreli, "parcalar");
  const { sayfalik, setSayfa } = sayfalama;
  // Filtre değişince ilk sayfaya dön.
  React.useEffect(
    () => setSayfa(1),
    [metinFiltre, kategori, durum, receteAralik, setSayfa],
  );

  // Başlıktaki aktif filtre çipleri — proje standardı (ui/filtre-cipleri).
  const cip = filtreCipleri(liste);
  cip.metin("Kod", metinFiltre.id, (p) => p.id, () =>
    setMetinFiltre((f) => ({ ...f, id: "" })),
  );
  cip.metin("Ad", metinFiltre.ad, (p) => p.ad, () =>
    setMetinFiltre((f) => ({ ...f, ad: "" })),
  );
  cip.liste("Kategori", kategori, (p) => p.kategori, () => setKategori("Tümü"));
  cip.liste("Durum", durum, (p) => p.durum, () => setDurum("Tümü"));
  cip.sayi("Reçete", receteAralik, (p) => p.recete.length, () =>
    setReceteAralik({ min: "", max: "" }),
  );

  const sayfaIds = sayfalik.map((p) => p.id);
  const tumuSecili =
    sayfaIds.length > 0 && sayfaIds.every((id) => secili.has(id));
  const baziSecili = sayfaIds.some((id) => secili.has(id));

  // Reçete sayısı için yardımcı (flatten: alt-parça çözülmüş malzeme adedi).
  function malzemeAdet(p: Parca): number {
    const m = flattenParca(p.id, 1, liste);
    return m.size;
  }

  function secimDegis(id: string, v: boolean) {
    setSecili((s) => {
      const n = new Set(s);
      if (v) n.add(id);
      else n.delete(id);
      return n;
    });
  }
  function tumunuSec(v: boolean) {
    setSecili((s) => {
      const n = new Set(s);
      sayfaIds.forEach((id) => (v ? n.add(id) : n.delete(id)));
      return n;
    });
  }
  async function sil(ids: string[]) {
    // Onaydan önce: silinemeyecek kayıt için "emin misiniz?" sorma.
    const kontrol = await silinebilirMi("parca", ids);
    if (!kontrol.ok) {
      await uyar({
        title: "Silinemedi",
        description: kontrol.error ?? "Parça silinemez.",
        detaylar: kontrol.detaylar,
      });
      return;
    }
    const tekAd =
      ids.length === 1 ? liste.find((p) => p.id === ids[0])?.ad : null;
    if (
      !(await onayla({
        title:
          ids.length === 1
            ? `"${tekAd ?? "Parça"}" silinsin mi?`
            : `${ids.length} parça silinsin mi?`,
        description:
          "Bu kayıt kalıcı olarak silinecek. Bu işlem geri alınamaz.",
      }))
    )
      return;
    const kaldirilan = liste.filter((p) => ids.includes(p.id));
    setListe((l) => l.filter((p) => !ids.includes(p.id)));
    setSecili((s) => {
      const n = new Set(s);
      ids.forEach((id) => n.delete(id));
      return n;
    });
    const res = await parcaSil(ids);
    if (res.ok) {
      toast.success(`${ids.length} parça silindi`);
    } else {
      setListe((l) => [...kaldirilan, ...l]);
      await uyar({
        title: "Silinemedi",
        description: res.error ?? "Silinemedi.",
      });
    }
  }
  async function kopyala(p: Parca) {
    const k: Parca = {
      ...p,
      id: kopyaId("PRC", 2000, 8000),
      ad: `${p.ad} (kopya)`,
      recete: [...p.recete],
    };
    setListe((l) => [k, ...l]);
    await parcaKaydet(k);
    toast.success("Parça kopyalandı");
  }
  async function durumDegistir(p: Parca) {
    const yeniDurum = p.durum === "Aktif" ? "Pasif" : "Aktif";
    setListe((l) =>
      l.map((x) => (x.id === p.id ? { ...x, durum: yeniDurum } : x)),
    );
    const res = await parcaKaydet({ ...p, durum: yeniDurum });
    if (!res.ok) {
      setListe((l) =>
        l.map((x) => (x.id === p.id ? { ...x, durum: p.durum } : x)),
      );
      toast.error(res.error ?? "Durum güncellenemedi.");
      return;
    }
    toast.success(
      yeniDurum === "Aktif" ? "Aktifleştirildi" : "Pasifleştirildi",
    );
  }
  function panoyaKopyala(metin: string, etiket: string) {
    navigator.clipboard?.writeText(metin);
    toast.success(`${etiket} kopyalandı`);
  }
  // Kolon başlığı sıralama yardımcıları — SiralaFiltreBaslik (proje standardı).
  const sira = (k: SortKey) => (sort.key === k ? sort.dir : null);
  const sirala = (k: SortKey) => (dir: "asc" | "desc") =>
    setSort({ key: k, dir });

  return (
    <div className="flex flex-col gap-3">
      {secili.size > 0 && (
        <div className="flex items-center gap-3 rounded-md border bg-muted/50 px-3 py-2 text-sm">
          <span className="font-medium">{secili.size} seçili</span>
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

      {/* Tablo — proje standardı liste kartı */}
      <div className="overflow-hidden rounded-md border bg-card">
        <ListHeader title="Parçalar" filtreler={cip.sonuc()}>
          {yonetici && <KolonAyarButonu kolon={kolon} />}
          <Button size="sm" onClick={() => router.push("/parcalar/yeni")}>
            <Plus className="size-4" /> Yeni Parça
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
              {kolon.temelGorunur("id") && (
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
                Parça
              </SiralaFiltreBaslik>
              {kolon.temelGorunur("kategori") && (
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
              {kolon.temelGorunur("recete") && (
                <SiralaFiltreBaslik
                  className="text-right"
                  sira={sira("recete")}
                  onSirala={sirala("recete")}
                  filtre={{
                    tip: "sayi",
                    min: receteAralik.min,
                    max: receteAralik.max,
                    onDegis: (min, max) => setReceteAralik({ min, max }),
                  }}
                >
                  Reçete
                </SiralaFiltreBaslik>
              )}
              {kolon.temelGorunur("malzeme") && (
                <TableHead className="text-right">Malzeme</TableHead>
              )}
              {kolon.temelGorunur("durum") && (
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
            {sayfalik.map((p) => (
              <SatirMenu
                key={p.id}
                className="w-52"
                aksiyonlar={[
                  {
                    etiket: "Aç",
                    ikon: ExternalLink,
                    kisayol: "⏎",
                    onSecim: () => router.push(`/parcalar/${p.id}`),
                  },
                  {
                    etiket: "Çoğalt",
                    ikon: CopyPlus,
                    onSecim: () => kopyala(p),
                  },
                  {
                    etiket: p.durum === "Aktif" ? "Pasif Yap" : "Aktif Yap",
                    ikon: Power,
                    onSecim: () => durumDegistir(p),
                  },
                  {
                    etiket: "Kopyala",
                    ikon: Hash,
                    altAksiyonlar: [
                      {
                        etiket: "Kod",
                        ikon: Hash,
                        onSecim: () => panoyaKopyala(p.id, "Kod"),
                      },
                      {
                        etiket: "Ad",
                        ikon: Type,
                        onSecim: () => panoyaKopyala(p.ad, "Ad"),
                      },
                      {
                        etiket: "Bağlantı",
                        ikon: Link2,
                        onSecim: () =>
                          panoyaKopyala(
                            `${window.location.origin}/parcalar/${p.id}`,
                            "Bağlantı",
                          ),
                      },
                    ],
                  },
                  {
                    etiket: "Sil",
                    ikon: Trash2,
                    tehlike: true,
                    ayracOnce: true,
                    onSecim: () => sil([p.id]),
                  },
                ]}
              >
                <TableRow
                  data-state={secili.has(p.id) ? "selected" : undefined}
                  className="cursor-pointer"
                  onClick={() => router.push(`/parcalar/${p.id}`)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={secili.has(p.id)}
                      onCheckedChange={(v) => secimDegis(p.id, v === true)}
                      aria-label={`${p.ad} seç`}
                    />
                  </TableCell>
                  {kolon.temelGorunur("id") && (
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {p.id}
                    </TableCell>
                  )}
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <GorselHucre gorseller={p.gorseller} alt={p.ad} />
                  </TableCell>
                  <TableCell className="font-medium">{p.ad}</TableCell>
                  {kolon.temelGorunur("kategori") && (
                    <TableCell className="text-muted-foreground">
                      {p.kategori}
                    </TableCell>
                  )}
                  {kolon.temelGorunur("recete") && (
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {p.recete.length}
                    </TableCell>
                  )}
                  {kolon.temelGorunur("malzeme") && (
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {malzemeAdet(p)}
                    </TableCell>
                  )}
                  {kolon.temelGorunur("durum") && (
                    <TableCell>
                      <Badge
                        variant={p.durum === "Aktif" ? "default" : "secondary"}
                      >
                        {p.durum}
                      </Badge>
                    </TableCell>
                  )}
                </TableRow>
              </SatirMenu>
            ))}
            {sayfalik.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={2 + kolon.gorunurTemelSayisi}
                  className="h-24 text-center text-muted-foreground"
                >
                  Parça bulunamadı.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {filtreli.length} parça
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
