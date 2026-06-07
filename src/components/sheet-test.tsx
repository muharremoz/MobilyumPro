"use client";

import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { IconInput, type AnimatedIconHandle } from "@/components/ui/icon-input";
import { RockingChairIcon } from "@/components/ui/icons/rocking-chair";
import { ScanTextIcon } from "@/components/ui/icons/scan-text";
import { TurkishLiraIcon } from "@/components/ui/icons/turkish-lira";
import { BoxesIcon } from "@/components/ui/icons/boxes";
import { FolderOpenIcon } from "@/components/ui/icons/folder-open";
import { AlignLeftIcon } from "@/components/ui/icons/align-left";
import { SearchSelect } from "@/components/ui/search-select";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function SheetTest() {
  const katRef = React.useRef<AnimatedIconHandle>(null);
  const aciklamaRef = React.useRef<AnimatedIconHandle>(null);

  return (
    <Sheet>
      <SheetTrigger render={<Button variant="outline">Sheet Test</Button>} />
      <SheetContent
        className="flex w-full flex-col gap-0.5 border-white bg-[#f5f5f5] p-2 sm:max-w-md"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, rgba(91,79,65,0.035) 0px, rgba(91,79,65,0.035) 1px, transparent 1px, transparent 4px)",
        }}
      >
        <SheetHeader className="flex h-9 flex-row items-center gap-2 px-3 py-0">
          <RockingChairIcon size={18} className="text-muted-foreground" />
          <SheetTitle>Yeni Kayıt</SheetTitle>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-auto rounded-md border bg-card p-3.5">
          <div className="grid gap-2.5">
            <IconInput label="Ürün Adı" icon={RockingChairIcon} placeholder="Örn. Milano Koltuk Takımı" />
            <IconInput label="Kod" icon={ScanTextIcon} placeholder="URN-0000" />

            {/* Kategori — select, etiket yanında animasyonlu ikon */}
            <div
              className="grid gap-1.5"
              onMouseEnter={() => katRef.current?.startAnimation()}
              onMouseLeave={() => katRef.current?.stopAnimation()}
              onFocus={() => katRef.current?.startAnimation()}
              onBlur={() => katRef.current?.stopAnimation()}
            >
              <label className="flex items-center gap-1.5 text-sm font-medium">
                <FolderOpenIcon
                  ref={katRef}
                  size={15}
                  className="text-muted-foreground"
                />
                Kategori
              </label>
              <SearchSelect
                placeholder="Kategori ara / seç"
                items={[
                  "Oturma Grubu",
                  "Yatak Odası",
                  "Yemek Odası",
                  "Çalışma",
                  "Aksesuar",
                ]}
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <IconInput label="Fiyat (₺)" type="number" icon={TurkishLiraIcon} placeholder="0" />
              <IconInput label="Stok" type="number" icon={BoxesIcon} placeholder="0" />
            </div>

            {/* Açıklama — textarea, etiket yanında animasyonlu ikon */}
            <div
              className="grid gap-1.5"
              onMouseEnter={() => aciklamaRef.current?.startAnimation()}
              onMouseLeave={() => aciklamaRef.current?.stopAnimation()}
              onFocus={() => aciklamaRef.current?.startAnimation()}
              onBlur={() => aciklamaRef.current?.stopAnimation()}
            >
              <label className="flex items-center gap-1.5 text-sm font-medium">
                <AlignLeftIcon
                  ref={aciklamaRef}
                  size={15}
                  className="text-muted-foreground"
                />
                Açıklama
              </label>
              <textarea
                rows={3}
                placeholder="Kısa açıklama..."
                className="w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30"
              />
            </div>
          </div>
        </div>

        <SheetFooter className="mt-1 flex-row justify-end gap-2 rounded-md border bg-card p-2">
          <SheetClose render={<Button variant="outline">İptal</Button>} />
          <SheetClose
            render={
              <Button onClick={() => toast.success("Kaydedildi (demo)")}>
                Kaydet
              </Button>
            }
          />
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
