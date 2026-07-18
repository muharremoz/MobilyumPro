/**
 * PROJE STANDARDI — alış birimi ↔ stok birimi dönüşümü.
 *
 * Gerçek akış: levha ADETLE alınır, m² ile stoklanır. Kart tek birimliyken
 * kullanıcının miktarı kafadan çevirip girmesi gerekiyordu; 10 levha yerine
 * 58,8 yazmayı unutan biri stoğu sessizce eksik bırakıyordu.
 *
 * Fiyat tarafı ayrıca tehlikeli: tedarikçi ₺/levha veriyorsa ve bu sayı
 * doğrudan maliyetFiyati'na (₺/m²) yazılırsa maliyet ~6 kat şişer ve tüm
 * reçete maliyetleri bozulur. Tedarikçiye göre fiyatın hangi birimde
 * verildiği değiştiği için bu da kart başına tutulur.
 */

export type BirimBilgisi = {
  /** Stok birimi — bakiyenin ve reçetelerin birimi. */
  stokBirimi: string;
  /** Satın alma birimi; boşsa dönüşüm yok. */
  alisBirimi?: string;
  /** 1 alış birimi kaç stok birimi eder. */
  alisCarpani?: number;
  /** Girilen fiyat hangi birime ait. */
  alisFiyatBirimi?: "alis" | "stok";
};

/** Dönüşüm tanımlı ve anlamlı mı (çarpan yoksa/0 ise yok sayılır). */
export function donusumVar(b: BirimBilgisi): boolean {
  return !!b.alisBirimi && !!b.alisCarpani && b.alisCarpani > 0;
}

/** Alış fişinde gösterilecek birim. */
export function girisBirimi(b: BirimBilgisi): string {
  return donusumVar(b) ? b.alisBirimi! : b.stokBirimi;
}

/** Alış miktarı → stok miktarı (10 levha → 58,8 m²). */
export function stokMiktarina(b: BirimBilgisi, alisMiktari: number): number {
  return donusumVar(b) ? alisMiktari * b.alisCarpani! : alisMiktari;
}

/**
 * Girilen birim fiyat → STOK BİRİMİ başına maliyet.
 *
 * Fiyat alış birimindeyse çarpana bölünür (₺/levha → ₺/m²); zaten stok
 * birimindeyse dokunulmaz. maliyetFiyati her zaman stok birimi başınadır —
 * reçete maliyeti onu stok birimindeki miktarla çarpıyor.
 */
export function stokBirimFiyati(b: BirimBilgisi, girilenFiyat: number): number {
  if (!donusumVar(b)) return girilenFiyat;
  return b.alisFiyatBirimi === "stok" ? girilenFiyat : girilenFiyat / b.alisCarpani!;
}

/** Kullanıcıya gösterilecek özet: "1 adet = 5,88 m²". */
export function donusumEtiketi(b: BirimBilgisi): string | null {
  if (!donusumVar(b)) return null;
  const c = b.alisCarpani!.toLocaleString("tr-TR", {
    maximumFractionDigits: 4,
  });
  return `1 ${b.alisBirimi} = ${c} ${b.stokBirimi}`;
}
