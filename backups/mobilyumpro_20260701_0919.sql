--
-- PostgreSQL database dump
--

\restrict oAZn1F14H6hfT67SXFgw5sn82tpFNTKJUBWnH9PscOHnpmUS5t02gxgppzf4rQK

-- Dumped from database version 17.10
-- Dumped by pg_dump version 17.10

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

--
-- Name: drizzle; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA drizzle;


--
-- Name: cari_islem_turu; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.cari_islem_turu AS ENUM (
    'Tahsilat',
    'Ödeme',
    'Borç',
    'Alacak'
);


--
-- Name: cari_sinif; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.cari_sinif AS ENUM (
    'Bireysel',
    'Kurumsal'
);


--
-- Name: cari_tip; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.cari_tip AS ENUM (
    'Müşteri',
    'Tedarikçi',
    'Her İkisi'
);


--
-- Name: durum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.durum AS ENUM (
    'Aktif',
    'Pasif'
);


--
-- Name: malzeme_tipi; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.malzeme_tipi AS ENUM (
    'Hammadde',
    'Yarı Mamul',
    'Yardımcı'
);


--
-- Name: para_birimi; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.para_birimi AS ENUM (
    'TL',
    'USD',
    'EUR'
);


--
-- Name: recete_bilesen_tip; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.recete_bilesen_tip AS ENUM (
    'malzeme',
    'parca'
);


--
-- Name: siparis_durum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.siparis_durum AS ENUM (
    'Beklemede',
    'Hazırlanıyor',
    'Kargoda',
    'Teslim Edildi',
    'İptal'
);


--
-- Name: stok_hareket_ref; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.stok_hareket_ref AS ENUM (
    'model',
    'malzeme'
);


--
-- Name: stok_hareket_turu; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.stok_hareket_turu AS ENUM (
    'Giriş',
    'Çıkış',
    'Transfer'
);


--
-- Name: uretim_durum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.uretim_durum AS ENUM (
    'Planlandı',
    'Üretimde',
    'Tamamlandı',
    'İptal'
);


