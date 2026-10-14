import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api, sayi, tl } from '../api.js';
import { Alt, DesenKare, PuanHalkasi, UstMenu } from '../bilesenler.jsx';

// Sunucuya ulaşılamazsa sayfa yine de çalışsın diye varsayılan kurallar
const VARSAYILAN = {
  puan_icin_tutar: 1, kupon_puan_bedeli: 200, kupon_indirim_orani: 5,
  kupon_gunluk_limit: 1, puan_gecerlilik_ay: 12, hosgeldin_puani: 50,
};

// "her 1 TL'ye 1 puan" yerine kural 1 TL ise "harcadığın her 1 TL için 1 puan"
export const kazanimMetni = (k) =>
  k.puan_icin_tutar === 1 ? 'harcadığın her 1 TL için 1 puan' : `her ${k.puan_icin_tutar} TL için 1 puan`;

export default function AnaSayfa() {
  const [program, setProgram] = useState(null);
  useEffect(() => {
    api('/program').then(setProgram).catch(() => setProgram(null));
  }, []);
  const k = { ...VARSAYILAN, ...(program?.kurallar || {}) };
  const hesapSilindi = useLocation().state?.hesapSilindi;

  return (
    <>
      <UstMenu />
      <main>
        {hesapSilindi && (
          <p className="kap bilgi bilgi--ust" role="status">Hesabın ve kişisel bilgilerin silindi. Seni yeniden aramızda görmekten mutluluk duyarız.</p>
        )}
        <Kahraman k={k} program={program} />
        <NasilCalisir k={k} />
        <Hesaplayici k={k} />
        {program?.kampanyalar?.length > 0 && <Kampanyalar liste={program.kampanyalar} />}
        <Sorular k={k} program={program} />
        <section className="kapanis">
          <div className="kap kapanis__ic">
            <h2>Bir sonraki alışverişinden itibaren puan kazan.</h2>
            <p>Üyelik ücretsiz ve bir dakika sürüyor. Uygulama indirmen gerekmez.</p>
            <Link className="dugme dugme--buyuk" to="/kayit">Ücretsiz üye ol</Link>
          </div>
        </section>
      </main>
      <Alt />
    </>
  );
}

// "Alsancak (İzmir), Kadıköy (İstanbul) ve ..." biçiminde pilot mağaza listesi
const magazaListesi = (magazalar = []) => {
  const adlar = [...magazalar]
    .sort((a, b) => a.il.localeCompare(b.il, 'tr') || a.ad.localeCompare(b.ad, 'tr'))
    .map((m) => `${m.ad} (${m.il})`);
  return adlar.length > 1 ? `${adlar.slice(0, -1).join(', ')} ve ${adlar.at(-1)}` : adlar[0] || '';
};

