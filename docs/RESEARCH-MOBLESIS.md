# RESEARCH — MÖBLESİS (Rakip/Referans Analizi)

> Kaynak: 2026-06-03 web araştırması. Hedef fabrikanın kullandığı yazılım.
> Not: MÖBLESİS resmi sitesine doğrudan erişilemedi (sunucu datacenter IP'lerini
> bloklamış olabilir); bilgiler dolaylı kaynaklardan (App Store, sektör siteleri,
> Çelmo Mobilya) derlendi. **Saha ziyaretinde teyit edilecek.**

## Özet
- **MÖBLESİS**, mobilya üretimine özel bir **ERP** yazılımı.
- İnegöl/Bursa (Türkiye'nin mobilya üretim merkezi) ekosisteminden.
- Kullanan örnek üretici: **Çelmo Mobilya**.

## Tespit edilen özellikler
- **Barkod tabanlı üretim ve satış takibi.**
- **Saha terminalleri** (panel/dokunmatik PC) ile üretim sahasında veri toplama
  → **istasyon bazlı (station-by-station) üretim ilerleme takibi.**
- **B2B bayi sipariş uygulaması** (iOS/Android): bayiler ERP'ye bağlı sipariş
  girer, **alternatif malzeme/kumaş** seçebilir, talep doğrudan fabrikaya düşer.
- Mobilyaya özel kavramlar: **ürün setleri, kumaş/renk varyantları, kutu/paket
  bilgileri.**
- Uçtan uca: siparişten üretime ve sevkiyata.

## Bizim ürünümüz için çıkarımlar
1. **İstasyon bazlı üretim takibi gerçek bir beklenti** → DATA-MODEL'deki
   `work_order_operations` + `production_stages` doğru yönde. (Açık soru #1'in
   muhtemel cevabı: evet, istasyon istasyon takip.)
2. **Barkod + saha terminali** önemli bir kullanım senaryosu → MVP'de barkodlu
   stok/üretim hareketi ve dokunmatik-dostu (tablet) bir üretim ekranı düşünülmeli.
3. **Varyant yönetimi (kumaş/renk/ölçü)** mobilyada kritik → ürün/BOM modeline
   varyant boyutu eklemeyi değerlendir (şu an taslakta yok — saha sonrası karar).
4. **B2B bayi portalı** ileride güçlü bir satış kanalı modülü olabilir (Satış fazı).

## Saha ziyaretinde gözlemlenecekler (MÖBLESİS ekranları)
- [ ] Üretim sahasındaki terminal: barkod okutunca ne oluyor? Hangi istasyon /
      iş emri / ilerleme görünüyor?
- [ ] İş emri ekranı: bir sipariş kaç aşamadan geçiyor, nasıl görünüyor?
- [ ] Ürün/reçete tanımı: kumaş/renk/varyant nasıl tanımlanıyor?
- [ ] Bayi sipariş akışı: bayi neyi seçebiliyor, fabrikaya nasıl düşüyor?
- [ ] Stok ekranı: hangi birimler (plaka/m²/metretül), fire nasıl?
- [ ] **En çok şikayet edilen / en yavaş bulunan şey** (çalışana sor) → farkımız burada.

## Kaynaklar
- Çelmo Mobilya (MÖBLESİS kullanıcısı): https://celmomobilya.com/en/
- Çelmo Mobilya uygulaması (MÖBLESİS entegre, App Store): https://apps.apple.com/us/app/%C3%A7elmo-mobilya/id6478965601
- İnegöl yazılım/mobilya ekosistemi: https://avenyazilim.com/inegol-yazilim-inovasyonun-merkezi/
