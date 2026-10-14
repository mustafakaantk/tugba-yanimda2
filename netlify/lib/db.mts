// Veritabanı bağlantısı – Netlify Database (Postgres)
// Netlify, NETLIFY_DB_URL ortam değişkenini otomatik tanımlar.
import { getDatabase } from '@netlify/database';

type Satir = Record<string, any>;
let baglanti: ReturnType<typeof getDatabase> | null = null;

function db() {
  if (!baglanti) baglanti = getDatabase();
  return baglanti;
}

/** Tek bir SQL sorgusu çalıştırır. Parametreler $1, $2 … ile verilir (SQL enjeksiyonuna karşı). */
export async function sorgu<T extends Satir = Satir>(sql: string, parametreler: unknown[] = []): Promise<T[]> {
  const sonuc = await db().pool.query(sql, parametreler as any[]);
  return sonuc.rows as T[];
}

export async function tekSatir<T extends Satir = Satir>(sql: string, parametreler: unknown[] = []): Promise<T | null> {
  const satirlar = await sorgu<T>(sql, parametreler);
  return satirlar[0] ?? null;
}

/** Birden fazla sorguyu tek işlem (transaction) içinde çalıştırır; hata olursa hepsi geri alınır. */
export async function islem<T>(fn: (s: typeof sorgu) => Promise<T>): Promise<T> {
  const istemci = await db().pool.connect();
  try {
    await istemci.query('BEGIN');
    const s = (async (sql: string, p: unknown[] = []) => (await istemci.query(sql, p as any[])).rows) as typeof sorgu;
    const sonuc = await fn(s);
    await istemci.query('COMMIT');
    return sonuc;
  } catch (hata) {
    await istemci.query('ROLLBACK').catch(() => {});
    throw hata;
  } finally {
    istemci.release();
  }
}
