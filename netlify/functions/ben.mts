// GET /api/ben – giriş yapmış kullanıcının bilgisi (sayfa yenilendiğinde paneli doğru açmak için)
import type { Config } from '@netlify/functions';
import { tekSatir } from '../lib/db.mts';
import { oturumOku, PANEL } from '../lib/oturum.mts';
import { guvenli, json } from '../lib/yardimci.mts';

export default guvenli(async (req) => {
  const o = await oturumOku(req);
  if (!o) return json({ kullanici: null });

  const k = await tekSatir(
    `SELECT k.id, k.ad, k.soyad, k.rol, k.telefon, k.kullanici_adi, m.ad AS magaza_adi, m.kod AS magaza_kodu
       FROM kullanicilar k LEFT JOIN magazalar m ON m.id = k.magaza_id WHERE k.id = $1`, [o.id]);
  if (!k) return json({ kullanici: null });

  const kullanici: Record<string, unknown> = {
    id: k.id, ad: k.ad, soyad: k.soyad, rol: k.rol,
    magazaAdi: k.magaza_adi, magazaKodu: k.magaza_kodu,
  };
  if (k.rol === 'musteri') {
    const ozet = await tekSatir('SELECT puan_bakiyesi, qr_kodu, alisveris_sayisi FROM musteri_ozet WHERE musteri_id = $1', [o.id]);
    kullanici.telefon = k.telefon;
    kullanici.puan = Number(ozet?.puan_bakiyesi ?? 0);
    kullanici.qrKodu = ozet?.qr_kodu;
    kullanici.alisverisSayisi = Number(ozet?.alisveris_sayisi ?? 0);
  } else {
    kullanici.kullaniciAdi = k.kullanici_adi;
  }
  return json({ kullanici, panel: PANEL[o.rol] });
});

export const config: Config = { path: '/api/ben', method: 'GET' };
