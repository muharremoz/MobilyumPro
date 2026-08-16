"use client";

import * as React from "react";
import { Canvas } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import { BoxGeometry } from "three";

import { cn } from "@/lib/utils";
import type { KenarSecim } from "@/lib/data";

/**
 * Parça görsel önizlemesi (react-three-fiber).
 *
 * Reçetede kenar bandı 4 toggle ile seçiliyor ama "üst + sol" gibi bir seçim
 * yazıyla okunduğunda hangi kenarın bantlandığı zihinde canlanmıyor —
 * özellikle atölyede. Burada parça gerçek en/boy oranıyla çizilir, bantlı
 * kenarlar malzeme rengiyle kalın şerit olarak belirginleşir.
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

/**
 * Bir kenarı bantlayan malzemeler (birden fazla olabilir; ilkinin rengi
 * şeride verilir, kalanı etikete yazılır).
 */
function kenarBantlari(bantlar: BantGosterim[], kenar: keyof KenarSecim) {
  return bantlar
    .map((b, i) => ({ ...b, renk: PALET[i % PALET.length] }))
    .filter((b) => b.kenarlar[kenar]);
}

/** Panel gövdesi + bantlı kenar şeritleri. */
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
  const g = en * olcek; // genişlik (X)
  const y = boy * olcek; // yükseklik (Y)
  const k = Math.max(kalinlik * olcek, 0.02); // kalınlık (Z), görünür kalsın

  // Şerit kalınlığı kenar bandının gerçek kalınlığı değil; görünürlük için
  // panele oranla sabit tutulur (0.4 mm bant hiçbir ölçekte seçilmezdi).
  const serit = Math.max(Math.min(g, y) * 0.045, 0.02);

  // Etiket şeridin üstünde değil DIŞINDA duruyor: dar bir panelde sol ve sağ
  // etiketleri panelin ortasında üst üste biniyordu.
  const etiketPay = Math.max(g, y) * 0.22;
  const kenarlar: {
    kenar: keyof KenarSecim;
    konum: [number, number, number];
    etiket: [number, number, number];
    boyut: [number, number, number];
  }[] = [
    {
      kenar: "ust",
      konum: [0, y / 2 + serit / 2, 0],
      etiket: [0, y / 2 + etiketPay, 0],
      boyut: [g, serit, k],
    },
    {
      kenar: "alt",
      konum: [0, -y / 2 - serit / 2, 0],
      etiket: [0, -y / 2 - etiketPay, 0],
      boyut: [g, serit, k],
    },
    {
      kenar: "sol",
      konum: [-g / 2 - serit / 2, 0, 0],
      etiket: [-g / 2 - etiketPay, 0, 0],
      boyut: [serit, y, k],
    },
    {
      kenar: "sag",
      konum: [g / 2 + serit / 2, 0, 0],
      etiket: [g / 2 + etiketPay, 0, 0],
      boyut: [serit, y, k],
    },
  ];

  // Kenar çizgisi geometrisi: ölçü değişmedikçe yeniden kurulmasın.
  const govde = React.useMemo(() => new BoxGeometry(g, y, k), [g, y, k]);
  React.useEffect(() => () => govde.dispose(), [govde]);

  return (
    <group>
      {/* Panel gövdesi — suntalam rengi */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[g, y, k]} />
        <meshStandardMaterial color="#d8c7a9" roughness={0.85} />
      </mesh>
      {/* Gövde kenar çizgisi: bantsız kenarlar da seçilebilsin */}
      <lineSegments>
        <edgesGeometry args={[govde]} />
        <lineBasicMaterial color="#8a7355" />
      </lineSegments>

      {kenarlar.map(({ kenar, konum, etiket, boyut }) => {
        const bagli = kenarBantlari(bantlar, kenar);
        if (bagli.length === 0) return null;
        return (
          <group key={kenar}>
            <mesh position={konum}>
              <boxGeometry args={boyut} />
              <meshStandardMaterial
                color={bagli[0].renk}
                roughness={0.4}
                metalness={0.05}
              />
            </mesh>
            <Html position={etiket} center distanceFactor={9}>
              <span
                className="rounded px-1 py-0.5 text-[9px] font-medium whitespace-nowrap text-white shadow"
                style={{ background: bagli[0].renk }}
              >
                {KENAR_ADI[kenar]}
                {bagli.length > 1 ? ` (${bagli.length})` : ""}
              </span>
            </Html>
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
  /** Sahne yüksekliği. Modalda kart içindekinden çok daha yüksek olmalı. */
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
          "overflow-hidden rounded-md border bg-gradient-to-b from-muted/10 to-muted/40",
          yukseklikClass,
        )}
      >
        <Canvas
          camera={{ position: [1.4, 1.1, 2.6], fov: 40 }}
          dpr={[1, 2]}
          frameloop="demand"
        >
          <ambientLight intensity={0.9} />
          <directionalLight position={[3, 4, 5]} intensity={1.1} />
          <directionalLight position={[-3, -2, -4]} intensity={0.3} />
          <Panel en={en} boy={boy} kalinlik={kal} bantlar={bantliOlanlar} />
          <OrbitControls
            enablePan={false}
            minDistance={1.8}
            maxDistance={6}
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
