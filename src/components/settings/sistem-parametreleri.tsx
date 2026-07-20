"use client";

import * as React from "react";
import { RotateCcw, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Switch } from "@/components/ui/switch";
import { SearchSelect } from "@/components/ui/search-select";
import { ListHeader } from "@/components/ui/list-header";
import { LineNav } from "@/components/line-nav";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  PARAMETRELER,
  PARAMETRE_GRUPLARI,
  type ParametreTanim,
} from "@/lib/parametreler";
import { parametreDegerKaydet, parametreSifirla } from "@/lib/db/actions";


/** Grup adından kararlı bir bölüm id'si — Türkçe karakterler sadeleştirilir. */
const grupId = (grup: string) =>
  "param-" +
  grup
    .toLocaleLowerCase("tr")
    .replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s")
    .replace(/ı/g, "i").replace(/ö/g, "o").replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/**
 * Kaydırdıkça hangi grubun hizada olduğunu bulur (scrollspy).
 *
 * rootMargin üstten -%10 / alttan -%70: "aktif" sayılan bant ekranın üst
 * şeridi olur, yoksa aşağıdaki gruplar da kesişip işaretçi zıplar.
 *
 * State hep GRUP ADI tutar (id değil) — ikisi karışırsa eşleştirme sessizce
 * geri düşüşe kalır.
 */
function useAktifGrup(gruplar: string[]) {
  const [aktif, setAktif] = React.useState<string | undefined>();
  // gruplar her render'da yeni dizi (filter sonucu); bağımlılığı içeriğe bağla
  // ki observer boş yere yeniden kurulmasın.
  const anahtar = gruplar.join("|");

  React.useEffect(() => {
    const adlar = anahtar ? anahtar.split("|") : [];
    if (!adlar.length) return;
    const adById = new Map(adlar.map((g) => [grupId(g), g]));

    const gozlemci = new IntersectionObserver(
      (girisler) => {
        const gorunur = girisler
          .filter((g) => g.isIntersecting)
          .sort(
            (a, b) => a.boundingClientRect.top - b.boundingClientRect.top,
          )[0];
        const ad = gorunur && adById.get(gorunur.target.id);
        if (ad) setAktif(ad);
      },
      { rootMargin: "-10% 0px -70% 0px", threshold: 0 },
    );

    for (const id of adById.keys()) {
      const oge = document.getElementById(id);
      if (oge) gozlemci.observe(oge);
    }
    return () => gozlemci.disconnect();
  }, [anahtar]);

  // Aktif grup aramayla listeden düşmüş olabilir → ilk gruba dön.
  return aktif && gruplar.includes(aktif) ? aktif : gruplar[0];
}

/**
 * Sistem parametreleri — tanımlar kodda sabit (PARAMETRELER), kullanıcı
 * yalnızca değeri değiştirir. Değer anında kaydedilir (metin/sayı blur'da,
 * anahtar/seçim değişimde). Varsayılandan sapanlarda "varsayılana dön" çıkar.
 */
