--
-- PostgreSQL database dump
--

\restrict r2jHM1iPyUbBrPTIA5uqZziZro2wDUvr6XroDcycd7u64gNMrCIJ0bfH5Nza5kT

-- Dumped from database version 18.1
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.model_parca DROP CONSTRAINT IF EXISTS urun_parca_urun_id_urun_id_fk;
ALTER TABLE IF EXISTS ONLY public.model_parca DROP CONSTRAINT IF EXISTS urun_parca_parca_id_parca_id_fk;
ALTER TABLE IF EXISTS ONLY public.uretim_emri DROP CONSTRAINT IF EXISTS uretim_emri_urun_id_urun_id_fk;
ALTER TABLE IF EXISTS ONLY public.siparis DROP CONSTRAINT IF EXISTS siparis_musteri_id_musteri_id_fk;
ALTER TABLE IF EXISTS ONLY public.recete_satiri DROP CONSTRAINT IF EXISTS recete_satiri_parca_id_parca_id_fk;
ALTER TABLE IF EXISTS ONLY public.recete_satiri DROP CONSTRAINT IF EXISTS recete_satiri_malzeme_id_malzeme_id_fk;
ALTER TABLE IF EXISTS ONLY public.recete_satiri DROP CONSTRAINT IF EXISTS recete_satiri_alt_parca_id_parca_id_fk;
ALTER TABLE IF EXISTS ONLY public.cari_islem DROP CONSTRAINT IF EXISTS cari_islem_cari_id_cari_id_fk;
ALTER TABLE IF EXISTS ONLY public.model DROP CONSTRAINT IF EXISTS urun_pkey;
ALTER TABLE IF EXISTS ONLY public.model_parca DROP CONSTRAINT IF EXISTS urun_parca_pkey;
ALTER TABLE IF EXISTS ONLY public.uretim_emri DROP CONSTRAINT IF EXISTS uretim_emri_pkey;
ALTER TABLE IF EXISTS ONLY public.stok_hareket DROP CONSTRAINT IF EXISTS stok_hareket_pkey;
ALTER TABLE IF EXISTS ONLY public.siparis DROP CONSTRAINT IF EXISTS siparis_pkey;
ALTER TABLE IF EXISTS ONLY public.recete_satiri DROP CONSTRAINT IF EXISTS recete_satiri_pkey;
ALTER TABLE IF EXISTS ONLY public.parca DROP CONSTRAINT IF EXISTS parca_pkey;
ALTER TABLE IF EXISTS ONLY public.musteri DROP CONSTRAINT IF EXISTS musteri_pkey;
ALTER TABLE IF EXISTS ONLY public.malzeme DROP CONSTRAINT IF EXISTS malzeme_pkey;
ALTER TABLE IF EXISTS ONLY public.depo DROP CONSTRAINT IF EXISTS depo_pkey;
ALTER TABLE IF EXISTS ONLY public.cari DROP CONSTRAINT IF EXISTS cari_pkey;
ALTER TABLE IF EXISTS ONLY public.cari_islem DROP CONSTRAINT IF EXISTS cari_islem_pkey;
ALTER TABLE IF EXISTS ONLY drizzle.__drizzle_migrations DROP CONSTRAINT IF EXISTS __drizzle_migrations_pkey;
ALTER TABLE IF EXISTS public.recete_satiri ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.model_parca ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS drizzle.__drizzle_migrations ALTER COLUMN id DROP DEFAULT;
DROP SEQUENCE IF EXISTS public.urun_parca_id_seq;
DROP TABLE IF EXISTS public.uretim_emri;
DROP TABLE IF EXISTS public.stok_hareket;
DROP TABLE IF EXISTS public.siparis;
DROP SEQUENCE IF EXISTS public.recete_satiri_id_seq;
DROP TABLE IF EXISTS public.recete_satiri;
DROP TABLE IF EXISTS public.parca;
DROP TABLE IF EXISTS public.musteri;
DROP TABLE IF EXISTS public.model_parca;
DROP TABLE IF EXISTS public.model;
DROP TABLE IF EXISTS public.malzeme;
DROP TABLE IF EXISTS public.depo;
DROP TABLE IF EXISTS public.cari_islem;
DROP TABLE IF EXISTS public.cari;
DROP SEQUENCE IF EXISTS drizzle.__drizzle_migrations_id_seq;
DROP TABLE IF EXISTS drizzle.__drizzle_migrations;
DROP TYPE IF EXISTS public.uretim_oncelik;
DROP TYPE IF EXISTS public.uretim_durum;
DROP TYPE IF EXISTS public.stok_hareket_turu;
DROP TYPE IF EXISTS public.stok_hareket_ref;
DROP TYPE IF EXISTS public.siparis_durum;
DROP TYPE IF EXISTS public.recete_bilesen_tip;
DROP TYPE IF EXISTS public.para_birimi;
DROP TYPE IF EXISTS public.malzeme_tipi;
DROP TYPE IF EXISTS public.durum;
DROP TYPE IF EXISTS public.cari_tip;
DROP TYPE IF EXISTS public.cari_sinif;
DROP TYPE IF EXISTS public.cari_islem_turu;
DROP SCHEMA IF EXISTS drizzle;
--
-- Name: drizzle; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA drizzle;


