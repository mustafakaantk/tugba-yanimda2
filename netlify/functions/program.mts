// GET /api/program – herkese açık: puan kuralları, mağaza listesi, güncel kampanyalar
// Tanıtım sitesi kuralları buradan okur; yönetici ayarı değiştirince site kendiliğinden güncellenir.
import type { Config } from '@netlify/functions';
import { sorgu } from '../lib/db.mts';
import { guvenli, json } from '../lib/yardimci.mts';

export default guvenli(async () => {
  const [ayar, magazalar, kampanyalar, sayilar] = await Promise.all([
    sorgu<{ anahtar: string; deger: string }>(
      `SELECT anahtar, deger FROM ayarlar WHERE anahtar IN
        ('puan_icin_tutar','kupon_puan_bedeli','kupon_indirim_orani','kupon_gunluk_limit','puan_gecerlilik_ay','hosgeldin_puani')`),
    sorgu('SELECT id, ad, il, ilce FROM magazalar WHERE aktif'),
    sorgu(`SELECT id, baslik, metin, baslangic, bitis, magaza_id FROM kampanyalar
            WHERE aktif AND magaza_id IS NULL AND bitis >= CURRENT_DATE ORDER BY baslangic LIMIT 6`),
    sorgu(`SELECT (SELECT COUNT(*) FROM magazalar WHERE aktif) AS magaza_sayisi`),
  ]);
  const kurallar = Object.fromEntries(ayar.map((a) => [a.anahtar, Number(a.deger)]));
  return json(
    { kurallar, magazalar, kampanyalar, magazaSayisi: Number(sayilar[0]?.magaza_sayisi ?? 0) },
    200,
    { 'Cache-Control': 'public, max-age=60' });
});

export const config: Config = { path: '/api/program', method: 'GET' };
