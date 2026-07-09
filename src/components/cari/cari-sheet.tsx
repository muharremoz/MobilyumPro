"use client";

import * as React from "react";
import { toast } from "sonner";

import { Switch } from "@/components/ui/switch";
import { FormSheet } from "@/components/ui/form-sheet";
import { IconInput, type AnimatedIconHandle } from "@/components/ui/icon-input";
import { AnimatedField } from "@/components/ui/animated-field";
import { SearchSelect } from "@/components/ui/search-select";
import { UsersRoundIcon } from "@/components/ui/icons/users-round";
import { ReceiptIcon } from "@/components/ui/icons/receipt";
import { PhoneIcon } from "@/components/ui/icons/phone";
import { SendIcon } from "@/components/ui/icons/send";
import { TruckIcon } from "@/components/ui/icons/truck";
import { WalletIcon } from "@/components/ui/icons/wallet";
import { AlignLeftIcon } from "@/components/ui/icons/align-left";
import { CircleCheckIcon } from "@/components/ui/icons/circle-check";
import type { Cari, CariTip, CariSinifi, ParaBirimi } from "@/lib/data";

const TIPLER: CariTip[] = ["Müşteri", "Tedarikçi", "Her İkisi"];
const SINIFLAR: CariSinifi[] = ["Bireysel", "Kurumsal"];
const PARA_BIRIMLERI: ParaBirimi[] = ["TL", "USD", "EUR"];

/** Yeni cari ekleme sheet'i — kod (CARI-####) sunucuda üretilir, bakiye 0. */
export function CariSheet({
  open,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSave: (c: Cari) => void;
}) {
  const [form, setForm] = React.useState({
    ad: "",
    tip: "Müşteri" as CariTip,
    sinif: "Bireysel" as CariSinifi,
    vergiNo: "",
    vergiDairesi: "",
    telefon: "",
    email: "",
    sehir: "",
    paraBirimi: "TL" as ParaBirimi,
    adres: "",
    not: "",
    durum: "Aktif" as "Aktif" | "Pasif",
  });
  const durumRef = React.useRef<AnimatedIconHandle>(null);

  React.useEffect(() => {
    if (!open) return;
    setForm({
      ad: "",
      tip: "Müşteri",
      sinif: "Bireysel",
      vergiNo: "",
      vergiDairesi: "",
      telefon: "",
      email: "",
      sehir: "",
      paraBirimi: "TL",
      adres: "",
      not: "",
      durum: "Aktif",
    });
  }, [open]);

  function kaydet() {
    if (!form.ad.trim()) {
      toast.error("Cari adı / unvanı gerekli");
      return;
    }
    onSave({
      id: "", // sunucu CARI-#### üretir
      ad: form.ad.trim(),
      tip: form.tip,
      sinif: form.sinif,
      vergiNo: form.vergiNo.trim() || undefined,
      vergiDairesi: form.vergiDairesi.trim() || undefined,
      telefon: form.telefon.trim() || undefined,
      email: form.email.trim() || undefined,
      adres: form.adres.trim() || undefined,
      sehir: form.sehir.trim() || undefined,
      bakiye: 0,
      paraBirimi: form.paraBirimi,
      durum: form.durum,
      not: form.not.trim() || undefined,
    });
    onOpenChange(false);
  }

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Yeni Cari"
      icon={UsersRoundIcon}
      onSave={kaydet}
    >
      <div className="grid gap-2.5">
        <IconInput
          label="Ad / Unvan"
          icon={UsersRoundIcon}
          placeholder="Örn. Ayşe Demir veya Mobilyum Ltd. Şti."
          value={form.ad}
          onChange={(e) => setForm((f) => ({ ...f, ad: e.target.value }))}
        />
        <div className="grid grid-cols-2 gap-2.5">
          <AnimatedField label="Tip" icon={UsersRoundIcon}>
            <SearchSelect
              items={TIPLER}
              value={form.tip}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, tip: (v as CariTip) ?? "Müşteri" }))
              }
              placeholder="Tip"
            />
          </AnimatedField>
          <AnimatedField label="Sınıf" icon={UsersRoundIcon}>
            <SearchSelect
              items={SINIFLAR}
              value={form.sinif}
              onValueChange={(v) =>
                setForm((f) => ({
                  ...f,
                  sinif: (v as CariSinifi) ?? "Bireysel",
                }))
              }
              placeholder="Sınıf"
            />
          </AnimatedField>
        </div>
        {form.sinif === "Kurumsal" && (
          <div className="grid grid-cols-2 gap-2.5">
            <IconInput
              label="Vergi No"
              icon={ReceiptIcon}
              placeholder="1234567890"
              value={form.vergiNo}
              onChange={(e) =>
                setForm((f) => ({ ...f, vergiNo: e.target.value }))
              }
            />
            <IconInput
              label="Vergi Dairesi"
              icon={ReceiptIcon}
              placeholder="Örn. Beşiktaş"
              value={form.vergiDairesi}
              onChange={(e) =>
                setForm((f) => ({ ...f, vergiDairesi: e.target.value }))
              }
            />
          </div>
        )}
        <div className="grid grid-cols-2 gap-2.5">
          <IconInput
            label="Telefon"
            icon={PhoneIcon}
            placeholder="0532 000 00 00"
            value={form.telefon}
            onChange={(e) =>
              setForm((f) => ({ ...f, telefon: e.target.value }))
            }
          />
          <IconInput
            label="E-posta"
            icon={SendIcon}
            placeholder="ornek@mail.com"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <IconInput
            label="Şehir"
            icon={TruckIcon}
            placeholder="Örn. İstanbul"
            value={form.sehir}
            onChange={(e) => setForm((f) => ({ ...f, sehir: e.target.value }))}
          />
          <AnimatedField label="Para Birimi" icon={WalletIcon}>
            <SearchSelect
              items={PARA_BIRIMLERI}
              value={form.paraBirimi}
              onValueChange={(v) =>
                setForm((f) => ({
                  ...f,
                  paraBirimi: (v as ParaBirimi) ?? "TL",
                }))
              }
              placeholder="Para birimi"
            />
          </AnimatedField>
        </div>
        <AnimatedField label="Adres" icon={AlignLeftIcon}>
          <textarea
            rows={2}
            placeholder="Açık adres..."
            value={form.adres}
            onChange={(e) => setForm((f) => ({ ...f, adres: e.target.value }))}
            className="w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30"
          />
        </AnimatedField>
        <AnimatedField label="Not" icon={AlignLeftIcon}>
          <textarea
            rows={2}
            placeholder="Kısa not..."
            value={form.not}
            onChange={(e) => setForm((f) => ({ ...f, not: e.target.value }))}
            className="w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30"
          />
        </AnimatedField>
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
          <span className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{form.durum}</span>
            <Switch
              checked={form.durum === "Aktif"}
              className="pointer-events-none data-checked:bg-emerald-600"
            />
          </span>
        </div>
      </div>
    </FormSheet>
  );
}
