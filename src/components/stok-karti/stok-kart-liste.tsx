"use client";

import * as React from "react";
import Link from "next/link";
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
import { useSayfalama, SayfalamaKontrol } from "@/components/ui/sayfalama";
import { usePropAynasi } from "@/hooks/use-prop-aynasi";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ListHeader } from "@/components/ui/list-header";
import { filtreCipleri } from "@/components/ui/filtre-cipleri";
import {
  useKolonAyarlari,
  KolonAyarButonu,
  KolonAyarSheet,
  type KolonTanim,
  type ListeKolonAyariDegeri,
} from "@/components/ui/kolon-ayarlari";
import { SiralaFiltreBaslik } from "@/components/ui/kolon-filtre";
import { GorselHucre } from "@/components/ui/liste-gorsel";
import { useOnay } from "@/components/ui/confirm-dialog";
import { SatirMenu } from "@/components/ui/satir-menu";
import { stokKaydet, stokSil,
  silinebilirMi,
} from "@/lib/db/actions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatTL, type StokKarti, type StokGrubu } from "@/lib/data";

const GRUPLAR: StokGrubu[] = ["Hammadde", "Yarı Mamül", "Mamül", "Hizmet"];
const GRUP_RENK: Record<StokGrubu, string> = {
  Hammadde: "bg-blue-100 text-blue-800",
  "Yarı Mamül": "bg-violet-100 text-violet-800",
  Mamül: "bg-emerald-100 text-emerald-800",
  Hizmet: "bg-slate-100 text-slate-800",
};
type SortKey =
  | "id"
  | "ad"
  | "grup"
  | "altGrup"
  | "cins"
  | "stokBirimi"
  | "miktar"
  | "satisFiyat1"
  | "durum";

