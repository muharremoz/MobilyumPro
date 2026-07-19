BEGIN TRY

BEGIN TRAN;

-- CreateSchema
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = N'dbo') EXEC sp_executesql N'CREATE SCHEMA [dbo];';

-- CreateTable
CREATE TABLE [dbo].[parca] (
    [id] NVARCHAR(1000) NOT NULL,
    [ad] NVARCHAR(1000) NOT NULL,
    [kategori] NVARCHAR(1000) NOT NULL,
    [aciklama] NVARCHAR(max),
    [durum] NVARCHAR(1000) NOT NULL CONSTRAINT [parca_durum_df] DEFAULT 'Aktif',
    [kaba_uzunluk] DECIMAL(10,2),
    [kaba_genislik] DECIMAL(10,2),
    [net_uzunluk] DECIMAL(10,2),
    [net_genislik] DECIMAL(10,2),
    [bitmis_uzunluk] DECIMAL(10,2),
    [bitmis_genislik] DECIMAL(10,2),
    [kalinlik] DECIMAL(10,2),
    CONSTRAINT [parca_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[makine] (
    [id] INT NOT NULL IDENTITY(1,1),
    [ad] NVARCHAR(1000) NOT NULL,
    [istasyon] NVARCHAR(1000) NOT NULL,
    [sira] INT NOT NULL CONSTRAINT [makine_sira_df] DEFAULT 0,
    [durum] NVARCHAR(1000) NOT NULL CONSTRAINT [makine_durum_df] DEFAULT 'Aktif',
    CONSTRAINT [makine_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[parca_islem] (
    [id] INT NOT NULL IDENTITY(1,1),
    [parca_id] NVARCHAR(1000) NOT NULL,
    [sira] INT NOT NULL,
    [istasyon] NVARCHAR(1000) NOT NULL,
    [makine_id] INT,
    [operasyon] NVARCHAR(1000) NOT NULL,
    [aciklama] NVARCHAR(1000),
    CONSTRAINT [parca_islem_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[parca_dokuman] (
    [id] INT NOT NULL IDENTITY(1,1),
    [parca_id] NVARCHAR(1000) NOT NULL,
    [ad] NVARCHAR(1000) NOT NULL,
    [url] NVARCHAR(max) NOT NULL,
    [tip] NVARCHAR(1000) NOT NULL CONSTRAINT [parca_dokuman_tip_df] DEFAULT 'Diğer',
    CONSTRAINT [parca_dokuman_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[recete_versiyon] (
    [id] INT NOT NULL IDENTITY(1,1),
    [parca_id] NVARCHAR(1000) NOT NULL,
    [versiyon_no] INT NOT NULL,
    [tarih] DATETIME2 NOT NULL CONSTRAINT [recete_versiyon_tarih_df] DEFAULT CURRENT_TIMESTAMP,
    [aciklama] NVARCHAR(max),
    [satirlar] NVARCHAR(max) NOT NULL,
    CONSTRAINT [recete_versiyon_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [recete_versiyon_parca_id_versiyon_no_key] UNIQUE NONCLUSTERED ([parca_id],[versiyon_no])
);

-- CreateTable
CREATE TABLE [dbo].[recete_satiri] (
    [id] INT NOT NULL IDENTITY(1,1),
    [parca_id] NVARCHAR(1000) NOT NULL,
    [tip] NVARCHAR(1000) NOT NULL,
    [malzeme_id] NVARCHAR(1000),
    [alt_parca_id] NVARCHAR(1000),
    [miktar] DECIMAL(14,3) NOT NULL,
    [fire] DECIMAL(5,2) NOT NULL CONSTRAINT [recete_satiri_fire_df] DEFAULT 0,
    [istasyon] NVARCHAR(1000),
    CONSTRAINT [recete_satiri_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[model_parca] (
    [id] INT NOT NULL IDENTITY(1,1),
    [model_id] NVARCHAR(1000) NOT NULL,
    [parca_id] NVARCHAR(1000) NOT NULL,
    [miktar] DECIMAL(14,3) NOT NULL,
    CONSTRAINT [model_parca_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[depo] (
    [id] NVARCHAR(1000) NOT NULL,
    [ad] NVARCHAR(1000) NOT NULL,
    [sehir] NVARCHAR(1000) NOT NULL,
    [kapasite] INT NOT NULL CONSTRAINT [depo_kapasite_df] DEFAULT 0,
    [doluluk] INT NOT NULL CONSTRAINT [depo_doluluk_df] DEFAULT 0,
    [durum] NVARCHAR(1000) NOT NULL CONSTRAINT [depo_durum_df] DEFAULT 'Aktif',
    CONSTRAINT [depo_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[musteri] (
    [id] NVARCHAR(1000) NOT NULL,
    [ad] NVARCHAR(1000) NOT NULL,
    [email] NVARCHAR(1000),
    [sehir] NVARCHAR(1000),
    CONSTRAINT [musteri_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[siparis] (
    [id] NVARCHAR(1000) NOT NULL,
    [musteri_id] NVARCHAR(1000),
    [musteri_ad] NVARCHAR(1000) NOT NULL,
    [tarih] DATE NOT NULL,
    [tutar] DECIMAL(14,2) NOT NULL CONSTRAINT [siparis_tutar_df] DEFAULT 0,
    [durum] NVARCHAR(1000) NOT NULL CONSTRAINT [siparis_durum_df] DEFAULT 'Beklemede',
    [urun_adedi] INT NOT NULL CONSTRAINT [siparis_urun_adedi_df] DEFAULT 1,
    CONSTRAINT [siparis_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[uretim_emri] (
    [id] NVARCHAR(1000) NOT NULL,
    [ref_tip] NVARCHAR(1000) NOT NULL CONSTRAINT [uretim_emri_ref_tip_df] DEFAULT 'model',
    [model_id] NVARCHAR(1000) NOT NULL,
    [model_ad] NVARCHAR(1000) NOT NULL,
    [adet] INT NOT NULL CONSTRAINT [uretim_emri_adet_df] DEFAULT 1,
    [durum] NVARCHAR(1000) NOT NULL CONSTRAINT [uretim_emri_durum_df] DEFAULT 'Planlandı',
    [oncelik] NVARCHAR(1000) CONSTRAINT [uretim_emri_oncelik_df] DEFAULT 'Normal',
    [olusturma] DATE NOT NULL,
    [termin_baslangic] DATE,
    [termin] DATE,
    [kaynak_siparis] NVARCHAR(1000),
    [musteri] NVARCHAR(1000),
    [hedef_depo] NVARCHAR(1000),
    [not] NVARCHAR(max),
    CONSTRAINT [uretim_emri_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[uretim_emri_adim] (
    [id] INT NOT NULL IDENTITY(1,1),
    [emir_id] NVARCHAR(1000) NOT NULL,
    [istasyon] NVARCHAR(1000) NOT NULL,
    [sira] INT NOT NULL,
    [durum] NVARCHAR(1000) NOT NULL CONSTRAINT [uretim_emri_adim_durum_df] DEFAULT 'Bekliyor',
    [baslangic] DATETIME2,
    [bitis] DATETIME2,
    [not] NVARCHAR(max),
    CONSTRAINT [uretim_emri_adim_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [uretim_emri_adim_emir_id_sira_key] UNIQUE NONCLUSTERED ([emir_id],[sira])
);

-- CreateTable
CREATE TABLE [dbo].[cari] (
    [id] NVARCHAR(1000) NOT NULL,
    [ad] NVARCHAR(1000) NOT NULL,
    [tam_ad] NVARCHAR(1000),
    [tip] NVARCHAR(1000) NOT NULL,
    [sinif] NVARCHAR(1000) NOT NULL,
    [yetkili] NVARCHAR(1000),
    [yetkili_unvan] NVARCHAR(1000),
    [yetkili_telefon] NVARCHAR(1000),
    [yetkili_email] NVARCHAR(1000),
    [telefon] NVARCHAR(1000),
    [telefon2] NVARCHAR(1000),
    [telefon3] NVARCHAR(1000),
    [fax] NVARCHAR(1000),
    [email] NVARCHAR(1000),
    [web_site] NVARCHAR(1000),
    [satis_fiyat_tipi] NVARCHAR(1000) NOT NULL CONSTRAINT [cari_satis_fiyat_tipi_df] DEFAULT 'Satış Fiyatı 1',
    [iskonto_orani] DECIMAL(5,2) NOT NULL CONSTRAINT [cari_iskonto_orani_df] DEFAULT 0,
    [temsilci] NVARCHAR(1000),
    [sube] NVARCHAR(1000),
    [muhasebe_kodu] NVARCHAR(1000),
    [tc_kimlik] NVARCHAR(1000),
    [vergi_no] NVARCHAR(1000),
    [vergi_dairesi] NVARCHAR(1000),
    [unvan] NVARCHAR(1000),
    [ulke] NVARCHAR(1000),
    [bolge] NVARCHAR(1000),
    [sehir] NVARCHAR(1000),
    [semt] NVARCHAR(1000),
    [adres] NVARCHAR(max),
    [bakiye] DECIMAL(14,2) NOT NULL CONSTRAINT [cari_bakiye_df] DEFAULT 0,
    [para_birimi] NVARCHAR(1000) NOT NULL CONSTRAINT [cari_para_birimi_df] DEFAULT 'TL',
    [durum] NVARCHAR(1000) NOT NULL CONSTRAINT [cari_durum_df] DEFAULT 'Aktif',
    [not] NVARCHAR(max),
    [create_date] DATETIME2 NOT NULL CONSTRAINT [cari_create_date_df] DEFAULT CURRENT_TIMESTAMP,
    [create_user_id] NVARCHAR(1000),
    [update_date] DATETIME2 NOT NULL,
    [update_user_id] NVARCHAR(1000),
    CONSTRAINT [cari_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[cari_banka] (
    [id] INT NOT NULL IDENTITY(1,1),
    [cari_id] NVARCHAR(1000) NOT NULL,
    [banka_adi] NVARCHAR(1000) NOT NULL,
    [sube] NVARCHAR(1000),
    [iban] NVARCHAR(1000),
    [aciklama] NVARCHAR(1000),
    CONSTRAINT [cari_banka_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[cari_sube] (
    [id] INT NOT NULL IDENTITY(1,1),
    [cari_id] NVARCHAR(1000) NOT NULL,
    [sube_adi] NVARCHAR(1000) NOT NULL,
    [yetkili] NVARCHAR(1000),
    [email] NVARCHAR(1000),
    [telefon] NVARCHAR(1000),
    [aciklama] NVARCHAR(1000),
    [ulke] NVARCHAR(1000),
    [sehir] NVARCHAR(1000),
    [semt] NVARCHAR(1000),
    [adres] NVARCHAR(max),
    CONSTRAINT [cari_sube_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[cari_yetkili] (
    [id] INT NOT NULL IDENTITY(1,1),
    [cari_id] NVARCHAR(1000) NOT NULL,
    [yetkili] NVARCHAR(1000) NOT NULL,
    [gorevi] NVARCHAR(1000),
    [email] NVARCHAR(1000),
    [telefon] NVARCHAR(1000),
    [sube_adi] NVARCHAR(1000),
    [aciklama] NVARCHAR(1000),
    CONSTRAINT [cari_yetkili_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[cari_crm] (
    [id] INT NOT NULL IDENTITY(1,1),
    [cari_id] NVARCHAR(1000) NOT NULL,
    [tarih] DATE NOT NULL,
    [personel] NVARCHAR(1000),
    [tip] NVARCHAR(1000) NOT NULL,
    [durum] NVARCHAR(1000) NOT NULL CONSTRAINT [cari_crm_durum_df] DEFAULT 'Planlandı',
    [aciklama] NVARCHAR(max),
    CONSTRAINT [cari_crm_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[cari_dokuman] (
    [id] INT NOT NULL IDENTITY(1,1),
    [cari_id] NVARCHAR(1000) NOT NULL,
    [ad] NVARCHAR(1000) NOT NULL,
    [url] NVARCHAR(max) NOT NULL,
    [tip] NVARCHAR(1000) NOT NULL CONSTRAINT [cari_dokuman_tip_df] DEFAULT 'Diğer',
    [gecerlilik] DATE,
    CONSTRAINT [cari_dokuman_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[cari_islem] (
    [id] NVARCHAR(1000) NOT NULL,
    [cari_id] NVARCHAR(1000) NOT NULL,
    [tarih] DATE NOT NULL,
    [tur] NVARCHAR(1000) NOT NULL,
    [tutar] DECIMAL(14,2) NOT NULL,
    [belge] NVARCHAR(1000),
    [aciklama] NVARCHAR(max) NOT NULL,
    CONSTRAINT [cari_islem_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[rol] (
    [id] INT NOT NULL IDENTITY(1,1),
    [ad] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [rol_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [rol_ad_key] UNIQUE NONCLUSTERED ([ad])
);

-- CreateTable
CREATE TABLE [dbo].[rol_yetki] (
    [id] INT NOT NULL IDENTITY(1,1),
    [rol_ad] NVARCHAR(1000) NOT NULL,
    [modul] NVARCHAR(1000) NOT NULL,
    [is_list] BIT NOT NULL CONSTRAINT [rol_yetki_is_list_df] DEFAULT 0,
    [is_add] BIT NOT NULL CONSTRAINT [rol_yetki_is_add_df] DEFAULT 0,
    [is_update] BIT NOT NULL CONSTRAINT [rol_yetki_is_update_df] DEFAULT 0,
    [is_delete] BIT NOT NULL CONSTRAINT [rol_yetki_is_delete_df] DEFAULT 0,
    CONSTRAINT [rol_yetki_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [rol_yetki_rol_ad_modul_key] UNIQUE NONCLUSTERED ([rol_ad],[modul])
);

-- CreateTable
CREATE TABLE [dbo].[departman] (
    [id] INT NOT NULL IDENTITY(1,1),
    [ad] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [departman_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [departman_ad_key] UNIQUE NONCLUSTERED ([ad])
);

-- CreateTable
CREATE TABLE [dbo].[kullanici_yetki] (
    [id] INT NOT NULL IDENTITY(1,1),
    [kullanici_id] NVARCHAR(1000) NOT NULL,
    [modul] NVARCHAR(1000) NOT NULL,
    [is_list] BIT NOT NULL CONSTRAINT [kullanici_yetki_is_list_df] DEFAULT 0,
    [is_add] BIT NOT NULL CONSTRAINT [kullanici_yetki_is_add_df] DEFAULT 0,
    [is_update] BIT NOT NULL CONSTRAINT [kullanici_yetki_is_update_df] DEFAULT 0,
    [is_delete] BIT NOT NULL CONSTRAINT [kullanici_yetki_is_delete_df] DEFAULT 0,
    CONSTRAINT [kullanici_yetki_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [kullanici_yetki_kullanici_id_modul_key] UNIQUE NONCLUSTERED ([kullanici_id],[modul])
);

-- CreateTable
CREATE TABLE [dbo].[yetki_seti] (
    [id] INT NOT NULL IDENTITY(1,1),
    [ad] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [yetki_seti_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [yetki_seti_ad_key] UNIQUE NONCLUSTERED ([ad])
);

-- CreateTable
CREATE TABLE [dbo].[yetki_seti_detay] (
    [id] INT NOT NULL IDENTITY(1,1),
    [set_id] INT NOT NULL,
    [modul] NVARCHAR(1000) NOT NULL,
    [is_list] BIT NOT NULL CONSTRAINT [yetki_seti_detay_is_list_df] DEFAULT 0,
    [is_add] BIT NOT NULL CONSTRAINT [yetki_seti_detay_is_add_df] DEFAULT 0,
    [is_update] BIT NOT NULL CONSTRAINT [yetki_seti_detay_is_update_df] DEFAULT 0,
    [is_delete] BIT NOT NULL CONSTRAINT [yetki_seti_detay_is_delete_df] DEFAULT 0,
    CONSTRAINT [yetki_seti_detay_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [yetki_seti_detay_set_id_modul_key] UNIQUE NONCLUSTERED ([set_id],[modul])
);

-- CreateTable
CREATE TABLE [dbo].[kullanici] (
    [id] NVARCHAR(1000) NOT NULL,
    [kullanici_adi] NVARCHAR(1000) NOT NULL,
    [ad_soyad] NVARCHAR(1000) NOT NULL,
    [email] NVARCHAR(1000),
    [telefon] NVARCHAR(1000),
    [departman] NVARCHAR(1000),
    [istasyon] NVARCHAR(1000),
    [sifre_hash] NVARCHAR(1000) NOT NULL,
    [rol] NVARCHAR(1000) NOT NULL CONSTRAINT [kullanici_rol_df] DEFAULT 'Kullanıcı',
    [durum] NVARCHAR(1000) NOT NULL CONSTRAINT [kullanici_durum_df] DEFAULT 'Aktif',
    [eski_tarihli_islem] BIT NOT NULL CONSTRAINT [kullanici_eski_tarihli_islem_df] DEFAULT 0,
    [olusturma] DATE NOT NULL,
    CONSTRAINT [kullanici_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [kullanici_kullanici_adi_key] UNIQUE NONCLUSTERED ([kullanici_adi])
);

-- CreateTable
CREATE TABLE [dbo].[kullanici_cari_yetki] (
    [id] INT NOT NULL IDENTITY(1,1),
    [kullanici_id] NVARCHAR(1000) NOT NULL,
    [cari_id] NVARCHAR(1000) NOT NULL,
    [goruntule] BIT NOT NULL CONSTRAINT [kullanici_cari_yetki_goruntule_df] DEFAULT 1,
    [islem_yap] BIT NOT NULL CONSTRAINT [kullanici_cari_yetki_islem_yap_df] DEFAULT 1,
    CONSTRAINT [kullanici_cari_yetki_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [kullanici_cari_yetki_kullanici_id_cari_id_key] UNIQUE NONCLUSTERED ([kullanici_id],[cari_id])
);

-- CreateTable
CREATE TABLE [dbo].[liste_ayar] (
    [id] INT NOT NULL IDENTITY(1,1),
    [liste_id] NVARCHAR(1000) NOT NULL,
    [kolonlar_json] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [liste_ayar_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [liste_ayar_liste_id_key] UNIQUE NONCLUSTERED ([liste_id])
);

-- CreateTable
CREATE TABLE [dbo].[sistem_parametre] (
    [id] INT NOT NULL IDENTITY(1,1),
    [anahtar] NVARCHAR(1000) NOT NULL,
    [deger] NVARCHAR(1000) NOT NULL,
    [aciklama] NVARCHAR(1000),
    CONSTRAINT [sistem_parametre_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [sistem_parametre_anahtar_key] UNIQUE NONCLUSTERED ([anahtar])
);

-- CreateTable
CREATE TABLE [dbo].[poset] (
    [id] NVARCHAR(1000) NOT NULL,
    [ad] NVARCHAR(1000) NOT NULL,
    [aciklama] NVARCHAR(1000),
    [durum] NVARCHAR(1000) NOT NULL CONSTRAINT [poset_durum_df] DEFAULT 'Aktif',
    [ref_tip] NVARCHAR(1000),
    [ref_id] NVARCHAR(1000),
    [paket_parca_id] NVARCHAR(1000),
    CONSTRAINT [poset_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[poset_malzeme] (
    [id] INT NOT NULL IDENTITY(1,1),
    [poset_id] NVARCHAR(1000) NOT NULL,
    [malzeme_id] NVARCHAR(1000) NOT NULL,
    [miktar] DECIMAL(14,3) NOT NULL,
    CONSTRAINT [poset_malzeme_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[sayim] (
    [id] NVARCHAR(1000) NOT NULL,
    [tarih] DATE NOT NULL,
    [depo] NVARCHAR(1000) NOT NULL,
    [durum] NVARCHAR(1000) NOT NULL CONSTRAINT [sayim_durum_df] DEFAULT 'Taslak',
    [aciklama] NVARCHAR(1000),
    [sorumlu] NVARCHAR(1000),
    [olusturma] DATE NOT NULL,
    [tamamlama] DATE,
    CONSTRAINT [sayim_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[sayim_satiri] (
    [id] INT NOT NULL IDENTITY(1,1),
    [sayim_id] NVARCHAR(1000) NOT NULL,
    [stok_id] NVARCHAR(1000) NOT NULL,
    [stok_ad] NVARCHAR(1000) NOT NULL,
    [birim] NVARCHAR(1000) NOT NULL,
    [sistem] DECIMAL(14,3) NOT NULL,
    [sayilan] DECIMAL(14,3),
    CONSTRAINT [sayim_satiri_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [sayim_satiri_sayim_id_stok_id_key] UNIQUE NONCLUSTERED ([sayim_id],[stok_id])
);

-- CreateTable
CREATE TABLE [dbo].[sayac] (
    [ad] NVARCHAR(1000) NOT NULL,
    [deger] INT NOT NULL,
    CONSTRAINT [sayac_pkey] PRIMARY KEY CLUSTERED ([ad])
);

-- CreateTable
CREATE TABLE [dbo].[stok_hareket] (
    [id] NVARCHAR(1000) NOT NULL,
    [tarih] DATE NOT NULL,
    [tur] NVARCHAR(1000) NOT NULL,
    [ref_tip] NVARCHAR(1000) NOT NULL,
    [ref_id] NVARCHAR(1000) NOT NULL,
    [miktar] DECIMAL(14,3) NOT NULL,
    [birim] NVARCHAR(1000) NOT NULL,
    [depo] NVARCHAR(1000) NOT NULL,
    [aciklama] NVARCHAR(max) NOT NULL,
    [emir_id] NVARCHAR(1000),
    [istasyon] NVARCHAR(1000),
    CONSTRAINT [stok_hareket_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[grup] (
    [id] NVARCHAR(1000) NOT NULL,
    [ad] NVARCHAR(1000) NOT NULL,
    [kod] NVARCHAR(1000) NOT NULL,
    [ust_id] NVARCHAR(1000),
    [sira] INT NOT NULL CONSTRAINT [grup_sira_df] DEFAULT 0,
    [durum] NVARCHAR(1000) NOT NULL CONSTRAINT [grup_durum_df] DEFAULT 'Aktif',
    CONSTRAINT [grup_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[tanim] (
    [id] NVARCHAR(1000) NOT NULL,
    [tip] NVARCHAR(1000) NOT NULL,
    [ad] NVARCHAR(1000) NOT NULL,
    [durum] NVARCHAR(1000) NOT NULL CONSTRAINT [tanim_durum_df] DEFAULT 'Aktif',
    [cinsler] NVARCHAR(max),
    CONSTRAINT [tanim_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [tanim_tip_ad_key] UNIQUE NONCLUSTERED ([tip],[ad])
);

-- CreateTable
CREATE TABLE [dbo].[kur] (
    [kod] NVARCHAR(1000) NOT NULL,
    [ad] NVARCHAR(1000) NOT NULL,
    [birim] INT NOT NULL CONSTRAINT [kur_birim_df] DEFAULT 1,
    [forex_alis] DECIMAL(14,4) NOT NULL CONSTRAINT [kur_forex_alis_df] DEFAULT 0,
    [forex_satis] DECIMAL(14,4) NOT NULL CONSTRAINT [kur_forex_satis_df] DEFAULT 0,
    [banknote_alis] DECIMAL(14,4) NOT NULL CONSTRAINT [kur_banknote_alis_df] DEFAULT 0,
    [banknote_satis] DECIMAL(14,4) NOT NULL CONSTRAINT [kur_banknote_satis_df] DEFAULT 0,
    [tarih] NVARCHAR(1000) NOT NULL,
    [guncelleme] DATETIME2 NOT NULL,
    CONSTRAINT [kur_pkey] PRIMARY KEY CLUSTERED ([kod])
);

-- CreateTable
CREATE TABLE [dbo].[istasyon] (
    [id] NVARCHAR(1000) NOT NULL,
    [ad] NVARCHAR(1000) NOT NULL,
    [sira] INT NOT NULL,
    [renk] NVARCHAR(1000) NOT NULL CONSTRAINT [istasyon_renk_df] DEFAULT '#737373',
    [konum_x] DECIMAL(6,2) NOT NULL CONSTRAINT [istasyon_konum_x_df] DEFAULT 0,
    [konum_z] DECIMAL(6,2) NOT NULL CONSTRAINT [istasyon_konum_z_df] DEFAULT 0,
    [konum_g] DECIMAL(6,2) NOT NULL CONSTRAINT [istasyon_konum_g_df] DEFAULT 4,
    [konum_d] DECIMAL(6,2) NOT NULL CONSTRAINT [istasyon_konum_d_df] DEFAULT 4,
    [durum] NVARCHAR(1000) NOT NULL CONSTRAINT [istasyon_durum_df] DEFAULT 'Aktif',
    CONSTRAINT [istasyon_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[alis] (
    [id] NVARCHAR(1000) NOT NULL,
    [cari_id] NVARCHAR(1000),
    [cari_ad] NVARCHAR(1000) NOT NULL,
    [tarih] DATE NOT NULL,
    [depo] NVARCHAR(1000) NOT NULL,
    [belge_no] NVARCHAR(1000),
    [aciklama] NVARCHAR(max),
    [toplam] DECIMAL(14,2) NOT NULL CONSTRAINT [alis_toplam_df] DEFAULT 0,
    CONSTRAINT [alis_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[alis_satiri] (
    [id] INT NOT NULL IDENTITY(1,1),
    [alis_id] NVARCHAR(1000) NOT NULL,
    [cari_id] NVARCHAR(1000) NOT NULL CONSTRAINT [alis_satiri_cari_id_df] DEFAULT '',
    [cari_ad] NVARCHAR(1000) NOT NULL CONSTRAINT [alis_satiri_cari_ad_df] DEFAULT '',
    [malzeme_id] NVARCHAR(1000) NOT NULL,
    [malzeme_ad] NVARCHAR(1000) NOT NULL,
    [miktar] DECIMAL(14,3) NOT NULL,
    [birim] NVARCHAR(1000) NOT NULL,
    [birim_fiyat] DECIMAL(14,2) NOT NULL,
    CONSTRAINT [alis_satiri_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[satin_alma_talep] (
    [id] NVARCHAR(1000) NOT NULL,
    [tarih] DATE NOT NULL,
    [kaynak] NVARCHAR(1000) NOT NULL CONSTRAINT [satin_alma_talep_kaynak_df] DEFAULT 'Manuel',
    [modeller] NVARCHAR(max),
    [aciklama] NVARCHAR(max),
    [durum] NVARCHAR(1000) NOT NULL CONSTRAINT [satin_alma_talep_durum_df] DEFAULT 'Beklemede',
    [alis_id] NVARCHAR(1000),
    [create_date] DATETIME2 NOT NULL CONSTRAINT [satin_alma_talep_create_date_df] DEFAULT CURRENT_TIMESTAMP,
    [depo] NVARCHAR(1000),
    [uretim_musteri] NVARCHAR(1000),
    [uretim_termin] DATE,
    [uretim_oncelik] NVARCHAR(1000),
    [uretim_emirleri] NVARCHAR(max),
    [olusturan_ad] NVARCHAR(1000),
    [onaylayan_ad] NVARCHAR(1000),
    [onay_tarihi] DATE,
    [red_nedeni] NVARCHAR(max),
    [baslatan_ad] NVARCHAR(1000),
    [baslatma_tarihi] DATE,
    CONSTRAINT [satin_alma_talep_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[satin_alma_talep_satiri] (
    [id] INT NOT NULL IDENTITY(1,1),
    [talep_id] NVARCHAR(1000) NOT NULL,
    [malzeme_id] NVARCHAR(1000) NOT NULL,
    [malzeme_ad] NVARCHAR(1000) NOT NULL,
    [miktar] DECIMAL(14,3) NOT NULL,
    [birim] NVARCHAR(1000) NOT NULL,
    [tedarik_edilen] DECIMAL(14,3) NOT NULL CONSTRAINT [satin_alma_talep_satiri_tedarik_edilen_df] DEFAULT 0,
    [cari_id] NVARCHAR(1000),
    [cari_ad] NVARCHAR(1000),
    [tahmini_fiyat] DECIMAL(14,2),
    [satir_durum] NVARCHAR(1000) NOT NULL CONSTRAINT [satin_alma_talep_satiri_satir_durum_df] DEFAULT 'Bekliyor',
    CONSTRAINT [satin_alma_talep_satiri_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[satin_alma_siparis] (
    [id] NVARCHAR(1000) NOT NULL,
    [talep_id] NVARCHAR(1000) NOT NULL,
    [cari_id] NVARCHAR(1000) NOT NULL,
    [cari_ad] NVARCHAR(1000) NOT NULL,
    [tarih] DATE NOT NULL,
    [depo] NVARCHAR(1000),
    [notlar] NVARCHAR(max),
    [durum] NVARCHAR(1000) NOT NULL CONSTRAINT [satin_alma_siparis_durum_df] DEFAULT 'Açık',
    [mail_tarihi] DATETIME2,
    [olusturan_ad] NVARCHAR(1000),
    [create_date] DATETIME2 NOT NULL CONSTRAINT [satin_alma_siparis_create_date_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [satin_alma_siparis_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[satin_alma_talep_siparis] (
    [id] INT NOT NULL IDENTITY(1,1),
    [satir_id] INT NOT NULL,
    [siparis_id] NVARCHAR(1000),
    [cari_id] NVARCHAR(1000) NOT NULL,
    [cari_ad] NVARCHAR(1000) NOT NULL,
    [miktar] DECIMAL(14,3) NOT NULL,
    [fiyat] DECIMAL(14,2),
    [tarih] DATE NOT NULL,
    [tedarik_edilen] DECIMAL(14,3) NOT NULL CONSTRAINT [satin_alma_talep_siparis_tedarik_edilen_df] DEFAULT 0,
    [alis_ids] NVARCHAR(max),
    CONSTRAINT [satin_alma_talep_siparis_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[stok] (
    [id] NVARCHAR(1000) NOT NULL,
    [kod] NVARCHAR(1000),
    [ad] NVARCHAR(1000) NOT NULL,
    [cins] NVARCHAR(1000),
    [grup] NVARCHAR(1000) NOT NULL,
    [alt_grup] NVARCHAR(1000),
    [detay_grup] NVARCHAR(1000),
    [kategori] NVARCHAR(1000),
    [marka] NVARCHAR(1000),
    [model] NVARCHAR(1000),
    [stok_birimi] NVARCHAR(1000) NOT NULL CONSTRAINT [stok_stok_birimi_df] DEFAULT 'adet',
    [alis_birimi] NVARCHAR(1000),
    [alis_carpani] DECIMAL(14,4),
    [alis_fiyat_birimi] NVARCHAR(1000),
    [puan] DECIMAL(10,2),
    [yukseklik] DECIMAL(10,2),
    [genislik] DECIMAL(10,2),
    [boy] DECIMAL(10,2),
    [kalinlik] DECIMAL(10,2),
    [agirlik] DECIMAL(10,3),
    [min_siparis] DECIMAL(14,3),
    [min_stok] DECIMAL(14,3),
    [max_stok] DECIMAL(14,3),
    [muhasebe_kodu] NVARCHAR(1000),
    [recete_parca_id] NVARCHAR(1000),
    [rota] NVARCHAR(1000) CONSTRAINT [stok_rota_df] DEFAULT 'fabrika',
    [uretici_cari_id] NVARCHAR(1000),
    [uretici_kodu] NVARCHAR(1000),
    [bolum] NVARCHAR(1000),
    [renk] NVARCHAR(1000),
    [renk_kodu] NVARCHAR(1000),
    [barkod] NVARCHAR(1000),
    [aciklama] NVARCHAR(max),
    [etiketler] NVARCHAR(max),
    [favori] BIT NOT NULL CONSTRAINT [stok_favori_df] DEFAULT 0,
    [durum] NVARCHAR(1000) NOT NULL CONSTRAINT [stok_durum_df] DEFAULT 'Aktif',
    [stok_miktar] DECIMAL(14,3) NOT NULL CONSTRAINT [stok_stok_miktar_df] DEFAULT 0,
    [varyantlar] NVARCHAR(max),
    [gorsel] NVARCHAR(max),
    [gorseller] NVARCHAR(max),
    [create_date] DATETIME2 NOT NULL CONSTRAINT [stok_create_date_df] DEFAULT CURRENT_TIMESTAMP,
    [create_user_id] NVARCHAR(1000),
    [update_date] DATETIME2 NOT NULL,
    [update_user_id] NVARCHAR(1000),
    [maliyet_fiyati] DECIMAL(14,2) NOT NULL CONSTRAINT [stok_maliyet_fiyati_df] DEFAULT 0,
    [maliyet_birimi] NVARCHAR(1000) NOT NULL CONSTRAINT [stok_maliyet_birimi_df] DEFAULT 'TL',
    [satis_fiyat1] DECIMAL(14,2) NOT NULL CONSTRAINT [stok_satis_fiyat1_df] DEFAULT 0,
    [satis_birim1] NVARCHAR(1000) NOT NULL CONSTRAINT [stok_satis_birim1_df] DEFAULT 'TL',
    [satis_fiyat2] DECIMAL(14,2) NOT NULL CONSTRAINT [stok_satis_fiyat2_df] DEFAULT 0,
    [satis_birim2] NVARCHAR(1000) NOT NULL CONSTRAINT [stok_satis_birim2_df] DEFAULT 'TL',
    [satis_fiyat3] DECIMAL(14,2) NOT NULL CONSTRAINT [stok_satis_fiyat3_df] DEFAULT 0,
    [satis_birim3] NVARCHAR(1000) NOT NULL CONSTRAINT [stok_satis_birim3_df] DEFAULT 'TL',
    [satis_fiyat4] DECIMAL(14,2) NOT NULL CONSTRAINT [stok_satis_fiyat4_df] DEFAULT 0,
    [satis_birim4] NVARCHAR(1000) NOT NULL CONSTRAINT [stok_satis_birim4_df] DEFAULT 'TL',
    [satis_fiyat5] DECIMAL(14,2) NOT NULL CONSTRAINT [stok_satis_fiyat5_df] DEFAULT 0,
    [satis_birim5] NVARCHAR(1000) NOT NULL CONSTRAINT [stok_satis_birim5_df] DEFAULT 'TL',
    CONSTRAINT [stok_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[stok_uretici] (
    [id] INT NOT NULL IDENTITY(1,1),
    [stok_id] NVARCHAR(1000) NOT NULL,
    [cari_id] NVARCHAR(1000) NOT NULL,
    [cari_ad] NVARCHAR(1000) NOT NULL,
    [uretici_kodu] NVARCHAR(1000),
    [fiyat] DECIMAL(14,2) NOT NULL CONSTRAINT [stok_uretici_fiyat_df] DEFAULT 0,
    [doviz] NVARCHAR(1000) NOT NULL CONSTRAINT [stok_uretici_doviz_df] DEFAULT 'TL',
    [min_siparis] DECIMAL(14,3),
    [tedarik_gun] INT,
    [fiyat_tarihi] DATE,
    CONSTRAINT [stok_uretici_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[stok_musteri] (
    [id] INT NOT NULL IDENTITY(1,1),
    [stok_id] NVARCHAR(1000) NOT NULL,
    [cari_id] NVARCHAR(1000) NOT NULL,
    [cari_ad] NVARCHAR(1000) NOT NULL,
    [musteri_kodu] NVARCHAR(1000),
    [min_siparis] DECIMAL(14,3),
    [fiyat] DECIMAL(14,2) NOT NULL CONSTRAINT [stok_musteri_fiyat_df] DEFAULT 0,
    [doviz] NVARCHAR(1000) NOT NULL CONSTRAINT [stok_musteri_doviz_df] DEFAULT 'TL',
    [iskonto_orani] DECIMAL(5,2) NOT NULL CONSTRAINT [stok_musteri_iskonto_orani_df] DEFAULT 0,
    CONSTRAINT [stok_musteri_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[stok_dokuman] (
    [id] INT NOT NULL IDENTITY(1,1),
    [stok_id] NVARCHAR(1000) NOT NULL,
    [ad] NVARCHAR(1000) NOT NULL,
    [url] NVARCHAR(max) NOT NULL,
    [tip] NVARCHAR(1000) NOT NULL CONSTRAINT [stok_dokuman_tip_df] DEFAULT 'Diğer',
    CONSTRAINT [stok_dokuman_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- AddForeignKey
ALTER TABLE [dbo].[parca_islem] ADD CONSTRAINT [parca_islem_parca_id_fkey] FOREIGN KEY ([parca_id]) REFERENCES [dbo].[parca]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[parca_islem] ADD CONSTRAINT [parca_islem_makine_id_fkey] FOREIGN KEY ([makine_id]) REFERENCES [dbo].[makine]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[parca_dokuman] ADD CONSTRAINT [parca_dokuman_parca_id_fkey] FOREIGN KEY ([parca_id]) REFERENCES [dbo].[parca]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[recete_versiyon] ADD CONSTRAINT [recete_versiyon_parca_id_fkey] FOREIGN KEY ([parca_id]) REFERENCES [dbo].[parca]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[recete_satiri] ADD CONSTRAINT [recete_satiri_parca_id_fkey] FOREIGN KEY ([parca_id]) REFERENCES [dbo].[parca]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[recete_satiri] ADD CONSTRAINT [recete_satiri_malzeme_id_fkey] FOREIGN KEY ([malzeme_id]) REFERENCES [dbo].[stok]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[recete_satiri] ADD CONSTRAINT [recete_satiri_alt_parca_id_fkey] FOREIGN KEY ([alt_parca_id]) REFERENCES [dbo].[parca]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[model_parca] ADD CONSTRAINT [model_parca_model_id_fkey] FOREIGN KEY ([model_id]) REFERENCES [dbo].[stok]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[model_parca] ADD CONSTRAINT [model_parca_parca_id_fkey] FOREIGN KEY ([parca_id]) REFERENCES [dbo].[parca]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[siparis] ADD CONSTRAINT [siparis_musteri_id_fkey] FOREIGN KEY ([musteri_id]) REFERENCES [dbo].[musteri]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[uretim_emri_adim] ADD CONSTRAINT [uretim_emri_adim_emir_id_fkey] FOREIGN KEY ([emir_id]) REFERENCES [dbo].[uretim_emri]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[cari_banka] ADD CONSTRAINT [cari_banka_cari_id_fkey] FOREIGN KEY ([cari_id]) REFERENCES [dbo].[cari]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[cari_sube] ADD CONSTRAINT [cari_sube_cari_id_fkey] FOREIGN KEY ([cari_id]) REFERENCES [dbo].[cari]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[cari_yetkili] ADD CONSTRAINT [cari_yetkili_cari_id_fkey] FOREIGN KEY ([cari_id]) REFERENCES [dbo].[cari]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[cari_crm] ADD CONSTRAINT [cari_crm_cari_id_fkey] FOREIGN KEY ([cari_id]) REFERENCES [dbo].[cari]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[cari_dokuman] ADD CONSTRAINT [cari_dokuman_cari_id_fkey] FOREIGN KEY ([cari_id]) REFERENCES [dbo].[cari]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[cari_islem] ADD CONSTRAINT [cari_islem_cari_id_fkey] FOREIGN KEY ([cari_id]) REFERENCES [dbo].[cari]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[rol_yetki] ADD CONSTRAINT [rol_yetki_rol_ad_fkey] FOREIGN KEY ([rol_ad]) REFERENCES [dbo].[rol]([ad]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[kullanici_yetki] ADD CONSTRAINT [kullanici_yetki_kullanici_id_fkey] FOREIGN KEY ([kullanici_id]) REFERENCES [dbo].[kullanici]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[yetki_seti_detay] ADD CONSTRAINT [yetki_seti_detay_set_id_fkey] FOREIGN KEY ([set_id]) REFERENCES [dbo].[yetki_seti]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[kullanici_cari_yetki] ADD CONSTRAINT [kullanici_cari_yetki_kullanici_id_fkey] FOREIGN KEY ([kullanici_id]) REFERENCES [dbo].[kullanici]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[poset_malzeme] ADD CONSTRAINT [poset_malzeme_poset_id_fkey] FOREIGN KEY ([poset_id]) REFERENCES [dbo].[poset]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[sayim_satiri] ADD CONSTRAINT [sayim_satiri_sayim_id_fkey] FOREIGN KEY ([sayim_id]) REFERENCES [dbo].[sayim]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[grup] ADD CONSTRAINT [grup_ust_id_fkey] FOREIGN KEY ([ust_id]) REFERENCES [dbo].[grup]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[alis_satiri] ADD CONSTRAINT [alis_satiri_alis_id_fkey] FOREIGN KEY ([alis_id]) REFERENCES [dbo].[alis]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[satin_alma_talep_satiri] ADD CONSTRAINT [satin_alma_talep_satiri_talep_id_fkey] FOREIGN KEY ([talep_id]) REFERENCES [dbo].[satin_alma_talep]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[satin_alma_talep_satiri] ADD CONSTRAINT [satin_alma_talep_satiri_malzeme_id_fkey] FOREIGN KEY ([malzeme_id]) REFERENCES [dbo].[stok]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[satin_alma_siparis] ADD CONSTRAINT [satin_alma_siparis_talep_id_fkey] FOREIGN KEY ([talep_id]) REFERENCES [dbo].[satin_alma_talep]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[satin_alma_talep_siparis] ADD CONSTRAINT [satin_alma_talep_siparis_satir_id_fkey] FOREIGN KEY ([satir_id]) REFERENCES [dbo].[satin_alma_talep_satiri]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[satin_alma_talep_siparis] ADD CONSTRAINT [satin_alma_talep_siparis_siparis_id_fkey] FOREIGN KEY ([siparis_id]) REFERENCES [dbo].[satin_alma_siparis]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[stok_uretici] ADD CONSTRAINT [stok_uretici_stok_id_fkey] FOREIGN KEY ([stok_id]) REFERENCES [dbo].[stok]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[stok_musteri] ADD CONSTRAINT [stok_musteri_stok_id_fkey] FOREIGN KEY ([stok_id]) REFERENCES [dbo].[stok]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[stok_dokuman] ADD CONSTRAINT [stok_dokuman_stok_id_fkey] FOREIGN KEY ([stok_id]) REFERENCES [dbo].[stok]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH

