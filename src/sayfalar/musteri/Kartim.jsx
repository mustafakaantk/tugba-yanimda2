// Kartım: kişisel QR, puan durumu, son hareketler, takip edilen mağazalar
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api, sayi } from '../../api.js';
import { PuanHalkasi } from '../../bilesenler.jsx';
import { useOturum } from '../../oturum.jsx';
import { HareketSatiri } from './Hareketler.jsx';
import { useFavoriler, useVeri, yolTarifi } from './veri.jsx';

function UyeQR({ kod }) {
  const [svg, setSvg] = useState('');
  useEffect(() => {
    // QR yalnızca üye kodunu içerir; telefon numarası yoktur
    QRCode.toString(kod, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#2e1519', light: '#ffffff' } })
      .then(setSvg)
      .catch(() => setSvg(''));
  }, [kod]);
  return svg
    ? <div className="m-qr" role="img" aria-label={`Üye QR kodu: ${kod}`} dangerouslySetInnerHTML={{ __html: svg }} />
    : <div className="m-qr m-qr--bos" aria-hidden="true" />;
}

export default function Kartim() {
  const { kullanici } = useOturum();
  const hosgeldin = useLocation().state?.hosgeldin;
  const program = useVeri('/program');
  const k = program.veri?.kurallar || { kupon_puan_bedeli: 200, kupon_indirim_orani: 5, kupon_gunluk_limit: 1 };
  const hedef = k.kupon_puan_bedeli;
  const kalan = Math.max(0, hedef - kullanici.puan);

  return (
    <div className="m-kartim">
      {hosgeldin > 0 && (
        <p className="bilgi" role="status">Üyeliğin hazır. Hesabına {hosgeldin} hoş geldin puanı yüklendi.</p>
      )}

      <section className="uye-kart uye-kart--panel" aria-label="Üye kartın">
        <div className="uye-kart__ust">
          <span className="uye-kart__marka">Tuğba Yanımda</span>
          <span className="uye-kart__isim">{kullanici.ad} {kullanici.soyad?.[0]}.</span>
        </div>
        <div className="uye-kart__qr">
          <UyeQR kod={kullanici.qrKodu} />
        </div>
        <p className="uye-kart__kod">{kullanici.qrKodu}</p>
        <p className="uye-kart__ipucu">Ödemeden önce kasiyere okut. Ekran parlaklığını artırmak okumayı kolaylaştırır.</p>
      </section>

      <section className="puan-kutu" aria-label="Puan durumun">
        <div className="puan-kutu__halka">
          <PuanHalkasi puan={kullanici.puan} hedef={hedef} />
          <div className="puan-kutu__sayi">
            <strong>{sayi(kullanici.puan)}</strong>
            <span>puan</span>
          </div>
        </div>
        <p className="puan-kutu__durum">
          {kalan === 0
            ? `%${k.kupon_indirim_orani} indirim hakkın hazır. Kasada “puanımı kullanmak istiyorum” demen yeterli.`
            : `%${k.kupon_indirim_orani} indirime ${sayi(kalan)} puan kaldı.`}
        </p>
        <div className="puan-kutu__nasil">
          <strong>Puanını nasıl kullanırsın?</strong>
          <p>
            Kasada “puanımı kullanmak istiyorum” de. Telefonuna gelen kodu kasiyere söyle; {sayi(hedef)} puan düşülür,
            alışverişine %{k.kupon_indirim_orani} indirim uygulanır. Günde {k.kupon_gunluk_limit} kez.
          </p>
        </div>
      </section>

      <SonHareketler />
      <TakipEdilenler />
    </div>
  );
}

function SonHareketler() {
  const [liste, setListe] = useState(null);
  useEffect(() => {
    api('/musteri/hareketler').then((d) => setListe(d.hareketler.slice(0, 3))).catch(() => setListe([]));
  }, []);
  return (
    <section className="m-blok" aria-labelledby="son-h">
      <div className="m-blok__bas">
        <h2 id="son-h">Son hareketler</h2>
        {liste?.length > 0 && <Link to="/musteri/hareketler">Tümünü gör</Link>}
      </div>
      {liste === null ? (
        <p className="m-bos">Yükleniyor…</p>
      ) : liste.length === 0 ? (
        <p className="m-bos">Henüz hareket yok. İlk alışverişinde QR kodunu okutman yeterli.</p>
      ) : (
        <ul className="m-hareketler">{liste.map((h) => <HareketSatiri key={h.id} h={h} />)}</ul>
      )}
    </section>
  );
}

function TakipEdilenler() {
  const { magazalar: favori, hazir } = useFavoriler();
  const { veri } = useVeri('/magazalar');
  const liste = (veri?.magazalar || []).filter((m) => favori.has(m.id));
  return (
    <section className="m-blok" aria-labelledby="takip-h">
      <div className="m-blok__bas">
        <h2 id="takip-h">Takip ettiğin mağazalar</h2>
        <Link to="/musteri/magazalar">{liste.length ? 'Düzenle' : 'Mağaza bul'}</Link>
      </div>
      {!hazir || !veri ? (
        <p className="m-bos">Yükleniyor…</p>
      ) : liste.length === 0 ? (
        <p className="m-bos">Yakınındaki mağazayı takip et; ikram, tadım günü ve kampanyalardan ilk sen haberdar ol.</p>
      ) : (
        <ul className="m-kisa-liste">
          {liste.map((m) => (
            <li key={m.id}>
              <div>
                <strong>{m.ad}</strong>
                <span>{m.ilce && m.ilce !== m.ad ? `${m.ilce}, ` : ''}{m.il}</span>
              </div>
              <a className="m-baglanti" href={yolTarifi(m)} target="_blank" rel="noopener">Yol tarifi</a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
