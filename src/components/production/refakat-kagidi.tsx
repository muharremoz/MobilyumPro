"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatTarih, type RefakatKagidi } from "@/lib/data";

/**
 * Parça refakat kağıdı — parça üretim boyunca ürünle birlikte gezer, her
 * istasyonda işlenir. Örnek fabrika formuna göre düzenlendi:
 * künye + miktar + malzeme/PVC + ölçü tablosu + işlem sırası + resim kutuları.
 *
 * Baskı: her kağıt kendi A3 sayfasında (yazdir-sayfa). Panel çerçevesi
 * çıktıya girmez (globals.css @media print).
 */

const mm = (v?: number) =>
  v == null ? "" : v.toLocaleString("tr-TR", { maximumFractionDigits: 1 });

/** Barkodu ince/kalın çubuklarla çizer (rakamlardan türetilir, okunur amaç
 *  taşımaz; gerçek tarama için ileride bir barkod kütüphanesi bağlanır). */
function BarkodCizgi({ kod }: { kod: string }) {
  return (
    <span className="flex flex-col items-center">
      <span className="flex h-8 items-end gap-[1px]">
        {kod.split("").map((c, i) => (
          <span
            key={i}
            className="bg-black"
            style={{ width: Number(c) % 3 === 0 ? 3 : 1.5, height: "100%" }}
          />
        ))}
      </span>
      <span className="mt-0.5 font-mono text-[9px] tracking-widest">{kod}</span>
    </span>
  );
}

