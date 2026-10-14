// POST /api/cikis – oturumu kapatır
import type { Config } from '@netlify/functions';
import { oturumKapat, oturumOku } from '../lib/oturum.mts';
import { guvenli, json, kaydet } from '../lib/yardimci.mts';

export default guvenli(async (req) => {
  const o = await oturumOku(req);
  if (o) await kaydet('cikis', { kullaniciId: o.id, req });
  return json({ tamam: true }, 200, { 'Set-Cookie': oturumKapat(req) });
});

export const config: Config = { path: '/api/cikis', method: 'POST' };
