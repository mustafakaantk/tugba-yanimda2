// POST /api/hesap/sil  { sifre }  – yalnızca müşteri, KVKK kapsamında kendi hesabını siler.
//
// Ne olur?
//  - Ad, soyad, telefon, e-posta, doğum tarihi, il, QR kodu ve izinler silinir (anonimleştirilir).
//  - Kalan puan bakiyesi sıfırlanır, kullanılmamış kuponlar iptal edilir, favoriler silinir.
//  - Giriş kayıtlarındaki telefon numarası temizlenir.
//  - Satış kayıtları muhasebe/yasal saklama için KİMLİKSİZ olarak kalır.
//  - Aynı telefon numarasıyla daha sonra yeniden üye olunabilir (yeni, sıfır puanlı hesap).
import type { Config } from '@netlify/functions';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { islem, tekSatir } from '../lib/db.mts';
import { oturumKapat, yetkiIste } from '../lib/oturum.mts';
import { guvenli, govde, json, kaydet, UygulamaHatasi } from '../lib/yardimci.mts';

export default guvenli(async (req) => {
  const o = await yetkiIste(req, 'musteri');
  const { sifre } = await govde<{ sifre?: string }>(req);
  if (typeof sifre !== 'string' || !sifre) throw new UygulamaHatasi(400, 'Onay için şifreni gir.');

  const k = await tekSatir<{ sifre_hash: string; telefon: string | null }>(
    'SELECT sifre_hash, telefon FROM kullanicilar WHERE id = $1', [o.id]);
  if (!k || !(await bcrypt.compare(sifre, k.sifre_hash))) {
    throw new UygulamaHatasi(401, 'Şifre hatalı. Hesabın silinmedi.');
  }

  const silinenPuan = await islem(async (s) => {
    const [bakiye] = await s('SELECT COALESCE(SUM(puan), 0)::int AS puan FROM puan_hareketleri WHERE musteri_id = $1', [o.id]);
    if (bakiye.puan !== 0) {
      await s(
        `INSERT INTO puan_hareketleri (musteri_id, tur, puan, aciklama, olusturan_id)
         VALUES ($1, 'manuel', $2, 'Hesap silindi – kalan puan sıfırlandı', $1)`,
        [o.id, -bakiye.puan]);
    }
    await s(`UPDATE kuponlar SET durum = 'iptal' WHERE musteri_id = $1 AND durum = 'aktif'`, [o.id]);
    await s('DELETE FROM favori_magazalar WHERE musteri_id = $1', [o.id]);
    await s('DELETE FROM favori_urunler WHERE musteri_id = $1', [o.id]);
    await s(
      `UPDATE musteriler
          SET qr_kodu = 'SILINDI-' || kullanici_id, e_posta = NULL, dogum_tarihi = NULL, cinsiyet = NULL,
              il = NULL, etk_onay = FALSE, etk_onay_tarihi = NULL
        WHERE kullanici_id = $1`, [o.id]);
    await s(
      `UPDATE kullanicilar
          SET telefon = NULL, kullanici_adi = 'silindi-' || id, ad = 'Silinmiş', soyad = 'Üye',
              sifre_hash = $2, durum = 'pasif', silinme_tarihi = NOW()
        WHERE id = $1`,
      [o.id, await bcrypt.hash(randomBytes(24).toString('hex'), 10)]);
    if (k.telefon) await s('UPDATE islem_kayitlari SET hedef = NULL WHERE hedef = $1', [k.telefon]);
    return bakiye.puan as number;
  });

  await kaydet('hesap_silindi', { kullaniciId: o.id, detay: { silinen_puan: silinenPuan }, req });
  return json({ tamam: true }, 200, { 'Set-Cookie': oturumKapat(req) });
});

export const config: Config = { path: '/api/hesap/sil', method: 'POST' };
