// Migration .sql dosyalarını Cloudflare fonksiyonlarının içine gömülecek bir JS modülüne çevirir.
// Böylece veritabanı adresi derleme sırasında görünmese bile site, ilk istekte bekleyen
// migration'ları kendisi uygulayabilir (bkz. functions/api/[[yol]].ts → veritabaniHazirla).
// Çıktı: netlify/lib/migrasyonlar.generated.mjs (repoya eklenmez, her derlemede yeniden üretilir)
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const KOK = join(dirname(fileURLToPath(import.meta.url)), '..');
const KLASOR = join(KOK, 'netlify/database/migrations');
const dosyalar = (await readdir(KLASOR)).filter((f) => /^\d+_[a-z0-9_-]+\.sql$/.test(f)).sort();
const liste = await Promise.all(dosyalar.map(async (ad) => ({ ad, sql: await readFile(join(KLASOR, ad), 'utf8') })));
await writeFile(
  join(KOK, 'netlify/lib/migrasyonlar.generated.mjs'),
  `// OTOMATİK ÜRETİLDİ – elle düzenleme (scripts/migrasyon-paketle.mjs)\nexport default ${JSON.stringify(liste)};\n`,
);
console.log(`✓ ${liste.length} migration pakete eklendi`);
