import { adetHesapla, formulHesapla, type FormulDegiskenleri } from "./formul";
import type { KenarSecim, ProjeParca } from "./data";

/**
 * Modül iskeleti — gövdenin standart parçaları ve ölçü kuralları.
 *
 * Teklif hazırlarken asıl dert şu: 30 modüllük bir otel işi için yüzlerce
 * parçayı tek tek girmek. Oysa bir dolabın parçaları hep aynı; değişen
 * yalnız ölçüler ve KAPAK SAYISI. Kullanıcı kapak sayısını artırdığında
 * kapak ve arkalık kutuları kendiliğinden çoğalsın diye ölçüler burada
 * formülle tanımlı.
 *
 * İskelet ayrı bir "şablon" ekranında değil KODDA duruyor: fabrikanın her
 * teklif öncesi şablon kurmasını beklemek, çözmeye çalıştığımız "teklif için
 * bir sürü tanım yapma" derdinin aynısını geri getirirdi.
 */

export type IskeletParca = {
  ad: string;
  adetFormul: string;
  enFormul: string;
  boyFormul: string;
  bant?: KenarSecim;
};

/**
 * Gövde iskeleti.
 *
 * ARKALIK ve KAPAK kapak sayısıyla çoğalır: dolap kapak sayısı arttıkça
 * gövde bölmelere ayrılır, her bölmenin kendi arkalığı ve kapağı olur.
 * Alt/üst/yanlar tek kalır ve ölçüleri değişmez — gövdenin dış hattı aynı.
 */
export const GOVDE_ISKELETI: IskeletParca[] = [
  {
    ad: "ALT",
    adetFormul: "1",
    enFormul: "en - 2*kalinlik",
    boyFormul: "derinlik",
    bant: { sag: true },
  },
  {
    ad: "ÜST",
    adetFormul: "1",
    enFormul: "en - 2*kalinlik",
    boyFormul: "derinlik",
    bant: { sag: true },
  },
  {
    ad: "SOL YAN",
    adetFormul: "1",
    enFormul: "derinlik",
    boyFormul: "boy",
    bant: { sag: true },
  },
  {
    ad: "SAĞ YAN",
    adetFormul: "1",
    enFormul: "derinlik",
    boyFormul: "boy",
    bant: { sag: true },
  },
  {
    ad: "ARKALIK",
    adetFormul: "kapakSayisi",
    enFormul: "(en - 2*kalinlik) / kapakSayisi",
    boyFormul: "boy - 2*kalinlik",
  },
  {
    ad: "KAPAK",
    adetFormul: "kapakSayisi",
    enFormul: "(en - 2*kalinlik) / kapakSayisi",
    boyFormul: "boy - 2*kalinlik",
    bant: { ust: true, alt: true, sol: true, sag: true },
  },
  {
    ad: "RAF",
    adetFormul: "rafSayisi",
    enFormul: "en - 2*kalinlik",
    boyFormul: "derinlik - 20",
    bant: { ust: true },
  },
];

/**
 * Gövde panelleri — arayüzde TEK KART içinde toplanır.
 *
 * Dördü de aynı levhadan kesilir ve aynı kenardan bantlanır; ayrı kartlarda
 * dururken kullanıcı aynı malzemeyi dört kez seçmek zorunda kalıyordu.
 */
export const GOVDE_PARCALARI = ["ALT", "ÜST", "SOL YAN", "SAĞ YAN"];

/** Kapak sayısıyla çoğalan parçalar — kullanıcıya "otomatik" diye gösterilir. */
export const COGALAN_PARCALAR = ["ARKALIK", "KAPAK"];

const yuvarla = (n: number) => Math.round(n * 100) / 100;

/**
 * İskeletten parça kutularını türetir.
 *
 * Kullanıcının ELLE DEĞİŞTİRDİĞİ kutular korunur: kapak sayısını 3'ten 4'e
 * çıkarmak, kullanıcının düzelttiği kapak ölçüsünü geri almamalı. Eşleştirme
 * ad + sıra üzerinden yapılır.
 */
export function parcalariTuret(
  d: FormulDegiskenleri,
  mevcut: ProjeParca[] = [],
): ProjeParca[] {
  const elle = new Map<string, ProjeParca>();
  for (const p of mevcut) if (p.elleDegisti) elle.set(p.ad, p);

  const sonuc: ProjeParca[] = [];
  let sira = 0;
  for (const i of GOVDE_ISKELETI) {
    const adet = adetHesapla(i.adetFormul, d);
    const kac = adet.ok ? adet.deger : 0;
    if (kac <= 0) continue; // rafSayisi 0 iken RAF kutusu çıkmaz

    const en = formulHesapla(i.enFormul, d);
    const boy = formulHesapla(i.boyFormul, d);
    // Çoğalan parçalar TEK TEK kutu olur: kullanıcı "3 adet kapak" değil üç
    // ayrı kapak kutusu görmek istiyor, çünkü birinin ölçüsünü ayrı
    // düzeltebilmeli.
    const cogalir = COGALAN_PARCALAR.includes(i.ad);
    const kutuSayisi = cogalir ? kac : 1;
    for (let n = 0; n < kutuSayisi; n++) {
      const ad = cogalir && kac > 1 ? `${i.ad} ${n + 1}` : i.ad;
      const korunan = elle.get(ad);
      sira++;
      sonuc.push(
        korunan
          ? { ...korunan, sira }
          : {
              ad,
              sira,
              adet: cogalir ? 1 : kac,
              en: en.ok ? yuvarla(en.deger) : undefined,
              boy: boy.ok ? yuvarla(boy.deger) : undefined,
              kalinlik: d.kalinlik || undefined,
              bant: { ...i.bant },
              malzemeler: (mevcut.find((m) => m.ad === ad)?.malzemeler ??
                []) as ProjeParca["malzemeler"],
            },
      );
    }
  }
  return sonuc;
}