ALTER SCHEMA drizzle OWNER TO postgres;

--
-- Name: cari_islem_turu; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.cari_islem_turu AS ENUM (
    'Tahsilat',
    'Ödeme',
    'Borç',
    'Alacak'
);


ALTER TYPE public.cari_islem_turu OWNER TO postgres;

--
-- Name: cari_sinif; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.cari_sinif AS ENUM (
    'Bireysel',
    'Kurumsal'
);


ALTER TYPE public.cari_sinif OWNER TO postgres;

--
-- Name: cari_tip; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.cari_tip AS ENUM (
    'Müşteri',
    'Tedarikçi',
    'Her İkisi'
);


ALTER TYPE public.cari_tip OWNER TO postgres;

--
-- Name: durum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.durum AS ENUM (
    'Aktif',
    'Pasif'
);


ALTER TYPE public.durum OWNER TO postgres;

--
-- Name: malzeme_tipi; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.malzeme_tipi AS ENUM (
    'Hammadde',
    'Yarı Mamul',
    'Yardımcı'
);


ALTER TYPE public.malzeme_tipi OWNER TO postgres;

--
-- Name: para_birimi; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.para_birimi AS ENUM (
    'TL',
    'USD',
    'EUR'
);


ALTER TYPE public.para_birimi OWNER TO postgres;

--
-- Name: recete_bilesen_tip; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.recete_bilesen_tip AS ENUM (
    'malzeme',
    'parca'
);


ALTER TYPE public.recete_bilesen_tip OWNER TO postgres;

--
-- Name: siparis_durum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.siparis_durum AS ENUM (
    'Beklemede',
    'Hazırlanıyor',
    'Kargoda',
    'Teslim Edildi',
    'İptal'
);


ALTER TYPE public.siparis_durum OWNER TO postgres;

--
-- Name: stok_hareket_ref; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.stok_hareket_ref AS ENUM (
    'model',
    'malzeme'
);


ALTER TYPE public.stok_hareket_ref OWNER TO postgres;

--
-- Name: stok_hareket_turu; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.stok_hareket_turu AS ENUM (
    'Giriş',
    'Çıkış',
    'Transfer'
);


ALTER TYPE public.stok_hareket_turu OWNER TO postgres;

--
-- Name: uretim_durum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.uretim_durum AS ENUM (
    'Planlandı',
    'Üretimde',
    'Tamamlandı',
    'İptal'
);


ALTER TYPE public.uretim_durum OWNER TO postgres;

--
-- Name: uretim_oncelik; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.uretim_oncelik AS ENUM (
    'Düşük',
    'Normal',
    'Yüksek',
    'Acil'
);


ALTER TYPE public.uretim_oncelik OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: __drizzle_migrations; Type: TABLE; Schema: drizzle; Owner: postgres
--

CREATE TABLE drizzle.__drizzle_migrations (
    id integer NOT NULL,
    hash text NOT NULL,
    created_at bigint
);


ALTER TABLE drizzle.__drizzle_migrations OWNER TO postgres;

--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE; Schema: drizzle; Owner: postgres
--

CREATE SEQUENCE drizzle.__drizzle_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE drizzle.__drizzle_migrations_id_seq OWNER TO postgres;

--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: drizzle; Owner: postgres
--

ALTER SEQUENCE drizzle.__drizzle_migrations_id_seq OWNED BY drizzle.__drizzle_migrations.id;


--
-- Name: cari; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cari (
    id text NOT NULL,
    ad text NOT NULL,
    tip public.cari_tip NOT NULL,
    sinif public.cari_sinif NOT NULL,
    vergi_no text,
    vergi_dairesi text,
    telefon text,
    email text,
    adres text,
    sehir text,
    bakiye numeric(14,2) DEFAULT '0'::numeric NOT NULL,
    para_birimi public.para_birimi DEFAULT 'TL'::public.para_birimi NOT NULL,
    durum public.durum DEFAULT 'Aktif'::public.durum NOT NULL,
    "not" text
);


ALTER TABLE public.cari OWNER TO postgres;

--
-- Name: cari_islem; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cari_islem (
    id text NOT NULL,
    cari_id text NOT NULL,
    tarih date NOT NULL,
    tur public.cari_islem_turu NOT NULL,
    tutar numeric(14,2) NOT NULL,
    belge text,
    aciklama text NOT NULL
);


