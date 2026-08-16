"use client";

import * as React from "react";
import { Canvas } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import { BoxGeometry, BufferAttribute, BufferGeometry } from "three";

import { cn } from "@/lib/utils";
import type { KenarSecim } from "@/lib/data";

/**
 * Parça görsel önizlemesi (react-three-fiber) — teknik çizim üslubu.
 *
 * Reçetede kenar bandı 4 toggle ile seçiliyor ama "üst + sol" gibi bir seçim
 * yazıyla okunduğunda hangi kenarın bantlandığı zihinde canlanmıyor —
 * özellikle atölyede. Burada parça gerçek en/boy oranıyla çizilir, bantlı
 * kenarlar malzeme rengiyle şerit olarak belirginleşir ve ölçüler kotalarla
 * (ölçü çizgileri) sahnenin üstünde yazar.
 *
 * Ölçüler mm; sahneye normalize edilir (en büyük kenar 2 birim).
 */

export type BantGosterim = {
  /** Malzeme adı (lejantta ve etikette görünür). */
  ad: string;
  kenarlar: KenarSecim;
};

/** Bant şeritleri için sabit palet — aynı sıradaki malzeme hep aynı renkte. */
const PALET = ["#e11d48", "#2563eb", "#16a34a", "#d97706", "#7c3aed", "#0891b2"];

const KENAR_ADI: Record<keyof KenarSecim, string> = {
  ust: "Üst",
  alt: "Alt",
  sol: "Sol",
  sag: "Sağ",
};

const sayiBicim = (n: number) =>
  n.toLocaleString("tr-TR", { maximumFractionDigits: 1 });

/** Teknik çizim renkleri — panel nötr, kotalar mürekkep. */
const RENK = {
  panel: "#c9ccd1",
  panelKenar: "#3f4652",
  kota: "#334155",
};

function kenarBantlari(bantlar: BantGosterim[], kenar: keyof KenarSecim) {
  return bantlar
    .map((b, i) => ({ ...b, renk: PALET[i % PALET.length] }))
    .filter((b) => b.kenarlar[kenar]);
}

/**
 * Düz çizgi parçalarından geometri. Ölçü çizgileri (kota) ve uç çentikleri
 * bununla kuruluyor — her biri için ayrı mesh açmak sahneyi şişirirdi.
 */
function cizgiGeometrisi(noktalar: number[][]) {
  const g = new BufferGeometry();
  g.setAttribute(
    "position",
    new BufferAttribute(new Float32Array(noktalar.flat()), 3),
  );
  return g;
}

/**
 * Sabit boyutlu etiket.
 *
 * distanceFactor KULLANILMIYOR: onunla etiket sahneye gömülü gibi ölçekleniyor
 * ve yakınlaşınca ekranı kaplayacak kadar büyüyordu.
 */
function Etiket({
  konum,
  children,
  renk,
}: {
  konum: [number, number, number];
  children: React.ReactNode;
  renk?: string;
}) {
  return (
    <Html position={konum} center zIndexRange={[10, 0]}>
      <span
        className="rounded px-1 py-px text-[10px] leading-tight font-medium whitespace-nowrap tabular-nums"
        style={
          renk
            ? { background: renk, color: "white" }
            : { background: "rgba(255,255,255,0.9)", color: RENK.kota }
        }
      >
        {children}
      </span>
    </Html>
  );
}

