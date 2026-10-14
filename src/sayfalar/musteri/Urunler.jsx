// Ürün kataloğu: kategori kartları, alt kategoriler, arama, favori ürünler, ürün ayrıntısı
// Fiyat gösterilmez; amaç ürünleri tanıtmak ve favoriye eklenen ürün indirime girince haber vermek (Faz 4).
import { useEffect, useMemo, useRef, useState } from 'react';
import { api, sayi } from '../../api.js';
import { kucuk, trSirala, useFavoriler, useVeri } from './veri.jsx';

function Kalp({ urun }) {
  const { urunler, degistir } = useFavoriler();
  const favori = urunler.has(urun.id);
  return (
    <button
      type="button"
      className={`m-kalp${favori ? ' m-kalp--acik' : ''}`}
      aria-pressed={favori}
      aria-label={favori ? `${urun.ad} favorilerden çıkar` : `${urun.ad} favorilere ekle`}
      onClick={(e) => { e.stopPropagation(); degistir('urun', urun.id, !favori); }}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 20s-7.5-4.6-9.2-9.3C1.7 7.6 3.6 4.5 6.9 4.5c2 0 3.3 1.1 4.1 2.3.8-1.2 2.1-2.3 4.1-2.3 3.3 0 5.2 3.1 4.1 6.2C19.5 15.4 12 20 12 20z" />
      </svg>
    </button>
  );
}

const Gorsel = ({ urun, sinif, boyut }) => (
  <img
    className={sinif} src={urun.gorsel} alt="" width={boyut} height={boyut} loading="lazy" decoding="async"
    onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
  />
);

function UrunSatiri({ urun, onAc }) {
  return (
    <li className="m-urun">
      <button type="button" className="m-urun__ana" onClick={() => onAc(urun)}>
        <Gorsel urun={urun} sinif="m-urun__gorsel" boyut={64} />
        <span className="m-urun__metin">
          <strong>{urun.ad}</strong>
          <span>{urun.altKategori}</span>
          {urun.cokSatan && <span className="m-etiket m-etiket--safran">Çok satan</span>}
        </span>
      </button>
      <Kalp urun={urun} />
    </li>
  );
}

function UrunAyrintisi({ urun, onKapat }) {
  const [ayrinti, setAyrinti] = useState(null);
  const dialog = useRef(null);
  useEffect(() => {
    dialog.current?.showModal?.();
    api(`/urunler/${urun.id}`).then((d) => setAyrinti(d.urun)).catch(() => setAyrinti({ aciklama: '' }));
  }, [urun.id]);
  // Ticimax açıklamaları uzun tek paragraf; "İçindekiler", "Üretici" gibi bölümleri satırlara ayır
  const parcalar = (ayrinti?.aciklama || '')
    .split(/(?<=\.)\s+(?=[A-ZÇĞİÖŞÜ][a-zçğıöşü]+\s?:)/)
    .map((p) => p.trim()).filter(Boolean);
  return (
    <dialog ref={dialog} className="m-dialog" onClose={onKapat} onClick={(e) => e.target === dialog.current && dialog.current.close()} aria-labelledby="urun-baslik">
      <div className="m-dialog__ic">
        <button type="button" className="m-dialog__kapat" onClick={() => dialog.current.close()} aria-label="Kapat">×</button>
        <Gorsel urun={urun} sinif="m-dialog__gorsel" boyut={260} />
        <h2 id="urun-baslik">{urun.ad}</h2>
        <p className="m-dialog__alt">{urun.altKategori}</p>
        <div className="m-dialog__eylem">
          <Kalp urun={urun} />
          <span className="m-not">Favorine eklediğin ürün indirime girince haber veririz.</span>
        </div>
        {ayrinti === null ? <p className="m-bos">Yükleniyor…</p> : parcalar.length > 0 && (
          <div className="m-dialog__aciklama">{parcalar.map((p) => <p key={p}>{p}</p>)}</div>
        )}
      </div>
    </dialog>
  );
}

