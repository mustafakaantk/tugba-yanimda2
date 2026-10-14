// GET /api/yonetim/ozet – yalnızca yönetici. Faz 4'te ayrıntılı rapor ekranlarına genişleyecek.
import type { Config } from '@netlify/functions';
import { sorgu, tekSatir } from '../lib/db.mts';
import { yetkiIste } from '../lib/oturum.mts';
import { guvenli, json } from '../lib/yardimci.mts';

export default guvenli(async (req) => {
  await yetkiIste(req, 'yonetici');
  const genel = await tekSatir(`
    SELECT
      (SELECT COUNT(*) FROM musteri_ozet)                                         AS uye_sayisi,
      (SELECT COUNT(*) FROM musteri_ozet WHERE kayit_tarihi > NOW() - INTERVAL '30 days') AS yeni_uye_30g,
      (SELECT COALESCE(SUM(net_tutar),0) FROM satislar WHERE durum='tamamlandi')   AS toplam_ciro,
      (SELECT COALESCE(SUM(net_tutar),0) FROM satislar WHERE durum='tamamlandi' AND musteri_id IS NOT NULL) AS uye_cirosu,
      (SELECT COUNT(*) FROM satislar WHERE durum='tamamlandi')                     AS satis_sayisi,
      (SELECT COALESCE(SUM(puan),0) FROM puan_hareketleri)                         AS dolasimdaki_puan,
      (SELECT COUNT(*) FROM kuponlar WHERE durum='kullanildi')                     AS kullanilan_kupon`);
  const magazalar = await sorgu(`
    SELECT m.ad, COUNT(s.id) AS satis, COALESCE(SUM(s.net_tutar),0) AS ciro
      FROM magazalar m LEFT JOIN satislar s ON s.magaza_id = m.id AND s.durum = 'tamamlandi'
     GROUP BY m.id ORDER BY ciro DESC`);
  return json({ genel, magazalar });
});

export const config: Config = { path: '/api/yonetim/ozet', method: 'GET' };
