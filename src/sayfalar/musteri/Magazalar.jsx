// Mağazalar: takip ettiklerim + mağaza bul (il kartları, arama, yakınımda), satır içi ayrıntı ve yol tarifi
import { useEffect, useMemo, useState } from 'react';
import { sayi } from '../../api.js';
import { kmMetni, kucuk, mesafeKm, trSirala, useFavoriler, useVeri, yolTarifi } from './veri.jsx';

function Yildiz({ magaza }) {
  const { magazalar, degistir } = useFavoriler();
  const takipte = magazalar.has(magaza.id);
  return (
    <button
      type="button"
      className={`m-yildiz${takipte ? ' m-yildiz--acik' : ''}`}
      aria-pressed={takipte}
      aria-label={takipte ? `${magaza.ad} mağazasını takipten çık` : `${magaza.ad} mağazasını takip et`}
      onClick={() => degistir('magaza', magaza.id, !takipte)}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" />
      </svg>
    </button>
  );
}

function MagazaSatiri({ m, acik, onAc }) {
  const { magazalar } = useFavoriler();
  const takipte = magazalar.has(m.id);
  return (
    <li className={`m-magaza${acik ? ' m-magaza--acik' : ''}`}>
      <div className="m-magaza__bas">
        <button type="button" className="m-magaza__ana" aria-expanded={acik} onClick={onAc}>
          <span className="m-magaza__ad">
            <strong>{m.ad}</strong>
            <span>{m.ilce && m.ilce !== m.ad ? `${m.ilce}, ` : ''}{m.il}</span>
          </span>
          {m.km !== undefined && <span className="m-km">{kmMetni(m.km)}</span>}
          {m.programda && <span className="m-etiket">Puan geçerli</span>}
        </button>
        <Yildiz magaza={m} />
      </div>
      {acik && (
        <div className="m-magaza__ayrinti">
          {m.adres && <p>{m.adres}, {m.ilce} / {m.il}</p>}
          {!m.programda && <p>Bu mağaza pilot döneminde programa dahil değil; takip edersen duyurularını yine görürsün.</p>}
          <div className="m-eylemler">
            <a className="dugme dugme--kucuk" href={yolTarifi(m)} target="_blank" rel="noopener">Yol tarifi</a>
            {takipte && <span className="m-not">Takip ediyorsun</span>}
          </div>
        </div>
      )}
    </li>
  );
}

function MagazaListesi({ liste }) {
  const [acik, setAcik] = useState(null);
  if (!liste.length) return null;
  return (
    <ul className="m-magazalar">
      {liste.map((m) => (
        <MagazaSatiri key={m.id} m={m} acik={acik === m.id} onAc={() => setAcik(acik === m.id ? null : m.id)} />
      ))}
    </ul>
  );
}

