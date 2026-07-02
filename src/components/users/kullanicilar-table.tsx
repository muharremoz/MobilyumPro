"use client";

import * as React from "react";
import {
  Search,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { SearchSelect } from "@/components/ui/search-select";
import { FormSheet } from "@/components/ui/form-sheet";
import { ErrorShakeField } from "@/components/ui/error-shake";
import { IconInput, type AnimatedIconHandle } from "@/components/ui/icon-input";
import { AnimatedField } from "@/components/ui/animated-field";
import { UsersIcon } from "@/components/ui/icons/users";
import { UsersRoundIcon } from "@/components/ui/icons/users-round";
import { SendIcon } from "@/components/ui/icons/send";
import { ShieldCheckIcon } from "@/components/ui/icons/shield-check";
import { ScanTextIcon } from "@/components/ui/icons/scan-text";
import { CircleCheckIcon } from "@/components/ui/icons/circle-check";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  type KullaniciKayit,
} from "@/lib/db/actions";

export const ROLLER = ["Yönetici", "Kullanıcı", "Görüntüleyici"] as const;

const ROL_RENK: Record<string, string> = {
  Yönetici: "bg-violet-100 text-violet-800",
  Kullanıcı: "bg-blue-100 text-blue-800",
  Görüntüleyici: "bg-slate-100 text-slate-700",
};
const SAYFA_BOYUT = 8;
type SortKey = "id" | "adSoyad" | "kullaniciAdi" | "rol" | "durum" | "olusturma";

