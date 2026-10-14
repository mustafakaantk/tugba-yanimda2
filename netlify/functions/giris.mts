// POST /api/giris  { kimlik: "telefon veya kullanıcı adı", sifre }
// Rolü veritabanından okur ve hangi panelin açılacağını döndürür.
import type { Config } from '@netlify/functions';
import bcrypt from 'bcryptjs';
import { sorgu, tekSatir } from '../lib/db.mts';
import { oturumAc, PANEL, type Rol } from '../lib/oturum.mts';
import { guvenli, govde, json, kaydet, metin, telefonDuzelt, UygulamaHatasi } from '../lib/yardimci.mts';

const AZAMI_DENEME = 5;      // 15 dakikada en fazla 5 hatalı deneme
const KILIT_DAKIKA = 15;
const SAHTE_HASH = '$2a$10$0BM59Y3VZUJezYIksMTQ6Ojsq2PXttplmLO3T9hMHBP74Otcf6Eva';

export default guvenli(async (req) => {
  const { kimlik, sifre } = await govde<{ kimlik?: string; sifre?: string }>(req);
  const ham = metin(kimlik, 60);
  if (!ham || typeof sifre !== 'string' || !sifre) {
    throw new UygulamaHatasi(400, 'Telefon numarası / kullanıcı adı ve şifre gerekli.');
  }
  const telefon = telefonDuzelt(ham);
  const hedef = telefon ?? ham.toLocaleLowerCase('tr-TR');

  // Kaba kuvvet koruması
  const deneme = await tekSatir<{ adet: string }>(
    `SELECT COUNT(*) AS adet FROM islem_kayitlari
      WHERE hedef = $1 AND islem = 'giris_hatali' AND tarih > NOW() - ($2 || ' minutes')::interval`,
    [hedef, KILIT_DAKIKA]);
  if (Number(deneme?.adet) >= AZAMI_DENEME) {
    throw new UygulamaHatasi(429, `Çok fazla hatalı deneme. ${KILIT_DAKIKA} dakika sonra tekrar deneyin.`);
  }

  const k = await tekSatir<{
    id: number; rol: Rol; sifre_hash: string; durum: string; ad: string; soyad: string; magaza_id: number | null; magaza_adi: string | null;
  }>(
    `SELECT k.id, k.rol, k.sifre_hash, k.durum, k.ad, k.soyad, k.magaza_id, m.ad AS magaza_adi
       FROM kullanicilar k LEFT JOIN magazalar m ON m.id = k.magaza_id
      WHERE ${telefon ? 'k.telefon = $1' : 'LOWER(k.kullanici_adi) = $1'}`,
    [hedef]);

  const dogru = k ? await bcrypt.compare(sifre, k.sifre_hash) : await bcrypt.compare(sifre, SAHTE_HASH); // kullanıcı yoksa da aynı sürede yanıt ver
  if (!k || !dogru) {
    await kaydet('giris_hatali', { hedef, req });
    throw new UygulamaHatasi(401, 'Bilgiler hatalı. Lütfen kontrol edip tekrar deneyin.');
  }
  if (k.durum !== 'aktif') {
    throw new UygulamaHatasi(403, 'Hesabınız pasif durumda. Mağazamızla iletişime geçin.');
  }

  await sorgu('UPDATE kullanicilar SET son_giris = NOW() WHERE id = $1', [k.id]);
  await kaydet('giris_basarili', { kullaniciId: k.id, hedef, req });
  const cerez = await oturumAc(req, { id: k.id, rol: k.rol, magazaId: k.magaza_id });

  return json(
    {
      kullanici: { id: k.id, ad: k.ad, soyad: k.soyad, rol: k.rol, magazaAdi: k.magaza_adi },
      yonlendir: PANEL[k.rol],
    },
    200,
    { 'Set-Cookie': cerez });
});

export const config: Config = { path: '/api/giris', method: 'POST' };