export default function Urunler() {
  const { veri, hata } = useVeri('/urunler');
  const { urunler: favori } = useFavoriler();
  const [kategori, setKategori] = useState(null); // kod | 'favori' | null
  const [alt, setAlt] = useState(null);
  const [arama, setArama] = useState('');
  const [secili, setSecili] = useState(null);

  const urunler = veri?.urunler || [];
  const kat = veri?.kategoriler.find((k) => k.kod === kategori);

  const altKategoriler = useMemo(() => {
    if (!kat) return [];
    const say = new Map();
    urunler.filter((u) => u.kategori === kat.kod).forEach((u) => say.set(u.altKategori, (say.get(u.altKategori) || 0) + 1));
    return [...say].sort((a, b) => b[1] - a[1] || trSirala(a[0], b[0]));
  }, [kat, urunler]);

  if (hata) return <p className="uyari" role="alert">{hata}</p>;
  if (!veri) return <p className="m-bos">Yükleniyor…</p>;

  const q = kucuk(arama.trim());
  let liste = null;
  let baslik = '';
  if (q) {
    liste = urunler.filter((u) => kucuk(`${u.ad} ${u.altKategori}`).includes(q));
    baslik = `“${arama.trim()}” için ${sayi(liste.length)} ürün`;
  } else if (kategori === 'favori') {
    liste = urunler.filter((u) => favori.has(u.id));
    baslik = 'Favori ürünlerin';
  } else if (kat) {
    liste = urunler.filter((u) => u.kategori === kat.kod && (!alt || u.altKategori === alt));
    baslik = kat.ad;
  }

  const geri = () => { setKategori(null); setAlt(null); setArama(''); };

  return (
    <div className="m-urun-sayfa">
      <div className="m-arama">
        <input type="search" value={arama} placeholder="Ürün ara: lokum, fıstık, kahve…" aria-label="Ürün ara" onChange={(e) => setArama(e.target.value)} />
      </div>

      {liste ? (
        <>
          <div className="m-liste-bas">
            <h2>{baslik}</h2>
            <button type="button" className="m-metin-dugme" onClick={geri}>Tüm kategoriler</button>
          </div>
          {kat && !q && altKategoriler.length > 1 && (
            <div className="m-cipler" role="group" aria-label="Alt kategori">
              <button type="button" aria-pressed={!alt} onClick={() => setAlt(null)}>Tümü</button>
              {altKategoriler.map(([ad, n]) => (
                <button key={ad} type="button" aria-pressed={alt === ad} onClick={() => setAlt(ad)}>{ad} <span>{n}</span></button>
              ))}
            </div>
          )}
          {liste.length ? (
            <ul className="m-urunler">{liste.map((u) => <UrunSatiri key={u.id} urun={u} onAc={setSecili} />)}</ul>
          ) : (
            <p className="m-bos">
              {kategori === 'favori' && !q
                ? 'Henüz favori ürünün yok. Beğendiğin ürünlerdeki kalbe dokun; indirime girdiklerinde haber verelim.'
                : 'Bu aramayla eşleşen ürün yok.'}
            </p>
          )}
        </>
      ) : (
        <>
          <button type="button" className="m-favori-serit" onClick={() => setKategori('favori')}>
            <span>Favori ürünlerin</span>
            <strong>{sayi(favori.size)}</strong>
          </button>
          <ul className="m-kategoriler">
            {veri.kategoriler.map((k) => (
              <li key={k.kod}>
                <button type="button" onClick={() => { setKategori(k.kod); setAlt(null); }}>
                  {k.kapak && <img src={k.kapak} alt="" width="72" height="72" loading="lazy" />}
                  <strong>{k.ad}</strong>
                  <span>{sayi(k.urunSayisi)} ürün</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {secili && <UrunAyrintisi urun={secili} onKapat={() => setSecili(null)} />}
    </div>
  );
}
