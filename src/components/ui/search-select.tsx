"use client";

import * as React from "react";
import { Copy, Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";

/** Dropdown üstünde sekme — her sekmenin kendi öğe listesi vardır. */
export interface SearchSelectSekme {
  key: string;
  label: string;
  items: string[];
}

export interface SearchSelectProps {
  items?: string[];
  value?: string | null;
  onValueChange?: (value: string | null) => void;
  placeholder?: string;
  /** @deprecated Arama artık kontrolün kendisinde; geriye uyumluluk için tutuluyor. */
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
  /**
   * Seçimi kaldırma (×) düğmesi. Opsiyonel alanlarda ŞART: yoksa kullanıcı
   * bir kez seçtikten sonra "boş"a geri dönemez.
   */
  temizlenebilir?: boolean;
  /**
   * Açılan listeye sınıf. Liste genişliğini en uzun öğe belirler; dar bir
   * kapsayıcıda (sheet vb.) taşmasın diye buradan sınırlandırılır.
   */
  listeClassName?: string;
  /** Dropdown altına "yeni ekle" butonu koyar; tıklanınca çağrılır. */
  addLabel?: string;
  onAdd?: () => void;
  /**
   * Verilirse her satırın sağında kopya düğmesi çıkar; tıklanınca o öğenin
   * DEĞERİ ile çağrılır (gösterim değil — çağıran tarafın eşleştirmesi için).
   * Seçim yapılmaz, popup kapanır.
   */
  onKopyala?: (item: string) => void;
  kopyaBaslik?: string;
  /**
   * Verilirse dropdown üstünde sekmeler gösterilir; aktif sekmenin öğeleri
   * listelenir. Öğe değerleri korunur, gösterimde "Etiket · " öneki atılır.
   */
  sekmeler?: SearchSelectSekme[];
}

/**
 * Aranabilir tek seçim — Vercel tarzı: kontrolün kendisi input, yazınca
 * liste süzülür (dropdown içinde ayrı arama kutusu yok).
 */
export function SearchSelect({
  items = [],
  value,
  onValueChange,
  placeholder = "Seçin",
  emptyText = "Sonuç bulunamadı",
  className,
  temizlenebilir,
  listeClassName,
  addLabel,
  onAdd,
  onKopyala,
  kopyaBaslik = "Kopyasını oluştur",
  sekmeler,
}: SearchSelectProps) {
  // "Yeni ekle" tıklanınca popup'ı kapatabilmek için open kontrollü.
  const [acik, setAcik] = React.useState(false);
  // Sekmeli modda aktif sekme.
  const [aktifSekme, setAktifSekme] = React.useState(
    () => sekmeler?.[0]?.key ?? "",
  );
  // Popup, içteki input'a değil görünür kontrolün tamamına hizalansın.
  const anchorRef = React.useRef<HTMLDivElement>(null);
  // Arama metni: grup sütununu süzmek için gerekiyor. Base UI öğeleri kendi
  // filtreliyor ama sekme listesi bizde, sorguyu bilmezse eşleşmesi olmayan
  // gruplar da listede kalırdı.
  const [sorgu, setSorgu] = React.useState("");
  const listeRef = React.useRef<HTMLDivElement>(null);
  // Yinelenen öğeler tekilleştirilir (aynı key hatası + kaybolan öğe önlenir).
  // Aktif kaynak (sekmeli modda seçili sekmenin öğeleri) memo'nun İÇİNDE
  // hesaplanır: dışarıda "?? []" her render'da yeni dizi üretip memo'yu
  // işlevsiz bırakıyordu.
  const benzersiz = React.useMemo(() => {
    const kaynak = sekmeler
      ? ((sekmeler.find((s) => s.key === aktifSekme) ?? sekmeler[0])?.items ??
        [])
      : items;
    return Array.from(new Set(kaynak));
  }, [sekmeler, aktifSekme, items]);
  // Aramada yalnız eşleşmesi olan gruplar kalır ve rakam eşleşme sayısını
  // gösterir; toplam sayı kalsaydı "AHŞAP 28" yazıp 2 satır listelenirdi.
  const gorunurSekmeler = React.useMemo(() => {
    if (!sekmeler) return undefined;
    const q = sorgu.trim().toLocaleLowerCase("tr");
    if (!q) return sekmeler.map((sek) => ({ ...sek, adet: sek.items.length }));
    return sekmeler
      .map((sek) => ({
        ...sek,
        adet: sek.items.filter((i) => i.toLocaleLowerCase("tr").includes(q))
          .length,
      }))
      .filter((sek) => sek.adet > 0);
  }, [sekmeler, sorgu]);

  // Aktif grup süzülüp kaybolduysa görünen ilkine geçilir; yoksa kullanıcı
  // eşleşme olduğu hâlde boş liste görürdü.
  React.useEffect(() => {
    if (!gorunurSekmeler || gorunurSekmeler.length === 0) return;
    if (!gorunurSekmeler.some((s) => s.key === aktifSekme))
      setAktifSekme(gorunurSekmeler[0].key);
  }, [gorunurSekmeler, aktifSekme]);

  // Grup değişince liste başa sarılır: önceki grupta aşağı inilmişse yeni
  // grubun ilk öğeleri ekranın dışında kalıyordu.
  React.useEffect(() => {
    if (listeRef.current) listeRef.current.scrollTop = 0;
  }, [aktifSekme]);

  // Sekmeli modda gösterimde "Etiket · " öneki atılır (değer korunur).
  const gosterim = (item: string) =>
    sekmeler ? item.replace(/^[^·]+·\s*/, "") : item;
  return (
    <Combobox
      items={benzersiz}
      value={value}
      onValueChange={(v) => onValueChange?.(v as string | null)}
      open={acik}
      onOpenChange={setAcik}
      onInputValueChange={(v) => setSorgu(String(v ?? ""))}
    >
      <div ref={anchorRef}>
        <ComboboxInput
          placeholder={placeholder}
          showClear={temizlenebilir}
          className={cn("w-full", className)}
          onClick={() => setAcik(true)}
        />
      </div>

      <ComboboxContent
        anchor={anchorRef}
        sideOffset={10}
        className={cn(
          "min-w-(--anchor-width)",
          // Sekmeli modda SABİT genişlik: genişlik içerikten (en uzun öğe)
          // hesaplanınca grup değiştirdikçe kutu zıplıyordu. Uzun adlar
          // satırda kırpılır.
          sekmeler && "w-[min(52rem,92vw)]",
          listeClassName,
        )}
      >
        {/* Gruplar YANDA: üstte yatay şerit olduğunda 10+ grup satıra
            sığmayıp sarıyor ve listeyi aşağı itiyordu. Yan sütun hem sabit
            kalıyor hem uzun grup adları tam okunuyor. */}
        <div className={cn(sekmeler && "flex items-stretch")}>
          {gorunurSekmeler && gorunurSekmeler.length > 0 && (
            <div className="max-h-72 w-44 shrink-0 overflow-y-auto border-r p-1">
              {gorunurSekmeler.map((sek) => (
                <button
                  key={sek.key}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setAktifSekme(sek.key)}
                  className={cn(
                    "flex w-full items-center gap-1 rounded-md px-2 py-1.5 text-left text-xs font-medium transition-colors",
                    aktifSekme === sek.key
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-black/5",
                  )}
                >
                  <span className="min-w-0 flex-1 truncate">{sek.label}</span>
                  <span className="shrink-0 tabular-nums opacity-60">
                    {sek.adet}
                  </span>
                </button>
              ))}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <ComboboxEmpty>{emptyText}</ComboboxEmpty>
            <ComboboxList ref={listeRef}>
              {(item: string) => (
                <ComboboxItem key={item} value={item} className="group/oge">
                  <span className="min-w-0 flex-1 truncate">
                    {gosterim(item)}
                  </span>
                  {onKopyala && (
                    <button
                      type="button"
                      title={kopyaBaslik}
                      aria-label={`${gosterim(item)} — ${kopyaBaslik}`}
                      // Kopya SEÇİM DEĞİL. ComboboxItem seçimi click'te yapıyor
                      // ve click düğmeden balonlanıyor; durdurmazsak kopya
                      // açılırken satırın malzemesi de değişirdi.
                      onPointerDownCapture={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setAcik(false);
                        onKopyala(item);
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      // svg'ye pointer-events:none veren ComboboxItem kuralı
                      // düğmenin kendisini de etkilemesin.
                      className="ml-2 grid size-6 shrink-0 place-items-center rounded text-muted-foreground opacity-0 transition-opacity group-hover/oge:opacity-100 focus-visible:opacity-100 hover:bg-black/10 hover:text-foreground [&_svg]:pointer-events-none"
                    >
                      <Copy className="size-3.5" />
                    </button>
                  )}
                </ComboboxItem>
              )}
            </ComboboxList>
          </div>
        </div>
        {onAdd && (
          <div className="border-t p-1">
            <button
              type="button"
              onClick={() => {
                setAcik(false); // popup açık kalıp modalla karışmasın
                onAdd();
              }}
              className="flex h-9 w-full cursor-pointer items-center gap-2 rounded-md px-2 text-sm font-medium text-foreground transition-colors hover:bg-black/10"
            >
              <Plus className="size-4" />
              {addLabel ?? "Yeni ekle"}
            </button>
          </div>
        )}
      </ComboboxContent>
    </Combobox>
  );
}
