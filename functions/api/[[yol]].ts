// =====================================================================
// Cloudflare Pages kapısı: /api/* isteklerini netlify/functions içindeki
// aynı fonksiyonlara yönlendirir. Böylece tek kod hem Netlify'da hem
// Cloudflare'de çalışır; yeni bir API eklenince aşağıdaki listeye eklenmeli.
// =====================================================================
import { Pool, neonConfig } from '@neondatabase/serverless';
import { istekHavuzu } from '../../netlify/lib/db.mts';
// @ts-ignore – derlemede üretilir (npm run build:cloudflare)
import MIGRASYONLAR from '../../netlify/lib/migrasyonlar.generated.mjs';

import * as giris from '../../netlify/functions/giris.mts';
import * as kayit from '../../netlify/functions/kayit.mts';
import * as ben from '../../netlify/functions/ben.mts';
import * as cikis from '../../netlify/functions/cikis.mts';
import * as program from '../../netlify/functions/program.mts';
import * as yonetimOzet from '../../netlify/functions/yonetim-ozet.mts';
import * as hesapSil from '../../netlify/functions/hesap-sil.mts';
import * as magazalar from '../../netlify/functions/magazalar.mts';
import * as urunler from '../../netlify/functions/urunler.mts';
import * as musteriHareketler from '../../netlify/functions/musteri-hareketler.mts';
import * as musteriFavoriler from '../../netlify/functions/musteri-favoriler.mts';
import * as musteriProfil from '../../netlify/functions/musteri-profil.mts';

interface Ortam {
  DATABASE_URL: string;
  JWT_SECRET?: string;
  YEREL_WS_PROXY?: string; // yalnızca yerel testte: Neon sürücüsünü yerel Postgres'e bağlar
}

type Modul = { default: (req: Request) => Promise<Response>; config: { path: string | string[]; method?: string | string[] } };

const MODULLER: Modul[] = [
  giris, kayit, ben, cikis, program, yonetimOzet, hesapSil, magazalar, urunler,
  musteriHareketler, musteriFavoriler, musteriProfil,
] as unknown as Modul[];

const ROTALAR = MODULLER.flatMap((m) =>
  ([] as string[]).concat(m.config.path).map((yol) => ({
    desen: new RegExp('^' + yol.replace(/:[a-z]+/gi, '[^/]+') + '/?$'),
    yontemler: ([] as string[]).concat(m.config.method || []),
    calistir: m.default,
  })));

// Her Cloudflare örneği (isolate) ilk istekte veritabanının güncel olduğundan emin olur.
// Derleme adımı migration'ları zaten uyguladıysa bu yalnızca tek bir hızlı sorgudur.
// Not: Workers'ta bir isteğin başlattığı G/Ç başka istekte beklenemez; bu yüzden paylaşılan söz (promise)
// yerine basit bir bayrak kullanılır. Aynı anda gelen istekleri veritabanı kilidi (advisory lock) sıraya sokar.
let veritabaniHazir = false;
async function veritabaniHazirla(havuz: Pool) {
  const istemci = await havuz.connect();
  try {
    await istemci.query('CREATE TABLE IF NOT EXISTS _migrasyonlar (ad TEXT PRIMARY KEY, uygulama TIMESTAMPTZ NOT NULL DEFAULT NOW())');
    let uygulanan = new Set((await istemci.query('SELECT ad FROM _migrasyonlar')).rows.map((r: any) => r.ad));
    if ((MIGRASYONLAR as { ad: string }[]).every((m) => uygulanan.has(m.ad))) return;
    await istemci.query('SELECT pg_advisory_lock(20261014)');
    try {
      uygulanan = new Set((await istemci.query('SELECT ad FROM _migrasyonlar')).rows.map((r: any) => r.ad));
      for (const m of MIGRASYONLAR as { ad: string; sql: string }[]) {
        if (uygulanan.has(m.ad)) continue;
        await istemci.query('BEGIN');
        try {
          await istemci.query(m.sql);
          await istemci.query('INSERT INTO _migrasyonlar (ad) VALUES ($1)', [m.ad]);
          await istemci.query('COMMIT');
        } catch (hata) {
          await istemci.query('ROLLBACK').catch(() => {});
          throw new Error(`Migration uygulanamadı (${m.ad}): ${(hata as Error).message}`);
        }
      }
    } finally {
      await istemci.query('SELECT pg_advisory_unlock(20261014)').catch(() => {});
    }
  } finally {
    istemci.release();
  }
}

const jsonYanit = (veri: unknown, durum: number) =>
  new Response(JSON.stringify(veri), { status: durum, headers: { 'Content-Type': 'application/json; charset=utf-8' } });

export const onRequest = async (ctx: { request: Request; env: Ortam; waitUntil(p: Promise<unknown>): void }) => {
  const { request, env } = ctx;
  const yol = new URL(request.url).pathname;
  const rota = ROTALAR.find((r) => r.desen.test(yol));
  if (!rota) return jsonYanit({ hata: 'Bulunamadı.' }, 404);
  if (rota.yontemler.length && !rota.yontemler.includes(request.method)) return jsonYanit({ hata: 'Desteklenmeyen istek.' }, 405);
  if (!env.DATABASE_URL) return jsonYanit({ hata: 'Sunucu yapılandırması eksik (DATABASE_URL).' }, 500);

  if (env.JWT_SECRET && typeof process !== 'undefined') process.env.JWT_SECRET = env.JWT_SECRET;
  if (env.YEREL_WS_PROXY) {
    neonConfig.wsProxy = (host: string, port: string | number) => `${env.YEREL_WS_PROXY}/v1?address=${host}:${port}`;
    neonConfig.useSecureWebSocket = false;
    neonConfig.pipelineTLS = false;
    neonConfig.pipelineConnect = false;
  }

  // Workers'ta bağlantılar istekten uzun yaşayamaz: her istek kendi havuzunu açar ve sonunda kapatır
  const havuz = new Pool({ connectionString: env.DATABASE_URL });
  try {
    try {
      if (!veritabaniHazir) {
        await veritabaniHazirla(havuz);
        veritabaniHazir = true;
      }
    } catch (hata) {
      console.error(hata);
      return jsonYanit({ hata: 'Veritabanı hazırlanamadı. Lütfen biraz sonra tekrar deneyin.' }, 503);
    }
    return await istekHavuzu.run(havuz as any, () => rota.calistir(request));
  } finally {
    ctx.waitUntil(havuz.end());
  }
};
