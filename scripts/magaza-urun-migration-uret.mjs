// =====================================================================
// Eski "Tuğba Yanımda" prototipinden aktarılan verilerle migration üretir.
// Kaynak:  veri/magazalar.json (132 mağaza), veri/urunler.json (385 ürün)
// Çıktı:   netlify/database/migrations/20261014150000_magaza_urun_rol.sql
// Çalıştırma: node scripts/magaza-urun-migration-uret.mjs
//
// NOT: Bu migration yayına girdikten sonra bu script yeniden çalıştırılıp
// dosya DEĞİŞTİRİLMEMELİ. Mağaza/ürün değişiklikleri yeni bir migration
// ya da (Faz 4'te) yönetici paneli üzerinden yapılır.
// =====================================================================
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const KOK = join(dirname(fileURLToPath(import.meta.url)), '..');
const CIKTI = join(KOK, 'netlify/database/migrations/20261014150000_magaza_urun_rol.sql');
const { magazalar } = JSON.parse(readFileSync(join(KOK, 'veri/magazalar.json'), 'utf8'));
const { kategoriler, urunler } = JSON.parse(readFileSync(join(KOK, 'veri/urunler.json'), 'utf8'));

const q = (v) => (v === null || v === undefined || v === '' ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`);
const kod = (i) => 'T' + String(i + 1).padStart(3, '0');

// Demo verisindeki 5 mağaza (id 1–5), gerçek listedeki karşılıklarına bağlanır;
// böylece mevcut demo satışları ve personel hesapları bozulmadan gerçek mağazaya geçer.
const DEMO_ESLEME = [
  { id: 1, eskiKod: 'IST-KDK', il: 'İstanbul', ad: 'Kadıköy' },
  { id: 2, eskiKod: 'IST-BKY', il: 'İstanbul', ad: 'Bakırköy Çarşı' },
  { id: 3, eskiKod: 'ANK-KZL', il: 'Ankara', ad: 'Kızılay 1' },
  { id: 4, eskiKod: 'IZM-ALS', il: 'İzmir', ad: 'Alsancak' },
  { id: 5, eskiKod: 'BRS-NLF', il: 'Bursa', ad: 'Nilüfer Özlüce' },
];

const sat = [];
const yaz = (s) => sat.push(s);

yaz(`-- =====================================================================
-- Tuğba Yanımda – Migration 3: gerçek mağazalar, ürün kataloğu, kasiyer/müdür
-- rolleri ve eski prototipten gelen program kuralları.
-- Otomatik üretildi: scripts/magaza-urun-migration-uret.mjs
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. ROLLER: "magaza" rolü ikiye ayrılır -> "kasiyer" ve "mudur"
--    (demo: kullanıcı adı ...01 olan müdür, ...02 olan kasiyer olur)
-- ---------------------------------------------------------------------
ALTER TABLE kullanicilar DROP CONSTRAINT IF EXISTS kullanicilar_rol_check;
ALTER TABLE kullanicilar DROP CONSTRAINT IF EXISTS magaza_personeli_magazali;

UPDATE kullanicilar
   SET rol = CASE WHEN kullanici_adi LIKE '%01' THEN 'mudur' ELSE 'kasiyer' END
 WHERE rol = 'magaza';

ALTER TABLE kullanicilar
  ADD CONSTRAINT kullanicilar_rol_check CHECK (rol IN ('musteri', 'kasiyer', 'mudur', 'yonetici'));
ALTER TABLE kullanicilar
  ADD CONSTRAINT magaza_personeli_magazali CHECK (rol NOT IN ('kasiyer', 'mudur') OR magaza_id IS NOT NULL);

-- ---------------------------------------------------------------------
-- 2. MAĞAZALAR: konum alanları + 132 gerçek mağaza
-- ---------------------------------------------------------------------
ALTER TABLE magazalar ADD COLUMN enlem  NUMERIC(9,6);
ALTER TABLE magazalar ADD COLUMN boylam NUMERIC(9,6);
`);

for (const d of DEMO_ESLEME) {
  const i = magazalar.findIndex((m) => m.il === d.il && m.ad === d.ad);
  if (i < 0) throw new Error(`Eşleşme bulunamadı: ${d.il} ${d.ad}`);
  const m = magazalar[i];
  yaz(`UPDATE magazalar SET kod = ${q(kod(i))}, ad = ${q(m.ad)}, il = ${q(m.il)}, ilce = ${q(m.ilce)}, adres = ${q(m.adres)}, telefon = NULL, enlem = ${m.enlem}, boylam = ${m.boylam}
 WHERE id = ${d.id} AND kod = ${q(d.eskiKod)};`);
}

yaz(`
INSERT INTO magazalar (kod, ad, il, ilce, adres, enlem, boylam)
SELECT v.kod, v.ad, v.il, v.ilce, v.adres, v.enlem, v.boylam
  FROM (VALUES
  ${magazalar.map((m, i) => `(${q(kod(i))}, ${q(m.ad)}, ${q(m.il)}, ${q(m.ilce)}, ${q(m.adres)}, ${m.enlem}::numeric, ${m.boylam}::numeric)`).join(',\n  ')}
  ) AS v (kod, ad, il, ilce, adres, enlem, boylam)
 WHERE NOT EXISTS (SELECT 1 FROM magazalar m WHERE m.il = v.il AND m.ad = v.ad);

CREATE INDEX idx_magaza_il ON magazalar (il, ad);

-- ---------------------------------------------------------------------
-- 3. ÜRÜN KATALOĞU (fiyat tutulmaz; stok kasa sisteminde kalır)
-- ---------------------------------------------------------------------
CREATE TABLE urun_kategorileri (
  kod            TEXT    PRIMARY KEY,
  ad             TEXT    NOT NULL,
  sira           INTEGER NOT NULL,
  kapak_urun_id  TEXT
);

CREATE TABLE urunler (
  id            TEXT        PRIMARY KEY,               -- Ticimax URUNID (ör. p6)
  ad            TEXT        NOT NULL,
  kategori      TEXT        NOT NULL REFERENCES urun_kategorileri(kod),
  alt_kategori  TEXT,
  aciklama      TEXT,
  stok_kodu     TEXT,
  cok_satan     BOOLEAN     NOT NULL DEFAULT FALSE,
  gorsel        TEXT,                                  -- /urun/p6.webp
  aktif         BOOLEAN     NOT NULL DEFAULT TRUE,
  olusturma     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_urun_kategori ON urunler (kategori) WHERE aktif;

INSERT INTO urun_kategorileri (kod, ad, sira, kapak_urun_id) VALUES
  ${kategoriler.map((k) => `(${q(k.kod)}, ${q(k.ad)}, ${k.sira}, ${q(k.kapak_urun_id)})`).join(',\n  ')};
`);

for (let i = 0; i < urunler.length; i += 100) {
  yaz(`INSERT INTO urunler (id, ad, kategori, alt_kategori, aciklama, stok_kodu, cok_satan, gorsel) VALUES
  ${urunler.slice(i, i + 100).map((u) => `(${q(u.id)}, ${q(u.ad)}, ${q(u.kategori)}, ${q(u.alt_kategori)}, ${q(u.aciklama)}, ${q(u.stok_kodu)}, ${u.cok_satan ? 'TRUE' : 'FALSE'}, ${q(`/urun/${u.id}.webp`)})`).join(',\n  ')};
`);
}

yaz(`ALTER TABLE urun_kategorileri
  ADD CONSTRAINT kapak_urun_fk FOREIGN KEY (kapak_urun_id) REFERENCES urunler(id);

-- ---------------------------------------------------------------------
-- 4. FAVORİLER (Faz 2'de müşteri panelinde kullanılacak)
-- ---------------------------------------------------------------------
CREATE TABLE favori_magazalar (
  musteri_id  INTEGER     NOT NULL REFERENCES kullanicilar(id) ON DELETE CASCADE,
  magaza_id   INTEGER     NOT NULL REFERENCES magazalar(id),
  tarih       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (musteri_id, magaza_id)
);

CREATE TABLE favori_urunler (
  musteri_id  INTEGER     NOT NULL REFERENCES kullanicilar(id) ON DELETE CASCADE,
  urun_id     TEXT        NOT NULL REFERENCES urunler(id),
  tarih       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (musteri_id, urun_id)
);
CREATE INDEX idx_favori_urun ON favori_urunler (urun_id);

-- ---------------------------------------------------------------------
-- 5. PROGRAM KURALLARI (eski prototipteki değerler; merkezden değiştirilebilir)
--    Puan kullanımı artık kasada SMS koduyla yapılır; kupon geçerlilik süresi kalkar.
-- ---------------------------------------------------------------------
UPDATE ayarlar SET deger = '1', guncelleme = NOW() WHERE anahtar = 'puan_icin_tutar';
DELETE FROM ayarlar WHERE anahtar = 'kupon_gecerlilik_gun';

INSERT INTO ayarlar (anahtar, deger, aciklama) VALUES
  ('kasa_indirim_kodu',     'Tuğba Yanımda %5', 'Puan kullanımında kasiyerin kasada seçeceği indirim kodunun adı'),
  ('azami_islem_tutari',    '5000',             'Tek işlemde puan verilebilecek en yüksek tutar (TL); üstü uyarı verir'),
  ('gunluk_azami_kazanim',  '3',                'Bir numaranın bir günde en fazla kaç kez puan kazanabileceği'),
  ('sms_kod_gecerlilik_dk', '5',                'Puan kullanımı için gönderilen SMS kodunun geçerlilik süresi (dakika)');
`);

writeFileSync(CIKTI, sat.join('\n') + '\n');
console.log(`Yazıldı: ${CIKTI}\n${magazalar.length} mağaza, ${kategoriler.length} kategori, ${urunler.length} ürün`);