function Kahraman({ k, program }) {
  const ornekPuan = Math.round(k.kupon_puan_bedeli * 0.82);
  return (
    <section className="kahraman">
      <div className="kap kahraman__ic">
        <div className="kahraman__metin">
          <h1>
            Her alışverişin,<br />bir sonrakine indirim.
          </h1>
          <p className="kahraman__alt">
            Kasada QR kodunu okut ya da numaranı söyle, {kazanimMetni(k)} kazan.
            {' '}{sayi(k.kupon_puan_bedeli)} puan biriktiğinde alışverişinde %{k.kupon_indirim_orani} indirim senin.
          </p>
          <div className="kahraman__eylem">
            <Link className="dugme dugme--buyuk" to="/kayit">Ücretsiz üye ol</Link>
            <Link className="dugme dugme--cizgi dugme--buyuk" to="/giris">Giriş yap</Link>
          </div>
          <p className="kahraman__hediye">
            Üye olduğun anda hesabına <strong>{k.hosgeldin_puani} hoş geldin puanı</strong> yüklenir.
          </p>
          {program?.magazaSayisi > 0 && (
            <p className="kahraman__magaza">
              {program.pilot
                ? `Pilot döneminde ${sayi(program.magazaSayisi)} mağazada geçerli: ${magazaListesi(program.magazalar)}.`
                : `${sayi(program.magazaSayisi)} Tuğba Kuruyemiş mağazasında geçerli.`}
            </p>
          )}
        </div>

        <div className="kart-sahne" aria-label="Örnek üye kartı">
          <div className="uye-kart">
            <div className="uye-kart__ust">
              <span className="uye-kart__marka">Tuğba Yanımda</span>
              <span className="uye-kart__isim">Ayşe Y.</span>
            </div>
            <div className="uye-kart__qr">
              <DesenKare tohum={11} />
            </div>
            <div className="uye-kart__puan">
              <PuanHalkasi puan={ornekPuan} hedef={k.kupon_puan_bedeli} />
              <div>
                <span className="uye-kart__sayi">{sayi(ornekPuan)}</span>
                <span className="uye-kart__etiket">puan, indirime {sayi(k.kupon_puan_bedeli - ornekPuan)} kaldı</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function NasilCalisir({ k }) {
  const adimlar = [
    {
      baslik: 'Üye ol',
      metin: 'Adın ve cep telefonunla bir dakikada üye ol. Mağazada kasiyerimiz de seni kaydedebilir.',
    },
    {
      baslik: 'Kasada QR kodunu okut',
      metin: `Ödeme öncesi panelindeki QR kodunu okut. Telefonun yanında değilse numaranı söylemen yeterli; ${kazanimMetni(k)} hesabına yazılır.`,
    },
    {
      baslik: 'Puanını indirime çevir',
      metin: `${sayi(k.kupon_puan_bedeli)} puan biriktiğinde kasada “puanımı kullanmak istiyorum” de. Telefonuna gelen kodu kasiyere söyle, %${k.kupon_indirim_orani} indirim fişine uygulanır.`,
    },
  ];
  return (
    <section id="nasil" className="bolum">
      <div className="kap">
        <h2 className="bolum__baslik">Üç adımda puan kazan</h2>
        <ol className="adimlar">
          {adimlar.map((a, i) => (
            <li key={a.baslik} className="adim">
              <span className="adim__no" aria-hidden="true">{i + 1}</span>
              <h3>{a.baslik}</h3>
              <p>{a.metin}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Hesaplayici({ k }) {
  const [aylik, setAylik] = useState(600);
  const s = useMemo(() => {
    const aylikPuan = Math.floor(aylik / k.puan_icin_tutar);
    const ilkKuponAy = aylikPuan > 0 ? Math.max(0, k.kupon_puan_bedeli - k.hosgeldin_puani) / aylikPuan : Infinity;
    const yillikKupon = Math.floor((aylikPuan * 12 + k.hosgeldin_puani) / k.kupon_puan_bedeli);
    // Her kupon ortalama bir alışveriş tutarında kullanılır varsayımı
    const ortalamaSepet = Math.min(aylik, 450);
    return { aylikPuan, ilkKuponAy, yillikKupon, yillikIndirim: yillikKupon * ortalamaSepet * (k.kupon_indirim_orani / 100) };
  }, [aylik, k]);

  const sureMetni = !Number.isFinite(s.ilkKuponAy)
    ? '—'
    : s.ilkKuponAy < 1
      ? 'bu ay'
      : `${Math.ceil(s.ilkKuponAy)} ay`;

  return (
    <section className="bolum bolum--fistik" aria-labelledby="hesap-baslik">
      <div className="kap hesap">
        <div>
          <h2 id="hesap-baslik" className="bolum__baslik">Ayda ne kadar alışveriş yapıyorsun?</h2>
          <p className="hesap__aciklama">Kaydırıcıyı oynat; puanının ne zaman indirime döneceğini gör.</p>
          <label className="hesap__etiket" htmlFor="aylik">
            Aylık alışveriş: <output htmlFor="aylik">{tl(aylik)}</output>
          </label>
          <input
            id="aylik" type="range" min="100" max="3000" step="50" value={aylik}
            onChange={(e) => setAylik(Number(e.target.value))}
            className="hesap__kaydirici"
          />
        </div>
        <dl className="hesap__sonuc">
          <div>
            <dt>Aylık puan</dt>
            <dd>{sayi(s.aylikPuan)}</dd>
          </div>
          <div>
            <dt>İlk indirim hakkı</dt>
            <dd>{sureMetni}</dd>
          </div>
          <div>
            <dt>Yılda indirim hakkı</dt>
            <dd>{sayi(s.yillikKupon)} adet</dd>
          </div>
          <div>
            <dt>Yaklaşık yıllık indirim</dt>
            <dd>{tl(s.yillikIndirim)}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}

function Kampanyalar({ liste }) {
  const tarih = (d) => new Date(d).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
  return (
    <section className="bolum">
      <div className="kap">
        <h2 className="bolum__baslik">Üyelere özel</h2>
        <ul className="kampanyalar">
          {liste.map((c) => (
            <li key={c.id}>
              <h3>{c.baslik}</h3>
              <p>{c.metin}</p>
              <small>{tarih(c.baslangic)} – {tarih(c.bitis)}</small>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Sorular({ k, program }) {
  const sorular = [
    ['Uygulama indirmem gerekiyor mu?', 'Hayır. Bu siteden üye olup panelini telefonunun ana ekranına ekleyebilirsin. Telefonun yanında değilse kasada cep numaranı söylemen de yeterli.'],
    ['Puanlarım ne zaman silinir?', k.puan_gecerlilik_ay > 0 ? `Her puan, kazanıldığı tarihten itibaren ${k.puan_gecerlilik_ay} ay geçerlidir.` : 'Puanların süresiz geçerlidir.'],
    ['Puanımı nasıl kullanırım?', `${sayi(k.kupon_puan_bedeli)} puanın olduğunda kasada “puanımı kullanmak istiyorum” de. Telefonuna tek kullanımlık bir kod gelir; kodu kasiyere söylediğinde ${sayi(k.kupon_puan_bedeli)} puan düşülür ve alışverişine %${k.kupon_indirim_orani} indirim uygulanır. Günde ${k.kupon_gunluk_limit} kez kullanılabilir.`],
    ['Puanlarımı başkası kullanabilir mi?', 'Hayır. Puan kullanımı yalnızca senin telefonuna gelen tek kullanımlık kodla onaylanır.'],
    ['Hangi mağazalarda geçerli?', program?.pilot
      ? `Program şu an pilot olarak ${sayi(program.magazaSayisi)} mağazamızda çalışıyor: ${magazaListesi(program.magazalar)}. Pilot sonrasında ${sayi(program.toplamMagaza)} mağazamızın tümüne yayılacak.`
      : 'Tüm Tuğba Kuruyemiş mağazalarında puan kazanıp kullanabilirsin.'],
    ['Hesabımı silebilir miyim?', 'Evet. Panelindeki “Hesabımı sil” bölümünden şifrenle onaylayarak hesabını kalıcı olarak silebilirsin. Kişisel bilgilerin silinir, kalan puanların da sıfırlanır.'],
    ['Alışveriş tutarım kimlerle paylaşılıyor?', 'Bilgilerin yalnızca Tuğba Kuruyemiş sadakat programı için kullanılır, üçüncü kişilere satılmaz. Ayrıntılar KVKK Aydınlatma Metni’nde.'],
    ['İade yaparsam ne olur?', 'İade edilen alışverişten kazandığın puanlar hesabından geri düşülür.'],
  ];
  return (
    <section id="sss" className="bolum">
      <div className="kap kap--dar">
        <h2 className="bolum__baslik">Sık sorulanlar</h2>
        <div className="sorular">
          {sorular.map(([s, c]) => (
            <details key={s}>
              <summary>{s}</summary>
              <p>{c}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