/** Panel gövdesi + bantlı kenar şeritleri + ölçü kotaları. */
function Panel({
  en,
  boy,
  kalinlik,
  bantlar,
}: {
  en: number;
  boy: number;
  kalinlik: number;
  bantlar: BantGosterim[];
}) {
  // En büyük kenar 2 birim olacak şekilde ölçekle: 400×2000 bir parça da,
  // 600×600 bir parça da aynı çerçeveye sığsın.
  const olcek = 2 / Math.max(en, boy);
  const g = en * olcek;
  const y = boy * olcek;
  const k = Math.max(kalinlik * olcek, 0.02);

  // Şerit kalınlığı gerçek bant kalınlığı değil; 0,4 mm hiçbir ölçekte
  // seçilemezdi, panele oranla sabit tutuluyor.
  const serit = Math.max(Math.min(g, y) * 0.03, 0.015);
  const buyuk = Math.max(g, y);
  const kotaPay = buyuk * 0.16; // kota çizgisinin panelden uzaklığı
  const centik = buyuk * 0.03;

  const kenarlar: {
    kenar: keyof KenarSecim;
    konum: [number, number, number];
    boyut: [number, number, number];
  }[] = [
    { kenar: "ust", konum: [0, y / 2 + serit / 2, 0], boyut: [g, serit, k] },
    { kenar: "alt", konum: [0, -y / 2 - serit / 2, 0], boyut: [g, serit, k] },
    { kenar: "sol", konum: [-g / 2 - serit / 2, 0, 0], boyut: [serit, y, k] },
    { kenar: "sag", konum: [g / 2 + serit / 2, 0, 0], boyut: [serit, y, k] },
  ];

  const govde = React.useMemo(() => new BoxGeometry(g, y, k), [g, y, k]);
  React.useEffect(() => () => govde.dispose(), [govde]);

  // Kotalar: en ALTTA, boy SOLDA — teknik çizim yerleşimi.
  const enKotaY = -y / 2 - kotaPay;
  const boyKotaX = -g / 2 - kotaPay;
  const kota = React.useMemo(
    () =>
      cizgiGeometrisi([
        // En kotası + uç çentikleri + uzatma çizgileri
        [-g / 2, enKotaY, 0],
        [g / 2, enKotaY, 0],
        [-g / 2, enKotaY - centik, 0],
        [-g / 2, enKotaY + centik, 0],
        [g / 2, enKotaY - centik, 0],
        [g / 2, enKotaY + centik, 0],
        [-g / 2, -y / 2, 0],
        [-g / 2, enKotaY, 0],
        [g / 2, -y / 2, 0],
        [g / 2, enKotaY, 0],
        // Boy kotası + uç çentikleri + uzatma çizgileri
        [boyKotaX, -y / 2, 0],
        [boyKotaX, y / 2, 0],
        [boyKotaX - centik, -y / 2, 0],
        [boyKotaX + centik, -y / 2, 0],
        [boyKotaX - centik, y / 2, 0],
        [boyKotaX + centik, y / 2, 0],
        [-g / 2, -y / 2, 0],
        [boyKotaX, -y / 2, 0],
        [-g / 2, y / 2, 0],
        [boyKotaX, y / 2, 0],
      ]),
    [g, y, enKotaY, boyKotaX, centik],
  );
  React.useEffect(() => () => kota.dispose(), [kota]);

  return (
    <group>
      <mesh>
        <boxGeometry args={[g, y, k]} />
        <meshStandardMaterial color={RENK.panel} roughness={0.95} />
      </mesh>
      {/* Gövde kenar çizgisi: bantsız kenarlar da seçilebilsin */}
      <lineSegments>
        <edgesGeometry args={[govde]} />
        <lineBasicMaterial color={RENK.panelKenar} />
      </lineSegments>

      {/* Ölçü kotaları */}
      <lineSegments geometry={kota}>
        <lineBasicMaterial color={RENK.kota} />
      </lineSegments>
      <Etiket konum={[0, enKotaY - centik * 2.4, 0]}>{sayiBicim(en)} mm</Etiket>
      <Etiket konum={[boyKotaX - centik * 2.4, 0, 0]}>
        {sayiBicim(boy)} mm
      </Etiket>
      {/* Kalınlık: panelin kalınlık yüzüne bakan köşede */}
      <Etiket konum={[g / 2 + kotaPay * 0.55, y / 2 + kotaPay * 0.5, k / 2]}>
        t = {sayiBicim(kalinlik)} mm
      </Etiket>

      {/* Bantlı kenarlar */}
      {kenarlar.map(({ kenar, konum, boyut }) => {
        const bagli = kenarBantlari(bantlar, kenar);
        if (bagli.length === 0) return null;
        // Etiket şeridin ORTASINDA değil ucunda: ortada dursa dar panelde
        // sol/sağ etiketleri üst üste binerdi.
        const etiketKonum: [number, number, number] =
          kenar === "sol" || kenar === "sag"
            ? [konum[0], y / 2 - serit * 4, 0]
            : [g / 2 - serit * 4, konum[1], 0];
        return (
          <group key={kenar}>
            <mesh position={konum}>
              <boxGeometry args={boyut} />
              <meshStandardMaterial color={bagli[0].renk} roughness={0.6} />
            </mesh>
            <Etiket konum={etiketKonum} renk={bagli[0].renk}>
              {KENAR_ADI[kenar]}
              {bagli.length > 1 ? ` ×${bagli.length}` : ""}
            </Etiket>
          </group>
        );
      })}
    </group>
  );
}

