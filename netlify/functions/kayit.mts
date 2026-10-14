// POST /api/kayit – yeni müşteri üyeliği
// Kullanıcı + müşteri profili + kişisel QR + hoş geldin puanı tek işlemde oluşturulur.
import type { Config } from '@netlify/functions';
import bcrypt from 'bcryptjs';
import { createHash, randomInt } from 'node:crypto';
import { islem, tekSatir } from '../lib/db.mts';
import { oturumAc, PANEL } from '../lib/oturum.mts';
import { guvenli, govde, json, kaydet, metin, telefonDuzelt, UygulamaHatasi } from '../lib/yardimci.mts';

const ALFABE = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // karışan karakterler (0/O, 1/I) yok
// Telefonun geri çevrilemeyen özeti (migration 4 ile aynı formül)
const telefonOzeti = (t: string) => createHash('sha256').update(`tugba-yanimda:${t}`, 'utf8').digest('hex');
const qrKoduUret = () => 'TY-' + Array.from({ length: 10 }, () => ALFABE[randomInt(ALFABE.length)]).join('');

interface KayitIstegi {
  ad?: string; soyad?: string; telefon?: string; sifre?: string;
  ePosta?: string; dogumTarihi?: string; magazaId?: number | string;
  kvkk?: boolean; etk?: boolean;
}

export default guvenli(async (req) => {
  const g = await govde<KayitIstegi>(req);
  const ad = metin(g.ad, 50);
  const soyad = metin(g.soyad, 50);
  const telefon = telefonDuzelt(g.telefon);
  const sifre = typeof g.sifre === 'string' ? g.sifre : '';
  const ePosta = metin(g.ePosta, 120).toLowerCase() || null;
  const dogum = metin(g.dogumTarihi, 10) || null;
  const magazaId = g.magazaId ? Number(g.magazaId) : null;

  if (ad.length < 2 || soyad.length < 2) throw new UygulamaHatasi(400, 'Ad ve soyad en az 2 harf olmalı.');
  if (!telefon) throw new UygulamaHatasi(400, 'Geçerli bir cep telefonu girin (5XX XXX XX XX).');
  if (sifre.length < 6 || !/\d/.test(sifre) || !/[a-zA-ZçğıöşüÇĞİÖŞÜ]/.test(sifre)) {
    throw new UygulamaHatasi(400, 'Şifre en az 6 karakter olmalı; harf ve rakam içermeli.');
  }
  if (ePosta && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ePosta)) throw new UygulamaHatasi(400, 'E-posta adresi geçersiz.');
  if (dogum) {
    const d = new Date(dogum);
    const yas = (Date.now() - d.getTime()) / (365.25 * 86400000);
    if (Number.isNaN(d.getTime()) || yas < 18 || yas > 110) {
      throw new UygulamaHatasi(400, 'Programa 18 yaşını doldurmuş kişiler üye olabilir.');
    }
  }
  if (g.kvkk !== true) throw new UygulamaHatasi(400, 'Üyelik için KVKK Aydınlatma Metni’ni onaylamanız gerekir.');

  const mevcut = await tekSatir('SELECT 1 FROM kullanicilar WHERE telefon = $1', [telefon]);
  if (mevcut) throw new UygulamaHatasi(409, 'Bu telefon numarasıyla zaten bir üyelik var. Giriş yapmayı deneyin.');

  if (magazaId) {
    const mg = await tekSatir('SELECT 1 FROM magazalar WHERE id = $1 AND aktif AND program_aktif', [magazaId]);
    if (!mg) throw new UygulamaHatasi(400, 'Seçilen mağaza programa dahil değil.');
  }

  const sifreHash = await bcrypt.hash(sifre, 10);

  const yeni = await islem(async (s) => {
    const [k] = await s(
      `INSERT INTO kullanicilar (rol, telefon, sifre_hash, ad, soyad) VALUES ('musteri', $1, $2, $3, $4) RETURNING id`,
      [telefon, sifreHash, ad, soyad]);
    let qr = qrKoduUret();
    for (let i = 0; i < 5; i++) {
      const [var_] = await s('SELECT 1 FROM musteriler WHERE qr_kodu = $1', [qr]);
      if (!var_) break;
      qr = qrKoduUret();
    }
    await s(
      `INSERT INTO musteriler (kullanici_id, qr_kodu, e_posta, dogum_tarihi, kayit_magaza_id, il, kayit_kanali, kvkk_onay_tarihi, etk_onay, etk_onay_tarihi)
       VALUES ($1, $2, $3, $4, $5, (SELECT il FROM magazalar WHERE id = $5), 'web', NOW(), $6, CASE WHEN $6 THEN NOW() END)`,
      [k.id, qr, ePosta, dogum, magazaId, g.etk === true]);
    const [hp] = await s(`SELECT deger::int AS puan FROM ayarlar WHERE anahtar = 'hosgeldin_puani'`);
    // Bu numara daha önce hoş geldin puanı aldıysa (hesap silinip yeniden açıldıysa) tekrar verilmez
    const ilkKez = (await s(
      'INSERT INTO hosgeldin_verilen (telefon_ozeti) VALUES ($1) ON CONFLICT DO NOTHING RETURNING 1',
      [telefonOzeti(telefon)])).length > 0;
    if (ilkKez && hp?.puan > 0) {
      await s(
        `INSERT INTO puan_hareketleri (musteri_id, tur, puan, aciklama) VALUES ($1, 'kazanim', $2, 'Hoş geldin puanı')`,
        [k.id, hp.puan]);
    }
    return { id: k.id as number, hosgeldin: ilkKez ? ((hp?.puan ?? 0) as number) : 0 };
  });

  await kaydet('kayit_olusturuldu', { kullaniciId: yeni.id, hedef: telefon, detay: { etk: g.etk === true }, req });
  const cerez = await oturumAc(req, { id: yeni.id, rol: 'musteri', magazaId: null });

  return json(
    { kullanici: { id: yeni.id, ad, soyad, rol: 'musteri' }, hosgeldinPuani: yeni.hosgeldin, yonlendir: PANEL.musteri },
    201,
    { 'Set-Cookie': cerez });
});

export const config: Config = { path: '/api/kayit', method: 'POST' };
