// Oturum durumu: kim giriş yaptı, rolü ne. Tüm sayfalar buradan okur.
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { api } from './api.js';

const OturumBaglami = createContext(null);

export const PANEL = { musteri: '/musteri', magaza: '/magaza', yonetici: '/yonetim' };

export function OturumSaglayici({ children }) {
  const [kullanici, setKullanici] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(true);

  const yenile = useCallback(async () => {
    try {
      const { kullanici } = await api('/ben');
      setKullanici(kullanici);
      return kullanici;
    } catch {
      setKullanici(null);
      return null;
    } finally {
      setYukleniyor(false);
    }
  }, []);

  useEffect(() => {
    yenile();
  }, [yenile]);

  const cikis = async () => {
    await api('/cikis', { yontem: 'POST', veri: {} }).catch(() => {});
    setKullanici(null);
  };

  return (
    <OturumBaglami.Provider value={{ kullanici, yukleniyor, yenile, cikis }}>{children}</OturumBaglami.Provider>
  );
}

export const useOturum = () => useContext(OturumBaglami);

/** Sayfayı yalnızca belirtilen role açar; başka rol girerse kendi paneline gönderilir. */
export function KorumaliSayfa({ rol, children }) {
  const { kullanici, yukleniyor } = useOturum();
  const konum = useLocation();
  if (yukleniyor) return <div className="yukleniyor" aria-live="polite">Yükleniyor…</div>;
  if (!kullanici) return <Navigate to="/giris" replace state={{ geri: konum.pathname }} />;
  if (kullanici.rol !== rol) return <Navigate to={PANEL[kullanici.rol]} replace />;
  return children;
}
