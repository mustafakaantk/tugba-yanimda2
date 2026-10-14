// GET /api/musteri/hareketler?sayfa=1 – giriş yapmış müşterinin puan hareketleri (yeniden eskiye)
import type { Config } from '@netlify/functions';
import { sorgu, tekSatir } from '../lib/db.mts';
import { yetkiIste } from '../lib/oturum.mts';
import { guvenli, json } from '../lib/yardimci.mts';

const SAYFA_BOYU = 30;

export default guvenli(async (req) => {
  const o = await yetkiIste(req, 'musteri');
  const sayfa = Math.max(1, Math.min(200, Number(new URL(req.url).searchParams.get('sayfa')) || 1));

  const satirlar = await sorgu(
    `SELECT h.id, h.tur, h.puan, h.aciklama, h.tarih,
            s.fis_no, s.net_tutar, s.indirim_tutari, s.durum AS satis_durumu,
            m.ad AS magaza_adi, m.il AS magaza_il
       FROM puan_hareketleri h
       LEFT JOIN kuponlar  kp ON kp.id = h.kupon_id
       LEFT JOIN satislar  s ON s.id = COALESCE(h.satis_id, kp.kullanilan_satis_id)
       LEFT JOIN magazalar m ON m.id = s.magaza_id
      WHERE h.musteri_id = $1
      ORDER BY h.tarih DESC, h.id DESC
      LIMIT $2 OFFSET $3`,
    [o.id, SAYFA_BOYU + 1, (sayfa - 1) * SAYFA_BOYU]);

  const ozet = sayfa === 1
    ? await tekSatir(
      `SELECT COALESCE(SUM(puan), 0)::int                                  AS bakiye,
              COALESCE(SUM(puan) FILTER (WHERE tur = 'kazanim'), 0)::int    AS toplam_kazanilan,
              COALESCE(-SUM(puan) FILTER (WHERE tur = 'harcama'), 0)::int   AS toplam_kullanilan,
              COUNT(*) FILTER (WHERE tur = 'harcama')::int                  AS indirim_sayisi
         FROM puan_hareketleri WHERE musteri_id = $1`, [o.id])
    : null;

  return json({
    hareketler: satirlar.slice(0, SAYFA_BOYU).map((h) => ({
      id: Number(h.id),
      tur: h.tur,
      puan: h.puan,
      aciklama: h.aciklama,
      tarih: h.tarih,
      fisNo: h.fis_no,
      tutar: h.net_tutar !== null ? Number(h.net_tutar) : null,
      indirim: h.indirim_tutari !== null ? Number(h.indirim_tutari) : null,
      iade: h.satis_durumu === 'iade',
      magaza: h.magaza_adi ? `${h.magaza_adi}, ${h.magaza_il}` : null,
    })),
    devamVar: satirlar.length > SAYFA_BOYU,
    ozet,
  });
});

export const config: Config = { path: '/api/musteri/hareketler', method: 'GET' };
