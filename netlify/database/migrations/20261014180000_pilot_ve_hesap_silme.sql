-- =====================================================================
-- Tuğba Yanımda – Migration 4: 5 mağazalık pilot + KVKK hesap silme
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. PİLOT: program yalnızca "program_aktif" işaretli mağazalarda çalışır.
--    Diğer mağazalar listede kalır (favori/duyuru için), ama puan işlemi,
--    kayıt sırasında mağaza seçimi ve personel girişi pilot mağazalarla sınırlıdır.
--    Faz 4'te Genel Merkez bu listeyi panelden değiştirebilecek.
-- ---------------------------------------------------------------------
ALTER TABLE magazalar ADD COLUMN program_aktif   BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE magazalar ADD COLUMN program_baslama DATE;

UPDATE magazalar
   SET program_aktif = TRUE, program_baslama = CURRENT_DATE
 WHERE (il, ad) IN (
   ('İstanbul', 'Kadıköy'),
   ('İstanbul', 'Bakırköy Çarşı'),
   ('Ankara',   'Kızılay 1'),
   ('İzmir',    'Alsancak'),
   ('Bursa',    'Nilüfer Özlüce')
 );

CREATE INDEX idx_magaza_program ON magazalar (program_aktif) WHERE program_aktif;

-- ---------------------------------------------------------------------
-- 2. HESAP SİLME (KVKK m.7 / m.11): müşteri hesabını kendisi siler.
--    Kişisel veriler anonimleştirilir; satış kayıtları yasal saklama ve
--    muhasebe için kimliksiz olarak kalır.
-- ---------------------------------------------------------------------
ALTER TABLE kullanicilar ADD COLUMN silinme_tarihi TIMESTAMPTZ;

-- Hoş geldin puanı bir telefon numarasına yalnızca bir kez verilir. Hesap silinse de
-- numaranın kendisi değil, geri çevrilemeyen özeti (SHA-256) saklanır; böylece
-- "sil – yeniden üye ol" ile puan toplanamaz.
CREATE TABLE hosgeldin_verilen (
  telefon_ozeti  TEXT        PRIMARY KEY,
  tarih          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Mevcut üyeler için özetleri şimdiden oluştur
INSERT INTO hosgeldin_verilen (telefon_ozeti, tarih)
SELECT encode(sha256(convert_to('tugba-yanimda:' || telefon, 'UTF8')), 'hex'), olusturma
  FROM kullanicilar
 WHERE rol = 'musteri' AND telefon IS NOT NULL
ON CONFLICT DO NOTHING;
