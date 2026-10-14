// GET /api/magazalar – herkese açık mağaza listesi (konum ve programa dahil olup olmadığıyla)
// Mağaza adresleri zaten tugbakuruyemis.com.tr'de herkese açık bilgi.
import type { Config } from '@netlify/functions';
import { sorgu } from '../lib/db.mts';
import { guvenli, json } from '../lib/yardimci.mts';

export default guvenli(async () => {
  const satirlar = await sorgu(
    `SELECT id, ad, il, ilce, adres, enlem, boylam, program_aktif
       FROM magazalar WHERE aktif`);
  return json(
    {
      magazalar: satirlar.map((m) => ({
        id: m.id, ad: m.ad, il: m.il, ilce: m.ilce, adres: m.adres,
        enlem: m.enlem !== null ? Number(m.enlem) : null,
        boylam: m.boylam !== null ? Number(m.boylam) : null,
        programda: m.program_aktif,
      })),
    },
    200,
    { 'Cache-Control': 'public, max-age=300' });
});

export const config: Config = { path: '/api/magazalar', method: 'GET' };
