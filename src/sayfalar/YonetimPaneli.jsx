import { useEffect, useState } from 'react';
import { api, sayi, tl } from '../api.js';
import { PanelCercevesi } from '../bilesenler.jsx';

// Faz 1: genel özet. Müşteri listesi, raporlar ve ayarlar Faz 4'te eklenecek.
export default function YonetimPaneli() {
  const [veri, setVeri] = useState(null);
  const [hata, setHata] = useState('');
  useEffect(() => {
    api('/yonetim/ozet').then(setVeri).catch((h) => setHata(h.message));
  }, []);

  if (hata) return <PanelCercevesi baslik="Genel bakış"><p className="uyari">{hata}</p></PanelCercevesi>;
  if (!veri) return <PanelCercevesi baslik="Genel bakış"><p className="yukleniyor">Yükleniyor…</p></PanelCercevesi>;

  const g = veri.genel;
  const s = veri.sayilar || {};
  const uyePayi = Number(g.toplam_ciro) > 0 ? Math.round((Number(g.uye_cirosu) / Number(g.toplam_ciro)) * 100) : 0;
  const enYuksek = Math.max(...veri.magazalar.map((m) => Number(m.ciro)), 1);

  return (
    <PanelCercevesi baslik="Genel bakış">
      <dl className="ozet-sayilar">
        <div><dt>Üye sayısı</dt><dd>{sayi(g.uye_sayisi)}</dd><small>Son 30 günde +{sayi(g.yeni_uye_30g)}</small></div>
        <div><dt>Toplam ciro</dt><dd>{tl(g.toplam_ciro)}</dd><small>{sayi(g.satis_sayisi)} satış</small></div>
        <div><dt>Üye cirosunun payı</dt><dd>%{uyePayi}</dd><small>{tl(g.uye_cirosu)}</small></div>
        <div><dt>Dolaşımdaki puan</dt><dd>{sayi(g.dolasimdaki_puan)}</dd><small>{sayi(g.kullanilan_kupon)} kupon kullanıldı</small></div>
      </dl>

      <section className="tablo-kutu">
        <h2>En çok ciro yapan mağazalar</h2>
        <p className="panel__dip" style={{ marginTop: 0 }}>
          {sayi(s.magaza_sayisi)} aktif mağazadan {sayi(s.satisli_magaza)} tanesinde Tuğba Yanımda satışı var. Katalogda {sayi(s.urun_sayisi)} ürün kayıtlı.
        </p>
        <table>
          <thead>
            <tr><th scope="col">Mağaza</th><th scope="col">İl</th><th scope="col" className="sag">Satış</th><th scope="col" className="sag">Ciro</th><th scope="col"><span className="gizli">Oran</span></th></tr>
          </thead>
          <tbody>
            {veri.magazalar.map((m) => (
              <tr key={`${m.il}-${m.ad}`}>
                <th scope="row">{m.ad}</th>
                <td>{m.il}</td>
                <td className="sag">{sayi(m.satis)}</td>
                <td className="sag">{tl(m.ciro)}</td>
                <td className="cubuk-hucre"><span className="cubuk" style={{ width: `${(Number(m.ciro) / enYuksek) * 100}%` }} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <p className="panel__dip">Müşteri listesi, ayrıntılı raporlar ve program ayarları Faz 4’te bu panele eklenecek.</p>
    </PanelCercevesi>
  );
}