export default function Magazalar() {
  const { veri, hata } = useVeri('/magazalar');
  const { magazalar: favori, hazir } = useFavoriler();
  const [sekme, setSekme] = useState(null); // null = varsayılan
  const [arama, setArama] = useState('');
  const [il, setIl] = useState(null);
  const [konum, setKonum] = useState(null);
  const [konumDurumu, setKonumDurumu] = useState('');

  const tum = veri?.magazalar || [];
  const takipEdilenler = tum.filter((m) => favori.has(m.id)).sort((a, b) => trSirala(a.ad, b.ad));
  // Varsayılan sekme açılışta BİR KEZ belirlenir; sonradan takip edilen mağaza ekranı değiştirmez
  useEffect(() => {
    if (sekme === null && veri && hazir) setSekme(takipEdilenler.length ? 'takip' : 'bul');
  }, [sekme, veri, hazir, takipEdilenler.length]);
  const aktifSekme = sekme ?? 'bul';

  const iller = useMemo(() => {
    const harita = new Map();
    for (const m of tum) {
      const o = harita.get(m.il) || { il: m.il, sayi: 0, programda: 0 };
      o.sayi++;
      if (m.programda) o.programda++;
      harita.set(m.il, o);
    }
    // Pilot mağazası olan iller önce, sonra mağaza sayısına göre
    return [...harita.values()].sort((a, b) => (b.programda > 0) - (a.programda > 0) || b.sayi - a.sayi || trSirala(a.il, b.il));
  }, [tum]);

  const konumBul = () => {
    if (!navigator.geolocation) {
      setKonumDurumu('Tarayıcın konum özelliğini desteklemiyor.');
      return;
    }
    setKonumDurumu('Konumun alınıyor…');
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setKonum({ enlem: p.coords.latitude, boylam: p.coords.longitude });
        setKonumDurumu('');
        setIl(null);
        setArama('');
      },
      () => setKonumDurumu('Konumuna erişilemedi. Tarayıcı izinlerini kontrol et ya da il seçerek ara.'),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  };

  let sonuc = null;
  let baslik = '';
  if (aktifSekme === 'bul') {
    const q = kucuk(arama.trim());
    if (q) {
      sonuc = tum.filter((m) => kucuk(`${m.ad} ${m.ilce} ${m.il}`).includes(q)).sort((a, b) => trSirala(a.ad, b.ad));
      baslik = `“${arama.trim()}” için ${sayi(sonuc.length)} mağaza`;
    } else if (konum) {
      sonuc = tum
        .filter((m) => m.enlem && m.boylam)
        .map((m) => ({ ...m, km: mesafeKm(konum, m) }))
        .sort((a, b) => a.km - b.km)
        .slice(0, 10);
      baslik = 'Sana en yakın 10 mağaza';
    } else if (il) {
      sonuc = tum.filter((m) => m.il === il).sort((a, b) => b.programda - a.programda || trSirala(a.ad, b.ad));
      baslik = `${il}: ${sayi(sonuc.length)} mağaza`;
    }
  }

  if (hata) return <p className="uyari" role="alert">{hata}</p>;
  if (!veri || !hazir) return <p className="m-bos">Yükleniyor…</p>;

  return (
    <div className="m-magaza-sayfa">
      <div className="m-segment" role="tablist" aria-label="Mağaza görünümü">
        <button type="button" role="tab" aria-selected={aktifSekme === 'takip'} onClick={() => setSekme('takip')}>
          Takip ettiklerim ({takipEdilenler.length})
        </button>
        <button type="button" role="tab" aria-selected={aktifSekme === 'bul'} onClick={() => setSekme('bul')}>
          Mağaza bul
        </button>
      </div>

      {aktifSekme === 'takip' ? (
        takipEdilenler.length ? (
          <MagazaListesi liste={takipEdilenler} />
        ) : (
          <p className="m-bos">
            Henüz mağaza takip etmiyorsun. <button type="button" className="m-metin-dugme" onClick={() => setSekme('bul')}>Mağaza bul</button>
          </p>
        )
      ) : (
        <>
          <div className="m-arama">
            <input
              type="search" value={arama} placeholder="Mağaza veya ilçe ara" aria-label="Mağaza ara"
              onChange={(e) => { setArama(e.target.value); setKonum(null); }}
            />
            <button type="button" className={`m-konum${konum ? ' m-konum--acik' : ''}`} onClick={konumBul}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></svg>
              <span>Yakınımda</span>
            </button>
          </div>
          {konumDurumu && <p className="m-not" role="status">{konumDurumu}</p>}

          {sonuc ? (
            <>
              <div className="m-liste-bas">
                <h2>{baslik}</h2>
                <button type="button" className="m-metin-dugme" onClick={() => { setIl(null); setKonum(null); setArama(''); }}>
                  Tüm iller
                </button>
              </div>
              {sonuc.length ? <MagazaListesi liste={sonuc} /> : <p className="m-bos">Bu aramayla eşleşen mağaza yok. Farklı bir ilçe ya da il adı dene.</p>}
            </>
          ) : (
            <>
              <h2 className="m-alt-baslik">{sayi(tum.length)} mağaza, {sayi(iller.length)} il</h2>
              <ul className="m-iller">
                {iller.map((x) => (
                  <li key={x.il}>
                    <button type="button" onClick={() => setIl(x.il)}>
                      <strong>{x.il}</strong>
                      <span>{sayi(x.sayi)} mağaza</span>
                      {x.programda > 0 && <span className="m-etiket">Pilot</span>}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  );
}
