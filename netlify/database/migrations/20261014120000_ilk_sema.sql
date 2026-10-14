-- =====================================================================
-- Tuğba Yanımda – Sadakat Programı
-- Migration 1: Ana veritabanı şeması
-- Netlify bu dosyayı her yayında (deploy) otomatik uygular.
-- Uygulanmış bir migration dosyası DEĞİŞTİRİLMEZ; değişiklikler yeni
-- bir dosyayla (ör. 20261020..._kampanya_alani.sql) yapılır.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. MAĞAZALAR
-- ---------------------------------------------------------------------
CREATE TABLE magazalar (
  id           SERIAL PRIMARY KEY,
  kod          TEXT        NOT NULL UNIQUE,          -- ör. IST-KDK
  ad           TEXT        NOT NULL,                 -- ör. Kadıköy Mağazası
  il           TEXT        NOT NULL,
  ilce         TEXT,
  adres        TEXT,
  telefon      TEXT,
  aktif        BOOLEAN     NOT NULL DEFAULT TRUE,
  olusturma    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 2. KULLANICILAR (tek giriş tablosu – rol alanı paneli belirler)
--    musteri   -> telefon ile giriş
--    magaza    -> kullanıcı adı ile giriş, bir mağazaya bağlı
--    yonetici  -> kullanıcı adı ile giriş (Genel Merkez)
-- ---------------------------------------------------------------------
CREATE TABLE kullanicilar (
  id             SERIAL PRIMARY KEY,
  rol            TEXT        NOT NULL CHECK (rol IN ('musteri', 'magaza', 'yonetici')),
  telefon        TEXT        UNIQUE,                 -- 10 hane: 5321234567
  kullanici_adi  TEXT        UNIQUE,                 -- personel / yönetici için
  sifre_hash     TEXT        NOT NULL,               -- bcrypt
  ad             TEXT        NOT NULL,
  soyad          TEXT        NOT NULL,
  magaza_id      INTEGER     REFERENCES magazalar(id),
  durum          TEXT        NOT NULL DEFAULT 'aktif' CHECK (durum IN ('aktif', 'pasif')),
  son_giris      TIMESTAMPTZ,
  olusturma      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT kimlik_gerekli CHECK (telefon IS NOT NULL OR kullanici_adi IS NOT NULL),
  CONSTRAINT telefon_bicimi CHECK (telefon IS NULL OR telefon ~ '^5[0-9]{9}$'),
  CONSTRAINT magaza_personeli_magazali CHECK (rol <> 'magaza' OR magaza_id IS NOT NULL)
);

-- ---------------------------------------------------------------------
-- 3. MÜŞTERİ PROFİLİ (kullanicilar ile 1-1)
-- ---------------------------------------------------------------------
CREATE TABLE musteriler (
  kullanici_id      INTEGER     PRIMARY KEY REFERENCES kullanicilar(id) ON DELETE CASCADE,
  qr_kodu           TEXT        NOT NULL UNIQUE,     -- QR içeriği; telefon numarası İÇERMEZ
  e_posta           TEXT,
  dogum_tarihi      DATE,
  cinsiyet          TEXT        CHECK (cinsiyet IN ('kadin', 'erkek', 'belirtmek_istemiyor')),
  il                TEXT,
  kayit_magaza_id   INTEGER     REFERENCES magazalar(id),
  kayit_kanali      TEXT        NOT NULL DEFAULT 'web' CHECK (kayit_kanali IN ('web', 'magaza', 'demo')),
  kvkk_onay_tarihi  TIMESTAMPTZ NOT NULL,            -- aydınlatma metni okundu
  etk_onay          BOOLEAN     NOT NULL DEFAULT FALSE, -- SMS/e-posta kampanya izni (İYS)
  etk_onay_tarihi   TIMESTAMPTZ
);

-- ---------------------------------------------------------------------
-- 4. KUPONLAR (puanla alınan % indirim kuponu)
-- ---------------------------------------------------------------------
CREATE TABLE kuponlar (
  id                   SERIAL PRIMARY KEY,
  musteri_id           INTEGER       NOT NULL REFERENCES kullanicilar(id),
  kod                  TEXT          NOT NULL UNIQUE,
  indirim_orani        NUMERIC(5,2)  NOT NULL CHECK (indirim_orani > 0 AND indirim_orani <= 100),
  puan_bedeli          INTEGER       NOT NULL CHECK (puan_bedeli > 0),
  durum                TEXT          NOT NULL DEFAULT 'aktif'
                         CHECK (durum IN ('aktif', 'kullanildi', 'suresi_doldu', 'iptal')),
  son_kullanma         TIMESTAMPTZ   NOT NULL,
  kullanilan_satis_id  INTEGER,
  kullanilma_tarihi    TIMESTAMPTZ,
  olusturma            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 5. SATIŞLAR (mağaza satış ekranından girilen fişler)
-- ---------------------------------------------------------------------
CREATE TABLE satislar (
  id              SERIAL PRIMARY KEY,
  fis_no          TEXT          NOT NULL UNIQUE,
  musteri_id      INTEGER       REFERENCES kullanicilar(id),  -- üyesiz satış için NULL olabilir
  magaza_id       INTEGER       NOT NULL REFERENCES magazalar(id),
  personel_id     INTEGER       REFERENCES kullanicilar(id),
  brut_tutar      NUMERIC(12,2) NOT NULL CHECK (brut_tutar > 0),
  indirim_tutari  NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (indirim_tutari >= 0),
  net_tutar       NUMERIC(12,2) NOT NULL CHECK (net_tutar >= 0),
  kupon_id        INTEGER       REFERENCES kuponlar(id),
  kazanilan_puan  INTEGER       NOT NULL DEFAULT 0,
  durum           TEXT          NOT NULL DEFAULT 'tamamlandi' CHECK (durum IN ('tamamlandi', 'iade')),
  iade_tarihi     TIMESTAMPTZ,
  tarih           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT net_hesap CHECK (net_tutar = brut_tutar - indirim_tutari)
);

ALTER TABLE kuponlar
  ADD CONSTRAINT kupon_satis_fk FOREIGN KEY (kullanilan_satis_id) REFERENCES satislar(id);

-- ---------------------------------------------------------------------
-- 6. PUAN HAREKETLERİ (defter / ledger – bakiye = toplam)
--    kazanim : satıştan gelen + puan
--    harcama : kupon alımı      - puan
--    iade    : iade edilen satışın puanı geri alınır (-) veya kupon iadesi (+)
--    manuel  : Genel Merkez düzeltmesi (+/-)
-- ---------------------------------------------------------------------
CREATE TABLE puan_hareketleri (
  id            BIGSERIAL PRIMARY KEY,
  musteri_id    INTEGER     NOT NULL REFERENCES kullanicilar(id),
  tur           TEXT        NOT NULL CHECK (tur IN ('kazanim', 'harcama', 'iade', 'manuel')),
  puan          INTEGER     NOT NULL CHECK (puan <> 0),
  satis_id      INTEGER     REFERENCES satislar(id),
  kupon_id      INTEGER     REFERENCES kuponlar(id),
  aciklama      TEXT,
  olusturan_id  INTEGER     REFERENCES kullanicilar(id),
  tarih         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 7. PROGRAM AYARLARI (yönetici panelinden değiştirilebilir)
-- ---------------------------------------------------------------------
CREATE TABLE ayarlar (
  anahtar        TEXT PRIMARY KEY,
  deger          TEXT        NOT NULL,
  aciklama       TEXT        NOT NULL,
  guncelleme     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  guncelleyen_id INTEGER     REFERENCES kullanicilar(id)
);

INSERT INTO ayarlar (anahtar, deger, aciklama) VALUES
  ('puan_icin_tutar',        '10',  'Kaç TL alışverişe 1 puan verilir (10 = her 10 TL için 1 puan)'),
  ('kupon_puan_bedeli',      '200', 'Bir indirim kuponu kaç puan'),
  ('kupon_indirim_orani',    '5',   'Kuponun indirim oranı (%)'),
  ('kupon_gunluk_limit',     '1',   'Bir müşteri günde en fazla kaç kupon kullanabilir'),
  ('kupon_gecerlilik_gun',   '7',   'Alınan kupon kaç gün geçerli'),
  ('puan_gecerlilik_ay',     '12',  'Kazanılan puan kaç ay sonra sona erer (0 = süresiz)'),
  ('hosgeldin_puani',        '50',  'Yeni üyeye verilen hoş geldin puanı');

-- ---------------------------------------------------------------------
-- 8. KAMPANYA / DUYURULAR
-- ---------------------------------------------------------------------
CREATE TABLE kampanyalar (
  id          SERIAL PRIMARY KEY,
  baslik      TEXT        NOT NULL,
  metin       TEXT        NOT NULL,
  gorsel_url  TEXT,
  magaza_id   INTEGER     REFERENCES magazalar(id),   -- NULL = tüm mağazalar
  baslangic   DATE        NOT NULL,
  bitis       DATE        NOT NULL,
  aktif       BOOLEAN     NOT NULL DEFAULT TRUE,
  olusturma   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (bitis >= baslangic)
);

-- ---------------------------------------------------------------------
-- 9. İŞLEM KAYITLARI (denetim izi: kim, ne, ne zaman)
-- ---------------------------------------------------------------------
CREATE TABLE islem_kayitlari (
  id            BIGSERIAL PRIMARY KEY,
  kullanici_id  INTEGER     REFERENCES kullanicilar(id),
  islem         TEXT        NOT NULL,                -- ör. giris_basarili, satis_olusturuldu
  hedef         TEXT,                                -- ör. telefon/kullanıcı adı denemesi
  detay         JSONB,
  ip            TEXT,
  tarih         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 10. SİSTEM GİZLİ ANAHTARLARI (yalnızca sunucu okur, panelde görünmez)
-- ---------------------------------------------------------------------
CREATE TABLE sistem_anahtarlari (
  anahtar  TEXT PRIMARY KEY,
  deger    TEXT NOT NULL
);

-- Oturum (JWT) imza anahtarı: ortam değişkeni JWT_SECRET yoksa bu kullanılır.
INSERT INTO sistem_anahtarlari (anahtar, deger)
VALUES ('oturum_anahtari',
        md5(random()::text || clock_timestamp()::text) ||
        md5(random()::text || clock_timestamp()::text) ||
        md5(random()::text || clock_timestamp()::text));

-- ---------------------------------------------------------------------
-- 11. GÖRÜNÜMLER (raporlama kolaylığı)
-- ---------------------------------------------------------------------
CREATE VIEW musteri_ozet AS
SELECT
  k.id                                   AS musteri_id,
  k.ad, k.soyad, k.telefon, k.durum, k.olusturma AS kayit_tarihi, k.son_giris,
  m.qr_kodu, m.e_posta, m.dogum_tarihi, m.cinsiyet, m.il,
  m.kayit_magaza_id, m.etk_onay,
  COALESCE(p.bakiye, 0)                  AS puan_bakiyesi,
  COALESCE(s.alisveris_sayisi, 0)        AS alisveris_sayisi,
  COALESCE(s.toplam_harcama, 0)          AS toplam_harcama,
  s.son_alisveris
FROM kullanicilar k
JOIN musteriler m ON m.kullanici_id = k.id
LEFT JOIN (
  SELECT musteri_id, SUM(puan) AS bakiye
  FROM puan_hareketleri GROUP BY musteri_id
) p ON p.musteri_id = k.id
LEFT JOIN (
  SELECT musteri_id,
         COUNT(*)        AS alisveris_sayisi,
         SUM(net_tutar)  AS toplam_harcama,
         MAX(tarih)      AS son_alisveris
  FROM satislar WHERE durum = 'tamamlandi' GROUP BY musteri_id
) s ON s.musteri_id = k.id
WHERE k.rol = 'musteri';

-- ---------------------------------------------------------------------
-- 12. İNDEKSLER
-- ---------------------------------------------------------------------
CREATE INDEX idx_satislar_musteri      ON satislar (musteri_id, tarih DESC);
CREATE INDEX idx_satislar_magaza_tarih ON satislar (magaza_id, tarih DESC);
CREATE INDEX idx_puan_musteri          ON puan_hareketleri (musteri_id, tarih DESC);
CREATE INDEX idx_kupon_musteri         ON kuponlar (musteri_id, durum);
CREATE INDEX idx_islem_hedef_tarih     ON islem_kayitlari (hedef, islem, tarih DESC);
CREATE INDEX idx_kullanici_rol         ON kullanicilar (rol);
