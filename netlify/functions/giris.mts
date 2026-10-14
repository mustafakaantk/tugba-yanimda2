// POST /api/giris  { kimlik: "telefon veya kullanıcı adı", sifre }
// Rolü veritabanından okur ve hangi panelin açılacağını döndürür.
import type { Config } from '@netlify/functions';
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

  // Şifre kontrolü veritabanında yapılır (pgcrypto crypt, bcrypt biçimi)
  const k = await tekSatir<{
    id: number; rol: Rol; dogru: boolean; durum: string; ad: string; soyad: string;
    magaza_id: number | null; magaza_adi: string | null; program_aktif: boolean | null;
  }>(
    `SELECT k.id, k.rol, (k.sifre_hash = crypt($2, k.sifre_hash)) AS dogru, k.durum, k.ad, k.soyad, k.magaza_id, m.ad AS magaza_adi, m.program_aktif
       FROM kullanicilar k LEFT JOIN magazalar m ON m.id = k.magaza_id
      WHERE ${telefon ? 'k.telefon = $1' : 'LOWER(k.kullanici_adi) = $1'}`,
    [hedef, sifre]);

  // Kullanıcı yoksa da aynı sürede yanıt ver (hesap var mı yok mu anlaşılmasın)
  if (!k) await tekSatir('SELECT crypt($1, $2)', [sifre, SAHTE_HASH]);
  if (!k || !k.dogru) {
    await kaydet('giris_hatali', { hedef, req });
    throw new UygulamaHatasi(401, 'Bilgiler hatalı. Lütfen kontrol edip tekrar deneyin.');
  }
  if (k.durum !== 'aktif') {
    throw new UygulamaHatasi(403, 'Hesabınız pasif durumda. Mağazamızla iletişime geçin.');
  }
  if ((k.rol === 'kasiyer' || k.rol === 'mudur') && !k.program_aktif) {
    throw new UygulamaHatasi(403, 'Mağazanız Tuğba Yanımda programına henüz dahil değil.');
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
