// =====================================================================
// Veritabanı migration çalıştırıcı (Cloudflare + Neon için)
//
// netlify/database/migrations/ içindeki .sql dosyalarını ad sırasıyla uygular;
// uygulananları "_migrasyonlar" tablosuna yazar, böylece her dosya bir kez çalışır.
// Her dosya kendi işlemi (transaction) içinde çalışır: hata olursa o dosya
// tamamen geri alınır ve derleme durur (bozuk sürüm yayına çıkmaz).
//
// Cloudflare'de derleme komutu: npm run build:cloudflare
// Elle çalıştırma:               DATABASE_URL=... node scripts/migrate.mjs
// =====================================================================
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import pg from 'pg';

const KLASOR = join(dirname(fileURLToPath(import.meta.url)), '../netlify/database/migrations');
const adres = process.env.DATABASE_URL;

if (!adres) {
  console.warn('⚠ DATABASE_URL tanımlı değil; migration adımı atlandı.');
  process.exit(0);
}

const yerel = /@(localhost|127\.0\.0\.1)[:/]/.test(adres);
const istemci = new pg.Client({ connectionString: adres, ssl: yerel ? false : { rejectUnauthorized: true } });

try {
  await istemci.connect();
  await istemci.query(`CREATE TABLE IF NOT EXISTS _migrasyonlar (
    ad TEXT PRIMARY KEY, uygulama TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
  // Aynı anda iki derleme çalışırsa çakışmasın
  await istemci.query('SELECT pg_advisory_lock(20261014)');

  const uygulanan = new Set((await istemci.query('SELECT ad FROM _migrasyonlar')).rows.map((r) => r.ad));
  const dosyalar = (await readdir(KLASOR)).filter((f) => /^\d+_[a-z0-9_-]+\.sql$/.test(f)).sort();
  const bekleyen = dosyalar.filter((f) => !uygulanan.has(f));

  if (!bekleyen.length) console.log(`✓ Veritabanı güncel (${dosyalar.length} migration).`);
  for (const dosya of bekleyen) {
    const sql = await readFile(join(KLASOR, dosya), 'utf8');
    const bas = Date.now();
    try {
      await istemci.query('BEGIN');
      await istemci.query(sql);
      await istemci.query('INSERT INTO _migrasyonlar (ad) VALUES ($1)', [dosya]);
      await istemci.query('COMMIT');
      console.log(`✓ ${dosya} (${Date.now() - bas} ms)`);
    } catch (hata) {
      await istemci.query('ROLLBACK').catch(() => {});
      console.error(`✗ ${dosya} uygulanamadı: ${hata.message}`);
      process.exitCode = 1;
      break;
    }
  }
} catch (hata) {
  console.error(`✗ Veritabanına bağlanılamadı: ${hata.message}`);
  process.exitCode = 1;
} finally {
  await istemci.end().catch(() => {});
}
