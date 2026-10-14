// Oturum yönetimi: imzalı token (JWT) httpOnly çerezde tutulur.
// Tarayıcıdaki JavaScript çereze erişemez; rol sunucuda her istekte doğrulanır.
import { SignJWT, jwtVerify } from 'jose';
import { tekSatir } from './db.mts';
import { UygulamaHatasi } from './yardimci.mts';

export type Rol = 'musteri' | 'kasiyer' | 'mudur' | 'yonetici';
export interface Oturum {
  id: number;
  rol: Rol;
  magazaId: number | null;
}

const CEREZ = 'ty_oturum';
const SURE: Record<Rol, number> = {
  musteri: 60 * 60 * 24 * 30, // 30 gün
  kasiyer: 60 * 60 * 14,      // bir vardiya
  mudur: 60 * 60 * 14,
  yonetici: 60 * 60 * 8,      // 8 saat
};

let anahtarOnbellek: Uint8Array | null = null;
async function anahtar(): Promise<Uint8Array> {
  if (anahtarOnbellek) return anahtarOnbellek;
  const ortam = (globalThis as any).Netlify?.env?.get?.('JWT_SECRET') ?? process.env.JWT_SECRET;
  let gizli = ortam as string | undefined;
  if (!gizli) {
    const s = await tekSatir<{ deger: string }>("SELECT deger FROM sistem_anahtarlari WHERE anahtar = 'oturum_anahtari'");
    gizli = s?.deger;
  }
  if (!gizli || gizli.length < 32) throw new Error('Oturum anahtarı bulunamadı');
  anahtarOnbellek = new TextEncoder().encode(gizli);
  return anahtarOnbellek;
}

function cerezYaz(req: Request, deger: string, saniye: number) {
  const guvenli = new URL(req.url).protocol === 'https:' ? '; Secure' : '';
  return `${CEREZ}=${deger}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${saniye}${guvenli}`;
}

export async function oturumAc(req: Request, o: Oturum) {
  const token = await new SignJWT({ rol: o.rol, mg: o.magazaId })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(o.id))
    .setIssuedAt()
    .setExpirationTime(`${SURE[o.rol]}s`)
    .sign(await anahtar());
  return cerezYaz(req, token, SURE[o.rol]);
}

export function oturumKapat(req: Request) {
  return cerezYaz(req, '', 0);
}

export async function oturumOku(req: Request): Promise<Oturum | null> {
  const cerez = req.headers.get('cookie') || '';
  const eslesme = cerez.match(new RegExp(`(?:^|;\\s*)${CEREZ}=([^;]+)`));
  if (!eslesme) return null;
  try {
    const { payload } = await jwtVerify(eslesme[1], await anahtar(), { algorithms: ['HS256'] });
    const id = Number(payload.sub);
    // Hesap pasife alındıysa token geçerli olsa bile erişim kesilir.
    const k = await tekSatir<{ durum: string; rol: Rol; magaza_id: number | null; program_aktif: boolean | null }>(
      `SELECT k.durum, k.rol, k.magaza_id, m.program_aktif
         FROM kullanicilar k LEFT JOIN magazalar m ON m.id = k.magaza_id WHERE k.id = $1`, [id]);
    if (!k || k.durum !== 'aktif') return null;
    // Mağaza pilottan çıkarılırsa o mağazanın personelinin açık oturumu da kapanır.
    if ((k.rol === 'kasiyer' || k.rol === 'mudur') && !k.program_aktif) return null;
    return { id, rol: k.rol, magazaId: k.magaza_id };
  } catch {
    return null;
  }
}

/** Fonksiyonun başında çağrılır: oturum yoksa 401, rol uymuyorsa 403 fırlatır. */
export async function yetkiIste(req: Request, ...roller: Rol[]): Promise<Oturum> {
  const o = await oturumOku(req);
  if (!o) throw new UygulamaHatasi(401, 'Oturumunuzun süresi doldu. Lütfen tekrar giriş yapın.');
  if (roller.length && !roller.includes(o.rol)) throw new UygulamaHatasi(403, 'Bu sayfaya erişim yetkiniz yok.');
  return o;
}

export const PANEL: Record<Rol, string> = {
  musteri: '/musteri',
  kasiyer: '/kasa',
  mudur: '/magaza',
  yonetici: '/yonetim',
};
