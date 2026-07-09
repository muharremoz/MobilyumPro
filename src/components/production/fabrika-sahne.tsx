"use client";

import * as React from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import { MathUtils, type Group, type Mesh } from "three";

import {
  DEPO,
  FABRIKA,
  ISTASYONLAR,
  aktifIstasyon,
  type FabrikaEmri,
  type Istasyon,
  type IstasyonSlug,
} from "@/lib/fabrika";

/**
 * Low-poly fabrika sahnesi (react-three-fiber).
 * Kroki: solda sevkiyat, ortada depo/montaj/paketleme, sağda kesim/bantlama/delik.
 * Canlı dekor: tur atan forklift, yürüyen işçiler, dönen testere, konveyör.
 * Paletler istasyon değiştirince kayarak taşınır.
 */

type SahneProps = {
  emirler: FabrikaEmri[];
  seciliIstasyon: IstasyonSlug | null;
  seciliEmirId: string | null;
  onIstasyonSec: (slug: IstasyonSlug | null) => void;
  onEmirSec: (id: string | null) => void;
};

function merkez(k: { x: number; z: number; g: number; d: number }) {
  return { cx: k.x + k.g / 2, cz: k.z + k.d / 2 };
}

// ── Palet (bir üretim emri) — hedefine yumuşakça kayar ───────────────────
function Palet({
  emir,
  hedef,
  isleniyor,
  secili,
  onSec,
}: {
  emir: FabrikaEmri;
  hedef: [number, number, number];
  isleniyor: boolean;
  secili: boolean;
  onSec: () => void;
}) {
  const ref = React.useRef<Group>(null);
  const [hover, setHover] = React.useState(false);
  const ilk = React.useRef(true);

  useFrame(({ clock }, delta) => {
    const g = ref.current;
    if (!g) return;
    if (ilk.current) {
      g.position.set(hedef[0], hedef[1], hedef[2]);
      ilk.current = false;
    }
    // İstasyon değişince kayarak taşın.
    g.position.x = MathUtils.damp(g.position.x, hedef[0], 2.2, delta);
    g.position.z = MathUtils.damp(g.position.z, hedef[2], 2.2, delta);
    const bob = isleniyor
      ? Math.sin(clock.elapsedTime * 2.2) * 0.08 + 0.1
      : 0;
    g.position.y = hedef[1] + bob;
  });

  return (
    <group
      ref={ref}
      onClick={(e) => {
        e.stopPropagation();
        onSec();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHover(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHover(false);
        document.body.style.cursor = "auto";
      }}
    >
      <mesh castShadow position={[0, 0.1, 0]}>
        <boxGeometry args={[1.1, 0.2, 1.1]} />
        <meshStandardMaterial color="#a16207" />
      </mesh>
      <mesh castShadow position={[0, 0.55, 0]}>
        <boxGeometry args={[0.95, 0.7, 0.95]} />
        <meshStandardMaterial
          color={secili ? "#f97316" : hover ? "#d6b98c" : "#c8a165"}
          emissive={secili ? "#f97316" : "#000000"}
          emissiveIntensity={secili ? 0.25 : 0}
        />
      </mesh>
      {isleniyor && (
        <mesh position={[0, 1.15, 0]}>
          <sphereGeometry args={[0.12, 12, 12]} />
          <meshStandardMaterial
            color="#10b981"
            emissive="#10b981"
            emissiveIntensity={1.4}
          />
        </mesh>
      )}
      {(hover || secili) && (
        <Html center position={[0, 1.7, 0]} className="pointer-events-none">
          <div className="rounded-md bg-[#171717] px-2 py-1 text-[11px] whitespace-nowrap text-white shadow-lg">
            {emir.id} · {emir.modelAd} ×{emir.adet}
          </div>
        </Html>
      )}
    </group>
  );
}

// ── İşçi — verilen elips üzerinde yürür (kol/bacak salınımlı) ────────────
function Isci({
  merkezX,
  merkezZ,
  rx = 1.6,
  rz = 1.2,
  hiz = 0.5,
  faz = 0,
  yelek = "#f97316",
  zeminY = 0.24, // istasyon/depo platformunun üst yüzü (0.22) + bot payı
}: {
  merkezX: number;
  merkezZ: number;
  rx?: number;
  rz?: number;
  hiz?: number;
  faz?: number;
  yelek?: string;
  zeminY?: number;
}) {
  const ref = React.useRef<Group>(null);
  const solKol = React.useRef<Group>(null);
  const sagKol = React.useRef<Group>(null);
  const solBacak = React.useRef<Group>(null);
  const sagBacak = React.useRef<Group>(null);

  useFrame(({ clock }) => {
    const g = ref.current;
    if (!g) return;
    const t = clock.elapsedTime * hiz + faz;
    const x = merkezX + Math.cos(t) * rx;
    const z = merkezZ + Math.sin(t) * rz;
    // Yürüme yönüne dön; adım döngüsüyle gövde hafifçe iner-kalkar.
    g.rotation.y = Math.atan2(-(Math.sin(t) * rx), Math.cos(t) * rz);
    const adim = Math.sin(t * 6);
    g.position.set(x, zeminY + Math.abs(Math.cos(t * 6)) * 0.03, z);
    // Karşıt kol-bacak salınımı (kalça/omuz pivotlu).
    if (solBacak.current) solBacak.current.rotation.x = adim * 0.55;
    if (sagBacak.current) sagBacak.current.rotation.x = -adim * 0.55;
    if (solKol.current) solKol.current.rotation.x = -adim * 0.45;
    if (sagKol.current) sagKol.current.rotation.x = adim * 0.45;
  });

  const ten = "#e8b98e";
  const pantolon = "#3f3f46";
  const gomlek = "#52525b";

  return (
    <group ref={ref}>
      {/* Bacaklar — kalça pivotlu */}
      {(
        [
          [0.09, solBacak],
          [-0.09, sagBacak],
        ] as const
      ).map(([dx, bacakRef]) => (
        <group key={dx} ref={bacakRef} position={[dx, 0.78, 0]}>
          <mesh castShadow position={[0, -0.37, 0]}>
            <cylinderGeometry args={[0.065, 0.075, 0.72, 8]} />
            <meshStandardMaterial color={pantolon} />
          </mesh>
          {/* Bot */}
          <mesh castShadow position={[0, -0.75, 0.05]}>
            <boxGeometry args={[0.13, 0.09, 0.27]} />
            <meshStandardMaterial color="#262626" />
          </mesh>
        </group>
      ))}
      {/* Gövde — yelek */}
      <mesh castShadow position={[0, 1.03, 0]}>
        <cylinderGeometry args={[0.17, 0.2, 0.52, 12]} />
        <meshStandardMaterial color={yelek} />
      </mesh>
      {/* Yelek reflektör şeritleri */}
      {[-0.08, 0.08].map((dx) => (
        <mesh key={dx} position={[dx, 1.03, 0.17]}>
          <boxGeometry args={[0.045, 0.42, 0.035]} />
          <meshStandardMaterial
            color="#f4f4f5"
            emissive="#f4f4f5"
            emissiveIntensity={0.15}
          />
        </mesh>
      ))}
      {/* Kollar — omuz pivotlu, gömlek kollu + ten eller */}
      {(
        [
          [0.25, solKol],
          [-0.25, sagKol],
        ] as const
      ).map(([dx, kolRef]) => (
        <group key={dx} ref={kolRef} position={[dx, 1.24, 0]}>
          <mesh castShadow position={[0, -0.23, 0]}>
            <cylinderGeometry args={[0.05, 0.045, 0.48, 8]} />
            <meshStandardMaterial color={gomlek} />
          </mesh>
          <mesh castShadow position={[0, -0.5, 0]}>
            <sphereGeometry args={[0.055, 8, 8]} />
            <meshStandardMaterial color={ten} />
          </mesh>
        </group>
      ))}
      {/* Boyun + kafa */}
      <mesh position={[0, 1.32, 0]}>
        <cylinderGeometry args={[0.06, 0.07, 0.1, 8]} />
        <meshStandardMaterial color={ten} />
      </mesh>
      <mesh castShadow position={[0, 1.46, 0]}>
        <sphereGeometry args={[0.14, 14, 14]} />
        <meshStandardMaterial color={ten} />
      </mesh>
      {/* Baret — tepe + siperlik */}
      <mesh position={[0, 1.54, 0]}>
        <sphereGeometry args={[0.135, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#facc15" />
      </mesh>
      <mesh position={[0, 1.54, 0.03]}>
        <cylinderGeometry args={[0.16, 0.16, 0.025, 14]} />
        <meshStandardMaterial color="#eab308" />
      </mesh>
    </group>
  );
}

// ── Forklift — koridor turunu atar ───────────────────────────────────────
const FORKLIFT_ROTA: [number, number][] = [
  [23.5, 4],
  [23.5, 24.5],
  [10.5, 24.5],
  [10.5, 4],
];

function Forklift() {
  const ref = React.useRef<Group>(null);
  const teker = React.useRef<Mesh[]>([]);

  // Rota toplam uzunluğu + segmentler
  const segmentler = React.useMemo(() => {
    const s: { a: [number, number]; b: [number, number]; uz: number }[] = [];
    for (let i = 0; i < FORKLIFT_ROTA.length; i++) {
      const a = FORKLIFT_ROTA[i];
      const b = FORKLIFT_ROTA[(i + 1) % FORKLIFT_ROTA.length];
      s.push({ a, b, uz: Math.hypot(b[0] - a[0], b[1] - a[1]) });
    }
    return s;
  }, []);
  const toplamUz = segmentler.reduce((t, s) => t + s.uz, 0);

  useFrame(({ clock }) => {
    const g = ref.current;
    if (!g) return;
    const hiz = 2.4; // birim/sn
    let mesafe = (clock.elapsedTime * hiz) % toplamUz;
    for (const seg of segmentler) {
      if (mesafe <= seg.uz) {
        const t = mesafe / seg.uz;
        const x = seg.a[0] + (seg.b[0] - seg.a[0]) * t;
        const z = seg.a[1] + (seg.b[1] - seg.a[1]) * t;
        g.position.set(x, 0.12, z);
        g.rotation.y = Math.atan2(seg.b[0] - seg.a[0], seg.b[1] - seg.a[1]);
        break;
      }
      mesafe -= seg.uz;
    }
    teker.current.forEach((w) => w && (w.rotation.x = clock.elapsedTime * 4));
  });

  return (
    <group ref={ref}>
      {/* Şasi */}
      <mesh castShadow position={[0, 0.45, -0.1]}>
        <boxGeometry args={[0.9, 0.5, 1.4]} />
        <meshStandardMaterial color="#f59e0b" />
      </mesh>
      {/* Kabin + koltuk arkalığı */}
      <mesh castShadow position={[0, 0.95, -0.45]}>
        <boxGeometry args={[0.7, 0.5, 0.5]} />
        <meshStandardMaterial color="#171717" />
      </mesh>
      {/* Tavan çubukları + tavan */}
      <mesh position={[0, 1.45, -0.15]}>
        <boxGeometry args={[0.8, 0.06, 1]} />
        <meshStandardMaterial color="#404040" />
      </mesh>
      {[-0.32, 0.32].map((dx) => (
        <mesh key={dx} position={[dx, 1.1, 0.3]}>
          <cylinderGeometry args={[0.04, 0.04, 0.75, 6]} />
          <meshStandardMaterial color="#404040" />
        </mesh>
      ))}
      {/* Asansör direği */}
      <mesh castShadow position={[0, 0.85, 0.75]}>
        <boxGeometry args={[0.7, 1.5, 0.1]} />
        <meshStandardMaterial color="#525252" />
      </mesh>
      {/* Çatallar */}
      {[-0.22, 0.22].map((dx) => (
        <mesh key={dx} position={[dx, 0.18, 1.25]}>
          <boxGeometry args={[0.12, 0.06, 0.9]} />
          <meshStandardMaterial color="#737373" />
        </mesh>
      ))}
      {/* Yük */}
      <mesh castShadow position={[0, 0.55, 1.2]}>
        <boxGeometry args={[0.7, 0.55, 0.7]} />
        <meshStandardMaterial color="#c8a165" />
      </mesh>
      {/* Tekerler */}
      {(
        [
          [-0.45, 0.35],
          [0.45, 0.35],
          [-0.45, -0.55],
          [0.45, -0.55],
        ] as const
      ).map(([dx, dz], i) => (
        <mesh
          key={i}
          ref={(el) => {
            if (el) teker.current[i] = el;
          }}
          position={[dx, 0.22, dz]}
          rotation={[0, 0, Math.PI / 2]}
        >
          <cylinderGeometry args={[0.22, 0.22, 0.16, 12]} />
          <meshStandardMaterial color="#262626" />
        </mesh>
      ))}
    </group>
  );
}

// ── Dekorlar ─────────────────────────────────────────────────────────────
function TestereMasasi({ x, z }: { x: number; z: number }) {
  const disk = React.useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (disk.current) disk.current.rotation.y = clock.elapsedTime * 8;
  });
  return (
    <group position={[x, 0, z]}>
      <mesh castShadow position={[0, 0.55, 0]}>
        <boxGeometry args={[2.6, 0.16, 1.6]} />
        <meshStandardMaterial color="#94a3b8" />
      </mesh>
      {[
        [-1.1, -0.6],
        [1.1, -0.6],
        [-1.1, 0.6],
        [1.1, 0.6],
      ].map(([dx, dz], i) => (
        <mesh key={i} position={[dx, 0.28, dz]}>
          <boxGeometry args={[0.12, 0.55, 0.12]} />
          <meshStandardMaterial color="#64748b" />
        </mesh>
      ))}
      {/* Dönen testere diski */}
      <mesh ref={disk} position={[0.4, 0.75, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.32, 0.32, 0.04, 20]} />
        <meshStandardMaterial color="#e5e7eb" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Kesilen plaka */}
      <mesh position={[-0.5, 0.68, 0]}>
        <boxGeometry args={[1.3, 0.06, 1]} />
        <meshStandardMaterial color="#d6b98c" />
      </mesh>
    </group>
  );
}

