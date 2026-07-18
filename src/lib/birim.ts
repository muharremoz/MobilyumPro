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

/**
 * Dönüşüm tanımlı ve ANLAMLI mı.
 *
 * Çarpan yoksa/0 ise yok sayılır. Alış birimi stok birimiyle AYNIYSA da yok
 * sayılır: "1 m² = ? m²" sorusunun tek anlamlı cevabı 1'dir, çarpan alanına
 * başka bir sayı girilmiş olsa bile onu uygulamak bakiyeyi bozardı.
 */
export function donusumVar(b: BirimBilgisi): boolean {
  if (!b.alisBirimi || b.alisBirimi === b.stokBirimi) return false;
  return !!b.alisCarpani && b.alisCarpani > 0;
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

/**
 * Satır tutarı — birim farkındalıklı.
 *
 * Miktar ALIŞ biriminde girilir, fiyat ise karta göre alış VEYA stok
 * biriminde. İkisi farklı birimdeyse düz `miktar × fiyat` yanlış tutar verir:
 * 10 levha, m² fiyatı 85,03 ile 850 ₺ çıkardı; doğrusu 58,8 m² × 85,03 =
 * 5.000 ₺. Tutar bu yüzden HER İKİSİ de stok birimine çevrilerek hesaplanır.
 *
 * Fiyat alış birimindeyse sonuç zaten `miktar × fiyat`'a eşittir
 * ((miktar × çarpan) × (fiyat / çarpan)), yani eski davranış korunur.
 */
export function satirTutari(
  b: BirimBilgisi,
  alisMiktari: number,
  girilenFiyat: number,
): number {
  return stokMiktarina(b, alisMiktari) * stokBirimFiyati(b, girilenFiyat);
}