ALTER TABLE public.cari_islem OWNER TO postgres;

--
-- Name: depo; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.depo (
    id text NOT NULL,
    ad text NOT NULL,
    sehir text NOT NULL,
    durum public.durum DEFAULT 'Aktif'::public.durum NOT NULL,
    kapasite integer DEFAULT 0 NOT NULL,
    doluluk integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.depo OWNER TO postgres;

--
-- Name: malzeme; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.malzeme (
    id text NOT NULL,
    ad text NOT NULL,
    tip public.malzeme_tipi NOT NULL,
    birim text NOT NULL,
    stok numeric(14,3) DEFAULT '0'::numeric NOT NULL,
    birim_fiyat numeric(14,2) DEFAULT '0'::numeric NOT NULL,
    tedarikci text,
    durum public.durum DEFAULT 'Aktif'::public.durum NOT NULL
);


ALTER TABLE public.malzeme OWNER TO postgres;

--
-- Name: model; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.model (
    id text CONSTRAINT urun_id_not_null NOT NULL,
    ad text CONSTRAINT urun_ad_not_null NOT NULL,
    kategori text CONSTRAINT urun_kategori_not_null NOT NULL,
    fiyat numeric(14,2) DEFAULT '0'::numeric CONSTRAINT urun_fiyat_not_null NOT NULL,
    stok integer DEFAULT 0 CONSTRAINT urun_stok_not_null NOT NULL,
    durum public.durum DEFAULT 'Aktif'::public.durum CONSTRAINT urun_durum_not_null NOT NULL,
    gorsel text,
    marka text,
    barkod text,
    agirlik numeric(14,3),
    min_stok integer,
    gorseller text[],
    varyantlar jsonb
);


ALTER TABLE public.model OWNER TO postgres;

--
-- Name: model_parca; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.model_parca (
    id integer CONSTRAINT urun_parca_id_not_null NOT NULL,
    model_id text CONSTRAINT urun_parca_urun_id_not_null NOT NULL,
    parca_id text CONSTRAINT urun_parca_parca_id_not_null NOT NULL,
    miktar numeric(14,3) CONSTRAINT urun_parca_miktar_not_null NOT NULL
);


ALTER TABLE public.model_parca OWNER TO postgres;

--
-- Name: musteri; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.musteri (
    id text NOT NULL,
    ad text NOT NULL,
    email text,
    sehir text
);


ALTER TABLE public.musteri OWNER TO postgres;

--
-- Name: parca; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.parca (
    id text NOT NULL,
    ad text NOT NULL,
    kategori text NOT NULL,
    aciklama text,
    durum public.durum DEFAULT 'Aktif'::public.durum NOT NULL
);


ALTER TABLE public.parca OWNER TO postgres;

--
-- Name: recete_satiri; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.recete_satiri (
    id integer NOT NULL,
    parca_id text NOT NULL,
    tip public.recete_bilesen_tip NOT NULL,
    malzeme_id text,
    alt_parca_id text,
    miktar numeric(14,3) NOT NULL
);


ALTER TABLE public.recete_satiri OWNER TO postgres;

--
-- Name: recete_satiri_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.recete_satiri_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.recete_satiri_id_seq OWNER TO postgres;

--
-- Name: recete_satiri_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.recete_satiri_id_seq OWNED BY public.recete_satiri.id;


--
-- Name: siparis; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.siparis (
    id text NOT NULL,
    musteri_id text,
    musteri_ad text NOT NULL,
    tarih date NOT NULL,
    tutar numeric(14,2) DEFAULT '0'::numeric NOT NULL,
    durum public.siparis_durum DEFAULT 'Beklemede'::public.siparis_durum NOT NULL,
    urun_adedi integer DEFAULT 1 NOT NULL
);


ALTER TABLE public.siparis OWNER TO postgres;

--
-- Name: stok_hareket; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stok_hareket (
    id text NOT NULL,
    tarih date NOT NULL,
    tur public.stok_hareket_turu NOT NULL,
    ref_tip public.stok_hareket_ref NOT NULL,
    ref_id text NOT NULL,
    miktar numeric(14,3) NOT NULL,
    birim text NOT NULL,
    depo text NOT NULL,
    aciklama text NOT NULL
);


ALTER TABLE public.stok_hareket OWNER TO postgres;

--
-- Name: uretim_emri; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.uretim_emri (
    id text NOT NULL,
    model_id text CONSTRAINT uretim_emri_urun_id_not_null NOT NULL,
    model_ad text CONSTRAINT uretim_emri_urun_ad_not_null NOT NULL,
    adet integer DEFAULT 1 NOT NULL,
    durum public.uretim_durum DEFAULT 'Planlandı'::public.uretim_durum NOT NULL,
    oncelik public.uretim_oncelik DEFAULT 'Normal'::public.uretim_oncelik,
    olusturma date NOT NULL,
    termin date,
    kaynak_siparis text,
    musteri text,
    hedef_depo text,
    "not" text
);


ALTER TABLE public.uretim_emri OWNER TO postgres;

--
-- Name: urun_parca_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.urun_parca_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.urun_parca_id_seq OWNER TO postgres;

--
-- Name: urun_parca_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.urun_parca_id_seq OWNED BY public.model_parca.id;


--
-- Name: __drizzle_migrations id; Type: DEFAULT; Schema: drizzle; Owner: postgres
--

ALTER TABLE ONLY drizzle.__drizzle_migrations ALTER COLUMN id SET DEFAULT nextval('drizzle.__drizzle_migrations_id_seq'::regclass);


--
-- Name: model_parca id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.model_parca ALTER COLUMN id SET DEFAULT nextval('public.urun_parca_id_seq'::regclass);


--
-- Name: recete_satiri id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recete_satiri ALTER COLUMN id SET DEFAULT nextval('public.recete_satiri_id_seq'::regclass);


--
-- Data for Name: __drizzle_migrations; Type: TABLE DATA; Schema: drizzle; Owner: postgres
--

COPY drizzle.__drizzle_migrations (id, hash, created_at) FROM stdin;
1	50fbc5b0be12a33fc8cd27894e76178fb79d9042b4380e1bd3dbdf0fa9727ff7	1781504112234
2	0b4c0f8658ec9efb9659207467feb4d541655f71394252e852b594fff3ed2e76	1781536971623
3	702931d9216846c893628490087f075856d2c9116eb91f5ae2e7e6ce84ce2c30	1781594005313
4	72474aa868671ccd9edfc76019a60d214563de5dd609e847656a3b823f86efcb	1781600000000
\.


--
-- Data for Name: cari; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cari (id, ad, tip, sinif, vergi_no, vergi_dairesi, telefon, email, adres, sehir, bakiye, para_birimi, durum, "not") FROM stdin;
CARI-1001	Ayşe Demir	Müşteri	Bireysel	\N	\N	0532 111 22 33	ayse.demir@mail.com	\N	İstanbul	-12500.00	TL	Aktif	\N
CARI-1002	Mehmet Kaya	Müşteri	Bireysel	\N	\N	0532 222 33 44	mehmet.kaya@mail.com	\N	Ankara	0.00	TL	Aktif	\N
CARI-1003	Mobilyum Ticaret Ltd. Şti.	Müşteri	Kurumsal	1234567890	Beşiktaş	0212 333 44 55	info@mobilyumtic.com	\N	İstanbul	-56750.00	TL	Aktif	\N
CARI-1004	Kastamonu Entegre	Tedarikçi	Kurumsal	9876543210	Kastamonu	0366 444 55 66	satis@kentegre.com	\N	Kastamonu	184200.00	TL	Aktif	\N
CARI-1005	Boyteks A.Ş.	Tedarikçi	Kurumsal	4567891230	Bursa	0224 555 66 77	tekstil@boyteks.com	\N	Bursa	92400.00	TL	Aktif	\N
CARI-1006	Samet Kalıp	Tedarikçi	Kurumsal	7891234560	Kayseri	0352 666 77 88	info@samet.com	\N	Kayseri	18750.00	TL	Aktif	\N
CARI-1007	Akdeniz Mobilya Bayi	Her İkisi	Kurumsal	3216549870	Antalya	0242 777 88 99	info@akdenizmob.com	\N	Antalya	-33800.00	TL	Aktif	\N
CARI-1008	Zeynep Şahin	Müşteri	Bireysel	\N	\N	0532 555 66 77	zeynep.sahin@mail.com	\N	İzmir	0.00	TL	Aktif	\N
CARI-1009	Can Yıldız	Müşteri	Bireysel	\N	\N	0532 888 99 00	can.yildiz@mail.com	\N	Bursa	-2400.00	TL	Aktif	\N
CARI-1010	Hayat Ahşap San.	Tedarikçi	Kurumsal	1597534862	Düzce	0380 999 00 11	siparis@hayatahsap.com	\N	Düzce	67200.00	TL	Aktif	\N
CARI-1011	Tunçer Akaryakıt	Tedarikçi	Kurumsal	7531596482	\N	0212 000 11 22	\N	\N	İstanbul	0.00	TL	Pasif	\N
CARI-1012	Burak Öztürk	Müşteri	Bireysel	\N	\N	0532 100 20 30	burak.ozturk@mail.com	\N	Adana	-5400.00	TL	Aktif	\N
\.


--
-- Data for Name: cari_islem; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cari_islem (id, cari_id, tarih, tur, tutar, belge, aciklama) FROM stdin;
CI-3001	CARI-1001	2026-04-12	Borç	24000.00	FAT-2026-118	Milano 3+2 koltuk takımı satışı
CI-3002	CARI-1001	2026-04-28	Tahsilat	6000.00	DK-2026-045	Peşinat
CI-3003	CARI-1001	2026-05-15	Tahsilat	5500.00	DK-2026-061	İkinci taksit
CI-3010	CARI-1003	2026-03-05	Borç	42000.00	FAT-2026-094	Toplu sipariş
CI-3011	CARI-1003	2026-04-08	Tahsilat	20000.00	DK-2026-038	Banka havalesi
CI-3012	CARI-1003	2026-05-22	Borç	38000.00	FAT-2026-135	Showroom takımları
CI-3013	CARI-1003	2026-06-01	Tahsilat	3250.00	DK-2026-058	Kısmi tahsilat
CI-3020	CARI-1004	2026-04-02	Alacak	95000.00	AF-2026-211	MDF Levha alımı
CI-3021	CARI-1004	2026-04-30	Ödeme	60000.00	DK-O-2026-072	Banka havalesi
CI-3022	CARI-1004	2026-05-18	Alacak	110000.00	AF-2026-256	Kontrplak alımı
CI-3023	CARI-1004	2026-05-30	Ödeme	40000.00	DK-O-2026-098	Vade ödemesi
CI-3024	CARI-1004	2026-06-05	Alacak	79200.00	AF-2026-289	Cila alımı
CI-3040	CARI-1007	2026-05-10	Borç	48000.00	FAT-2026-128	Bayi siparişi
CI-3041	CARI-1007	2026-05-25	Tahsilat	14200.00	DK-2026-051	Peşinat
\.


--
-- Data for Name: depo; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.depo (id, ad, sehir, durum, kapasite, doluluk) FROM stdin;
DEP-01	Ana Depo	İstanbul	Aktif	5000	3420
DEP-02	Yedek Depo	İstanbul	Aktif	2000	880
DEP-03	Showroom Merkez	İstanbul	Aktif	300	215
DEP-04	Bursa Bölge	Bursa	Pasif	1500	0
\.


--
-- Data for Name: malzeme; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.malzeme (id, ad, tip, birim, stok, birim_fiyat, tedarikci, durum) FROM stdin;
MLZ-1001	MDF Levha 18mm	Hammadde	m²	240.000	380.00	Kastamonu Entegre	Aktif
MLZ-1002	Sünger 40 Dansite	Hammadde	m³	18.000	2400.00	İzopolimer	Aktif
MLZ-1003	Keten Kumaş Krem	Hammadde	m	320.000	185.00	Boyteks	Aktif
MLZ-1004	Kadife Kumaş Antrasit	Hammadde	m	145.000	245.00	Boyteks	Aktif
MLZ-1005	Kontrplak 12mm	Hammadde	m²	90.000	290.00	Hayat Ahşap	Aktif
MLZ-1006	Cila Mat Ceviz	Yardımcı	lt	36.000	320.00	Akzo Nobel	Aktif
MLZ-1007	Vida 4×40	Yardımcı	adet	12400.000	0.45	Norm Cıvata	Aktif
MLZ-1008	Menteşe Bas-Aç	Yardımcı	adet	860.000	18.00	Samet	Aktif
MLZ-1009	Çekmece Rayı 45cm	Yardımcı	adet	240.000	95.00	Samet	Aktif
MLZ-1010	Yatak Çerçevesi (Karkas)	Yarı Mamul	adet	22.000	1800.00	\N	Aktif
MLZ-1011	PVC Kenar Bandı Beyaz	Yardımcı	m	480.000	8.00	Roma Plastik	Aktif
MLZ-1012	Ayna Cam 4mm	Hammadde	m²	32.000	420.00	Şişecam	Aktif
\.


--
-- Data for Name: model; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.model (id, ad, kategori, fiyat, stok, durum, gorsel, marka, barkod, agirlik, min_stok, gorseller, varyantlar) FROM stdin;
URN-1002	Roma Yemek Masası 6 Kişilik	Yemek Odası	18900.00	7	Aktif	\N	\N	\N	\N	\N	\N	\N
URN-1003	Loft Çalışma Masası	Çalışma	6450.00	0	Pasif	\N	\N	\N	\N	\N	\N	\N
URN-1004	Venüs Yatak Odası Takımı	Yatak Odası	56750.00	4	Aktif	\N	\N	\N	\N	\N	\N	\N
URN-1005	Nordic TV Ünitesi	Oturma Grubu	8200.00	21	Aktif	\N	\N	\N	\N	\N	\N	\N
URN-1006	Comfort Berjer Koltuk	Oturma Grubu	9750.00	3	Aktif	\N	\N	\N	\N	\N	\N	\N
URN-1007	Elegance Şifonyer	Yatak Odası	5400.00	15	Aktif	\N	\N	\N	\N	\N	\N	\N
URN-1008	Minimal Kitaplık	Çalışma	3900.00	2	Aktif	\N	\N	\N	\N	\N	\N	\N
URN-1009	Saten Halı 160x230	Aksesuar	2750.00	33	Aktif	\N	\N	\N	\N	\N	\N	\N
URN-1010	Aurora Gardırop 4 Kapaklı	Yatak Odası	22400.00	6	Aktif	\N	\N	\N	\N	\N	\N	\N
URN-8155	Saten Halı 160x230 (kopya)	Aksesuar	2750.00	33	Aktif	\N	\N	\N	\N	\N	\N	\N
URN-1001	Milano 3+2 Koltuk Takımı	Oturma Grubu	150000.00	12	Aktif	\N	\N	\N	\N	\N	\N	\N
\.


--
-- Data for Name: model_parca; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.model_parca (id, model_id, parca_id, miktar) FROM stdin;
1	URN-1004	PRC-2003	1.000
2	URN-1004	PRC-2004	2.000
3	URN-1004	PRC-2005	1.000
4	URN-1004	PRC-2006	1.000
5	URN-1007	PRC-2005	1.000
6	URN-1010	PRC-2007	1.000
\.


--
-- Data for Name: musteri; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.musteri (id, ad, email, sehir) FROM stdin;
MUS-301	Ayşe Demir	ayse.demir@mail.com	İstanbul
MUS-302	Mehmet Kaya	mehmet.kaya@mail.com	Ankara
MUS-303	Zeynep Şahin	zeynep.sahin@mail.com	İzmir
MUS-304	Can Yıldız	can.yildiz@mail.com	Bursa
MUS-305	Elif Aydın	elif.aydin@mail.com	Antalya
MUS-306	Burak Öztürk	burak.ozturk@mail.com	Adana
\.


--
-- Data for Name: parca; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.parca (id, ad, kategori, aciklama, durum) FROM stdin;
PRC-2001	Yatak Çerçevesi (Karkas)	Karyola	Standart 160×200 cm	Aktif
PRC-2002	Karyola Başlığı (Yastıklı)	Karyola	Kumaş kaplı yastıklı başlık	Aktif
PRC-2003	Karyola (Tam)	Karyola	Çerçeve + başlık birleşik karyola	Aktif
PRC-2004	Komidin 2 Çekmeceli	Komidin	Standart komidin	Aktif
PRC-2005	Şifonyer 4 Çekmeceli	Şifonyer	Standart şifonyer	Aktif
PRC-2006	Boy Ayna 60×180	Ayna	MDF çerçeveli boy aynası	Aktif
PRC-2007	Gardırop 4 Kapaklı	Gardırop	Sürmeli kapaklı, raflı	Aktif
\.


--
-- Data for Name: recete_satiri; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.recete_satiri (id, parca_id, tip, malzeme_id, alt_parca_id, miktar) FROM stdin;
1	PRC-2001	malzeme	MLZ-1005	\N	4.500
2	PRC-2001	malzeme	MLZ-1007	\N	60.000
3	PRC-2001	malzeme	MLZ-1006	\N	0.400
4	PRC-2002	malzeme	MLZ-1005	\N	0.800
5	PRC-2002	malzeme	MLZ-1002	\N	0.050
6	PRC-2002	malzeme	MLZ-1003	\N	2.200
7	PRC-2002	malzeme	MLZ-1007	\N	24.000
8	PRC-2003	parca	\N	PRC-2001	1.000
9	PRC-2003	parca	\N	PRC-2002	1.000
10	PRC-2004	malzeme	MLZ-1001	\N	0.900
11	PRC-2004	malzeme	MLZ-1009	\N	2.000
12	PRC-2004	malzeme	MLZ-1007	\N	30.000
13	PRC-2004	malzeme	MLZ-1011	\N	4.500
14	PRC-2004	malzeme	MLZ-1006	\N	0.200
15	PRC-2005	malzeme	MLZ-1001	\N	2.400
16	PRC-2005	malzeme	MLZ-1009	\N	4.000
17	PRC-2005	malzeme	MLZ-1007	\N	64.000
18	PRC-2005	malzeme	MLZ-1011	\N	9.500
19	PRC-2005	malzeme	MLZ-1006	\N	0.450
20	PRC-2006	malzeme	MLZ-1012	\N	1.080
21	PRC-2006	malzeme	MLZ-1001	\N	0.600
22	PRC-2006	malzeme	MLZ-1006	\N	0.150
23	PRC-2006	malzeme	MLZ-1007	\N	12.000
24	PRC-2007	malzeme	MLZ-1001	\N	6.800
25	PRC-2007	malzeme	MLZ-1005	\N	1.200
26	PRC-2007	malzeme	MLZ-1008	\N	12.000
27	PRC-2007	malzeme	MLZ-1007	\N	120.000
28	PRC-2007	malzeme	MLZ-1011	\N	22.000
29	PRC-2007	malzeme	MLZ-1006	\N	0.800
\.


--
-- Data for Name: siparis; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.siparis (id, musteri_id, musteri_ad, tarih, tutar, durum, urun_adedi) FROM stdin;
SIP-5021	MUS-301	Ayşe Demir	2026-06-05	42500.00	Hazırlanıyor	1
SIP-5020	MUS-302	Mehmet Kaya	2026-06-05	27100.00	Kargoda	2
SIP-5019	MUS-303	Zeynep Şahin	2026-06-04	56750.00	Teslim Edildi	1
SIP-5018	MUS-304	Can Yıldız	2026-06-04	8200.00	Beklemede	1
SIP-5017	MUS-305	Elif Aydın	2026-06-03	12150.00	Teslim Edildi	3
SIP-5016	MUS-306	Burak Öztürk	2026-06-02	5400.00	İptal	1
SIP-5015	\N	Selin Arslan	2026-06-01	22400.00	Kargoda	1
SIP-5014	\N	Deniz Koç	2026-05-31	9750.00	Teslim Edildi	1
\.


--
-- Data for Name: stok_hareket; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stok_hareket (id, tarih, tur, ref_tip, ref_id, miktar, birim, depo, aciklama) FROM stdin;
SH-1010	2026-06-05	Giriş	model	URN-1001	4.000	adet	Ana Depo	Üretimden giriş
SH-1009	2026-06-05	Çıkış	model	URN-1005	2.000	adet	Ana Depo	Sipariş SIP-5021
SH-1008	2026-06-04	Transfer	model	URN-1006	1.000	adet	Ana Depo → Showroom	Sergileme
SH-1007	2026-06-04	Çıkış	model	URN-1007	3.000	adet	Ana Depo	Sipariş SIP-5019
SH-1006	2026-06-03	Giriş	model	URN-1009	10.000	adet	Yedek Depo	Tedarikçi alımı
SH-1005	2026-06-02	Çıkış	model	URN-1008	1.000	adet	Ana Depo	Hasarlı iade
SH-1004	2026-06-02	Transfer	model	URN-1010	2.000	adet	Yedek Depo → Ana Depo	Bölgesel sevkiyat
SH-1003	2026-06-01	Giriş	model	URN-1004	1.000	adet	Ana Depo	Üretimden giriş
SH-0999	2026-05-28	Çıkış	model	URN-1001	1.000	adet	Ana Depo	Sipariş SIP-5012
SH-0995	2026-05-22	Giriş	model	URN-1001	6.000	adet	Ana Depo	Üretimden giriş
SH-2010	2026-06-05	Giriş	malzeme	MLZ-1001	80.000	m²	Ana Depo	Kastamonu Entegre - Fatura #4521
SH-2009	2026-06-05	Çıkış	malzeme	MLZ-1001	12.000	m²	Ana Depo	Üretim emri ÜRT-302
SH-2008	2026-06-04	Çıkış	malzeme	MLZ-1007	240.000	adet	Ana Depo	Üretim emri ÜRT-301
SH-2007	2026-06-03	Giriş	malzeme	MLZ-1003	120.000	m	Yedek Depo	Boyteks - Fatura #2210
SH-2006	2026-06-02	Çıkış	malzeme	MLZ-1003	18.000	m	Yedek Depo	Üretim emri ÜRT-298
SH-2005	2026-06-01	Giriş	malzeme	MLZ-1007	3000.000	adet	Ana Depo	Norm Cıvata - Fatura #889
SH-2004	2026-05-30	Çıkış	malzeme	MLZ-1002	2.500	m³	Ana Depo	Üretim emri ÜRT-295
SH-2003	2026-05-28	Transfer	malzeme	MLZ-1001	30.000	m²	Ana Depo → Yedek Depo	Stok dağıtımı
SH-2002	2026-05-25	Çıkış	malzeme	MLZ-1001	22.000	m²	Ana Depo	Üretim emri ÜRT-290
\.


--
-- Data for Name: uretim_emri; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.uretim_emri (id, model_id, model_ad, adet, durum, oncelik, olusturma, termin, kaynak_siparis, musteri, hedef_depo, "not") FROM stdin;
UE-4001	URN-1004	Venüs Yatak Odası Takımı	3	Üretimde	Normal	2026-06-04	2026-06-12	SIP-5019	\N	\N	\N
UE-4002	URN-1010	Aurora Gardırop 4 Kapaklı	5	Planlandı	Normal	2026-06-05	2026-06-15	\N	\N	\N	\N
UE-4003	URN-1004	Venüs Yatak Odası Takımı	2	Tamamlandı	Normal	2026-05-28	2026-06-03	\N	\N	\N	\N
UE-4004	URN-1004	Venüs Yatak Odası Takımı	1	Üretimde	Acil	2026-06-30	2026-06-30	\N	\N	DEP-01	\N
\.


--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE SET; Schema: drizzle; Owner: postgres
--

SELECT pg_catalog.setval('drizzle.__drizzle_migrations_id_seq', 4, true);


--
-- Name: recete_satiri_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.recete_satiri_id_seq', 29, true);


--
-- Name: urun_parca_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.urun_parca_id_seq', 6, true);


--
-- Name: __drizzle_migrations __drizzle_migrations_pkey; Type: CONSTRAINT; Schema: drizzle; Owner: postgres
--

ALTER TABLE ONLY drizzle.__drizzle_migrations
    ADD CONSTRAINT __drizzle_migrations_pkey PRIMARY KEY (id);


--
-- Name: cari_islem cari_islem_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cari_islem
    ADD CONSTRAINT cari_islem_pkey PRIMARY KEY (id);


--
-- Name: cari cari_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cari
    ADD CONSTRAINT cari_pkey PRIMARY KEY (id);


--
-- Name: depo depo_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.depo
    ADD CONSTRAINT depo_pkey PRIMARY KEY (id);


--
-- Name: malzeme malzeme_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.malzeme
    ADD CONSTRAINT malzeme_pkey PRIMARY KEY (id);


--
-- Name: musteri musteri_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.musteri
    ADD CONSTRAINT musteri_pkey PRIMARY KEY (id);


--
-- Name: parca parca_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.parca
    ADD CONSTRAINT parca_pkey PRIMARY KEY (id);


--
-- Name: recete_satiri recete_satiri_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recete_satiri
    ADD CONSTRAINT recete_satiri_pkey PRIMARY KEY (id);


--
-- Name: siparis siparis_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.siparis
    ADD CONSTRAINT siparis_pkey PRIMARY KEY (id);


--
-- Name: stok_hareket stok_hareket_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stok_hareket
    ADD CONSTRAINT stok_hareket_pkey PRIMARY KEY (id);


--
-- Name: uretim_emri uretim_emri_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.uretim_emri
    ADD CONSTRAINT uretim_emri_pkey PRIMARY KEY (id);


--
-- Name: model_parca urun_parca_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.model_parca
    ADD CONSTRAINT urun_parca_pkey PRIMARY KEY (id);


--
-- Name: model urun_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.model
    ADD CONSTRAINT urun_pkey PRIMARY KEY (id);


--
-- Name: cari_islem cari_islem_cari_id_cari_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cari_islem
    ADD CONSTRAINT cari_islem_cari_id_cari_id_fk FOREIGN KEY (cari_id) REFERENCES public.cari(id) ON DELETE CASCADE;


--
-- Name: recete_satiri recete_satiri_alt_parca_id_parca_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recete_satiri
    ADD CONSTRAINT recete_satiri_alt_parca_id_parca_id_fk FOREIGN KEY (alt_parca_id) REFERENCES public.parca(id);


--
-- Name: recete_satiri recete_satiri_malzeme_id_malzeme_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recete_satiri
    ADD CONSTRAINT recete_satiri_malzeme_id_malzeme_id_fk FOREIGN KEY (malzeme_id) REFERENCES public.malzeme(id);


--
-- Name: recete_satiri recete_satiri_parca_id_parca_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recete_satiri
    ADD CONSTRAINT recete_satiri_parca_id_parca_id_fk FOREIGN KEY (parca_id) REFERENCES public.parca(id) ON DELETE CASCADE;


--
-- Name: siparis siparis_musteri_id_musteri_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.siparis
    ADD CONSTRAINT siparis_musteri_id_musteri_id_fk FOREIGN KEY (musteri_id) REFERENCES public.musteri(id);


--
-- Name: uretim_emri uretim_emri_urun_id_urun_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.uretim_emri
    ADD CONSTRAINT uretim_emri_urun_id_urun_id_fk FOREIGN KEY (model_id) REFERENCES public.model(id);


--
-- Name: model_parca urun_parca_parca_id_parca_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.model_parca
    ADD CONSTRAINT urun_parca_parca_id_parca_id_fk FOREIGN KEY (parca_id) REFERENCES public.parca(id);


--
-- Name: model_parca urun_parca_urun_id_urun_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.model_parca
    ADD CONSTRAINT urun_parca_urun_id_urun_id_fk FOREIGN KEY (model_id) REFERENCES public.model(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict r2jHM1iPyUbBrPTIA5uqZziZro2wDUvr6XroDcycd7u64gNMrCIJ0bfH5Nza5kT