function Konveyor({
  x,
  z,
  uzunluk,
  yatay = true,
}: {
  x: number;
  z: number;
  uzunluk: number;
  yatay?: boolean;
}) {
  const kutu = React.useRef<Group>(null);
  useFrame(({ clock }) => {
    if (!kutu.current) return;
    const t = (clock.elapsedTime * 0.7) % 1;
    const off = -uzunluk / 2 + 0.6 + t * (uzunluk - 1.2);
    kutu.current.position.set(yatay ? off : 0, 0.78, yatay ? 0 : off);
  });
  return (
    <group position={[x, 0, z]} rotation={[0, yatay ? 0 : Math.PI / 2, 0]}>
      <mesh castShadow position={[0, 0.55, 0]}>
        <boxGeometry args={[uzunluk, 0.14, 0.9]} />
        <meshStandardMaterial color="#525252" />
      </mesh>
      {[-uzunluk / 2 + 0.4, uzunluk / 2 - 0.4].map((dx, i) => (
        <mesh key={i} position={[dx, 0.28, 0]}>
          <boxGeometry args={[0.14, 0.5, 0.7]} />
          <meshStandardMaterial color="#404040" />
        </mesh>
      ))}
      <group ref={kutu}>
        <mesh castShadow>
          <boxGeometry args={[0.55, 0.4, 0.55]} />
          <meshStandardMaterial color="#c8a165" />
        </mesh>
      </group>
    </group>
  );
}

