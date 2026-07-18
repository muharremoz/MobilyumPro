"use client";

import * as React from "react";
import Link from "next/link";
import {
  Pencil,
  Trash2,
  Check,
  Wand2,
  Copy,
  CopyPlus,
  Power,
  Plus,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { SearchSelect } from "@/components/ui/search-select";
import { Switch } from "@/components/ui/switch";
import { FormSheet } from "@/components/ui/form-sheet";
import { ListHeader } from "@/components/ui/list-header";
import { filtreCipleri } from "@/components/ui/filtre-cipleri";
import { useSayfalama, SayfalamaKontrol } from "@/components/ui/sayfalama";
import {
  useKolonAyarlari,
  KolonAyarButonu,
  KolonAyarSheet,
  type KolonTanim,
  type ListeKolonAyariDegeri,
} from "@/components/ui/kolon-ayarlari";
import { SiralaFiltreBaslik } from "@/components/ui/kolon-filtre";
import { ErrorShakeField } from "@/components/ui/error-shake";
import { IconInput, type AnimatedIconHandle } from "@/components/ui/icon-input";
import { AnimatedField } from "@/components/ui/animated-field";
import { UsersRoundIcon } from "@/components/ui/icons/users-round";
import { SendIcon } from "@/components/ui/icons/send";
import { PhoneIcon } from "@/components/ui/icons/phone";
import { FolderTreeIcon } from "@/components/ui/icons/folder-tree";
import { ShieldCheckIcon } from "@/components/ui/icons/shield-check";
import { ScanTextIcon } from "@/components/ui/icons/scan-text";
import { CircleCheckIcon } from "@/components/ui/icons/circle-check";
import { HistoryIcon } from "@/components/ui/icons/history";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import type { KullaniciGorunum } from "@/lib/db/queries";
import {
  kullaniciKaydet,
  kullaniciSil,
  rolEkle as rolEkleAction,
  departmanEkle as departmanEkleAction,
  type KullaniciKayit,
  silinebilirMi,
} from "@/lib/db/actions";

const ROL_RENK: Record<string, string> = {
  Yönetici: "bg-violet-100 text-violet-800",
  Kullanıcı: "bg-blue-100 text-blue-800",
  Görüntüleyici: "bg-slate-100 text-slate-700",
};
type SortKey = "adSoyad" | "email" | "telefon" | "departman" | "rol" | "durum";
type MetinKolon = "adSoyad" | "email" | "telefon";

/** Proje standardı kolon tanımları (kolon-ayarlari modülü). */
const TEMEL_KOLONLAR: KolonTanim[] = [
  {
    key: "adSoyad",
    label: "Ad Soyad",
    aciklama: "Kullanıcının adı soyadı.",
    kilitli: true,
  },
  { key: "email", label: "E-posta", aciklama: "E-posta adresi." },
  { key: "telefon", label: "Telefon", aciklama: "Telefon numarası." },
  {
    key: "departman",
    label: "Departman",
    aciklama: "Bağlı olduğu departman.",
  },
  { key: "rol", label: "Rol", aciklama: "Yetki rolü." },
  { key: "durum", label: "Durum", aciklama: "Aktif/Pasif durumu." },
];
const EK_KOLONLAR: KolonTanim[] = [];

export function KullanicilarTable({
  kullanicilar,
  roller: rollerProp,
  departmanlar: departmanlarProp,
  kolonAyari,
  kisiSecenekleri = [],
  mevcutKullaniciId = "",
  yonetici = true, // TODO: oturum altyapısı gelince gerçek rolden gelecek
}: {
  kullanicilar: KullaniciGorunum[];
  roller: string[];
  departmanlar: string[];
  /** Kolon ayarları (liste_ayar "kullanicilar"). */
  kolonAyari?: ListeKolonAyariDegeri;
  /** Kolon-ayar sheet'indeki kullanıcı seçenekleri (liste verisiyle karışmasın). */
  kisiSecenekleri?: { id: string; ad: string }[];
  mevcutKullaniciId?: string;
  yonetici?: boolean;
}) {
  const { onayla, uyar, onayDialog } = useOnay();
  const [liste, setListe] = React.useState<KullaniciGorunum[]>(kullanicilar);
  const [metinFiltre, setMetinFiltre] = React.useState<
    Record<MetinKolon, string>
  >({ adSoyad: "", email: "", telefon: "" });
  const [rol, setRol] = React.useState("Tümü");
  const [departman, setDepartman] = React.useState("Tümü");
  const [durum, setDurum] = React.useState("Tümü");
  const [sort, setSort] = React.useState<{ key: SortKey; dir: "asc" | "desc" }>(
    { key: "adSoyad", dir: "asc" },
  );
  const [secili, setSecili] = React.useState<Set<string>>(new Set());
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [duzenlenen, setDuzenlenen] = React.useState<KullaniciGorunum | null>(
    null,
  );
  // Roller/departmanlar DB'den gelir; "yeni ekle" DB'ye yazar + local günceller.
  const [departmanlar, setDepartmanlar] =
    React.useState<string[]>(departmanlarProp);
  const [roller, setRoller] = React.useState<string[]>(rollerProp);

  async function departmanEkle(d: string) {
    const ad = d.trim();
    if (!ad) return;
    setDepartmanlar((prev) => (prev.includes(ad) ? prev : [...prev, ad]));
    const res = await departmanEkleAction(ad);
    if (!res.ok) {
      setDepartmanlar((prev) => prev.filter((x) => x !== ad));
      toast.error(res.error ?? "Departman eklenemedi.");
    }
  }
  async function rolEkle(r: string) {
    const ad = r.trim();
    if (!ad) return;
    setRoller((prev) => (prev.includes(ad) ? prev : [...prev, ad]));
    const res = await rolEkleAction(ad);
    if (!res.ok) {
      setRoller((prev) => prev.filter((x) => x !== ad));
      toast.error(res.error ?? "Rol eklenemedi.");
    }
  }

  // Sütun ayarları — proje standardı (ui/kolon-ayarlari).
  const kolon = useKolonAyarlari({
    listeId: "kullanicilar",
    yol: "/kullanicilar",
    temel: TEMEL_KOLONLAR,
    ek: EK_KOLONLAR,
    ayar: kolonAyari,
    mevcutKullaniciId,
  });

  const filtreli = React.useMemo(() => {
    const arr = liste.filter((k) => {
      const metin = (Object.keys(metinFiltre) as MetinKolon[]).every((kol) => {
        const q = metinFiltre[kol].toLowerCase();
        if (!q) return true;
        return (k[kol] ?? "").toLowerCase().includes(q);
      });
      const r = rol === "Tümü" || k.rol === rol;
      const dep = departman === "Tümü" || k.departman === departman;
      const d = durum === "Tümü" || k.durum === durum;
      return metin && r && dep && d;
    });
    const yon = sort.dir === "asc" ? 1 : -1;
    return [...arr].sort(
      (a, b) =>
        String(a[sort.key] ?? "").localeCompare(
          String(b[sort.key] ?? ""),
          "tr",
        ) * yon,
    );
  }, [liste, metinFiltre, rol, departman, durum, sort]);

  const sayfalama = useSayfalama(filtreli, "kullanicilar");
  const { sayfalik, setSayfa } = sayfalama;
  // Filtre değişince ilk sayfaya dön.
  React.useEffect(
    () => setSayfa(1),
    [metinFiltre, rol, departman, durum, setSayfa],
  );

  // Başlıktaki aktif filtre çipleri — proje standardı (ui/filtre-cipleri).
  const cip = filtreCipleri(liste);
  for (const [kol, etiket] of [
    ["adSoyad", "Ad Soyad"],
    ["email", "E-posta"],
    ["telefon", "Telefon"],
  ] as const) {
    cip.metin(etiket, metinFiltre[kol], (k) => k[kol] ?? "", () =>
      setMetinFiltre((f) => ({ ...f, [kol]: "" })),
    );
  }
  cip.liste("Rol", rol, (k) => k.rol, () => setRol("Tümü"));
  cip.liste("Departman", departman, (k) => k.departman, () =>
    setDepartman("Tümü"),
  );
  cip.liste("Durum", durum, (k) => k.durum, () => setDurum("Tümü"));

  const sayfaIds = sayfalik.map((k) => k.id);
  const tumuSecili =
    sayfaIds.length > 0 && sayfaIds.every((id) => secili.has(id));
  const baziSecili = sayfaIds.some((id) => secili.has(id));

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
    const kontrol = await silinebilirMi("kullanici", ids);
    if (!kontrol.ok) {
      await uyar({
        title: "Silinemedi",
        description: kontrol.error ?? "Kullanıcı silinemez.",
      });
      return;
    }
    const tekAd =
      ids.length === 1 ? liste.find((k) => k.id === ids[0])?.adSoyad : null;
    if (
      !(await onayla({
        title:
          ids.length === 1
            ? `"${tekAd ?? "Kullanıcı"}" silinsin mi?`
            : `${ids.length} kullanıcı silinsin mi?`,
        description:
          "Bu kayıt kalıcı olarak silinecek. Bu işlem geri alınamaz.",
      }))
    )
      return;
    const kaldirilan = liste.filter((k) => ids.includes(k.id));
    setListe((l) => l.filter((k) => !ids.includes(k.id)));
    setSecili((s) => {
      const n = new Set(s);
      ids.forEach((id) => n.delete(id));
      return n;
    });
    const res = await kullaniciSil(ids);
    if (res.ok) {
      toast.success(`${ids.length} kullanıcı silindi`);
    } else {
      setListe((l) => [...kaldirilan, ...l]);
      await uyar({
        title: "Silinemedi",
        description: res.error ?? "Silinemedi.",
      });
    }
  }

  async function kaydet(kayit: KullaniciKayit): Promise<boolean> {
    const res = await kullaniciKaydet(kayit);
    if (!res.ok) {
      toast.error(res.error ?? "Kullanıcı kaydedilemedi.");
      return false;
    }
    const id = res.id!;
    const gorunum: KullaniciGorunum = {
      id,
      kullaniciAdi: res.kullaniciAdi ?? "",
      adSoyad: kayit.adSoyad.trim(),
      email: kayit.email?.trim() || undefined,
      telefon: kayit.telefon?.trim() || undefined,
      departman: kayit.departman?.trim() || undefined,
      rol: kayit.rol,
      durum: kayit.durum,
      eskiTarihliIslem: kayit.eskiTarihliIslem ?? false,
      olusturma:
        liste.find((k) => k.id === id)?.olusturma ??
        new Date().toISOString().slice(0, 10),
    };
    setListe((l) => {
      const i = l.findIndex((x) => x.id === id);
      if (i >= 0) {
        const n = [...l];
        n[i] = gorunum;
        return n;
      }
      return [gorunum, ...l];
    });
    toast.success(kayit.id ? "Kullanıcı güncellendi" : "Kullanıcı eklendi");
    return true;
  }

  async function durumDegistir(k: KullaniciGorunum) {
    const yeniDurum =
      k.durum === "Aktif" ? ("Pasif" as const) : ("Aktif" as const);
    await kaydet({
      id: k.id,
      adSoyad: k.adSoyad,
      email: k.email,
      telefon: k.telefon,
      departman: k.departman,
      rol: k.rol,
      durum: yeniDurum,
    });
  }

  function panoyaKopyala(deger: string, etiket: string) {
    navigator.clipboard.writeText(deger);
    toast.success(`${etiket} kopyalandı`);
  }

  // Kullanıcıyı kopyala: sheet'i "(kopya)" adıyla, id'siz (yeni kayıt) açar;
  // kullanıcı adı otomatik üretilir, şifreyi admin belirler.
  function kopyala(k: KullaniciGorunum) {
    setDuzenlenen({
      ...k,
      id: "",
      kullaniciAdi: "",
      adSoyad: `${k.adSoyad} (kopya)`,
    });
    setSheetOpen(true);
  }

  // Kolon başlığı sıralama yardımcıları — SiralaFiltreBaslik (proje standardı).
  const sira = (k: SortKey) => (sort.key === k ? sort.dir : null);
  const sirala = (k: SortKey) => (dir: "asc" | "desc") =>
    setSort({ key: k, dir });
  const metinDeger = (k: MetinKolon) => (v: string) =>
    setMetinFiltre((f) => ({ ...f, [k]: v }));

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-3">
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

      <div className="overflow-hidden rounded-md border bg-card">
        <ListHeader title="Kullanıcılar" filtreler={cip.sonuc()}>
          {yonetici && <KolonAyarButonu kolon={kolon} />}
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href="/kullanicilar/yetkiler" />}
          >
            Yetkilendirmeler
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setDuzenlenen(null);
              setSheetOpen(true);
            }}
          >
            <Plus className="size-4" /> Yeni Kullanıcı
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
              <SiralaFiltreBaslik
                sira={sira("adSoyad")}
                onSirala={sirala("adSoyad")}
                filtre={{
                  tip: "metin",
                  deger: metinFiltre.adSoyad,
                  onDeger: metinDeger("adSoyad"),
                }}
              >
                Ad Soyad
              </SiralaFiltreBaslik>
              {kolon.temelGorunur("email") && (
                <SiralaFiltreBaslik
                  sira={sira("email")}
                  onSirala={sirala("email")}
                  filtre={{
                    tip: "metin",
                    deger: metinFiltre.email,
                    onDeger: metinDeger("email"),
                  }}
                >
                  E-posta
                </SiralaFiltreBaslik>
              )}
              {kolon.temelGorunur("telefon") && (
                <SiralaFiltreBaslik
                  sira={sira("telefon")}
                  onSirala={sirala("telefon")}
                  filtre={{
                    tip: "metin",
                    deger: metinFiltre.telefon,
                    onDeger: metinDeger("telefon"),
                  }}
                >
                  Telefon
                </SiralaFiltreBaslik>
              )}
              {kolon.temelGorunur("departman") && (
                <SiralaFiltreBaslik
                  sira={sira("departman")}
                  onSirala={sirala("departman")}
                  filtre={{
                    tip: "liste",
                    secenekler: departmanlar,
                    deger: departman,
                    onDeger: setDepartman,
                  }}
                >
                  Departman
                </SiralaFiltreBaslik>
              )}
              {kolon.temelGorunur("rol") && (
                <SiralaFiltreBaslik
                  sira={sira("rol")}
                  onSirala={sirala("rol")}
                  filtre={{
                    tip: "liste",
                    secenekler: roller,
                    deger: rol,
                    onDeger: setRol,
                  }}
                >
                  Rol
                </SiralaFiltreBaslik>
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
            {sayfalik.map((k) => (
              <SatirMenu
                key={k.id}
                className="w-52"
                aksiyonlar={[
                  {
                    etiket: "Düzenle",
                    ikon: Pencil,
                    onSecim: () => {
                      setDuzenlenen(k);
                      setSheetOpen(true);
                    },
                  },
                  {
                    etiket: "Kopyala",
                    ikon: CopyPlus,
                    onSecim: () => kopyala(k),
                  },
                  {
                    etiket: k.durum === "Aktif" ? "Pasif Yap" : "Aktif Yap",
                    ikon: Power,
                    onSecim: () => durumDegistir(k),
                  },
                  {
                    etiket: "Kullanıcı Adını Kopyala",
                    ikon: Copy,
                    onSecim: () =>
                      panoyaKopyala(k.kullaniciAdi, "Kullanıcı adı"),
                  },
                  {
                    etiket: "E-postayı Kopyala",
                    ikon: Copy,
                    gizli: !k.email,
                    onSecim: () => panoyaKopyala(k.email!, "E-posta"),
                  },
                  {
                    etiket: "Sil",
                    ikon: Trash2,
                    tehlike: true,
                    onSecim: () => sil([k.id]),
                  },
                ]}
              >
                <TableRow
                  data-state={secili.has(k.id) ? "selected" : undefined}
                  className="cursor-pointer"
                  onClick={() => {
                    setDuzenlenen(k);
                    setSheetOpen(true);
                  }}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={secili.has(k.id)}
                      onCheckedChange={(v) => secimDegis(k.id, v === true)}
                      aria-label={`${k.adSoyad} seç`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{k.adSoyad}</TableCell>
                  {kolon.temelGorunur("email") && (
                    <TableCell className="text-muted-foreground">
                      {k.email ?? "—"}
                    </TableCell>
                  )}
                  {kolon.temelGorunur("telefon") && (
                    <TableCell className="text-muted-foreground tabular-nums">
                      {k.telefon ?? "—"}
                    </TableCell>
                  )}
                  {kolon.temelGorunur("departman") && (
                    <TableCell>
                      {k.departman ? (
                        <Badge variant="secondary">{k.departman}</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  )}
                  {kolon.temelGorunur("rol") && (
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={cn(
                          ROL_RENK[k.rol] ?? "bg-slate-100 text-slate-700",
                        )}
                      >
                        {k.rol}
                      </Badge>
                    </TableCell>
                  )}
                  {kolon.temelGorunur("durum") && (
                    <TableCell>
                      <Badge
                        variant={k.durum === "Aktif" ? "default" : "secondary"}
                      >
                        {k.durum}
                      </Badge>
                    </TableCell>
                  )}
                </TableRow>
              </SatirMenu>
            ))}
            {sayfalik.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={1 + kolon.gorunurTemelSayisi}
                  className="h-24 text-center text-muted-foreground"
                >
                  Kullanıcı bulunamadı.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {filtreli.length} kullanıcı
          {secili.size > 0 ? ` · ${secili.size} seçili` : ""}
        </span>
        <SayfalamaKontrol sayfalama={sayfalama} />
      </div>

      <KullaniciSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        item={duzenlenen}
        departmanlar={departmanlar}
        onDepartmanEkle={departmanEkle}
        roller={roller}
        onRolEkle={rolEkle}
        onSave={kaydet}
      />

      {/* Sütun ayarları sheet'i — proje standardı */}
      <KolonAyarSheet kolon={kolon} kullanicilar={kisiSecenekleri} />
      {onayDialog}
    </div>
  );
}

type SheetHatalar = {
  adSoyad?: string;
  sifre?: string;
};

/** 8 karakter: hece-hece okunur, klavyede yazması kolay ama tahmin etmesi zor.
 *  Karışan karakterler yok (l/I/1, o/O/0). Örn: "Kemuta47" */
function sifreUret(): string {
  const sessiz = "bcdfghjkmnprstvyz";
  const sesli = "aeu";
  const sec = (s: string) => s[Math.floor(Math.random() * s.length)];
  const hece = () => sec(sessiz) + sec(sesli);
  const govde = hece() + hece() + hece(); // 6 harf
  const rakam = String(Math.floor(Math.random() * 90) + 10); // 2 rakam (10-99)
  return govde[0].toUpperCase() + govde.slice(1) + rakam;
}

function KullaniciSheet({
  open,
  onOpenChange,
  item,
  departmanlar,
  onDepartmanEkle,
  roller,
  onRolEkle,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  item: KullaniciGorunum | null;
  departmanlar: string[];
  onDepartmanEkle: (d: string) => void;
  roller: string[];
  onRolEkle: (r: string) => void;
  onSave: (k: KullaniciKayit) => Promise<boolean>;
}) {
  const [form, setForm] = React.useState({
    adSoyad: "",
    email: "",
    telefon: "",
    departman: "",
    rol: "Kullanıcı" as string,
    sifre: "",
    durum: "Aktif" as "Aktif" | "Pasif",
    eskiTarihliIslem: false,
  });
  const [hatalar, setHatalar] = React.useState<SheetHatalar>({});
  const [shakeNonce, setShakeNonce] = React.useState(0);
  const [sifreGoster, setSifreGoster] = React.useState(false);
  // Sheet üstü "yeni ekle" modalı: rol veya departman için ortak.
  const [yeniMod, setYeniMod] = React.useState<"rol" | "departman" | null>(
    null,
  );
  const [yeniAd, setYeniAd] = React.useState("");
  const revertTimer = React.useRef<ReturnType<typeof setTimeout>>(undefined);
  const durumRef = React.useRef<AnimatedIconHandle>(null);
  const eskiTarihRef = React.useRef<AnimatedIconHandle>(null);

  React.useEffect(() => {
    if (!open) {
      setYeniMod(null);
      setYeniAd("");
      return;
    }
    setHatalar({});
    setSifreGoster(false);
    if (item) {
      setForm({
        adSoyad: item.adSoyad,
        email: item.email ?? "",
        telefon: item.telefon ?? "",
        departman: item.departman ?? "",
        rol: item.rol,
        sifre: "",
        durum: item.durum,
        eskiTarihliIslem: item.eskiTarihliIslem,
      });
    } else {
      setForm({
        adSoyad: "",
        email: "",
        telefon: "",
        departman: "",
        rol: "Kullanıcı",
        sifre: "",
        durum: "Aktif",
        eskiTarihliIslem: false,
      });
    }
  }, [open, item]);

  function yeniKaydet() {
    const ad = yeniAd.trim();
    if (!ad || !yeniMod) return;
    if (yeniMod === "rol") {
      onRolEkle(ad);
      setForm((f) => ({ ...f, rol: ad })); // eklenen otomatik seçilir
    } else {
      onDepartmanEkle(ad);
      setForm((f) => ({ ...f, departman: ad }));
    }
    setYeniAd("");
    setYeniMod(null);
  }

  function sifreDoldur() {
    const s = sifreUret();
    setForm((f) => ({ ...f, sifre: s }));
    setSifreGoster(true);
  }

  async function kaydet() {
    const yeni: SheetHatalar = {};
    if (!form.adSoyad.trim()) yeni.adSoyad = "Ad soyad zorunludur.";
    if (!item?.id && !form.sifre) yeni.sifre = "Şifre zorunludur.";
    if (form.sifre && form.sifre.length < 6)
      yeni.sifre = "Şifre en az 6 karakter olmalı.";

    setHatalar(yeni);
    if (Object.keys(yeni).length > 0) {
      setShakeNonce((n) => n + 1);
      clearTimeout(revertTimer.current);
      revertTimer.current = setTimeout(() => setHatalar({}), 3000);
      return;
    }

    const ok = await onSave({
      id: item?.id || undefined,
      adSoyad: form.adSoyad,
      email: form.email.trim() || undefined,
      telefon: form.telefon.trim() || undefined,
      departman: form.departman || undefined,
      rol: form.rol,
      durum: form.durum,
      eskiTarihliIslem: form.eskiTarihliIslem,
      sifre: form.sifre || undefined,
    });
    if (ok) onOpenChange(false);
  }

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={item?.id ? "Kullanıcıyı Düzenle" : "Yeni Kullanıcı"}
      icon={UsersRoundIcon}
      onSave={kaydet}
    >
      {/* Departman modalı açıkken sheet'i karart (dialog backdrop'ı sheet'in
          altında kalıyor; overlay'i sheet'in kendi içine koyuyoruz). */}
      {yeniMod && (
        <div
          className="absolute inset-0 z-40 bg-black/15 backdrop-blur-xs duration-100 animate-in fade-in-0"
          onClick={() => setYeniMod(null)}
        />
      )}
      <div className="grid gap-2.5">
        <ErrorShakeField error={hatalar.adSoyad} shakeNonce={shakeNonce}>
          <IconInput
            label="Ad Soyad"
            icon={UsersRoundIcon}
            placeholder="Örn. Ahmet Yılmaz"
            value={form.adSoyad}
            onChange={(e) =>
              setForm((f) => ({ ...f, adSoyad: e.target.value }))
            }
          />
        </ErrorShakeField>
        <IconInput
          label="E-posta"
          icon={SendIcon}
          type="email"
          placeholder="ornek@mail.com"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
        />
        <IconInput
          label="Telefon"
          icon={PhoneIcon}
          type="tel"
          placeholder="0500 000 00 00"
          value={form.telefon}
          onChange={(e) => setForm((f) => ({ ...f, telefon: e.target.value }))}
        />
        <div className="grid grid-cols-2 gap-2.5">
          <AnimatedField label="Rol" icon={ShieldCheckIcon}>
            <SearchSelect
              items={roller}
              value={form.rol}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, rol: v ?? "Kullanıcı" }))
              }
              placeholder="Rol"
              addLabel="Yeni ekle"
              onAdd={() => {
                setYeniAd("");
                setYeniMod("rol");
              }}
            />
          </AnimatedField>
          <AnimatedField label="Departman" icon={FolderTreeIcon}>
            <SearchSelect
              items={departmanlar}
              value={form.departman || null}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, departman: v ?? "" }))
              }
              placeholder="Departman"
              addLabel="Yeni ekle"
              onAdd={() => {
                setYeniAd("");
                setYeniMod("departman");
              }}
            />
          </AnimatedField>
        </div>
        <ErrorShakeField error={hatalar.sifre} shakeNonce={shakeNonce}>
          <div className="relative">
            <IconInput
              label={item?.id ? "Yeni Şifre" : "Şifre"}
              icon={ScanTextIcon}
              type={sifreGoster ? "text" : "password"}
              placeholder={item?.id ? "(değiştirmek için doldur)" : "••••••"}
              autoComplete="new-password"
              className="pr-10"
              value={form.sifre}
              onChange={(e) =>
                setForm((f) => ({ ...f, sifre: e.target.value }))
              }
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Şifre oluştur"
              title="Şifre oluştur"
              className="absolute right-1 bottom-1 text-muted-foreground hover:text-foreground"
              onClick={sifreDoldur}
            >
              <Wand2 className="size-4" />
            </Button>
          </div>
        </ErrorShakeField>
        <div
          role="button"
          tabIndex={0}
          onClick={() =>
            setForm((f) => ({
              ...f,
              durum: f.durum === "Aktif" ? "Pasif" : "Aktif",
            }))
          }
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setForm((f) => ({
                ...f,
                durum: f.durum === "Aktif" ? "Pasif" : "Aktif",
              }));
            }
          }}
          onMouseEnter={() => durumRef.current?.startAnimation()}
          onMouseLeave={() => durumRef.current?.stopAnimation()}
          className="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-input px-3 py-2.5 transition-colors outline-none select-none hover:bg-muted/40 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30"
        >
          <span className="flex items-center gap-1.5 text-sm font-medium">
            <CircleCheckIcon
              ref={durumRef}
              size={15}
              className="text-muted-foreground"
            />
            Durum
          </span>
          <span className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{form.durum}</span>
            <Switch
              checked={form.durum === "Aktif"}
              className="pointer-events-none data-checked:bg-emerald-600"
            />
          </span>
        </div>
        <div
          role="button"
          tabIndex={0}
          onClick={() =>
            setForm((f) => ({ ...f, eskiTarihliIslem: !f.eskiTarihliIslem }))
          }
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setForm((f) => ({
                ...f,
                eskiTarihliIslem: !f.eskiTarihliIslem,
              }));
            }
          }}
          onMouseEnter={() => eskiTarihRef.current?.startAnimation()}
          onMouseLeave={() => eskiTarihRef.current?.stopAnimation()}
          className="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-input px-3 py-2.5 transition-colors outline-none select-none hover:bg-muted/40 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30"
        >
          <span className="flex items-center gap-1.5 text-sm font-medium">
            <HistoryIcon
              ref={eskiTarihRef}
              size={15}
              className="text-muted-foreground"
            />
            Eski Tarihli İşlem
          </span>
          <span className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {form.eskiTarihliIslem ? "İzinli" : "Kapalı"}
            </span>
            <Switch
              checked={form.eskiTarihliIslem}
              className="pointer-events-none data-checked:bg-emerald-600"
            />
          </span>
        </div>
      </div>

      <Dialog
        open={yeniMod !== null}
        onOpenChange={(v) => !v && setYeniMod(null)}
      >
        {/* Sheet'in (sağda, ~24rem) yatay ortasına hizala: 8px kenar + (384-320)/2 */}
        <DialogContent className="sm:left-auto sm:right-10 sm:max-w-xs sm:translate-x-0">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-1.5">
              {yeniMod === "rol" ? (
                <ShieldCheckIcon size={16} className="text-muted-foreground" />
              ) : (
                <FolderTreeIcon size={16} className="text-muted-foreground" />
              )}
              {yeniMod === "rol" ? "Yeni Rol" : "Yeni Departman"}
            </DialogTitle>
            <DialogDescription>
              {yeniMod === "rol" ? "Rol" : "Departman"} ekleyin; eklenince
              otomatik seçilir.
            </DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            placeholder={
              yeniMod === "rol" ? "Örn. Depo Sorumlusu" : "Örn. Satın Alma"
            }
            value={yeniAd}
            onChange={(e) => setYeniAd(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                yeniKaydet();
              }
            }}
          />
          <DialogFooter className="p-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setYeniMod(null)}
            >
              İptal
            </Button>
            <Button size="sm" onClick={yeniKaydet} disabled={!yeniAd.trim()}>
              <Check className="size-3.5" /> Ekle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FormSheet>
  );
}