/** Proje standardı kolon tanımları (kolon-ayarlari modülü). */
const TEMEL_KOLONLAR: KolonTanim[] = [
  {
    key: "id",
    label: "Kod",
    aciklama: "Stok kodu (kullanıcı kodu boşsa sistem kodu).",
    kilitli: true,
  },
  { key: "ad", label: "Ad", aciklama: "Stok kartı adı." },
  // Not: "grup" alanı tipi tutar (form da "Tip" der), "altGrup" grup ağacından
  // seçilen gerçek gruptur (form da "Grup" der). Etiketler formla hizalı.
  { key: "grup", label: "Tip", aciklama: "Hammadde/Yarı Mamül/Mamül/Hizmet." },
  { key: "altGrup", label: "Grup", aciklama: "Grup ağacından seçilen grup." },
  { key: "cins", label: "Cins", aciklama: "Malzeme cinsi (MDF, Suntalam, …)." },
  { key: "stokBirimi", label: "Birim", aciklama: "Stok birimi (adet, m², …)." },
  {
    key: "miktar",
    label: "Miktar",
    aciklama: "Ledger'dan okunan mevcut miktar.",
  },
  {
    key: "satisFiyat1",
    label: "Satış Fiyatı",
    aciklama: "Satış fiyatı 1 (TL).",
  },
  { key: "durum", label: "Durum", aciklama: "Aktif/Pasif durumu." },
];
const EK_KOLONLAR: (KolonTanim & {
  hucre: (s: StokKarti) => React.ReactNode;
})[] = [
  {
    key: "marka",
    label: "Marka",
    aciklama: "Stok kartının markası.",
    hucre: (s) => s.marka ?? <span className="text-muted-foreground">—</span>,
  },
  {
    key: "barkod",
    label: "Barkod",
    aciklama: "Barkod numarası.",
    hucre: (s) =>
      s.barkod ? (
        <span className="font-mono text-xs">{s.barkod}</span>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    key: "maliyetFiyati",
    label: "Maliyet",
    aciklama: "Maliyet fiyatı (TL).",
    hucre: (s) => (
      <span className="tabular-nums">{formatTL(s.maliyetFiyati)}</span>
    ),
  },
];

const BOS_KULLANICILAR: { id: string; ad: string }[] = [];

export function StokKartListe({
  stoklar,
  kolonAyari,
  kullanicilar = BOS_KULLANICILAR,
  mevcutKullaniciId = "",
  yonetici = true, // TODO: oturum altyapısı gelince gerçek rolden gelecek
}: {
  stoklar: StokKarti[];
  /** Kolon ayarları (liste_ayar "stok-kartlari"). */
  kolonAyari?: ListeKolonAyariDegeri;
  kullanicilar?: { id: string; ad: string }[];
  mevcutKullaniciId?: string;
  yonetici?: boolean;
}) {
  const router = useRouter();
  const { onayla, uyar, onayDialog } = useOnay();
  const [liste, setListe] = usePropAynasi(stoklar);
  // Kolon filtreleri (başlık popover'larından)
  const [metinFiltre, setMetinFiltre] = React.useState({ id: "", ad: "" });
  const [grupF, setGrupF] = React.useState("Tümü");
  const [altGrupF, setAltGrupF] = React.useState("Tümü");
  const [cinsF, setCinsF] = React.useState("Tümü");
  const [birimF, setBirimF] = React.useState("Tümü");
  const [durumF, setDurumF] = React.useState("Tümü");
  const [sayiFiltre, setSayiFiltre] = React.useState<
    Record<"miktar" | "satisFiyat1", { min: string; max: string }>
  >({ miktar: { min: "", max: "" }, satisFiyat1: { min: "", max: "" } });
  const [sort, setSort] = React.useState<{ key: SortKey; dir: "asc" | "desc" }>(
    { key: "id", dir: "asc" },
  );

  // Sütun ayarları — proje standardı (ui/kolon-ayarlari).
  const kolon = useKolonAyarlari({
    listeId: "stok-kartlari",
    yol: "/stok-karti",
    temel: TEMEL_KOLONLAR,
    ek: EK_KOLONLAR,
    ayar: kolonAyari,
    mevcutKullaniciId,
  });
  const gorunurEk = EK_KOLONLAR.filter((k) => kolon.ekGorunur(k.key));

  // Liste filtrelerinin seçenekleri veriden türer: ölü seçenek çıkmaz, yeni
  // değer girildikçe kendiliğinden listeye düşer.
  const secenek = (deger: (s: StokKarti) => string | undefined) =>
    [...new Set(liste.map(deger).filter((v): v is string => !!v))].sort((a, b) =>
      a.localeCompare(b, "tr"),
    );
  const altGrupSecenekleri = React.useMemo(
    () => secenek((s) => s.altGrup),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [liste],
  );
  const cinsSecenekleri = React.useMemo(
    () => secenek((s) => s.cins),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [liste],
  );
  const birimSecenekleri = React.useMemo(
    () => secenek((s) => s.stokBirimi),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [liste],
  );

  const filtreli = React.useMemo(() => {
    const qId = metinFiltre.id.toLocaleLowerCase("tr");
    const qAd = metinFiltre.ad.toLocaleLowerCase("tr");
    const arada = (n: number, min: string, max: string) =>
      (min === "" || n >= Number(min)) && (max === "" || n <= Number(max));
    const arr = liste.filter(
      (s) =>
        (!qId || (s.kod ?? s.id).toLocaleLowerCase("tr").includes(qId)) &&
        (!qAd || s.ad.toLocaleLowerCase("tr").includes(qAd)) &&
        (altGrupF === "Tümü" || s.altGrup === altGrupF) &&
        (cinsF === "Tümü" || s.cins === cinsF) &&
        (birimF === "Tümü" || s.stokBirimi === birimF) &&
        (grupF === "Tümü" || s.grup === grupF) &&
        (durumF === "Tümü" || s.durum === durumF) &&
        arada(s.miktar, sayiFiltre.miktar.min, sayiFiltre.miktar.max) &&
        arada(
          s.satisFiyat1,
          sayiFiltre.satisFiyat1.min,
          sayiFiltre.satisFiyat1.max,
        ),
    );
    const yon = sort.dir === "asc" ? 1 : -1;
    return [...arr].sort((a, b) => {
      const deger = (x: StokKarti): string | number =>
        sort.key === "id" ? (x.kod ?? x.id) : (x[sort.key] ?? "");
      const va = deger(a);
      const vb = deger(b);
      if (typeof va === "number" && typeof vb === "number")
        return (va - vb) * yon;
      return String(va).localeCompare(String(vb), "tr") * yon;
    });
  }, [
    liste,
    metinFiltre,
    grupF,
    altGrupF,
    cinsF,
    birimF,
    durumF,
    sayiFiltre,
    sort,
  ]);

  const sayfalama = useSayfalama(filtreli, "stok-kartlari");
  const { setSayfa } = sayfalama;
  // Filtre değişince ilk sayfaya dön.
  React.useEffect(
    () => setSayfa(1),
    [metinFiltre, grupF, altGrupF, cinsF, birimF, durumF, sayiFiltre, setSayfa],
  );

  async function sil(s: StokKarti) {
    // Onaydan önce: silinemeyecek kayıt için "emin misiniz?" sorma.
    const kontrol = await silinebilirMi("stok", [s.id]);
    if (!kontrol.ok) {
      await uyar({
        title: "Silinemedi",
        description: kontrol.error ?? "Kart silinemez.",
        detaylar: kontrol.detaylar,
      });
      return;
    }
    if (
      !(await onayla({
        title: `"${s.ad}" silinsin mi?`,
        description:
          "Bu malzeme kalıcı olarak silinecek. Bu işlem geri alınamaz.",
      }))
    )
      return;
    const onceki = liste;
    setListe((l) => l.filter((x) => x.id !== s.id));
    const res = await stokSil(s.id);
    if (!res.ok) {
      setListe(onceki);
      await uyar({
        title: "Silinemedi",
        description: res.error ?? "Stok kartı silinemedi.",
      });
      return;
    }
    toast.success("Stok kartı silindi");
  }

  async function kopyala(s: StokKarti) {
    const { miktar: _miktar, ...rest } = s;
    const res = await stokKaydet({ ...rest, ad: `${s.ad} (kopya)` }, true);
    if (!res.ok || !res.id) {
      toast.error(res.error ?? "Çoğaltılamadı.");
      return;
    }
    setListe((l) => [
      { ...s, id: res.id!, kod: undefined, ad: `${s.ad} (kopya)`, miktar: 0 },
      ...l,
    ]);
    toast.success("Malzeme çoğaltıldı");
  }

  async function durumDegistir(s: StokKarti) {
    const yeniDurum = s.durum === "Aktif" ? "Pasif" : "Aktif";
    const onceki = liste;
    setListe((l) =>
      l.map((x) => (x.id === s.id ? { ...x, durum: yeniDurum } : x)),
    );
    const { miktar: _miktar, ...rest } = s;
    const res = await stokKaydet({ ...rest, durum: yeniDurum }, false);
    if (!res.ok) {
      setListe(onceki);
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

  const sayfalik = sayfalama.sayfalik;

  // Başlıktaki aktif filtre çipleri — proje standardı (ui/filtre-cipleri).
  const cip = filtreCipleri(liste);
  cip.metin("Kod", metinFiltre.id, (s) => s.kod ?? s.id, () =>
    setMetinFiltre((f) => ({ ...f, id: "" })),
  );
  cip.metin("Ad", metinFiltre.ad, (s) => s.ad, () =>
    setMetinFiltre((f) => ({ ...f, ad: "" })),
  );
  cip.liste("Tip", grupF, (s) => s.grup, () => setGrupF("Tümü"));
  cip.liste("Grup", altGrupF, (s) => s.altGrup, () => setAltGrupF("Tümü"));
  cip.liste("Cins", cinsF, (s) => s.cins, () => setCinsF("Tümü"));
  cip.liste("Birim", birimF, (s) => s.stokBirimi, () => setBirimF("Tümü"));
  cip.liste("Durum", durumF, (s) => s.durum, () => setDurumF("Tümü"));
  cip.sayi("Miktar", sayiFiltre.miktar, (s) => s.miktar, () =>
    setSayiFiltre((f) => ({ ...f, miktar: { min: "", max: "" } })),
  );
  cip.sayi("Satış Fiyatı", sayiFiltre.satisFiyat1, (s) => s.satisFiyat1, () =>
    setSayiFiltre((f) => ({ ...f, satisFiyat1: { min: "", max: "" } })),
  );

  // Kolon başlığı sıralama yardımcıları — SiralaFiltreBaslik (proje standardı).
  const sira = (k: SortKey) => (sort.key === k ? sort.dir : null);
  const sirala = (k: SortKey) => (dir: "asc" | "desc") =>
    setSort({ key: k, dir });

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-md border bg-card">
        <ListHeader title="Malzeme" filtreler={cip.sonuc()}>
          {yonetici && <KolonAyarButonu kolon={kolon} />}
          <Button
            size="sm"
            nativeButton={false}
            render={<Link href="/stok-karti/yeni" />}
          >
            <Plus className="size-4" /> Yeni Malzeme
          </Button>
        </ListHeader>
        <Table>
          <TableHeader>
            <TableRow>
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
              <TableHead className="w-14">Görsel</TableHead>
              {kolon.temelGorunur("ad") && (
                <SiralaFiltreBaslik
                  sira={sira("ad")}
                  onSirala={sirala("ad")}
                  filtre={{
                    tip: "metin",
                    deger: metinFiltre.ad,
                    onDeger: (v) => setMetinFiltre((f) => ({ ...f, ad: v })),
                  }}
                >
                  Ad
                </SiralaFiltreBaslik>
              )}
              {kolon.temelGorunur("grup") && (
                <SiralaFiltreBaslik
                  sira={sira("grup")}
                  onSirala={sirala("grup")}
                  filtre={{
                    tip: "liste",
                    secenekler: GRUPLAR,
                    deger: grupF,
                    onDeger: setGrupF,
                  }}
                >
                  Tip
                </SiralaFiltreBaslik>
              )}
              {kolon.temelGorunur("altGrup") && (
                <SiralaFiltreBaslik
                  sira={sira("altGrup")}
                  onSirala={sirala("altGrup")}
                  filtre={{
                    tip: "liste",
                    secenekler: altGrupSecenekleri,
                    deger: altGrupF,
                    onDeger: setAltGrupF,
                  }}
                >
                  Grup
                </SiralaFiltreBaslik>
              )}
              {kolon.temelGorunur("cins") && (
                <SiralaFiltreBaslik
                  sira={sira("cins")}
                  onSirala={sirala("cins")}
                  filtre={{
                    tip: "liste",
                    secenekler: cinsSecenekleri,
                    deger: cinsF,
                    onDeger: setCinsF,
                  }}
                >
                  Cins
                </SiralaFiltreBaslik>
              )}
              {kolon.temelGorunur("stokBirimi") && (
                <SiralaFiltreBaslik
                  sira={sira("stokBirimi")}
                  onSirala={sirala("stokBirimi")}
                  filtre={{
                    tip: "liste",
                    secenekler: birimSecenekleri,
                    deger: birimF,
                    onDeger: setBirimF,
                  }}
                >
                  Birim
                </SiralaFiltreBaslik>
              )}
              {kolon.temelGorunur("miktar") && (
                <SiralaFiltreBaslik
                  className="text-right"
                  sira={sira("miktar")}
                  onSirala={sirala("miktar")}
                  filtre={{
                    tip: "sayi",
                    min: sayiFiltre.miktar.min,
                    max: sayiFiltre.miktar.max,
                    onDegis: (min, max) =>
                      setSayiFiltre((f) => ({ ...f, miktar: { min, max } })),
                  }}
                >
                  Miktar
                </SiralaFiltreBaslik>
              )}
              {kolon.temelGorunur("satisFiyat1") && (
                <SiralaFiltreBaslik
                  className="text-right"
                  sira={sira("satisFiyat1")}
                  onSirala={sirala("satisFiyat1")}
                  filtre={{
                    tip: "sayi",
                    min: sayiFiltre.satisFiyat1.min,
                    max: sayiFiltre.satisFiyat1.max,
                    onDegis: (min, max) =>
                      setSayiFiltre((f) => ({
                        ...f,
                        satisFiyat1: { min, max },
                      })),
                  }}
                >
                  Satış Fiyatı
                </SiralaFiltreBaslik>
              )}
              {kolon.temelGorunur("durum") && (
                <SiralaFiltreBaslik
                  sira={sira("durum")}
                  onSirala={sirala("durum")}
                  filtre={{
                    tip: "liste",
                    secenekler: ["Aktif", "Pasif"],
                    deger: durumF,
                    onDeger: setDurumF,
                  }}
                >
                  Durum
                </SiralaFiltreBaslik>
              )}
              {gorunurEk.map((k) => (
                <TableHead key={k.key}>{k.label}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sayfalik.map((s) => (
              <SatirMenu
                key={s.id}
                className="w-52"
                aksiyonlar={[
                  {
                    etiket: "Aç",
                    ikon: ExternalLink,
                    kisayol: "⏎",
                    onSecim: () => router.push(`/stok-karti/${s.id}`),
                  },
                  {
                    etiket: "Çoğalt",
                    ikon: CopyPlus,
                    onSecim: () => kopyala(s),
                  },
                  {
                    etiket: s.durum === "Aktif" ? "Pasif Yap" : "Aktif Yap",
                    ikon: Power,
                    onSecim: () => durumDegistir(s),
                  },
                  {
                    etiket: "Kopyala",
                    ikon: Hash,
                    altAksiyonlar: [
                      {
                        etiket: "Kod",
                        ikon: Hash,
                        onSecim: () => panoyaKopyala(s.kod ?? s.id, "Kod"),
                      },
                      {
                        etiket: "Ad",
                        ikon: Type,
                        onSecim: () => panoyaKopyala(s.ad, "Ad"),
                      },
                      {
                        etiket: "Barkod",
                        ikon: Hash,
                        gizli: !s.barkod,
                        onSecim: () => panoyaKopyala(s.barkod!, "Barkod"),
                      },
                      {
                        etiket: "Bağlantı",
                        ikon: Link2,
                        onSecim: () =>
                          panoyaKopyala(
                            `${window.location.origin}/stok-karti/${s.id}`,
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
                    onSecim: () => sil(s),
                  },
                ]}
              >
                <TableRow
                  className="cursor-pointer"
                  onClick={() => router.push(`/stok-karti/${s.id}`)}
                >
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {s.kod ?? s.id}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <GorselHucre gorseller={s.gorseller} alt={s.ad} />
                  </TableCell>
                  {kolon.temelGorunur("ad") && (
                    <TableCell className="font-medium">{s.ad}</TableCell>
                  )}
                  {kolon.temelGorunur("grup") && (
                    <TableCell>
                      <Badge variant="secondary" className={GRUP_RENK[s.grup]}>
                        {s.grup}
                      </Badge>
                    </TableCell>
                  )}
                  {kolon.temelGorunur("altGrup") && (
                    <TableCell className="text-muted-foreground">
                      {s.altGrup ?? "—"}
                    </TableCell>
                  )}
                  {kolon.temelGorunur("cins") && (
                    <TableCell className="text-muted-foreground">
                      {s.cins ?? "—"}
                    </TableCell>
                  )}
                  {kolon.temelGorunur("stokBirimi") && (
                    <TableCell className="text-muted-foreground">
                      {s.stokBirimi}
                    </TableCell>
                  )}
                  {kolon.temelGorunur("miktar") && (
                    <TableCell
                      className={cn(
                        "text-right tabular-nums",
                        s.miktar === 0 && "text-muted-foreground/60",
                      )}
                    >
                      {s.miktar.toLocaleString("tr-TR")}
                    </TableCell>
                  )}
                  {kolon.temelGorunur("satisFiyat1") && (
                    <TableCell className="text-right tabular-nums">
                      {formatTL(s.satisFiyat1)}
                    </TableCell>
                  )}
                  {kolon.temelGorunur("durum") && (
                    <TableCell>
                      <Badge
                        variant={s.durum === "Aktif" ? "default" : "secondary"}
                      >
                        {s.durum}
                      </Badge>
                    </TableCell>
                  )}
                  {gorunurEk.map((k) => (
                    <TableCell key={k.key}>{k.hucre(s)}</TableCell>
                  ))}
                </TableRow>
              </SatirMenu>
            ))}
            {sayfalik.length === 0 && (
              <TableRow>
                <TableCell
                  // Sabit kolon yalnızca "Görsel" (1). Kod dahil temel
                  // kolonlar gorunurTemelSayisi'na girer; 2 yazılıysa boş
                  // listede tablo bir kolon genişler.
                  colSpan={1 + kolon.gorunurTemelSayisi + gorunurEk.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  Stok kartı bulunamadı.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{filtreli.length} stok kartı</span>
        <SayfalamaKontrol sayfalama={sayfalama} />
      </div>

      {/* Sütun ayarları sheet'i — proje standardı */}
      <KolonAyarSheet kolon={kolon} kullanicilar={kullanicilar} />
      {onayDialog}
    </div>
  );
}
