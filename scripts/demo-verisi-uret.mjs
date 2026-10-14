// =====================================================================
// Demo verisi üretici
// Çalıştırma:  node scripts/demo-verisi-uret.mjs
// Çıktı:       netlify/database/migrations/20261014120100_demo_verisi.sql
//
// Her çalıştırmada AYNI veriyi üretir (sabit tohum). 5 mağaza, 10 personel,
// 1 yönetici, 200 müşteri ve ~1.500 satış; puan defteri tutarlıdır
// (hiçbir müşterinin bakiyesi eksiye düşmez).
// =====================================================================
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const KOK = join(dirname(fileURLToPath(import.meta.url)), '..');
const CIKTI = join(KOK, 'netlify/database/migrations/20261014120100_demo_verisi.sql');

// Tüm demo hesapların şifresi: Demo1234  (bcrypt)
const SIFRE_HASH = '$2a$10$0BM59Y3VZUJezYIksMTQ6Ojsq2PXttplmLO3T9hMHBP74Otcf6Eva';

// ---------- sabit tohumlu rastgele sayı üretici ----------
let tohum = 20261014;
const rnd = () => {
  tohum |= 0; tohum = (tohum + 0x6d2b79f5) | 0;
  let t = Math.imul(tohum ^ (tohum >>> 15), 1 | tohum);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const sec = (dizi) => dizi[Math.floor(rnd() * dizi.length)];
const aralik = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const q = (v) => (v === null || v === undefined ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`);
const ts = (d) => q(d.toISOString());

// ---------- program kuralları (ayarlar tablosuyla aynı) ----------
const PUAN_ICIN_TUTAR = 10;
const KUPON_PUAN = 200;
const KUPON_ORAN = 5;
const HOSGELDIN = 50;

// ---------- zaman çizelgesi ----------
const BASLANGIC = new Date('2026-06-15T07:00:00Z');
const BITIS = new Date('2026-10-13T18:00:00Z');
const GUN = 86400000;

// ---------- mağazalar ----------
const magazalar = [
  { id: 1, kod: 'IST-KDK', ad: 'Kadıköy Mağazası', il: 'İstanbul', ilce: 'Kadıköy', kisa: 'kadikoy' },
  { id: 2, kod: 'IST-BKY', ad: 'Bakırköy Mağazası', il: 'İstanbul', ilce: 'Bakırköy', kisa: 'bakirkoy' },
  { id: 3, kod: 'ANK-KZL', ad: 'Kızılay Mağazası', il: 'Ankara', ilce: 'Çankaya', kisa: 'kizilay' },
  { id: 4, kod: 'IZM-ALS', ad: 'Alsancak Mağazası', il: 'İzmir', ilce: 'Konak', kisa: 'alsancak' },
  { id: 5, kod: 'BRS-NLF', ad: 'Nilüfer Mağazası', il: 'Bursa', ilce: 'Nilüfer', kisa: 'nilufer' },
];
const magazaAgirlik = [0.27, 0.22, 0.2, 0.18, 0.13];

// ---------- isimler ----------
const kadinAd = ['Ayşe','Fatma','Zeynep','Elif','Emine','Merve','Esra','Büşra','Selin','Deniz','Gamze','Hatice','Özlem','Sevgi','Derya','Ebru','Nur','Yasemin','Gül','Melike','Ceren','İrem','Burcu','Tuğba','Seda','Pınar','Aslı','Dilek','Canan','Hande'];
const erkekAd = ['Mehmet','Mustafa','Ahmet','Ali','Hüseyin','Hasan','İbrahim','Murat','Emre','Burak','Can','Kerem','Oğuz','Serkan','Volkan','Yusuf','Ömer','Kemal','Tolga','Barış','Cem','Onur','Eren','Hakan','Selim','Umut','Gökhan','Sinan','Erdem','Kaan'];
const soyadlar = ['Yılmaz','Kaya','Demir','Şahin','Çelik','Yıldız','Yıldırım','Öztürk','Aydın','Özdemir','Arslan','Doğan','Kılıç','Aslan','Çetin','Kara','Koç','Kurt','Özkan','Şimşek','Polat','Korkmaz','Erdoğan','Güneş','Aksoy','Tekin','Bulut','Uçar','Ergin','Taş','Avcı','Çakır','Kaplan','Bozkurt','Ünal'];
const trAscii = (s) => s.toLocaleLowerCase('tr-TR')
  .replace(/ç/g,'c').replace(/ğ/g,'g').replace(/ı/g,'i').replace(/ö/g,'o').replace(/ş/g,'s').replace(/ü/g,'u');

// ---------- çıktı tamponu ----------
const satirlar = [];
const yaz = (s) => satirlar.push(s);
const topluEkle = (tablo, kolonlar, kayitlar, parca = 250) => {
  for (let i = 0; i < kayitlar.length; i += parca) {
    const dilim = kayitlar.slice(i, i + parca);
    yaz(`INSERT INTO ${tablo} (${kolonlar.join(', ')}) VALUES\n  ${dilim.map((r) => `(${r.join(', ')})`).join(',\n  ')};\n`);
  }
};

yaz(`-- =====================================================================
-- Tuğba Yanımda – DEMO VERİSİ (otomatik üretildi: scripts/demo-verisi-uret.mjs)
-- Tüm demo hesapların şifresi: Demo1234
-- Canlıya geçmeden önce bu veriyi temizleyen ayrı bir migration eklenecek.
-- =====================================================================
`);

// ---------- mağazalar ----------
topluEkle('magazalar', ['id','kod','ad','il','ilce','adres','telefon'],
  magazalar.map((m) => [m.id, q(m.kod), q(m.ad), q(m.il), q(m.ilce), q(`${m.ilce} Çarşı Cad. No:${aralik(3, 120)} (demo adres)`), q(`0850 000 0${m.id} 0${m.id}`)]));

// ---------- kullanıcılar: yönetici + personel ----------
const kullanicilar = [];
let kid = 1;
kullanicilar.push([kid++, q('yonetici'), 'NULL', q('yonetim'), q(SIFRE_HASH), q('Genel'), q('Merkez'), 'NULL', ts(new Date('2026-06-01T09:00:00Z'))]);
const personel = {}; // magaza_id -> [kullanici_id]
for (const m of magazalar) {
  personel[m.id] = [];
  for (let n = 1; n <= 2; n++) {
    const kadin = rnd() < 0.5;
    personel[m.id].push(kid);
    kullanicilar.push([kid++, q('magaza'), 'NULL', q(`${m.kisa}0${n}`), q(SIFRE_HASH),
      q(sec(kadin ? kadinAd : erkekAd)), q(sec(soyadlar)), m.id, ts(new Date('2026-06-01T09:00:00Z'))]);
  }
}

// ---------- müşteriler ----------
const kullanilanTel = new Set();
const telUret = () => {
  let t;
  do { t = `5${sec(['3','4','5','0'])}${aralik(0, 9)}${String(aralik(0, 9999999)).padStart(7, '0')}`; } while (kullanilanTel.has(t));
  kullanilanTel.add(t);
  return t;
};
const qrKullanilan = new Set();
const ALFABE = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const qrUret = () => {
  let s;
  do { s = 'TY-' + Array.from({ length: 10 }, () => ALFABE[Math.floor(rnd() * ALFABE.length)]).join(''); } while (qrKullanilan.has(s));
  qrKullanilan.add(s);
  return s;
};

const musteriler = [];
const musteriProfil = [];
for (let i = 0; i < 200; i++) {
  const ilk = i === 0;
  const kadin = ilk ? true : rnd() < 0.62;
  const ad = ilk ? 'Ayşe' : sec(kadin ? kadinAd : erkekAd);
  const soyad = ilk ? 'Yılmaz' : sec(soyadlar);
  const tel = ilk ? '5320000001' : telUret();
  kullanilanTel.add(tel);
  // kayıtların %70'i ilk 45 günde, kalanı sonradan
  const kayitGun = rnd() < 0.7 ? rnd() * 45 : 45 + rnd() * 70;
  const kayit = new Date(BASLANGIC.getTime() + (ilk ? 0 : kayitGun * GUN) + aralik(1, 10) * 3600000);
  let r = rnd(), ev = 1;
  for (let j = 0, top = 0; j < magazaAgirlik.length; j++) { top += magazaAgirlik[j]; if (r < top) { ev = j + 1; break; } }
  if (ilk) ev = 4;
  // alışveriş sıklığı: az sayıda sadık müşteri çok gelir (Pareto)
  const aktiflik = ilk ? 6 : Math.pow(rnd(), 2.2) * 8 + 0.3;
  const m = { id: kid, ad, soyad, tel, kayit, ev, aktiflik, bakiye: 0, sonKuponGunu: null };
  musteriler.push(m);
  kullanicilar.push([kid, q('musteri'), q(tel), 'NULL', q(SIFRE_HASH), q(ad), q(soyad), 'NULL', ts(kayit)]);
  const eposta = rnd() < 0.55 || ilk ? `${trAscii(ad)}.${trAscii(soyad)}${ilk ? '' : aralik(1, 99)}@ornek.com` : null;
  const dogum = `${aralik(1962, 2006)}-${String(aralik(1, 12)).padStart(2, '0')}-${String(aralik(1, 28)).padStart(2, '0')}`;
  const etk = ilk || rnd() < 0.68;
  musteriProfil.push([kid, q(ilk ? 'TY-DEMO000001' : qrUret()), q(eposta), q(dogum), q(rnd() < 0.08 ? 'belirtmek_istemiyor' : kadin ? 'kadin' : 'erkek'),
    q(magazalar[ev - 1].il), ev, q(rnd() < 0.6 ? 'magaza' : 'web'), ts(kayit), etk ? 'TRUE' : 'FALSE', etk ? ts(kayit) : 'NULL']);
  kid++;
}
topluEkle('kullanicilar', ['id','rol','telefon','kullanici_adi','sifre_hash','ad','soyad','magaza_id','olusturma'], kullanicilar);
topluEkle('musteriler', ['kullanici_id','qr_kodu','e_posta','dogum_tarihi','cinsiyet','il','kayit_magaza_id','kayit_kanali','kvkk_onay_tarihi','etk_onay','etk_onay_tarihi'], musteriProfil);

// ---------- satış simülasyonu ----------
const hareketler = [];
const kuponlar = [];
const satislar = [];
let hid = 1, kpid = 1, sid = 1;
const fisSayac = {};

// hoş geldin puanları
for (const m of musteriler) {
  hareketler.push([hid++, m.id, q('kazanim'), HOSGELDIN, 'NULL', 'NULL', q('Hoş geldin puanı'), 'NULL', ts(m.kayit)]);
  m.bakiye += HOSGELDIN;
}

// satış zamanları: mağaza saatleri 10:00–22:00 (TR), hafta sonu yoğun
const zamanlar = [];
while (zamanlar.length < 1500) {
  const gun = Math.floor(rnd() * ((BITIS - BASLANGIC) / GUN));
  const d = new Date(BASLANGIC.getTime() + gun * GUN);
  const haftaSonu = [0, 6].includes(d.getUTCDay());
  if (!haftaSonu && rnd() < 0.3) continue; // hafta içini biraz seyrelt
  d.setUTCHours(aralik(7, 18), aralik(0, 59), aralik(0, 59));
  zamanlar.push(d);
}
zamanlar.sort((a, b) => a - b);

const agirlikliMusteri = (tarih) => {
  const uygun = musteriler.filter((m) => m.kayit <= tarih);
  const top = uygun.reduce((s, m) => s + m.aktiflik, 0);
  let r = rnd() * top;
  for (const m of uygun) { r -= m.aktiflik; if (r <= 0) return m; }
  return uygun[uygun.length - 1];
};
const tutarUret = () => {
  // log-normal; medyan ~320 TL
  const u1 = rnd() || 1e-9, u2 = rnd();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return Math.min(3800, Math.max(35, Math.round(Math.exp(5.77 + 0.62 * z) * 10) / 10));
};

for (const tarih of zamanlar) {
  const uyeli = rnd() < 0.9;
  const m = uyeli ? agirlikliMusteri(tarih) : null;
  const magazaId = m ? (rnd() < 0.82 ? m.ev : aralik(1, 5)) : aralik(1, 5);
  const mg = magazalar[magazaId - 1];
  const personelId = sec(personel[magazaId]);
  const brut = tutarUret();
  const gunAnahtar = tarih.toISOString().slice(0, 10);
  let indirim = 0, kuponId = null;

  if (m && m.bakiye >= KUPON_PUAN && m.sonKuponGunu !== gunAnahtar && rnd() < 0.4) {
    kuponId = kpid++;
    indirim = Math.round(brut * KUPON_ORAN) / 100;
    const olusturma = new Date(tarih.getTime() - aralik(1, 6) * 60000);
    kuponlar.push({ id: kuponId, musteri: m.id, olusturma, kullanildi: tarih, satis: sid });
    hareketler.push([hid++, m.id, q('harcama'), -KUPON_PUAN, 'NULL', kuponId, q(`%${KUPON_ORAN} indirim kuponu`), 'NULL', ts(olusturma)]);
    m.bakiye -= KUPON_PUAN;
    m.sonKuponGunu = gunAnahtar;
  }
  const net = Math.round((brut - indirim) * 100) / 100;
  const puan = m ? Math.floor(net / PUAN_ICIN_TUTAR) : 0;
  const yymmdd = gunAnahtar.slice(2).replace(/-/g, '');
  const anahtar = `${mg.kod}-${yymmdd}`;
  fisSayac[anahtar] = (fisSayac[anahtar] || 0) + 1;
  const fis = `${anahtar}-${String(fisSayac[anahtar]).padStart(4, '0')}`;

  // %1,5 iade (bakiye yetiyorsa)
  let durum = 'tamamlandi', iadeTarihi = null;
  if (m && puan > 0 && rnd() < 0.015) {
    durum = 'iade';
    iadeTarihi = new Date(tarih.getTime() + aralik(2, 72) * 3600000);
  }
  satislar.push([sid, q(fis), m ? m.id : 'NULL', magazaId, personelId, brut.toFixed(2), indirim.toFixed(2), net.toFixed(2),
    kuponId ?? 'NULL', puan, q(durum), iadeTarihi ? ts(iadeTarihi) : 'NULL', ts(tarih)]);
  if (m && puan > 0) {
    hareketler.push([hid++, m.id, q('kazanim'), puan, sid, 'NULL', q(`${fis} numaralı alışveriş`), personelId, ts(tarih)]);
    m.bakiye += puan;
    if (durum === 'iade') {
      if (m.bakiye >= puan) {
        hareketler.push([hid++, m.id, q('iade'), -puan, sid, 'NULL', q(`${fis} iadesi – puan geri alındı`), personelId, ts(iadeTarihi)]);
        m.bakiye -= puan;
      } else {
        satislar[satislar.length - 1][10] = q('tamamlandi');
        satislar[satislar.length - 1][11] = 'NULL';
      }
    }
  }
  sid++;
}

// Birkaç müşteriye kullanılmamış aktif kupon (uygulamadan almış, henüz mağazaya gelmemiş)
const bugun = new Date('2026-10-13T12:00:00Z');
for (const m of musteriler.filter((x) => x.bakiye >= KUPON_PUAN).slice(0, 6)) {
  const id = kpid++;
  const olusturma = new Date(bugun.getTime() - aralik(1, 48) * 3600000);
  kuponlar.push({ id, musteri: m.id, olusturma, aktif: true });
  hareketler.push([hid++, m.id, q('harcama'), -KUPON_PUAN, 'NULL', id, q(`%${KUPON_ORAN} indirim kuponu`), 'NULL', ts(olusturma)]);
  m.bakiye -= KUPON_PUAN;
}

// kuponlar satışlardan önce eklenir (satislar.kupon_id FK), kullanılan_satis_id sonra güncellenir
const kodUret = () => 'K' + Array.from({ length: 7 }, () => ALFABE[Math.floor(rnd() * ALFABE.length)]).join('');
topluEkle('kuponlar', ['id','musteri_id','kod','indirim_orani','puan_bedeli','durum','son_kullanma','kullanilma_tarihi','olusturma'],
  kuponlar.map((k) => [k.id, k.musteri, q(kodUret()), KUPON_ORAN, KUPON_PUAN, q(k.aktif ? 'aktif' : 'kullanildi'),
    ts(new Date(k.olusturma.getTime() + 7 * GUN)), k.kullanildi ? ts(k.kullanildi) : 'NULL', ts(k.olusturma)]));
topluEkle('satislar', ['id','fis_no','musteri_id','magaza_id','personel_id','brut_tutar','indirim_tutari','net_tutar','kupon_id','kazanilan_puan','durum','iade_tarihi','tarih'], satislar);
yaz(`UPDATE kuponlar k SET kullanilan_satis_id = s.id FROM satislar s WHERE s.kupon_id = k.id;\n`);
topluEkle('puan_hareketleri', ['id','musteri_id','tur','puan','satis_id','kupon_id','aciklama','olusturan_id','tarih'], hareketler);

// kampanyalar
topluEkle('kampanyalar', ['baslik','metin','magaza_id','baslangic','bitis'], [
  [q('Kış Lokumlarında Çift Puan'), q('Tüm lokum çeşitlerinde 1–30 Kasım arasında her alışverişe çift puan.'), 'NULL', q('2026-11-01'), q('2026-11-30')],
  [q('Alsancak’a Özel Kahve Haftası'), q('Türk kahvesi ve kahve yanı lezzetlerde %10 indirim.'), 4, q('2026-10-10'), q('2026-10-20')],
  [q('Doğum Gününde 100 Puan Hediye'), q('Doğum gününüzün olduğu hafta uygulamaya giriş yapın, 100 puan hesabınıza tanımlansın.'), 'NULL', q('2026-10-01'), q('2026-12-31')],
]);

// sayaçları ileri al
for (const t of ['magazalar', 'kullanicilar', 'kuponlar', 'satislar', 'puan_hareketleri']) {
  yaz(`SELECT setval(pg_get_serial_sequence('${t}', 'id'), (SELECT MAX(id) FROM ${t}));`);
}

writeFileSync(CIKTI, satirlar.join('\n') + '\n');
const toplamNet = satislar.reduce((s, r) => s + Number(r[7]), 0);
console.log(`Yazıldı: ${CIKTI}`);
console.log(`Mağaza: ${magazalar.length}, kullanıcı: ${kullanicilar.length}, satış: ${satislar.length}, kupon: ${kuponlar.length}, puan hareketi: ${hareketler.length}`);
console.log(`Toplam ciro: ${toplamNet.toFixed(2)} TL, en düşük bakiye: ${Math.min(...musteriler.map((m) => m.bakiye))}`);