--
-- Name: uretim_oncelik; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.uretim_oncelik AS ENUM (
    'Düşük',
    'Normal',
    'Yüksek',
    'Acil'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: __drizzle_migrations; Type: TABLE; Schema: drizzle; Owner: -
--

CREATE TABLE drizzle.__drizzle_migrations (
    id integer NOT NULL,
    hash text NOT NULL,
    created_at bigint
);


--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE; Schema: drizzle; Owner: -
--

CREATE SEQUENCE drizzle.__drizzle_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: drizzle; Owner: -
--

ALTER SEQUENCE drizzle.__drizzle_migrations_id_seq OWNED BY drizzle.__drizzle_migrations.id;


--
-- Name: cari; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: cari_islem; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: depo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.depo (
    id text NOT NULL,
    ad text NOT NULL,
    sehir text NOT NULL,
    durum public.durum DEFAULT 'Aktif'::public.durum NOT NULL,
    kapasite integer DEFAULT 0 NOT NULL,
    doluluk integer DEFAULT 0 NOT NULL
);


--
-- Name: malzeme; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: model; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.model (
    id text NOT NULL,
    ad text NOT NULL,
    kategori text NOT NULL,
    fiyat numeric(14,2) DEFAULT '0'::numeric NOT NULL,
    stok integer DEFAULT 0 NOT NULL,
    durum public.durum DEFAULT 'Aktif'::public.durum NOT NULL,
    gorsel text,
    marka text,
    barkod text,
    agirlik numeric(14,3),
    min_stok integer,
    gorseller text[],
    varyantlar jsonb
);


--
-- Name: model_parca; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.model_parca (
    id integer NOT NULL,
    model_id text NOT NULL,
    parca_id text NOT NULL,
    miktar numeric(14,3) NOT NULL
);


--
-- Name: musteri; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.musteri (
    id text NOT NULL,
    ad text NOT NULL,
    email text,
    sehir text
);


--
-- Name: parca; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.parca (
    id text NOT NULL,
    ad text NOT NULL,
    kategori text NOT NULL,
    aciklama text,
    durum public.durum DEFAULT 'Aktif'::public.durum NOT NULL
);


--
-- Name: recete_satiri; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recete_satiri (
    id integer NOT NULL,
    parca_id text NOT NULL,
    tip public.recete_bilesen_tip NOT NULL,
    malzeme_id text,
    alt_parca_id text,
    miktar numeric(14,3) NOT NULL
);


--
-- Name: recete_satiri_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.recete_satiri_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: recete_satiri_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.recete_satiri_id_seq OWNED BY public.recete_satiri.id;


--
-- Name: siparis; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: stok_hareket; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: uretim_emri; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.uretim_emri (
    id text NOT NULL,
    model_id text NOT NULL,
    model_ad text NOT NULL,
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


--
-- Name: urun_parca_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.urun_parca_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: urun_parca_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.urun_parca_id_seq OWNED BY public.model_parca.id;


--
-- Name: __drizzle_migrations id; Type: DEFAULT; Schema: drizzle; Owner: -
--

ALTER TABLE ONLY drizzle.__drizzle_migrations ALTER COLUMN id SET DEFAULT nextval('drizzle.__drizzle_migrations_id_seq'::regclass);


--
-- Name: model_parca id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.model_parca ALTER COLUMN id SET DEFAULT nextval('public.urun_parca_id_seq'::regclass);


--
-- Name: recete_satiri id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recete_satiri ALTER COLUMN id SET DEFAULT nextval('public.recete_satiri_id_seq'::regclass);


--
-- Data for Name: __drizzle_migrations; Type: TABLE DATA; Schema: drizzle; Owner: -
--

COPY drizzle.__drizzle_migrations (id, hash, created_at) FROM stdin;
1	05aa14b0445ccb4be3cb070e0a3e0c7c8811319f7cff8be00934d0c5650b079d	1781504112234
2	3eef59c7f4297788d01d6cefbdbaed2084290e48a3bdb0e1d4fc527fd01ae05c	1781536971623
3	df033a3a8f4e965d34366c9fbca0c3798142c19452db1f81d6db3467426f5731	1781594005313
4	d29fbc715ac9de6952a4f1d8025f561399599682a3085884d1ed27ce728ea214	1781600000000
\.


--
-- Data for Name: cari; Type: TABLE DATA; Schema: public; Owner: -
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
-- Data for Name: cari_islem; Type: TABLE DATA; Schema: public; Owner: -
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
-- Data for Name: depo; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.depo (id, ad, sehir, durum, kapasite, doluluk) FROM stdin;
DEP-01	Ana Depo	İstanbul	Aktif	5000	3420
DEP-02	Yedek Depo	İstanbul	Aktif	2000	880
DEP-03	Showroom Merkez	İstanbul	Aktif	300	215
DEP-04	Bursa Bölge	Bursa	Pasif	1500	0
\.


--
-- Data for Name: malzeme; Type: TABLE DATA; Schema: public; Owner: -
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
-- Data for Name: model; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.model (id, ad, kategori, fiyat, stok, durum, gorsel, marka, barkod, agirlik, min_stok, gorseller, varyantlar) FROM stdin;
URN-1001	Milano 3+2 Koltuk Takımı	Oturma Grubu	42500.00	12	Aktif	\N	\N	\N	\N	\N	\N	\N
URN-1002	Roma Yemek Masası 6 Kişilik	Yemek Odası	18900.00	7	Aktif	\N	\N	\N	\N	\N	\N	\N
URN-1003	Loft Çalışma Masası	Çalışma	6450.00	0	Pasif	\N	\N	\N	\N	\N	\N	\N
URN-1004	Venüs Yatak Odası Takımı	Yatak Odası	56750.00	4	Aktif	\N	\N	\N	\N	\N	\N	\N
URN-1005	Nordic TV Ünitesi	Oturma Grubu	8200.00	21	Aktif	\N	\N	\N	\N	\N	\N	\N
URN-1006	Comfort Berjer Koltuk	Oturma Grubu	9750.00	3	Aktif	\N	\N	\N	\N	\N	\N	\N
URN-1007	Elegance Şifonyer	Yatak Odası	5400.00	15	Aktif	\N	\N	\N	\N	\N	\N	\N
URN-1008	Minimal Kitaplık	Çalışma	3900.00	2	Aktif	\N	\N	\N	\N	\N	\N	\N
URN-1009	Saten Halı 160x230	Aksesuar	2750.00	33	Aktif	\N	\N	\N	\N	\N	\N	\N
URN-1010	Aurora Gardırop 4 Kapaklı	Yatak Odası	22400.00	6	Aktif	\N	\N	\N	\N	\N	\N	\N
\.


--
-- Data for Name: model_parca; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.model_parca (id, model_id, parca_id, miktar) FROM stdin;
19	URN-1004	PRC-2003	1.000
20	URN-1004	PRC-2004	2.000
21	URN-1004	PRC-2005	1.000
22	URN-1004	PRC-2006	1.000
23	URN-1007	PRC-2005	1.000
24	URN-1010	PRC-2007	1.000
\.


--
-- Data for Name: musteri; Type: TABLE DATA; Schema: public; Owner: -
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
-- Data for Name: parca; Type: TABLE DATA; Schema: public; Owner: -
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
-- Data for Name: recete_satiri; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.recete_satiri (id, parca_id, tip, malzeme_id, alt_parca_id, miktar) FROM stdin;
90	PRC-2001	malzeme	MLZ-1005	\N	4.500
91	PRC-2001	malzeme	MLZ-1007	\N	60.000
92	PRC-2001	malzeme	MLZ-1006	\N	0.400
93	PRC-2002	malzeme	MLZ-1005	\N	0.800
94	PRC-2002	malzeme	MLZ-1002	\N	0.050
95	PRC-2002	malzeme	MLZ-1003	\N	2.200
96	PRC-2002	malzeme	MLZ-1007	\N	24.000
97	PRC-2003	parca	\N	PRC-2001	1.000
98	PRC-2003	parca	\N	PRC-2002	1.000
99	PRC-2004	malzeme	MLZ-1001	\N	0.900
100	PRC-2004	malzeme	MLZ-1009	\N	2.000
101	PRC-2004	malzeme	MLZ-1007	\N	30.000
102	PRC-2004	malzeme	MLZ-1011	\N	4.500
103	PRC-2004	malzeme	MLZ-1006	\N	0.200
104	PRC-2005	malzeme	MLZ-1001	\N	2.400
105	PRC-2005	malzeme	MLZ-1009	\N	4.000
106	PRC-2005	malzeme	MLZ-1007	\N	64.000
107	PRC-2005	malzeme	MLZ-1011	\N	9.500
108	PRC-2005	malzeme	MLZ-1006	\N	0.450
109	PRC-2006	malzeme	MLZ-1012	\N	1.080
110	PRC-2006	malzeme	MLZ-1001	\N	0.600
111	PRC-2006	malzeme	MLZ-1006	\N	0.150
112	PRC-2006	malzeme	MLZ-1007	\N	12.000
113	PRC-2007	malzeme	MLZ-1001	\N	6.800
114	PRC-2007	malzeme	MLZ-1005	\N	1.200
115	PRC-2007	malzeme	MLZ-1008	\N	12.000
116	PRC-2007	malzeme	MLZ-1007	\N	120.000
117	PRC-2007	malzeme	MLZ-1011	\N	22.000
118	PRC-2007	malzeme	MLZ-1006	\N	0.800
\.


--
-- Data for Name: siparis; Type: TABLE DATA; Schema: public; Owner: -
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
-- Data for Name: stok_hareket; Type: TABLE DATA; Schema: public; Owner: -
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
-- Data for Name: uretim_emri; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.uretim_emri (id, model_id, model_ad, adet, durum, oncelik, olusturma, termin, kaynak_siparis, musteri, hedef_depo, "not") FROM stdin;
UE-4001	URN-1004	Venüs Yatak Odası Takımı	3	Üretimde	Normal	2026-06-04	2026-06-12	SIP-5019	\N	\N	\N
UE-4002	URN-1010	Aurora Gardırop 4 Kapaklı	5	Planlandı	Normal	2026-06-05	2026-06-15	\N	\N	\N	\N
UE-4003	URN-1004	Venüs Yatak Odası Takımı	2	Tamamlandı	Normal	2026-05-28	2026-06-03	\N	\N	\N	\N
\.


--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE SET; Schema: drizzle; Owner: -
--

SELECT pg_catalog.setval('drizzle.__drizzle_migrations_id_seq', 4, true);


--
-- Name: recete_satiri_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.recete_satiri_id_seq', 118, true);


--
-- Name: urun_parca_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.urun_parca_id_seq', 24, true);


--
-- Name: __drizzle_migrations __drizzle_migrations_pkey; Type: CONSTRAINT; Schema: drizzle; Owner: -
--

ALTER TABLE ONLY drizzle.__drizzle_migrations
    ADD CONSTRAINT __drizzle_migrations_pkey PRIMARY KEY (id);


--
-- Name: cari_islem cari_islem_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cari_islem
    ADD CONSTRAINT cari_islem_pkey PRIMARY KEY (id);


--
-- Name: cari cari_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cari
    ADD CONSTRAINT cari_pkey PRIMARY KEY (id);


--
-- Name: depo depo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.depo
    ADD CONSTRAINT depo_pkey PRIMARY KEY (id);


--
-- Name: malzeme malzeme_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.malzeme
    ADD CONSTRAINT malzeme_pkey PRIMARY KEY (id);


--
-- Name: musteri musteri_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.musteri
    ADD CONSTRAINT musteri_pkey PRIMARY KEY (id);


--
-- Name: parca parca_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parca
    ADD CONSTRAINT parca_pkey PRIMARY KEY (id);


--
-- Name: recete_satiri recete_satiri_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recete_satiri
    ADD CONSTRAINT recete_satiri_pkey PRIMARY KEY (id);


--
-- Name: siparis siparis_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.siparis
    ADD CONSTRAINT siparis_pkey PRIMARY KEY (id);


--
-- Name: stok_hareket stok_hareket_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stok_hareket
    ADD CONSTRAINT stok_hareket_pkey PRIMARY KEY (id);


--
-- Name: uretim_emri uretim_emri_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.uretim_emri
    ADD CONSTRAINT uretim_emri_pkey PRIMARY KEY (id);


--
-- Name: model_parca urun_parca_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.model_parca
    ADD CONSTRAINT urun_parca_pkey PRIMARY KEY (id);


--
-- Name: model urun_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.model
    ADD CONSTRAINT urun_pkey PRIMARY KEY (id);


--
-- Name: cari_islem cari_islem_cari_id_cari_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cari_islem
    ADD CONSTRAINT cari_islem_cari_id_cari_id_fk FOREIGN KEY (cari_id) REFERENCES public.cari(id) ON DELETE CASCADE;


--
-- Name: recete_satiri recete_satiri_alt_parca_id_parca_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recete_satiri
    ADD CONSTRAINT recete_satiri_alt_parca_id_parca_id_fk FOREIGN KEY (alt_parca_id) REFERENCES public.parca(id);


--
-- Name: recete_satiri recete_satiri_malzeme_id_malzeme_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recete_satiri
    ADD CONSTRAINT recete_satiri_malzeme_id_malzeme_id_fk FOREIGN KEY (malzeme_id) REFERENCES public.malzeme(id);


--
-- Name: recete_satiri recete_satiri_parca_id_parca_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recete_satiri
    ADD CONSTRAINT recete_satiri_parca_id_parca_id_fk FOREIGN KEY (parca_id) REFERENCES public.parca(id) ON DELETE CASCADE;


--
-- Name: siparis siparis_musteri_id_musteri_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.siparis
    ADD CONSTRAINT siparis_musteri_id_musteri_id_fk FOREIGN KEY (musteri_id) REFERENCES public.musteri(id);


--
-- Name: uretim_emri uretim_emri_urun_id_urun_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.uretim_emri
    ADD CONSTRAINT uretim_emri_urun_id_urun_id_fk FOREIGN KEY (model_id) REFERENCES public.model(id);


--
-- Name: model_parca urun_parca_parca_id_parca_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.model_parca
    ADD CONSTRAINT urun_parca_parca_id_parca_id_fk FOREIGN KEY (parca_id) REFERENCES public.parca(id);


--
-- Name: model_parca urun_parca_urun_id_urun_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.model_parca
    ADD CONSTRAINT urun_parca_urun_id_urun_id_fk FOREIGN KEY (model_id) REFERENCES public.model(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict oAZn1F14H6hfT67SXFgw5sn82tpFNTKJUBWnH9PscOHnpmUS5t02gxgppzf4rQK

