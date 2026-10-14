// GET  /api/musteri/favoriler                      – müşterinin favori mağaza ve ürün kimlikleri
// POST /api/musteri/favoriler {tur, id, ekle}       – favoriye ekle / çıkar
//       tur: 'magaza' | 'urun'   ekle: true | false
import type { Config } from '@netlify/functions';
import { sorgu, tekSatir } from '../lib/db.mts';
import { yetkiIste } from '../lib/oturum.mts';
import { guvenli, govde, json, UygulamaHatasi } from '../lib/yardimci.mts';

const AZAMI = { magaza: 20, urun: 200 };

async function liste(musteriId: number) {
  const [m, u] = await Promise.all([
    sorgu<{ magaza_id: number }>('SELECT magaza_id FROM favori_magazalar WHERE musteri_id = $1 ORDER BY tarih', [musteriId]),
    sorgu<{ urun_id: string }>('SELECT urun_id FROM favori_urunler WHERE musteri_id = $1 ORDER BY tarih DESC', [musteriId]),
  ]);
  return { magazalar: m.map((x) => x.magaza_id), urunler: u.map((x) => x.urun_id) };
}

export default guvenli(async (req) => {
  const o = await yetkiIste(req, 'musteri');
  if (req.method === 'GET') return json(await liste(o.id));

  const { tur, id, ekle } = await govde<{ tur?: string; id?: unknown; ekle?: boolean }>(req);
  if (tur !== 'magaza' && tur !== 'urun') throw new UygulamaHatasi(400, 'Geçersiz favori türü.');

  if (tur === 'magaza') {
    const magazaId = Number(id);
    if (!Number.isInteger(magazaId)) throw new UygulamaHatasi(400, 'Geçersiz mağaza.');
    if (ekle) {
      const var_ = await tekSatir('SELECT 1 FROM magazalar WHERE id = $1 AND aktif', [magazaId]);
      if (!var_) throw new UygulamaHatasi(404, 'Mağaza bulunamadı.');
      const sayi = await tekSatir<{ n: number }>('SELECT COUNT(*)::int AS n FROM favori_magazalar WHERE musteri_id = $1', [o.id]);
      if ((sayi?.n ?? 0) >= AZAMI.magaza) throw new UygulamaHatasi(400, `En fazla ${AZAMI.magaza} mağaza takip edebilirsin.`);
      await sorgu('INSERT INTO favori_magazalar (musteri_id, magaza_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [o.id, magazaId]);
    } else {
      await sorgu('DELETE FROM favori_magazalar WHERE musteri_id = $1 AND magaza_id = $2', [o.id, magazaId]);
    }
  } else {
    const urunId = String(id ?? '');
    if (!/^p\d{1,6}$/.test(urunId)) throw new UygulamaHatasi(400, 'Geçersiz ürün.');
    if (ekle) {
      const var_ = await tekSatir('SELECT 1 FROM urunler WHERE id = $1 AND aktif', [urunId]);
      if (!var_) throw new UygulamaHatasi(404, 'Ürün bulunamadı.');
      const sayi = await tekSatir<{ n: number }>('SELECT COUNT(*)::int AS n FROM favori_urunler WHERE musteri_id = $1', [o.id]);
      if ((sayi?.n ?? 0) >= AZAMI.urun) throw new UygulamaHatasi(400, `En fazla ${AZAMI.urun} ürünü favorine ekleyebilirsin.`);
      await sorgu('INSERT INTO favori_urunler (musteri_id, urun_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [o.id, urunId]);
    } else {
      await sorgu('DELETE FROM favori_urunler WHERE musteri_id = $1 AND urun_id = $2', [o.id, urunId]);
    }
  }
  return json(await liste(o.id));
});

export const config: Config = { path: '/api/musteri/favoriler', method: ['GET', 'POST'] };
