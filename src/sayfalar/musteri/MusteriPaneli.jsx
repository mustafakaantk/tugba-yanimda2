// Müşteri paneli – Faz 2. Telefonda alt menülü uygulama, masaüstünde üst sekmeler.
import { NavLink, Route, Routes } from 'react-router-dom';
import { PanelCercevesi } from '../../bilesenler.jsx';
import { useFavoriler, FavoriSaglayici } from './veri.jsx';
import Kartim from './Kartim.jsx';
import Hareketler from './Hareketler.jsx';
import Magazalar from './Magazalar.jsx';
import Urunler from './Urunler.jsx';
import Hesabim from './Hesabim.jsx';

const SEKMELER = [
  { yol: '/musteri', ad: 'Kartım', son: true, ikon: <path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM7 9h4v4H7zM14 10h4M14 14h3" /> },
  { yol: '/musteri/hareketler', ad: 'Hareketler', ikon: <path d="M4 6h16M4 12h16M4 18h10" /> },
  { yol: '/musteri/magazalar', ad: 'Mağazalar', ikon: <path d="M4 10l1.5-5h13L20 10M4 10v9h16v-9M4 10h16M9 19v-5h6v5" /> },
  { yol: '/musteri/urunler', ad: 'Ürünler', ikon: <path d="M6 8h12l-1 12H7zM9 8V6a3 3 0 0 1 6 0v2" /> },
  { yol: '/musteri/hesap', ad: 'Hesabım', ikon: <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 20c1.5-4 4.5-6 8-6s6.5 2 8 6" /> },
];

function Sekmeler() {
  return (
    <nav className="m-sekmeler" aria-label="Müşteri paneli">
      {SEKMELER.map((s) => (
        <NavLink key={s.yol} to={s.yol} end={s.son} className="m-sekme">
          <svg viewBox="0 0 24 24" aria-hidden="true">{s.ikon}</svg>
          <span>{s.ad}</span>
        </NavLink>
      ))}
    </nav>
  );
}

function FavoriHatasi() {
  const { hata, setHata } = useFavoriler();
  if (!hata) return null;
  return (
    <p className="uyari m-hata" role="alert">
      {hata} <button type="button" onClick={() => setHata('')}>Kapat</button>
    </p>
  );
}

function Sayfa({ baslik, children }) {
  return (
    <PanelCercevesi baslik={baslik} ust={<Sekmeler />}>
      <FavoriHatasi />
      {children}
    </PanelCercevesi>
  );
}

export default function MusteriPaneli() {
  return (
    <FavoriSaglayici>
      <Routes>
        <Route index element={<Sayfa baslik={null}><Kartim /></Sayfa>} />
        <Route path="hareketler" element={<Sayfa baslik="Puan hareketlerin"><Hareketler /></Sayfa>} />
        <Route path="magazalar" element={<Sayfa baslik="Mağazalar"><Magazalar /></Sayfa>} />
        <Route path="urunler" element={<Sayfa baslik="Ürünler"><Urunler /></Sayfa>} />
        <Route path="hesap" element={<Sayfa baslik="Hesabım"><Hesabim /></Sayfa>} />
        <Route path="*" element={<Sayfa baslik={null}><Kartim /></Sayfa>} />
      </Routes>
    </FavoriSaglayici>
  );
}
