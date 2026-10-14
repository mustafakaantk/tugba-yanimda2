import { useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { KorumaliSayfa } from './oturum.jsx';
import AnaSayfa from './sayfalar/AnaSayfa.jsx';
import Giris from './sayfalar/Giris.jsx';
import Kayit from './sayfalar/Kayit.jsx';
import Kvkk from './sayfalar/Kvkk.jsx';
import MusteriPaneli from './sayfalar/musteri/MusteriPaneli.jsx';
import KasaPaneli from './sayfalar/KasaPaneli.jsx';
import MagazaPaneli from './sayfalar/MagazaPaneli.jsx';
import YonetimPaneli from './sayfalar/YonetimPaneli.jsx';

export default function Uygulama() {
  // Sayfa değişince en üste dön (#nasil gibi bağlantılar hariç)
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) window.scrollTo(0, 0);
  }, [pathname, hash]);

  return (
    <Routes>
      <Route path="/" element={<AnaSayfa />} />
      <Route path="/giris" element={<Giris />} />
      <Route path="/kayit" element={<Kayit />} />
      <Route path="/kvkk" element={<Kvkk />} />
      <Route path="/musteri/*" element={<KorumaliSayfa rol="musteri"><MusteriPaneli /></KorumaliSayfa>} />
      <Route path="/kasa/*" element={<KorumaliSayfa rol="kasiyer"><KasaPaneli /></KorumaliSayfa>} />
      <Route path="/magaza/*" element={<KorumaliSayfa rol="mudur"><MagazaPaneli /></KorumaliSayfa>} />
      <Route path="/yonetim/*" element={<KorumaliSayfa rol="yonetici"><YonetimPaneli /></KorumaliSayfa>} />
      <Route path="*" element={<AnaSayfa />} />
    </Routes>
  );
}
