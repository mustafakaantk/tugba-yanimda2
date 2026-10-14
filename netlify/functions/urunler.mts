// GET /api/urunler          – katalog (kategoriler + ürünler, açıklamasız; hızlı yüklenir)
// GET /api/urunler/:id      – tek ürünün açıklaması dahil ayrıntısı
// Fiyat tutulmaz/gösterilmez; stok kasa sisteminde kalır.
import type { Config } from '@netlify/functions';
import { sorgu, tekSatir } from '../lib/db.mts';
import { guvenli, json, UygulamaHatasi } from '../lib/yardimci.mts';

export default guvenli(async (req) => {
  const parca = new URL(req.url).pathname.replace(/\/+$/, '').split('/');
  const id = parca.length > 3 ? decodeURIComponent(parca[3]) : null;

  if (id) {
    if (!/^p\d{1,6}$/.test(id)) throw new UygulamaHatasi(404, 'Ürün bulunamadı.');
    const u = await tekSatir(
      `SELECT u.id, u.ad, u.kategori, k.ad AS kategori_adi, u.alt_kategori, u.aciklama, u.cok_satan, u.gorsel
         FROM urunler u JOIN urun_kategorileri k ON k.kod = u.kategori
        WHERE u.id = $1 AND u.aktif`, [id]);
    if (!u) throw new UygulamaHatasi(404, 'Ürün bulunamadı.');
    return json(
      {
        urun: {
          id: u.id, ad: u.ad, kategori: u.kategori, kategoriAdi: u.kategori_adi, altKategori: u.alt_kategori,
          aciklama: u.aciklama, cokSatan: u.cok_satan, gorsel: u.gorsel,
        },
      },
      200,
      { 'Cache-Control': 'public, max-age=600' });
  }

  const [kategoriler, urunler] = await Promise.all([
    sorgu(
      `SELECT k.kod, k.ad, k.sira, u.gorsel AS kapak, COUNT(x.id)::int AS urun_sayisi
         FROM urun_kategorileri k
         LEFT JOIN urunler u ON u.id = k.kapak_urun_id
         LEFT JOIN urunler x ON x.kategori = k.kod AND x.aktif
        GROUP BY k.kod, u.gorsel ORDER BY k.sira`),
    sorgu(
      `SELECT id, ad, kategori, alt_kategori, cok_satan, gorsel
         FROM urunler WHERE aktif ORDER BY cok_satan DESC, ad`),
  ]);
  return json(
    {
      kategoriler: kategoriler.filter((k) => k.urun_sayisi > 0).map((k) => ({ kod: k.kod, ad: k.ad, kapak: k.kapak, urunSayisi: k.urun_sayisi })),
      urunler: urunler.map((u) => ({ id: u.id, ad: u.ad, kategori: u.kategori, altKategori: u.alt_kategori, cokSatan: u.cok_satan, gorsel: u.gorsel })),
    },
    200,
    { 'Cache-Control': 'public, max-age=600' });
});

export const config: Config = { path: ['/api/urunler', '/api/urunler/:id'], method: 'GET' };
