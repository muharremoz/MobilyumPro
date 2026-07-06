"use client";

import * as React from "react";
import Link from "next/link";
import {
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  ArrowUpNarrowWide,
  ArrowDownWideNarrow,
  Check,
  Wand2,
  Copy,
  CopyPlus,
  Power,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { KullaniciGorunum } from "@/lib/db/queries";
import {
  kullaniciKaydet,
  kullaniciSil,
  rolEkle as rolEkleAction,
  departmanEkle as departmanEkleAction,
  type KullaniciKayit,
} from "@/lib/db/actions";

const ROL_RENK: Record<string, string> = {
  Yönetici: "bg-violet-100 text-violet-800",
  Kullanıcı: "bg-blue-100 text-blue-800",
  Görüntüleyici: "bg-slate-100 text-slate-700",
};
const SAYFA_BOYUT = 8;
type SortKey = "adSoyad" | "email" | "telefon" | "departman" | "rol" | "durum";
type MetinKolon = "adSoyad" | "email" | "telefon";

export function KullanicilarTable({
  kullanicilar,
  roller: rollerProp,
  departmanlar: departmanlarProp,
}: {
  kullanicilar: KullaniciGorunum[];
  roller: string[];
  departmanlar: string[];
}) {
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
  const [sayfa, setSayfa] = React.useState(1);
  const [secili, setSecili] = React.useState<Set<string>>(new Set());
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [duzenlenen, setDuzenlenen] = React.useState<KullaniciGorunum | null>(
    null,
  );
  // Roller/departmanlar DB'den gelir; "yeni ekle" DB'ye yazar + local günceller.
  const [departmanlar, setDepartmanlar] = React.useState<string[]>(departmanlarProp);
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

  React.useEffect(() => setSayfa(1), [metinFiltre, rol, departman, durum]);

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

  const toplamSayfa = Math.max(1, Math.ceil(filtreli.length / SAYFA_BOYUT));
  const aktifSayfa = Math.min(sayfa, toplamSayfa);
  const sayfalik = filtreli.slice(
    (aktifSayfa - 1) * SAYFA_BOYUT,
    aktifSayfa * SAYFA_BOYUT,
  );
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
      toast.error(res.error ?? "Silinemedi.");
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
    const yeniDurum = k.durum === "Aktif" ? ("Pasif" as const) : ("Aktif" as const);
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

  const sortIkon = (k: SortKey) =>
    sort.key !== k ? (
      <ChevronsUpDown className="size-3.5 text-muted-foreground/50" />
    ) : sort.dir === "asc" ? (
      <ChevronUp className="size-3.5" />
    ) : (
      <ChevronDown className="size-3.5" />
    );

  const kolonFiltreAktif = (k: SortKey) => {
    if (k === "rol") return rol !== "Tümü";
    if (k === "departman") return departman !== "Tümü";
    if (k === "durum") return durum !== "Tümü";
    return metinFiltre[k as MetinKolon] !== "";
  };
  const kolonFiltreTemizle = (k: SortKey) => {
    if (k === "rol") setRol("Tümü");
    else if (k === "departman") setDepartman("Tümü");
    else if (k === "durum") setDurum("Tümü");
    else setMetinFiltre((f) => ({ ...f, [k]: "" }));
  };

  const ogeCls = (seciliMi: boolean) =>
    cn(
      "flex w-full cursor-pointer items-center gap-2 rounded-[5px] px-1.5 py-1 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
      seciliMi && "bg-accent/60 font-medium",
    );

  const SortBaslik = ({
    k,
    children,
    className,
  }: {
    k: SortKey;
    children: React.ReactNode;
    className?: string;
  }) => {
    const aktif = kolonFiltreAktif(k);
    return (
      <TableHead className={className}>
        <Popover>
          <PopoverTrigger
            render={
              <button
                type="button"
                className="inline-flex cursor-pointer items-center gap-1 hover:text-foreground"
              >
                {children}
                {sortIkon(k)}
                {aktif && (
                  <span className="ml-0.5 size-1.5 shrink-0 rounded-full bg-primary" />
                )}
              </button>
            }
          />
          <PopoverContent align="start" className="w-56 gap-0 p-1.5 text-left">
            {/* Sıralama */}
            <p className="px-1.5 pt-0.5 pb-1 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
              Sırala
            </p>
            <div className="grid grid-cols-2 gap-1">
              <button
                type="button"
                className={cn(
                  ogeCls(sort.key === k && sort.dir === "asc"),
                  "justify-center",
                )}
                onClick={() => setSort({ key: k, dir: "asc" })}
              >
                <ArrowUpNarrowWide className="size-4" /> Artan
              </button>
              <button
                type="button"
                className={cn(
                  ogeCls(sort.key === k && sort.dir === "desc"),
                  "justify-center",
                )}
                onClick={() => setSort({ key: k, dir: "desc" })}
              >
                <ArrowDownWideNarrow className="size-4" /> Azalan
              </button>
            </div>

            <div className="my-1.5 h-px bg-border" />
            <p className="px-1.5 pb-1 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
              Filtre
            </p>

            {(k === "rol" || k === "departman" || k === "durum") && (
              <div className="grid max-h-56 gap-0.5 overflow-auto">
                {(k === "rol"
                  ? ["Tümü", ...roller]
                  : k === "departman"
                    ? ["Tümü", ...departmanlar]
                    : ["Tümü", "Aktif", "Pasif"]
                ).map((v) => {
                  const seciliDeger =
                    k === "rol" ? rol : k === "departman" ? departman : durum;
                  return (
                    <button
                      key={v}
                      type="button"
                      className={ogeCls(seciliDeger === v)}
                      onClick={() =>
                        k === "rol"
                          ? setRol(v)
                          : k === "departman"
                            ? setDepartman(v)
                            : setDurum(v)
                      }
                    >
                      {v}
                      {seciliDeger === v && <Check className="ml-auto size-4" />}
                    </button>
                  );
                })}
              </div>
            )}

            {(k === "adSoyad" || k === "email" || k === "telefon") && (
              <Input
                autoFocus
                placeholder="İçeren metin..."
                value={metinFiltre[k]}
                onChange={(e) =>
                  setMetinFiltre((f) => ({ ...f, [k]: e.target.value }))
                }
                className="h-8"
              />
            )}

            {aktif && (
              <>
                <div className="my-1.5 h-px bg-border" />
                <button
                  type="button"
                  className="flex w-full cursor-pointer items-center gap-2 rounded-[5px] px-1.5 py-1 text-left text-sm text-rose-600 transition-colors hover:bg-rose-50"
                  onClick={() => kolonFiltreTemizle(k)}
                >
                  <Trash2 className="size-3.5" /> Filtreyi temizle
                </button>
              </>
            )}
          </PopoverContent>
        </Popover>
      </TableHead>
    );
  };

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
          <Button variant="ghost" size="sm" onClick={() => setSecili(new Set())}>
            Temizle
          </Button>
        </div>
      )}

      <div className="overflow-hidden rounded-md border bg-card">
        {/* Liste başlığı */}
        <div className="flex items-center justify-between gap-3 border-b px-3 py-1.5">
          <h2 className="text-sm font-semibold">Kullanıcılar</h2>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href="/kullanicilar/yetkiler" />}
            >
              Yetkilendirmeler
            </Button>
            <Button
              onClick={() => {
                setDuzenlenen(null);
                setSheetOpen(true);
              }}
            >
              Yeni Kullanıcı
            </Button>
          </div>
        </div>

        <Table className="[&_td]:h-12 [&_td]:px-3 [&_td]:text-sm [&_th]:h-10 [&_th]:px-3">
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
              <SortBaslik k="adSoyad">Ad Soyad</SortBaslik>
              <SortBaslik k="email">E-posta</SortBaslik>
              <SortBaslik k="telefon">Telefon</SortBaslik>
              <SortBaslik k="departman">Departman</SortBaslik>
              <SortBaslik k="rol">Rol</SortBaslik>
              <SortBaslik k="durum">Durum</SortBaslik>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sayfalik.map((k) => (
              <ContextMenu key={k.id}>
                <ContextMenuTrigger
                  render={
                    <TableRow
                      data-state={secili.has(k.id) ? "selected" : undefined}
                      className="cursor-pointer"
                      onClick={() => {
                        setDuzenlenen(k);
                        setSheetOpen(true);
                      }}
                    />
                  }
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={secili.has(k.id)}
                      onCheckedChange={(v) => secimDegis(k.id, v === true)}
                      aria-label={`${k.adSoyad} seç`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{k.adSoyad}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {k.email ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">
                    {k.telefon ?? "—"}
                  </TableCell>
                  <TableCell>
                    {k.departman ? (
                      <Badge variant="secondary">{k.departman}</Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
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
                  <TableCell>
                    <Badge
                      variant={k.durum === "Aktif" ? "default" : "secondary"}
                    >
                      {k.durum}
                    </Badge>
                  </TableCell>
                </ContextMenuTrigger>
                <ContextMenuContent className="w-52">
                  <ContextMenuItem
                    onClick={() => {
                      setDuzenlenen(k);
                      setSheetOpen(true);
                    }}
                  >
                    <Pencil className="mr-2 size-4" /> Düzenle
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => kopyala(k)}>
                    <CopyPlus className="mr-2 size-4" /> Kopyala
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => durumDegistir(k)}>
                    <Power className="mr-2 size-4" />
                    {k.durum === "Aktif" ? "Pasif Yap" : "Aktif Yap"}
                  </ContextMenuItem>
                  <ContextMenuItem
                    onClick={() => panoyaKopyala(k.kullaniciAdi, "Kullanıcı adı")}
                  >
                    <Copy className="mr-2 size-4" /> Kullanıcı Adını Kopyala
                  </ContextMenuItem>
                  {k.email && (
                    <ContextMenuItem
                      onClick={() => panoyaKopyala(k.email!, "E-posta")}
                    >
                      <Copy className="mr-2 size-4" /> E-postayı Kopyala
                    </ContextMenuItem>
                  )}
                  <ContextMenuItem
                    variant="destructive"
                    onClick={() => sil([k.id])}
                  >
                    <Trash2 className="mr-2 size-4" /> Sil
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            ))}
            {sayfalik.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
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
        <div className="flex items-center gap-2">
          <span>
            Sayfa {aktifSayfa} / {toplamSayfa}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            disabled={aktifSayfa <= 1}
            onClick={() => setSayfa((p) => Math.max(1, p - 1))}
            aria-label="Önceki"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            disabled={aktifSayfa >= toplamSayfa}
            onClick={() => setSayfa((p) => Math.min(toplamSayfa, p + 1))}
            aria-label="Sonraki"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
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
  });
  const [hatalar, setHatalar] = React.useState<SheetHatalar>({});
  const [shakeNonce, setShakeNonce] = React.useState(0);
  const [sifreGoster, setSifreGoster] = React.useState(false);
  // Sheet üstü "yeni ekle" modalı: rol veya departman için ortak.
  const [yeniMod, setYeniMod] = React.useState<"rol" | "departman" | null>(null);
  const [yeniAd, setYeniAd] = React.useState("");
  const revertTimer = React.useRef<ReturnType<typeof setTimeout>>(undefined);
  const durumRef = React.useRef<AnimatedIconHandle>(null);

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
            onChange={(e) => setForm((f) => ({ ...f, adSoyad: e.target.value }))}
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
              onValueChange={(v) => setForm((f) => ({ ...f, departman: v ?? "" }))}
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
              onChange={(e) => setForm((f) => ({ ...f, sifre: e.target.value }))}
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
      </div>

      <Dialog open={yeniMod !== null} onOpenChange={(v) => !v && setYeniMod(null)}>
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
            placeholder={yeniMod === "rol" ? "Örn. Depo Sorumlusu" : "Örn. Satın Alma"}
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
            <Button size="sm" variant="outline" onClick={() => setYeniMod(null)}>
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
