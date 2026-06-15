"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  DefinitionsPage,
  MENU as DEF_MENU,
  TABS as DEF_TABS,
  type TabKey as DefTab,
} from "@/components/definitions/definitions-page";
import { StockStatus } from "@/components/inventory/stock-status";
import { StockMovements } from "@/components/inventory/stock-movements";
import { Warehouses } from "@/components/inventory/warehouses";
import { StockCount } from "@/components/inventory/stock-count";
import { Materials } from "@/components/inventory/materials";
import { Parts } from "@/components/inventory/parts";
import type { Urun, Malzeme, Parca } from "@/lib/data";

type StockKey = "durum" | "hareketler" | "depolar" | "sayim";
const STOCK_LABEL: Record<StockKey, string> = {
  durum: "Stok Durumu",
  hareketler: "Stok Hareketleri",
  depolar: "Depolar",
  sayim: "Sayım",
};

type ProdKey = "malzemeler" | "parcalar";
const PROD_LABEL: Record<ProdKey, string> = {
  malzemeler: "Malzemeler",
  parcalar: "Parçalar",
};

const STOCK_GROUP: { label: string; keys: StockKey[] } = {
  label: "Stok",
  keys: ["durum", "hareketler", "depolar", "sayim"],
};
const PROD_GROUP: { label: string; keys: ProdKey[] } = {
  label: "Üretim",
  keys: ["malzemeler", "parcalar"],
};

type Secim =
  | { tip: "stok"; key: StockKey }
  | { tip: "uretim"; key: ProdKey }
  | { tip: "tanim"; key: DefTab };

export function InventoryPage({
  initial,
  urunler,
  malzemeler,
  parcalar,
}: {
  initial?: Secim;
  urunler: Urun[];
  malzemeler: Malzeme[];
  parcalar: Parca[];
}) {
  const [secim, setSecim] = React.useState<Secim>(
    initial ?? { tip: "stok", key: "durum" },
  );
  const [acikGrup, setAcikGrup] = React.useState<Set<string>>(
    () =>
      new Set([
        STOCK_GROUP.label,
        PROD_GROUP.label,
        ...DEF_MENU.map((g) => g.label),
      ]),
  );

  function grupAcKapa(label: string) {
    setAcikGrup((s) => {
      const n = new Set(s);
      if (n.has(label)) n.delete(label);
      else n.add(label);
      return n;
    });
  }

  function isActive(s: Secim) {
    return s.tip === secim.tip && s.key === secim.key;
  }

  return (
    <div className="flex gap-4">
      {/* Sol gruplu menü — Stok + Tanımlamalar bir arada */}
      <aside className="w-52 shrink-0">
        <nav className="flex flex-col gap-2 rounded-md border bg-card p-1.5">
          {/* Stok grubu */}
          <MenuGroup
            label={STOCK_GROUP.label}
            acik={acikGrup.has(STOCK_GROUP.label)}
            onToggle={() => grupAcKapa(STOCK_GROUP.label)}
          >
            {STOCK_GROUP.keys.map((k) => (
              <MenuItem
                key={k}
                label={STOCK_LABEL[k]}
                active={isActive({ tip: "stok", key: k })}
                onClick={() => setSecim({ tip: "stok", key: k })}
              />
            ))}
          </MenuGroup>

          {/* Üretim grubu — Malzemeler + Parçalar (BOM tabanı) */}
          <MenuGroup
            label={PROD_GROUP.label}
            acik={acikGrup.has(PROD_GROUP.label)}
            onToggle={() => grupAcKapa(PROD_GROUP.label)}
          >
            {PROD_GROUP.keys.map((k) => (
              <MenuItem
                key={k}
                label={PROD_LABEL[k]}
                active={isActive({ tip: "uretim", key: k })}
                onClick={() => setSecim({ tip: "uretim", key: k })}
              />
            ))}
          </MenuGroup>

          {/* Tanımlamalar grupları */}
          {DEF_MENU.map((g) => (
            <MenuGroup
              key={g.label}
              label={`Tanım · ${g.label}`}
              acik={acikGrup.has(g.label)}
              onToggle={() => grupAcKapa(g.label)}
            >
              {g.keys.map((k) => (
                <MenuItem
                  key={k}
                  label={DEF_TABS[k].label}
                  active={isActive({ tip: "tanim", key: k })}
                  onClick={() => setSecim({ tip: "tanim", key: k })}
                />
              ))}
            </MenuGroup>
          ))}
        </nav>
      </aside>

      {/* Sağ içerik */}
      <div className="flex min-w-0 flex-1 flex-col">
        {secim.tip === "stok" && secim.key === "durum" && (
          <StockStatus urunler={urunler} />
        )}
        {secim.tip === "stok" && secim.key === "hareketler" && <StockMovements />}
        {secim.tip === "stok" && secim.key === "depolar" && <Warehouses />}
        {secim.tip === "stok" && secim.key === "sayim" && <StockCount />}
        {secim.tip === "uretim" && secim.key === "malzemeler" && (
          <Materials malzemeler={malzemeler} />
        )}
        {secim.tip === "uretim" && secim.key === "parcalar" && (
          <Parts parcalar={parcalar} malzemeler={malzemeler} />
        )}
        {secim.tip === "tanim" && (
          <DefinitionsPage
            hideMenu
            tip={secim.key}
            onTipChange={(k) => setSecim({ tip: "tanim", key: k })}
          />
        )}
      </div>
    </div>
  );
}

function MenuGroup({
  label,
  acik,
  onToggle,
  children,
}: {
  label: string;
  acik: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full cursor-pointer items-center justify-between rounded-md bg-muted/60 px-2.5 py-1.5 text-left text-[12px] font-semibold tracking-wide text-foreground uppercase transition-colors hover:bg-muted"
      >
        <span>{label}</span>
        <ChevronDown
          className={cn(
            "size-3.5 text-muted-foreground transition-transform",
            !acik && "-rotate-90",
          )}
        />
      </button>
      {acik && <div className="mt-1 flex flex-col gap-0.5 pl-1">{children}</div>}
    </div>
  );
}

function MenuItem({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex cursor-pointer items-center justify-between rounded-md px-3 py-1.5 text-left text-sm transition-colors",
        active
          ? "bg-accent font-medium text-foreground"
          : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
      )}
    >
      <span>{label}</span>
    </button>
  );
}
