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

  async function kaydet(anahtar: string, yeni: string) {
    if (yeni === kayitli.current[anahtar]) return;
    const onceki = kayitli.current[anahtar];
    setDegerler((s) => ({ ...s, [anahtar]: yeni }));
    const res = await parametreDegerKaydet(anahtar, yeni);
    if (!res.ok) {
      setDegerler((s) => ({ ...s, [anahtar]: onceki }));
      toast.error(res.error ?? "Kaydedilemedi.");
      return;
    }
    kayitli.current[anahtar] = yeni;
    setOverrideler((s) => new Set(s).add(anahtar));
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
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
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
          <div key={grup} className="overflow-hidden rounded-md border bg-card">
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
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {tanim.aciklama}
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