export function ParcaOnizleme({
  en,
  boy,
  kalinlik,
  bantlar,
  yukseklikClass = "h-56",
}: {
  en?: number;
  boy?: number;
  kalinlik?: number;
  bantlar: BantGosterim[];
  /** Sahne yüksekliği. Sheet'te kart içindekinden çok daha yüksek olmalı. */
  yukseklikClass?: string;
}) {
  if (!en || !boy) {
    return (
      <div className="flex h-48 items-center justify-center rounded-md border border-dashed bg-muted/20 px-4 text-center text-xs text-muted-foreground">
        Önizleme için parçanın en ve boy ölçüsü girilmeli.
      </div>
    );
  }

  // Kalınlık girilmediyse panel yassı görünmesin diye 18 mm varsayılır;
  // etikette bunun tahmin olduğu belirtilir.
  const kal = kalinlik && kalinlik > 0 ? kalinlik : 18;
  const bantliOlanlar = bantlar.filter(
    (b) => b.kenarlar.ust || b.kenarlar.alt || b.kenarlar.sol || b.kenarlar.sag,
  );

  return (
    <div className="flex flex-col gap-2">
      <div
        className={cn(
          "overflow-hidden rounded-md border bg-white",
          yukseklikClass,
        )}
        // Milimetrik kağıt zemini: teknik çizim hissi sahnede değil arkada
        // veriliyor, üç boyutlu ızgara döndürünce kafa karıştırıyordu.
        style={{
          backgroundImage:
            "linear-gradient(rgba(51,65,85,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(51,65,85,0.07) 1px, transparent 1px)",
          backgroundSize: "16px 16px",
        }}
      >
        <Canvas
          camera={{ position: [0.9, 0.7, 3.4], fov: 35 }}
          dpr={[1, 2]}
          frameloop="demand"
        >
          <ambientLight intensity={1.1} />
          <directionalLight position={[2, 4, 6]} intensity={0.8} />
          <directionalLight position={[-3, -2, -4]} intensity={0.25} />
          <Panel en={en} boy={boy} kalinlik={kal} bantlar={bantliOlanlar} />
          <OrbitControls
            enablePan={false}
            minDistance={2}
            maxDistance={7}
            // Dönerken parça hep ayakta kalsın: alttan bakış kafa karıştırır.
            minPolarAngle={Math.PI / 6}
            maxPolarAngle={Math.PI - Math.PI / 6}
          />
        </Canvas>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        <span className="tabular-nums">
          {sayiBicim(en)} × {sayiBicim(boy)} mm · {sayiBicim(kal)} mm
          {!kalinlik || kalinlik <= 0 ? " (varsayılan)" : ""}
        </span>
        {bantliOlanlar.length === 0 ? (
          <span>Bantlı kenar yok</span>
        ) : (
          bantliOlanlar.map((b, i) => {
            const kenarlar = (
              Object.keys(KENAR_ADI) as (keyof KenarSecim)[]
            ).filter((k) => b.kenarlar[k]);
            return (
              <span key={i} className="inline-flex items-center gap-1">
                <span
                  className="size-2.5 rounded-full"
                  style={{ background: PALET[i % PALET.length] }}
                />
                <span className="max-w-40 truncate">{b.ad}</span>
                <span className="text-muted-foreground/70">
                  {kenarlar.map((k) => KENAR_ADI[k]).join(", ")}
                </span>
              </span>
            );
          })
        )}
      </div>
    </div>
  );
}
