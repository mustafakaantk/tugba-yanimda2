// Müşteri panelinin ortak verisi: favoriler (bağlam), mağaza/ürün kataloğu (önbellekli), yardımcılar
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../../api.js';

// ---------- herkese açık katalog: sekmeler arası geçişte tekrar indirilmesin ----------
const onbellek = {};
export function onbellekliGetir(yol) {
  if (!onbellek[yol]) onbellek[yol] = api(yol).catch((h) => { delete onbellek[yol]; throw h; });
  return onbellek[yol];
}

export function useVeri(yol) {
  const [durum, setDurum] = useState({ veri: null, hata: '' });
  useEffect(() => {
    let iptal = false;
    onbellekliGetir(yol)
      .then((veri) => !iptal && setDurum({ veri, hata: '' }))
      .catch((h) => !iptal && setDurum({ veri: null, hata: h.message }));
    return () => { iptal = true; };
  }, [yol]);
  return durum;
}

// ---------- favoriler ----------
const FavoriBaglami = createContext(null);

export function FavoriSaglayici({ children }) {
  const [fav, setFav] = useState({ magazalar: new Set(), urunler: new Set(), hazir: false });
  const [hata, setHata] = useState('');

  const uygula = (d) => setFav({ magazalar: new Set(d.magazalar), urunler: new Set(d.urunler), hazir: true });

  useEffect(() => {
    api('/musteri/favoriler').then(uygula).catch((h) => setHata(h.message));
  }, []);

  // İyimser güncelleme: ekranda hemen değişir, sunucu reddederse geri alınır
  const degistir = useCallback(async (tur, id, ekle) => {
    const anahtar = tur === 'magaza' ? 'magazalar' : 'urunler';
    setHata('');
    setFav((o) => {
      const yeni = new Set(o[anahtar]);
      ekle ? yeni.add(id) : yeni.delete(id);
      return { ...o, [anahtar]: yeni };
    });
    try {
      uygula(await api('/musteri/favoriler', { yontem: 'POST', veri: { tur, id, ekle } }));
    } catch (h) {
      setHata(h.message);
      api('/musteri/favoriler').then(uygula).catch(() => {});
    }
  }, []);

  return <FavoriBaglami.Provider value={{ ...fav, degistir, hata, setHata }}>{children}</FavoriBaglami.Provider>;
}

export const useFavoriler = () => useContext(FavoriBaglami);

// ---------- yardımcılar ----------
export const trSirala = (a, b) => a.localeCompare(b, 'tr');
export const kucuk = (s) => (s || '').toLocaleLowerCase('tr');

/** İki koordinat arası kuş uçuşu mesafe (km) */
export function mesafeKm(a, b) {
  const R = 6371;
  const r = (x) => (x * Math.PI) / 180;
  const dLat = r(b.enlem - a.enlem);
  const dLon = r(b.boylam - a.boylam);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.enlem)) * Math.cos(r(b.enlem)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export const kmMetni = (km) => (km < 1 ? `${Math.round(km * 1000)} m` : `${km < 10 ? km.toFixed(1).replace('.', ',') : Math.round(km)} km`);

export const yolTarifi = (m) =>
  m.enlem && m.boylam
    ? `https://www.google.com/maps/dir/?api=1&destination=${m.enlem},${m.boylam}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`Tuğba Kuruyemiş ${m.ad} ${m.adres || ''} ${m.il}`)}`;

export const tarihMetni = (t, secenek = { day: 'numeric', month: 'long', year: 'numeric' }) =>
  new Date(t).toLocaleDateString('tr-TR', secenek);
export const saatMetni = (t) => new Date(t).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
