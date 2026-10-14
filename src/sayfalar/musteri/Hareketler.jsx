// Puan hareketleri: özet + aylara göre gruplu liste, sayfalı
import { useEffect, useState } from 'react';
import { api, sayi, tl } from '../../api.js';
import { saatMetni, tarihMetni } from './veri.jsx';

const TUR_ADI = {
  kazanim: 'Alışveriş',
  harcama: 'İndirim kullanıldı',
  iade: 'İade',
  manuel: 'Düzeltme',
};

function baslik(h) {
  if (h.tur === 'kazanim' && !h.fisNo) return h.aciklama || 'Puan kazanıldı';
  if (h.tur === 'harcama') {
    const oran = h.aciklama?.match(/%\d+/)?.[0];
    return oran ? `${oran} indirim kullanıldı` : TUR_ADI.harcama;
  }
  if (h.tur === 'manuel') return h.aciklama || TUR_ADI.manuel;
  return TUR_ADI[h.tur] || h.aciklama;
}

export function HareketSatiri({ h }) {
  const detay = [
    h.magaza,
    `${tarihMetni(h.tarih, { day: 'numeric', month: 'short' })} ${saatMetni(h.tarih)}`,
    h.tutar !== null && h.tur === 'kazanim' ? `fiş ${tl(h.tutar)}` : null,
    h.tur === 'harcama' && h.indirim ? `${tl(h.indirim)} indirim` : null,
  ].filter(Boolean);
  return (
    <li className={`m-hareket m-hareket--${h.tur}${h.iade && h.tur === 'kazanim' ? ' m-hareket--iptal' : ''}`}>
      <div className="m-hareket__sol">
        <strong>{baslik(h)}</strong>
        <span className="m-hareket__detay">{detay.map((d) => <span key={d}>{d}</span>)}</span>
        {h.iade && h.tur === 'kazanim' && <span className="m-etiket m-etiket--gri">Bu alışveriş iade edildi</span>}
      </div>
      <span className="m-hareket__puan">{h.puan > 0 ? '+' : '−'}{sayi(Math.abs(h.puan))}</span>
    </li>
  );
}

const ayAnahtari = (t) => tarihMetni(t, { month: 'long', year: 'numeric' });

export default function Hareketler() {
  const [liste, setListe] = useState([]);
  const [ozet, setOzet] = useState(null);
  const [sayfa, setSayfa] = useState(1);
  const [devam, setDevam] = useState(false);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState('');

  useEffect(() => {
    setYukleniyor(true);
    api(`/musteri/hareketler?sayfa=${sayfa}`)
      .then((d) => {
        setListe((o) => (sayfa === 1 ? d.hareketler : [...o, ...d.hareketler]));
        if (d.ozet) setOzet(d.ozet);
        setDevam(d.devamVar);
      })
      .catch((h) => setHata(h.message))
      .finally(() => setYukleniyor(false));
  }, [sayfa]);

  // Aylara göre grupla
  const gruplar = [];
  for (const h of liste) {
    const ay = ayAnahtari(h.tarih);
    if (!gruplar.length || gruplar.at(-1).ay !== ay) gruplar.push({ ay, satirlar: [] });
    gruplar.at(-1).satirlar.push(h);
  }

  return (
    <div className="m-hareket-sayfa">
      {ozet && (
        <dl className="m-ozet">
          <div><dt>Bakiye</dt><dd>{sayi(ozet.bakiye)}</dd></div>
          <div><dt>Toplam kazandığın</dt><dd>{sayi(ozet.toplam_kazanilan)}</dd></div>
          <div><dt>Kullandığın indirim</dt><dd>{sayi(ozet.indirim_sayisi)} kez</dd></div>
        </dl>
      )}
      {hata && <p className="uyari" role="alert">{hata}</p>}
      {!yukleniyor && !hata && liste.length === 0 && (
        <p className="m-bos">Henüz puan hareketin yok. İlk alışverişinde kasada QR kodunu okutman yeterli.</p>
      )}
      {gruplar.map((g) => (
        <section key={g.ay} className="m-ay">
          <h2>{g.ay}</h2>
          <ul className="m-hareketler">{g.satirlar.map((h) => <HareketSatiri key={h.id} h={h} />)}</ul>
        </section>
      ))}
      {yukleniyor && <p className="m-bos">Yükleniyor…</p>}
      {devam && !yukleniyor && (
        <button type="button" className="dugme dugme--cizgi m-daha" onClick={() => setSayfa((s) => s + 1)}>
          Daha eski hareketleri göster
        </button>
      )}
    </div>
  );
}
