// GET  /api/musteri/profil            – hesap bilgileri ve izinler
// POST /api/musteri/profil {etk}      – SMS/e-posta kampanya iznini (ETK/İYS) aç-kapat
import type { Config } from '@netlify/functions';
import { sorgu, tekSatir } from '../lib/db.mts';
import { yetkiIste } from '../lib/oturum.mts';
import { guvenli, govde, json, kaydet, UygulamaHatasi } from '../lib/yardimci.mts';

async function profil(id: number) {
  const p = await tekSatir(
    `SELECT k.ad, k.soyad, k.telefon, k.olusturma, m.e_posta, to_char(m.dogum_tarihi, 'YYYY-MM-DD') AS dogum_tarihi, m.etk_onay, m.etk_onay_tarihi,
            m.kvkk_onay_tarihi, mg.ad AS kayit_magaza, mg.il AS kayit_il
       FROM kullanicilar k JOIN musteriler m ON m.kullanici_id = k.id
       LEFT JOIN magazalar mg ON mg.id = m.kayit_magaza_id
      WHERE k.id = $1`, [id]);
  if (!p) throw new UygulamaHatasi(404, 'Hesap bulunamadı.');
  return {
    ad: p.ad, soyad: p.soyad, telefon: p.telefon, eposta: p.e_posta, dogumTarihi: p.dogum_tarihi,
    uyelikTarihi: p.olusturma, kvkkOnayTarihi: p.kvkk_onay_tarihi,
    etk: p.etk_onay, etkTarihi: p.etk_onay_tarihi,
    kayitMagaza: p.kayit_magaza ? `${p.kayit_magaza}, ${p.kayit_il}` : null,
  };
}

export default guvenli(async (req) => {
  const o = await yetkiIste(req, 'musteri');
  if (req.method === 'GET') return json({ profil: await profil(o.id) });

  const { etk } = await govde<{ etk?: unknown }>(req);
  if (typeof etk !== 'boolean') throw new UygulamaHatasi(400, 'Geçersiz istek.');
  await sorgu(
    'UPDATE musteriler SET etk_onay = $2, etk_onay_tarihi = CASE WHEN $2 THEN NOW() ELSE NULL END WHERE kullanici_id = $1',
    [o.id, etk]);
  await kaydet(etk ? 'etk_izni_verildi' : 'etk_izni_geri_alindi', { kullaniciId: o.id, req });
  return json({ profil: await profil(o.id) });
});

export const config: Config = { path: '/api/musteri/profil', method: ['GET', 'POST'] };