/** Tek bir refakat kağıdı (bir parça). */
function Kagit({ k }: { k: RefakatKagidi }) {
  const o = k.olculer;
  // Şemadaki ölçüler: net kesim varsa o, yoksa bitmiş ölçü gösterilir.
  const semaU = o?.netUzunluk ?? o?.bitmisUzunluk;
  const semaG = o?.netGenislik ?? o?.bitmisGenislik;

  return (
    <div className="yazdir-sayfa mx-auto w-full max-w-[297mm] border border-black bg-white p-4 text-black">
      {/* ── Üst bant: logo · sayfa · barkod · basım ── */}
      <div className="flex items-center gap-3 border-b border-black pb-2">
        <span className="text-lg font-black tracking-tight">MobilyumPro</span>
        <span className="bg-black px-3 py-0.5 text-lg font-bold text-white tabular-nums">
          {k.sayfaToplam} / {k.sayfaNo}
        </span>
        <span className="flex-1" />
        <BarkodCizgi kod={k.barkod} />
        <span className="text-right text-[10px] leading-tight">
          {new Date().toLocaleString("tr-TR")}
          <span className="block text-sm font-bold">
            {k.hedefDepo ? "STOK" : "SİPARİŞ"}
          </span>
        </span>
      </div>

      {/* ── Başlık + iş emri künyesi ── */}
      <div className="flex items-stretch border-b border-black">
        <div className="flex flex-1 items-center gap-3 py-1">
          <span className="bg-black px-3 py-0.5 text-sm font-bold text-white tabular-nums">
            {k.sayfaNo}
          </span>
          <span className="text-base font-bold tracking-wide">
            PARÇA REFAKAT KAĞIDI
          </span>
        </div>
        <table className="w-56 border-l border-black text-[10px]">
          <tbody>
            <tr className="border-b border-black">
              <td className="w-14 border-r border-black px-1">TARİH</td>
              <td className="px-1 font-semibold">
                {formatTarih(k.emirTarihi)}
              </td>
            </tr>
            <tr className="border-b border-black">
              <td className="border-r border-black px-1">İŞ EMRİ</td>
              <td className="px-1 font-semibold">{k.emirId}</td>
            </tr>
            <tr>
              <td className="border-r border-black px-1">TERMİN</td>
              <td className="px-1 font-semibold">
                {k.termin ? formatTarih(k.termin) : "—"}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── Ürün / parça ── */}
      <div className="border-b border-black px-1 py-0.5 text-[11px] font-semibold">
        {k.musteri ?? k.hedefDepo ?? "—"}
      </div>
      <div className="grid grid-cols-2 border-b border-black text-[10px]">
        <div className="border-r border-black px-1 py-0.5">
          ÜRÜN <span className="font-mono">{k.urunId}</span>
          <div className="text-xs font-bold">{k.urunAd}</div>
        </div>
        <div className="px-1 py-0.5">
          PARÇA <span className="font-mono">{k.parcaId}</span>
          <div className="text-xs font-bold">{k.parcaAd}</div>
        </div>
      </div>

      {/* ── Miktarlar ── */}
      <div className="flex items-center gap-2 border-b border-black px-1 py-1 text-[10px]">
        <span>Ü.MİK.</span>
        <span className="bg-black px-2 text-sm font-bold text-white tabular-nums">
          {k.miktar.toLocaleString("tr-TR")}
        </span>
        <span className="ml-3">KABA KSM.MİK.</span>
        <span className="bg-black px-2 text-sm font-bold text-white tabular-nums">
          {o?.kabaUzunluk ? k.miktar.toLocaleString("tr-TR") : 0}
        </span>
        <span className="ml-3">NET KSM.MİK.</span>
        <span className="bg-black px-2 text-sm font-bold text-white tabular-nums">
          {k.miktar.toLocaleString("tr-TR")}
        </span>
      </div>

      {/* ── Malzeme + PVC'ler + parça şeması ── */}
      <div className="border-b border-black px-1 py-0.5 text-[10px] font-semibold">
        MALZEME : {k.malzeme ?? "—"}
      </div>
      <div className="flex border-b border-black">
        <div className="flex-1">
          <div className="border-b border-black px-1 text-center text-[9px]">
            PVC&apos;LER
          </div>
          {(k.pvcler.length ? k.pvcler : ["—"]).map((pvc, i) => (
            <div
              key={i}
              className="border-b border-black/40 px-1 py-1 text-[10px] last:border-0"
            >
              {pvc}
            </div>
          ))}
        </div>
        {/* Ölçülü şema: üst/alt uzunluk, sol/sağ genişlik */}
        <div className="flex w-48 shrink-0 flex-col items-center justify-center border-l border-black py-1">
          <span className="text-[10px] font-semibold tabular-nums">
            {mm(semaU)}
          </span>
          <span className="flex items-center gap-1">
            <span className="text-[10px] font-semibold tabular-nums">
              {mm(semaG)}
            </span>
            <span className="size-16 border border-black" />
            <span className="text-[10px] font-semibold tabular-nums">
              {mm(semaG)}
            </span>
          </span>
          <span className="text-[10px] font-semibold tabular-nums">
            {mm(semaU)}
          </span>
        </div>
      </div>

      {/* ── Ölçü tablosu ── */}
      <table className="w-full border-b border-black text-center text-[11px]">
        <thead>
          <tr className="border-b border-black">
            <th colSpan={2} className="border-r border-black font-semibold">
              KABA KESİM ÖLÇÜSÜ (mm)
            </th>
            <th colSpan={2} className="border-r border-black font-semibold">
              NET KESİM ÖLÇÜSÜ (mm)
            </th>
            <th colSpan={2} className="border-r border-black font-semibold">
              BİTMİŞ ÖLÇÜ (mm)
            </th>
            <th className="w-12 font-semibold">KAL</th>
          </tr>
          <tr className="border-b border-black text-[9px]">
            <th className="border-r border-black/40 font-normal">UZUNLUK</th>
            <th className="border-r border-black font-normal">GENİŞLİK</th>
            <th className="border-r border-black/40 font-normal">UZUNLUK</th>
            <th className="border-r border-black font-normal">GENİŞLİK</th>
            <th className="border-r border-black/40 font-normal">UZUNLUK</th>
            <th className="border-r border-black font-normal">GENİŞLİK</th>
            <th className="font-normal">(mm)</th>
          </tr>
        </thead>
        <tbody>
          <tr className="text-sm font-bold tabular-nums">
            <td className="border-r border-black/40 py-1">
              {mm(o?.kabaUzunluk) || 0}
            </td>
            <td className="border-r border-black">
              {mm(o?.kabaGenislik) || 0}
            </td>
            <td className="border-r border-black/40">{mm(o?.netUzunluk)}</td>
            <td className="border-r border-black">{mm(o?.netGenislik)}</td>
            <td className="border-r border-black/40">{mm(o?.bitmisUzunluk)}</td>
            <td className="border-r border-black">{mm(o?.bitmisGenislik)}</td>
            <td>{mm(o?.kalinlik)}</td>
          </tr>
        </tbody>
      </table>

      {/* ── İşlem sırası ── */}
      <table className="w-full border-b border-black text-[11px]">
        <thead>
          <tr className="border-b border-black">
            <th className="w-6 border-r border-black" />
            <th className="border-r border-black text-left font-semibold">
              İŞLEM SIRASI
            </th>
            <th className="border-r border-black" />
            <th className="w-40 border-r border-black text-left font-semibold">
              OPERASYON
            </th>
            <th className="w-20 font-semibold">TARİH</th>
          </tr>
        </thead>
        <tbody>
          {k.islemler.length === 0 ? (
            <tr>
              <td colSpan={5} className="py-3 text-center text-[10px]">
                Parçanın işlem sırası tanımlı değil (Parça kartı → İşlem
                Sırası).
              </td>
            </tr>
          ) : (
            k.islemler.map((i) => (
              <tr key={i.sira} className="border-b border-black/40 last:border-0">
                <td className="border-r border-black text-center tabular-nums">
                  {i.sira}
                </td>
                <td className="border-r border-black px-1 font-semibold uppercase">
                  {i.istasyonAd}
                </td>
                <td className="border-r border-black px-1 uppercase">
                  {i.makineAd ?? ""}
                </td>
                <td className="border-r border-black px-1 uppercase">
                  {i.operasyon}
                </td>
                {/* Tarih kolonu elle doldurulur */}
                <td />
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* ── Resim kutuları ── */}
      <div className="grid grid-cols-3 text-[9px]">
        {[
          { baslik: "ÜRÜN RESMİ", src: k.urunGorsel },
          { baslik: "PARÇA RESMİ", src: k.parcaGorsel },
          { baslik: "KANAL DETAYI", src: undefined },
        ].map((kutu, i) => (
          <div
            key={kutu.baslik}
            className={
              i < 2 ? "border-r border-black px-1 py-0.5" : "px-1 py-0.5"
            }
          >
            {kutu.baslik}
            <div className="mt-0.5 flex h-24 items-center justify-center">
              {kutu.src && (
                <Image
                  src={kutu.src}
                  alt={kutu.baslik}
                  width={120}
                  height={90}
                  unoptimized
                  className="max-h-24 w-auto object-contain"
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RefakatKagitlari({
  kagitlar,
  emirId,
}: {
  kagitlar: RefakatKagidi[];
  emirId: string;
}) {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Refakat kağıdı A3 basılır (globals.css'teki A4 kuralını ezer). */}
      <style>{"@media print{@page{size:A3 portrait;margin:10mm}}"}</style>

      {/* Araç çubuğu — çıktıda görünmez */}
      <div className="yazdir-gizle flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button size="sm" variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="size-4" /> Geri
          </Button>
          <div>
            <h1 className="text-lg font-semibold">
              {emirId}
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                Refakat Kağıtları
              </span>
            </h1>
            <p className="text-xs text-muted-foreground">
              {kagitlar.length} parça · her parça ayrı A3 sayfaya basılır
            </p>
          </div>
        </div>
        <Button size="sm" onClick={() => window.print()}>
          <Printer className="size-3.5" /> Yazdır
        </Button>
      </div>

      {kagitlar.length === 0 ? (
        <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          Bu emir için refakat kağıdı üretilemedi — modelin parçası yok.
        </p>
      ) : (
        <div className="yazdir-alan flex flex-col gap-4">
          {kagitlar.map((k) => (
            <Kagit key={`${k.emirId}-${k.parcaId}`} k={k} />
          ))}
        </div>
      )}
    </div>
  );
}
