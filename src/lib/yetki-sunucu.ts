import "server-only";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { getOturum, oturumZorunlu, type Oturum } from "@/lib/oturum";
import {
  BOS_YETKI,
  MODULLER,
  type ModulYetki,
  type YetkiBayrak,
} from "@/lib/yetki";

/**
 * Yetki çözümleme — sunucu tarafı tek kaynak.
 *
 * Öncelik: Yönetici > kullanıcı override > rol > kapalı.
 *
 * Yönetici rolü matrise TABİ DEĞİL: matristeki bir yanlış tık yöneticileri
 * kendi yetki ekranından da dışarıda bırakır ve geri açmanın uygulama içinden
 * yolu kalmazdı. Matris diğer roller için anlamlı çalışmaya devam eder.
 *
 * Kaydı olmayan modül kapalıdır (BOS_YETKI) — yeni bir modül eklendiğinde
 * kimse otomatik erişim kazanmasın diye varsayılan "kapalı".
 */

const TAM_YETKI: ModulYetki = {
  isList: true,
  isAdd: true,
  isUpdate: true,
  isDelete: true,
};

/** Bir kullanıcının tüm modüllerdeki efektif yetkileri. */
export async function kullaniciYetkileri(
  oturum: Oturum,
): Promise<Record<string, ModulYetki>> {
  if (oturum.yonetici) {
    // Düz nesne döner (Proxy değil): Object.entries/keys ile dolaşan kod
    // sessizce boş liste görmesin.
    return Object.fromEntries(MODULLER.map((m) => [m.id, TAM_YETKI]));
  }

  const [rolRows, kullaniciRows] = await Promise.all([
    db.rolYetki.findMany({ where: { rolAd: oturum.rol } }),
    db.kullaniciYetki.findMany({ where: { kullaniciId: oturum.id } }),
  ]);

  const sonuc: Record<string, ModulYetki> = {};
  for (const r of rolRows) {
    sonuc[r.modul] = {
      isList: r.isList,
      isAdd: r.isAdd,
      isUpdate: r.isUpdate,
      isDelete: r.isDelete,
    };
  }
  // Kullanıcı override'ı rolün üstüne yazar (modül bazında tam değiştirir).
  for (const r of kullaniciRows) {
    sonuc[r.modul] = {
      isList: r.isList,
      isAdd: r.isAdd,
      isUpdate: r.isUpdate,
      isDelete: r.isDelete,
    };
  }
  return sonuc;
}

/** Tek bir bayrak sorgusu — oturum verilmezse çerezden okunur. */
export async function yetkiVarMi(
  modul: string,
  bayrak: YetkiBayrak,
  oturum?: Oturum | null,
): Promise<boolean> {
  const o = oturum ?? (await getOturum());
  if (!o) return false;
  if (o.yonetici) return true;
  const yetkiler = await kullaniciYetkileri(o);
  return (yetkiler[modul] ?? BOS_YETKI)[bayrak];
}

/**
 * Server action'lar için: yetki yoksa hata fırlatır.
 * Kimlik parametre olarak ALINMAZ — istemciden gelen id'ye güvenilmez.
 */
export async function yetkiZorunlu(
  modul: string,
  bayrak: YetkiBayrak,
): Promise<Oturum> {
  const o = await oturumZorunlu();
  if (o.yonetici) return o;
  const yetkiler = await kullaniciYetkileri(o);
  if (!(yetkiler[modul] ?? BOS_YETKI)[bayrak]) {
    throw new Error("Bu işlem için yetkiniz yok.");
  }
  return o;
}

/**
 * Sayfalar için: modülü listeleme yetkisi yoksa panoya döner.
 * Hata sayfası yerine yönlendirme — yetkisiz kullanıcıya "burada bir şey var
 * ama giremiyorsun" demek yerine sessizce girebildiği yere alır.
 */
export async function sayfaYetkisi(modul: string): Promise<Oturum> {
  const o = await oturumZorunlu();
  if (o.yonetici) return o;
  const yetkiler = await kullaniciYetkileri(o);
  if (!(yetkiler[modul] ?? BOS_YETKI).isList) redirect("/");
  return o;
}