export function KullanicilarTable({
  kullanicilar,
}: {
  kullanicilar: KullaniciGorunum[];
}) {
  const [liste, setListe] = React.useState<KullaniciGorunum[]>(kullanicilar);
  const [arama, setArama] = React.useState("");
  const [rol, setRol] = React.useState("Tümü");
  const [durum, setDurum] = React.useState("Tümü");
  const [sort, setSort] = React.useState<{ key: SortKey; dir: "asc" | "desc" }>(
    { key: "id", dir: "asc" },
  );
  const [sayfa, setSayfa] = React.useState(1);
  const [secili, setSecili] = React.useState<Set<string>>(new Set());
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [duzenlenen, setDuzenlenen] = React.useState<KullaniciGorunum | null>(
    null,
  );

  React.useEffect(() => setSayfa(1), [arama, rol, durum]);

  const filtreli = React.useMemo(() => {
    const q = arama.toLowerCase();
    const arr = liste.filter((k) => {
      const ara =
        k.adSoyad.toLowerCase().includes(q) ||
        k.kullaniciAdi.toLowerCase().includes(q) ||
        (k.email ?? "").toLowerCase().includes(q) ||
        k.id.toLowerCase().includes(q);
      const r = rol === "Tümü" || k.rol === rol;
      const d = durum === "Tümü" || k.durum === durum;
      return ara && r && d;
    });
    const yon = sort.dir === "asc" ? 1 : -1;
    return [...arr].sort((a, b) =>
      String(a[sort.key]).localeCompare(String(b[sort.key]), "tr") * yon,
    );
  }, [liste, arama, rol, durum, sort]);

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

  function sortla(k: SortKey) {
    setSort((s) =>
      s.key === k
        ? { key: k, dir: s.dir === "asc" ? "desc" : "asc" }
        : { key: k, dir: "asc" },
    );
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
      kullaniciAdi: kayit.kullaniciAdi.trim(),
      adSoyad: kayit.adSoyad.trim(),
      email: kayit.email?.trim() || undefined,
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

  const sortIkon = (k: SortKey) =>
    sort.key !== k ? (
      <ChevronsUpDown className="size-3.5 text-muted-foreground/50" />
    ) : sort.dir === "asc" ? (
      <ChevronUp className="size-3.5" />
    ) : (
      <ChevronDown className="size-3.5" />
    );
  const SortBaslik = ({
    k,
    children,
    className,
  }: {
    k: SortKey;
    children: React.ReactNode;
    className?: string;
  }) => (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => sortla(k)}
        className="inline-flex cursor-pointer items-center gap-1 hover:text-foreground"
      >
        {children}
        {sortIkon(k)}
      </button>
    </TableHead>
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Araç çubuğu */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Ad, kullanıcı adı veya e-posta ara..."
            value={arama}
            onChange={(e) => setArama(e.target.value)}
            className="h-9 pl-9"
          />
        </div>
        <div className="w-40">
          <SearchSelect
            items={["Tümü", ...ROLLER]}
            value={rol}
            onValueChange={(v) => setRol(v ?? "Tümü")}
            placeholder="Rol"
          />
        </div>
        <div className="w-36">
          <SearchSelect
            items={["Tümü", "Aktif", "Pasif"]}
            value={durum}
            onValueChange={(v) => setDurum(v ?? "Tümü")}
            placeholder="Durum"
          />
        </div>
        <Button
          className="ml-auto"
          onClick={() => {
            setDuzenlenen(null);
            setSheetOpen(true);
          }}
        >
          <Plus className="size-4" /> Yeni Kullanıcı
        </Button>
      </div>

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
              <SortBaslik k="id">Kod</SortBaslik>
              <SortBaslik k="adSoyad">Ad Soyad</SortBaslik>
              <SortBaslik k="kullaniciAdi">Kullanıcı Adı</SortBaslik>
              <TableHead>E-posta</TableHead>
              <SortBaslik k="rol">Rol</SortBaslik>
              <SortBaslik k="durum">Durum</SortBaslik>
              <SortBaslik k="olusturma">Oluşturma</SortBaslik>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sayfalik.map((k) => (
              <TableRow
                key={k.id}
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
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {k.id}
                </TableCell>
                <TableCell className="font-medium">{k.adSoyad}</TableCell>
                <TableCell className="text-muted-foreground">
                  {k.kullaniciAdi}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {k.email ?? "—"}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className={cn(ROL_RENK[k.rol] ?? "bg-slate-100 text-slate-700")}
                  >
                    {k.rol}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={k.durum === "Aktif" ? "default" : "secondary"}>
                    {k.durum}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground tabular-nums">
                  {k.olusturma}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button variant="ghost" size="icon-sm" aria-label="İşlemler">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      }
                    />
                    <DropdownMenuContent align="end" className="w-36">
                      <DropdownMenuItem
                        onClick={() => {
                          setDuzenlenen(k);
                          setSheetOpen(true);
                        }}
                      >
                        <Pencil className="mr-2 size-4" /> Düzenle
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => sil([k.id])}
                      >
                        <Trash2 className="mr-2 size-4" /> Sil
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {sayfalik.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={9}
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
        onSave={kaydet}
      />
    </div>
  );
}

type SheetHatalar = {
  adSoyad?: string;
  kullaniciAdi?: string;
  sifre?: string;
  sifreTekrar?: string;
};

function KullaniciSheet({
  open,
  onOpenChange,
  item,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  item: KullaniciGorunum | null;
  onSave: (k: KullaniciKayit) => Promise<boolean>;
}) {
  const [form, setForm] = React.useState({
    adSoyad: "",
    kullaniciAdi: "",
    email: "",
    rol: "Kullanıcı" as string,
    sifre: "",
    sifreTekrar: "",
    durum: "Aktif" as "Aktif" | "Pasif",
  });
  const [hatalar, setHatalar] = React.useState<SheetHatalar>({});
  const [shakeNonce, setShakeNonce] = React.useState(0);
  const revertTimer = React.useRef<ReturnType<typeof setTimeout>>(undefined);
  const durumRef = React.useRef<AnimatedIconHandle>(null);

  React.useEffect(() => {
    if (!open) return;
    setHatalar({});
    if (item) {
      setForm({
        adSoyad: item.adSoyad,
        kullaniciAdi: item.kullaniciAdi,
        email: item.email ?? "",
        rol: item.rol,
        sifre: "",
        sifreTekrar: "",
        durum: item.durum,
      });
    } else {
      setForm({
        adSoyad: "",
        kullaniciAdi: "",
        email: "",
        rol: "Kullanıcı",
        sifre: "",
        sifreTekrar: "",
        durum: "Aktif",
      });
    }
  }, [open, item]);

  async function kaydet() {
    const yeni: SheetHatalar = {};
    if (!form.adSoyad.trim()) yeni.adSoyad = "Ad soyad zorunludur.";
    if (!form.kullaniciAdi.trim())
      yeni.kullaniciAdi = "Kullanıcı adı zorunludur.";
    if (!item && !form.sifre) yeni.sifre = "Şifre zorunludur.";
    if (form.sifre && form.sifre.length < 6)
      yeni.sifre = "Şifre en az 6 karakter olmalı.";
    if (form.sifre && form.sifre !== form.sifreTekrar)
      yeni.sifreTekrar = "Şifreler eşleşmiyor.";

    setHatalar(yeni);
    if (Object.keys(yeni).length > 0) {
      setShakeNonce((n) => n + 1);
      clearTimeout(revertTimer.current);
      revertTimer.current = setTimeout(() => setHatalar({}), 3000);
      return;
    }

    const ok = await onSave({
      id: item?.id,
      adSoyad: form.adSoyad,
      kullaniciAdi: form.kullaniciAdi,
      email: form.email.trim() || undefined,
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
      title={item ? "Kullanıcıyı Düzenle" : "Yeni Kullanıcı"}
      icon={UsersRoundIcon}
      onSave={kaydet}
    >
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
        <ErrorShakeField error={hatalar.kullaniciAdi} shakeNonce={shakeNonce}>
          <IconInput
            label="Kullanıcı Adı"
            icon={UsersIcon}
            placeholder="örn. ahmet"
            autoComplete="off"
            value={form.kullaniciAdi}
            onChange={(e) =>
              setForm((f) => ({ ...f, kullaniciAdi: e.target.value }))
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
        <AnimatedField label="Rol" icon={ShieldCheckIcon}>
          <SearchSelect
            items={[...ROLLER]}
            value={form.rol}
            onValueChange={(v) => setForm((f) => ({ ...f, rol: v ?? "Kullanıcı" }))}
            placeholder="Rol"
          />
        </AnimatedField>
        <div className="grid grid-cols-2 gap-2.5">
          <ErrorShakeField error={hatalar.sifre} shakeNonce={shakeNonce}>
            <IconInput
              label={item ? "Yeni Şifre" : "Şifre"}
              icon={ScanTextIcon}
              type="password"
              placeholder={item ? "(değiştirmek için doldur)" : "••••••"}
              autoComplete="new-password"
              value={form.sifre}
              onChange={(e) => setForm((f) => ({ ...f, sifre: e.target.value }))}
            />
          </ErrorShakeField>
          <ErrorShakeField error={hatalar.sifreTekrar} shakeNonce={shakeNonce}>
            <IconInput
              label="Şifre (Tekrar)"
              icon={ScanTextIcon}
              type="password"
              placeholder="••••••"
              autoComplete="new-password"
              value={form.sifreTekrar}
              onChange={(e) =>
                setForm((f) => ({ ...f, sifreTekrar: e.target.value }))
              }
            />
          </ErrorShakeField>
        </div>
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
          className="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-input px-3 py-2.5 transition-colors outline-none hover:bg-muted/40 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30"
        >
          <span className="flex items-center gap-1.5 text-sm font-medium">
            <CircleCheckIcon
              ref={durumRef}
              size={15}
              className="text-muted-foreground"
            />
            Durum
          </span>
          <Badge variant={form.durum === "Aktif" ? "default" : "secondary"}>
            {form.durum}
          </Badge>
        </div>
      </div>
    </FormSheet>
  );
}