export function SistemParametreleri({
  degerler: dbDegerler,
}: {
  degerler: Record<string, string>;
}) {
  // Efektif değerler: DB override ?? varsayılan.
  const [degerler, setDegerler] = React.useState<Record<string, string>>(() =>
    Object.fromEntries(
      PARAMETRELER.map((p) => [p.anahtar, dbDegerler[p.anahtar] ?? p.varsayilan]),
    ),
  );
  // DB'de kaydı olan (override edilmiş) anahtarlar.
  const [overrideler, setOverrideler] = React.useState<Set<string>>(
    () => new Set(Object.keys(dbDegerler)),
  );
  const [arama, setArama] = React.useState("");
  const kayitli = React.useRef({ ...degerler });

  // Arama: etiket, açıklama ve anahtar üzerinden süz; boş gruplar gizlenir.
  const q = arama.trim().toLocaleLowerCase("tr");
  const eslesir = (p: (typeof PARAMETRELER)[number]) =>
    !q ||
    p.etiket.toLocaleLowerCase("tr").includes(q) ||
    p.aciklama.toLocaleLowerCase("tr").includes(q) ||
    p.anahtar.toLocaleLowerCase("tr").includes(q);
  const gorunurGruplar = PARAMETRE_GRUPLARI.filter((grup) =>
    PARAMETRELER.some((p) => p.grup === grup && eslesir(p)),
  );
  // Menü yalnız aramadan geçen grupları gösterir; işaretçi de onlara göre.
  const aktifGrup = useAktifGrup(gorunurGruplar);

  async function kaydet(anahtar: string, yeni: string) {
    if (yeni === kayitli.current[anahtar]) return;
    const onceki = kayitli.current[anahtar];
    const varsayilan = PARAMETRELER.find(
      (p) => p.anahtar === anahtar,
    )?.varsayilan;
    setDegerler((s) => ({ ...s, [anahtar]: yeni }));
    // Değer manuel olarak varsayılana eşitlendiyse override kaydını sil —
    // "varsayılana dön" göstermeye gerek kalmaz.
    const res =
      yeni === varsayilan
        ? await parametreSifirla(anahtar)
        : await parametreDegerKaydet(anahtar, yeni);
    if (!res.ok) {
      setDegerler((s) => ({ ...s, [anahtar]: onceki }));
      toast.error(res.error ?? "Kaydedilemedi.");
      return;
    }
    kayitli.current[anahtar] = yeni;
    setOverrideler((s) => {
      const n = new Set(s);
      if (yeni === varsayilan) n.delete(anahtar);
      else n.add(anahtar);
      return n;
    });
    toast.success("Kaydedildi");
  }

  async function sifirla(tanim: ParametreTanim) {
    const onceki = kayitli.current[tanim.anahtar];
    setDegerler((s) => ({ ...s, [tanim.anahtar]: tanim.varsayilan }));
    const res = await parametreSifirla(tanim.anahtar);
    if (!res.ok) {
      setDegerler((s) => ({ ...s, [tanim.anahtar]: onceki }));
      toast.error(res.error ?? "Sıfırlanamadı.");
      return;
    }
    kayitli.current[tanim.anahtar] = tanim.varsayilan;
    setOverrideler((s) => {
      const n = new Set(s);
      n.delete(tanim.anahtar);
      return n;
    });
    toast.success("Varsayılana döndürüldü");
  }

  return (
    <TooltipProvider delay={200}>
      <div className="mx-auto flex w-full max-w-5xl gap-6">
        {/*
          Bölüm menüsü — 22 parametre 5 gruba yayılıyor, sayfa uzun.
          Sticky: kaydırma panel kabında olduğu için üstte asılı kalır.
        */}
        <aside className="sticky top-0 hidden h-fit shrink-0 pt-1 lg:block lg:w-48">
          <LineNav
            items={gorunurGruplar.map((g) => ({
              title: g,
              href: `#${grupId(g)}`,
            }))}
            activeHref={aktifGrup ? `#${grupId(aktifGrup)}` : undefined}
            scrollActiveIntoView={false}
            onItemClick={(oge, e) => {
              // Hash gezinmesi iç kaydırma kabında güvenilir değil; elle kaydır.
              e.preventDefault();
              document
                .getElementById(oge.href.slice(1))
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          />
        </aside>

      <div className="flex min-w-0 flex-1 flex-col gap-4">
        {/* Arama */}
        <div className="relative">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Parametre ara..."
            value={arama}
            onChange={(e) => setArama(e.target.value)}
            className="h-9 pl-9"
          />
        </div>

        {gorunurGruplar.map((grup) => (
          <div
            key={grup}
            id={grupId(grup)}
            className="overflow-hidden rounded-md border bg-card scroll-mt-2"
          >
            <ListHeader title={grup} />
            <div className="divide-y">
              {PARAMETRELER.filter((p) => p.grup === grup && eslesir(p)).map(
                (p) => (
                  <ParametreSatiri
                    key={p.anahtar}
                    tanim={p}
                    deger={degerler[p.anahtar]}
                    override={overrideler.has(p.anahtar)}
                    onDegis={(v) =>
                      setDegerler((s) => ({ ...s, [p.anahtar]: v }))
                    }
                    onKaydet={(v) => kaydet(p.anahtar, v)}
                    onSifirla={() => sifirla(p)}
                  />
                ),
              )}
            </div>
          </div>
        ))}
        {gorunurGruplar.length === 0 && (
          <div className="flex min-h-32 items-center justify-center rounded-md border border-dashed p-8 text-sm text-muted-foreground">
            Aramayla eşleşen parametre yok.
          </div>
        )}
      </div>
      </div>
    </TooltipProvider>
  );
}

function ParametreSatiri({
  tanim,
  deger,
  override,
  onDegis,
  onKaydet,
  onSifirla,
}: {
  tanim: ParametreTanim;
  deger: string;
  override: boolean;
  onDegis: (v: string) => void;
  onKaydet: (v: string) => void;
  onSifirla: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3">
      {/* Sol: etiket + açıklama */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">{tanim.etiket}</p>
          {override && (
            <span
              className="size-1.5 shrink-0 rounded-full bg-amber-500"
              title="Varsayılandan farklı"
            />
          )}
          {/* Karşılığı olmayan ayarı sessizce göstermek, kullanıcıya
              değiştirdiğini sandırıyordu. Açıkça söylüyoruz. */}
          {tanim.durum === "yakinda" && (
            <span
              className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium tracking-wide text-muted-foreground uppercase"
              title="Bu ayar kaydedilir ama henüz bir davranışı etkilemez."
            >
              Yakında
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {tanim.aciklama}
          {tanim.durum === "yakinda" && (
            <span className="text-muted-foreground/70">
              {" "}
              · Henüz etkin değil, kaydedilir ama uygulanmaz.
            </span>
          )}
        </p>
      </div>

      {/* Sağ: sabit genişlikte kontrol kolonu (tüm tipler aynı hizada) */}
      <div className="flex shrink-0 items-center gap-1.5">
        {override && (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Varsayılana dön"
                  onClick={onSifirla}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="size-3.5" />
                </Button>
              }
            />
            <TooltipContent side="top">
              Varsayılana dön ({tanim.varsayilan})
            </TooltipContent>
          </Tooltip>
        )}

        {tanim.tip === "boolean" && (
          <Switch
            checked={deger === "true"}
            onCheckedChange={(v) => onKaydet(v === true ? "true" : "false")}
            className="data-checked:bg-emerald-600"
          />
        )}

        {tanim.tip === "secim" && (
          <SearchSelect
            items={tanim.secenekler ?? []}
            value={deger}
            onValueChange={(v) => v && onKaydet(v)}
            placeholder={tanim.etiket}
            className="h-8 w-32"
          />
        )}

        {tanim.tip === "sayi" && (
          <InputGroup className="h-8 w-28 overflow-hidden">
            <InputGroupInput
              type="number"
              value={deger}
              onChange={(e) => onDegis(e.target.value)}
              onBlur={(e) => onKaydet(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
              }}
              className="text-right tabular-nums"
            />
            {tanim.birim && (
              <InputGroupAddon
                align="inline-end"
                className="h-full w-12 justify-center self-stretch border-l bg-[#fafafa] px-2 text-xs font-normal"
              >
                {tanim.birim}
              </InputGroupAddon>
            )}
          </InputGroup>
        )}

        {tanim.tip === "metin" && (
          <Input
            value={deger}
            onChange={(e) => onDegis(e.target.value)}
            onBlur={(e) => onKaydet(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
            className="h-8 w-44"
          />
        )}
      </div>
    </div>
  );
}