function CalismaMasasi({ x, z, renk = "#a8a29e" }: { x: number; z: number; renk?: string }) {
  return (
    <group position={[x, 0, z]}>
      <mesh castShadow position={[0, 0.5, 0]}>
        <boxGeometry args={[2, 0.14, 1.1]} />
        <meshStandardMaterial color={renk} />
      </mesh>
      {[
        [-0.85, -0.4],
        [0.85, -0.4],
        [-0.85, 0.4],
        [0.85, 0.4],
      ].map(([dx, dz], i) => (
        <mesh key={i} position={[dx, 0.25, dz]}>
          <boxGeometry args={[0.1, 0.5, 0.1]} />
          <meshStandardMaterial color="#78716c" />
        </mesh>
      ))}
      <mesh castShadow position={[0.3, 0.68, 0]}>
        <boxGeometry args={[0.6, 0.22, 0.5]} />
        <meshStandardMaterial color="#d6b98c" />
      </mesh>
    </group>
  );
}

// ── İstasyon platformu ───────────────────────────────────────────────────
function IstasyonAlani({
  istasyon,
  isleyen,
  bekleyen,
  secili,
  onSec,
  children,
}: {
  istasyon: Istasyon;
  isleyen: number;
  bekleyen: number;
  secili: boolean;
  onSec: () => void;
  children?: React.ReactNode;
}) {
  const { konum } = istasyon;
  const { cx, cz } = merkez(konum);
  const [hover, setHover] = React.useState(false);

  const zemin = isleyen > 0 ? "#d1fae5" : bekleyen > 0 ? "#fef3c7" : "#e5e5e5";
  const kenar = secili
    ? istasyon.renk
    : isleyen > 0
      ? "#10b981"
      : bekleyen > 0
        ? "#f59e0b"
        : "#c4c4c4";

  return (
    <group>
      <mesh
        receiveShadow
        position={[cx, 0.11, cz]}
        onClick={(e) => {
          e.stopPropagation();
          onSec();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHover(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHover(false);
          document.body.style.cursor = "auto";
        }}
      >
        <boxGeometry args={[konum.g, 0.22, konum.d]} />
        <meshStandardMaterial color={hover || secili ? "#ffffff" : zemin} />
      </mesh>
      <mesh position={[cx, 0.02, cz]}>
        <boxGeometry args={[konum.g + 0.3, 0.06, konum.d + 0.3]} />
        <meshStandardMaterial color={kenar} />
      </mesh>
      <Html
        center
        position={[cx, 2.6, konum.z + 0.6]}
        className="pointer-events-none select-none"
        distanceFactor={30}
      >
        <div className="flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 whitespace-nowrap shadow-[0_0_0_1px_rgba(0,0,0,0.08)] backdrop-blur-sm">
          <span
            className="size-2 rounded-full"
            style={{ backgroundColor: istasyon.renk }}
          />
          <span className="text-xs font-medium text-[#171717]">
            {istasyon.ad}
          </span>
          {isleyen + bekleyen > 0 && (
            <span className="rounded-full bg-[#171717] px-1.5 text-[10px] text-white tabular-nums">
              {isleyen + bekleyen}
            </span>
          )}
        </div>
      </Html>
      {children}
    </group>
  );
}

function Makine({
  x,
  z,
  g = 1.6,
  d = 1.2,
  h = 1.1,
  renk = "#9ca3af",
}: {
  x: number;
  z: number;
  g?: number;
  d?: number;
  h?: number;
  renk?: string;
}) {
  return (
    <group position={[x, 0, z]}>
      <mesh castShadow position={[0, h / 2 + 0.2, 0]}>
        <boxGeometry args={[g, h, d]} />
        <meshStandardMaterial color={renk} />
      </mesh>
      <mesh position={[0, h + 0.32, 0]}>
        <boxGeometry args={[g * 0.55, 0.22, d * 0.55]} />
        <meshStandardMaterial color="#6b7280" />
      </mesh>
    </group>
  );
}

function Raf({ x, z, uzunluk }: { x: number; z: number; uzunluk: number }) {
  return (
    <group position={[x, 0, z]}>
      {[0.5, 1.1, 1.7].map((y) => (
        <mesh key={y} castShadow position={[0, y, 0]}>
          <boxGeometry args={[uzunluk, 0.08, 1]} />
          <meshStandardMaterial color="#78716c" />
        </mesh>
      ))}
      {[-uzunluk / 2 + 0.1, uzunluk / 2 - 0.1].map((dx) => (
        <mesh key={dx} position={[dx, 1, 0]}>
          <boxGeometry args={[0.12, 2, 1]} />
          <meshStandardMaterial color="#57534e" />
        </mesh>
      ))}
      {[-1, 0.4, 1.5].map((dx, i) => (
        <mesh key={i} castShadow position={[dx, 0.78, 0]}>
          <boxGeometry args={[0.7, 0.5, 0.7]} />
          <meshStandardMaterial color={i % 2 ? "#d6b98c" : "#c8a165"} />
        </mesh>
      ))}
    </group>
  );
}

// ── Ana sahne ────────────────────────────────────────────────────────────
export default function FabrikaSahne({
  emirler,
  seciliIstasyon,
  seciliEmirId,
  onIstasyonSec,
  onEmirSec,
}: SahneProps) {
  // İstasyon → emirler + palet hedef konumları (paletler kökte render edilir
  // ki istasyon değişince kayarak taşınabilsinler).
  const paletler = React.useMemo(() => {
    const gruplar = new Map<IstasyonSlug, FabrikaEmri[]>();
    for (const i of ISTASYONLAR) gruplar.set(i.slug, []);
    for (const e of emirler) {
      if (e.durum === "Tamamlandı") continue;
      const slug = aktifIstasyon(e);
      if (slug) gruplar.get(slug)?.push(e);
    }
    const sonuc: {
      emir: FabrikaEmri;
      hedef: [number, number, number];
      isleniyor: boolean;
      istasyon: IstasyonSlug;
    }[] = [];
    for (const ist of ISTASYONLAR) {
      const grup = gruplar.get(ist.slug) ?? [];
      const { konum } = ist;
      const kolon = Math.floor((konum.g - 1.6) / 1.5) || 1;
      grup.forEach((e, i) => {
        sonuc.push({
          emir: e,
          istasyon: ist.slug,
          hedef: [
            konum.x + 1.2 + (i % kolon) * 1.5,
            0.12,
            konum.z + 1.2 + Math.floor(i / kolon) * 1.5,
          ],
          isleniyor: e.adimlar.some(
            (a) => a.istasyon === ist.slug && a.durum === "İşleniyor",
          ),
        });
      });
    }
    return { gruplar, sonuc };
  }, [emirler]);

  const depoM = merkez(DEPO.konum);

  return (
    <Canvas
      shadows
      camera={{ position: [46, 34, 46], fov: 32 }}
      onPointerMissed={() => {
        onIstasyonSec(null);
        onEmirSec(null);
      }}
    >
      <color attach="background" args={["#fafafa"]} />
      <ambientLight intensity={0.85} />
      <directionalLight
        position={[25, 40, 15]}
        intensity={1.4}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
      />
      <OrbitControls
        target={[FABRIKA.g / 2, 0, FABRIKA.d / 2]}
        maxPolarAngle={Math.PI / 2.3}
        minDistance={14}
        maxDistance={90}
      />

      {/* Zeminler + duvarlar */}
      <mesh
        receiveShadow
        rotation={[-Math.PI / 2, 0, 0]}
        position={[FABRIKA.g / 2, -0.02, FABRIKA.d / 2]}
      >
        <planeGeometry args={[FABRIKA.g + 30, FABRIKA.d + 30]} />
        <meshStandardMaterial color="#ececec" />
      </mesh>
      <mesh receiveShadow position={[FABRIKA.g / 2, 0, FABRIKA.d / 2]}>
        <boxGeometry args={[FABRIKA.g, 0.12, FABRIKA.d]} />
        <meshStandardMaterial color="#f5f5f5" />
      </mesh>
      {(
        [
          [FABRIKA.g / 2, 0, 1.2, FABRIKA.g, 0.35],
          [FABRIKA.g / 2, FABRIKA.d, 1.2, FABRIKA.g, 0.35],
          [0, FABRIKA.d / 2, 1.2, 0.35, FABRIKA.d],
          [FABRIKA.g, FABRIKA.d / 2, 1.2, 0.35, FABRIKA.d],
        ] as const
      ).map(([x, z, h, g, d], i) => (
        <mesh key={i} castShadow position={[x, h / 2, z]}>
          <boxGeometry args={[g, h, d]} />
          <meshStandardMaterial color="#dcdcdc" />
        </mesh>
      ))}

      {/* Depo */}
      <group>
        <mesh receiveShadow position={[depoM.cx, 0.11, depoM.cz]}>
          <boxGeometry args={[DEPO.konum.g, 0.22, DEPO.konum.d]} />
          <meshStandardMaterial color="#e5e5e5" />
        </mesh>
        <Html
          center
          position={[depoM.cx, 2.6, DEPO.konum.z + 0.6]}
          className="pointer-events-none select-none"
          distanceFactor={30}
        >
          <div className="rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium whitespace-nowrap text-[#171717] shadow-[0_0_0_1px_rgba(0,0,0,0.08)]">
            {DEPO.ad}
          </div>
        </Html>
        <Raf x={depoM.cx} z={DEPO.konum.z + 2.2} uzunluk={DEPO.konum.g - 2.5} />
        <Raf x={depoM.cx} z={DEPO.konum.z + 5.4} uzunluk={DEPO.konum.g - 2.5} />
        <Isci merkezX={depoM.cx} merkezZ={DEPO.konum.z + 3.8} rx={2.6} rz={1} hiz={0.4} yelek="#737373" />
      </group>

      {/* İstasyonlar + bölüme özel dekor */}
      {ISTASYONLAR.map((ist) => {
        const grup = paletler.gruplar.get(ist.slug) ?? [];
        const isleyen = grup.filter((e) =>
          e.adimlar.some(
            (a) => a.istasyon === ist.slug && a.durum === "İşleniyor",
          ),
        ).length;
        const { konum } = ist;
        const { cx } = merkez(konum);
        return (
          <IstasyonAlani
            key={ist.slug}
            istasyon={ist}
            isleyen={isleyen}
            bekleyen={grup.length - isleyen}
            secili={seciliIstasyon === ist.slug}
            onSec={() => {
              onIstasyonSec(ist.slug);
              onEmirSec(null);
            }}
          >
            {ist.slug === "kesim" && (
              <>
                <TestereMasasi x={cx + 1.5} z={konum.z + konum.d - 1.6} />
                <Isci merkezX={cx + 1.5} merkezZ={konum.z + konum.d - 1.6} rx={2.2} rz={1.1} hiz={0.55} faz={1} yelek="#3b82f6" />
              </>
            )}
            {ist.slug === "bantlama" && (
              <Konveyor x={cx} z={konum.z + konum.d - 1.3} uzunluk={konum.g - 2.5} />
            )}
            {ist.slug === "delik" && (
              <>
                <Makine x={konum.x + 2} z={konum.z + konum.d - 1.6} g={2.2} h={1.5} renk="#94a3b8" />
                <Makine x={konum.x + konum.g - 2} z={konum.z + konum.d - 1.6} g={2.2} h={1.3} renk="#a8a29e" />
                <Isci merkezX={cx} merkezZ={konum.z + konum.d - 2.6} rx={2.8} rz={0.9} hiz={0.45} faz={3} yelek="#06b6d4" />
              </>
            )}
            {ist.slug === "montaj" && (
              <>
                <CalismaMasasi x={konum.x + 2.2} z={konum.z + konum.d - 1.3} />
                <CalismaMasasi x={konum.x + konum.g - 2.2} z={konum.z + konum.d - 1.3} />
                <Isci merkezX={cx} merkezZ={konum.z + konum.d - 1.9} rx={2.4} rz={0.7} hiz={0.6} faz={2} yelek="#f97316" />
              </>
            )}
            {ist.slug === "paketleme" && (
              <>
                <Konveyor x={cx} z={konum.z + konum.d - 1.2} uzunluk={konum.g - 2.5} />
                <Isci merkezX={cx} merkezZ={konum.z + 1.6} rx={2.2} rz={0.6} hiz={0.5} faz={4.5} yelek="#f59e0b" />
              </>
            )}
            {ist.slug === "sevkiyat" && (
              <Isci merkezX={cx} merkezZ={konum.z + 4} rx={1.6} rz={2.6} hiz={0.45} faz={0.7} yelek="#10b981" />
            )}
          </IstasyonAlani>
        );
      })}

      {/* Paletler (kökte — istasyonlar arası kayarak taşınır) */}
      {paletler.sonuc.map(({ emir, hedef, isleniyor, istasyon }) => (
        <Palet
          key={emir.id}
          emir={emir}
          hedef={hedef}
          isleniyor={isleniyor}
          secili={seciliEmirId === emir.id}
          onSec={() => {
            onEmirSec(emir.id);
            onIstasyonSec(istasyon);
          }}
        />
      ))}

      {/* Koridorda tur atan forklift */}
      <Forklift />
    </Canvas>
  );
}
