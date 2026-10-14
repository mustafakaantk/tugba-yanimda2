// Veritabanı bağlantısı – platformdan bağımsız (Netlify, Cloudflare, yerel test)
//
// Veritabanı Neon (serverless Postgres). Bağlantı adresi şu sırayla aranır:
//   DATABASE_URL  (Cloudflare / harici Neon)  →  NETLIFY_DB_URL (Netlify Database)
//
// Cloudflare Workers'ta bir bağlantı isteği aşamaz; bu yüzden Cloudflare kapısı
// (functions/api/[[yol]].ts) her istek için yeni bir havuz açar ve bunu
// AsyncLocalStorage ile buraya iletir. Netlify'da ise tek havuz yeniden kullanılır.
import { AsyncLocalStorage } from 'node:async_hooks';
import { Pool } from '@neondatabase/serverless';

type Satir = Record<string, any>;
interface Havuz {
  query(sql: string, parametreler?: any[]): Promise<{ rows: any[] }>;
  connect(): Promise<{ query(sql: string, parametreler?: any[]): Promise<{ rows: any[] }>; release(): void }>;
}

/** İstek kapsamındaki havuz (Cloudflare). */
export const istekHavuzu = new AsyncLocalStorage<Havuz>();

let varsayilan: Havuz | null = null;

/** Varsayılan havuzu dışarıdan ayarla (yerel testte pg havuzu verilir). */
export function veritabaniAyarla(havuz: Havuz) {
  varsayilan = havuz;
}

function ortam(ad: string): string | undefined {
  const n = (globalThis as any).Netlify?.env?.get?.(ad);
  if (n) return n;
  return typeof process !== 'undefined' ? process.env?.[ad] : undefined;
}

function db(): Havuz {
  const istek = istekHavuzu.getStore();
  if (istek) return istek;
  if (!varsayilan) {
    const adres = ortam('DATABASE_URL') || ortam('NETLIFY_DB_URL');
    if (!adres) throw new Error('Veritabanı bağlantı adresi tanımlı değil (DATABASE_URL).');
    varsayilan = new Pool({ connectionString: adres }) as unknown as Havuz;
  }
  return varsayilan;
}

/** Tek bir SQL sorgusu çalıştırır. Parametreler $1, $2 … ile verilir (SQL enjeksiyonuna karşı). */
export async function sorgu<T extends Satir = Satir>(sql: string, parametreler: unknown[] = []): Promise<T[]> {
  const sonuc = await db().query(sql, parametreler as any[]);
  return sonuc.rows as T[];
}

export async function tekSatir<T extends Satir = Satir>(sql: string, parametreler: unknown[] = []): Promise<T | null> {
  const satirlar = await sorgu<T>(sql, parametreler);
  return satirlar[0] ?? null;
}

/** Birden fazla sorguyu tek işlem (transaction) içinde çalıştırır; hata olursa hepsi geri alınır. */
export async function islem<T>(fn: (s: typeof sorgu) => Promise<T>): Promise<T> {
  const istemci = await db().connect();
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
