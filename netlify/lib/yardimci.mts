// Ortak yardımcılar: JSON yanıt, hata, telefon biçimi, işlem kaydı
import { sorgu } from './db.mts';

export class UygulamaHatasi extends Error {
  constructor(public durum: number, mesaj: string) {
    super(mesaj);
  }
}

export function json(veri: unknown, durum = 200, basliklar: Record<string, string> = {}) {
  const h = new Headers({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  for (const [k, v] of Object.entries(basliklar)) h.append(k, v);
  return new Response(JSON.stringify(veri), { status: durum, headers: h });
}

/** Her fonksiyonu sarar: beklenen hataları kullanıcıya düzgün mesajla, beklenmeyenleri genel mesajla döndürür. */
export function guvenli(fn: (req: Request) => Promise<Response>) {
  return async (req: Request) => {
    try {
      return await fn(req);
    } catch (hata) {
      if (hata instanceof UygulamaHatasi) return json({ hata: hata.message }, hata.durum);
      console.error(hata);
      return json({ hata: 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.' }, 500);
    }
  };
}

/** POST gövdesini okur. Yalnızca JSON kabul edilir (form tabanlı CSRF denemelerini engeller). */
export async function govde<T = Record<string, unknown>>(req: Request): Promise<T> {
  if (!(req.headers.get('content-type') || '').includes('application/json')) {
    throw new UygulamaHatasi(415, 'Geçersiz istek biçimi.');
  }
  try {
    return (await req.json()) as T;
  } catch {
    throw new UygulamaHatasi(400, 'İstek okunamadı.');
  }
}

/** 0532 123 45 67, +90 532…, 532… → 5321234567. Geçersizse null. */
export function telefonDuzelt(girdi: unknown): string | null {
  if (typeof girdi !== 'string') return null;
  let r = girdi.replace(/\D/g, '');
  if (r.startsWith('90') && r.length === 12) r = r.slice(2);
  if (r.startsWith('0') && r.length === 11) r = r.slice(1);
  return /^5\d{9}$/.test(r) ? r : null;
}

export function ipAdresi(req: Request) {
  return req.headers.get('x-nf-client-connection-ip') || req.headers.get('x-forwarded-for')?.split(',')[0].trim() || null;
}

/** Denetim izi: kim, ne yaptı. Kayıt hatası asıl işlemi bozmaz. */
export async function kaydet(islemAdi: string, opts: { kullaniciId?: number | null; hedef?: string | null; detay?: unknown; req?: Request } = {}) {
  try {
    await sorgu('INSERT INTO islem_kayitlari (kullanici_id, islem, hedef, detay, ip) VALUES ($1, $2, $3, $4, $5)', [
      opts.kullaniciId ?? null,
      islemAdi,
      opts.hedef ?? null,
      opts.detay ? JSON.stringify(opts.detay) : null,
      opts.req ? ipAdresi(opts.req) : null,
    ]);
  } catch (h) {
    console.error('İşlem kaydı yazılamadı', h);
  }
}

export function metin(v: unknown, enFazla = 100): string {
  return typeof v === 'string' ? v.trim().slice(0, enFazla) : '';
}
