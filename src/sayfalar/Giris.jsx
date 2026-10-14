import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { Logo } from '../bilesenler.jsx';
import { PANEL, useOturum } from '../oturum.jsx';

// Yalnızca demo sürümünde gösterilir; canlıda bu liste kaldırılacak.
const DEMO_HESAPLAR = [
  { etiket: 'Üye', kimlik: '0532 000 00 01', aciklama: 'Ayşe Yılmaz' },
  { etiket: 'Kasiyer', kimlik: 'alsancak02', aciklama: 'Alsancak kasası' },
  { etiket: 'Mağaza müdürü', kimlik: 'alsancak01', aciklama: 'Alsancak mağazası' },
  { etiket: 'Genel Merkez', kimlik: 'yonetim', aciklama: 'Yönetici' },
];

export default function Giris() {
  const { kullanici, yukleniyor, yenile } = useOturum();
  const git = useNavigate();
  const [kimlik, setKimlik] = useState('');
  const [sifre, setSifre] = useState('');
  const [hata, setHata] = useState('');
  const [gonderiliyor, setGonderiliyor] = useState(false);

  // Zaten giriş yapılmışsa doğrudan kendi paneline
  useEffect(() => {
    if (!yukleniyor && kullanici) git(PANEL[kullanici.rol], { replace: true });
  }, [kullanici, yukleniyor, git]);

  const gonder = async (e) => {
    e.preventDefault();
    setHata('');
    setGonderiliyor(true);
    try {
      const sonuc = await api('/giris', { yontem: 'POST', veri: { kimlik, sifre } });
      await yenile();
      git(sonuc.yonlendir, { replace: true });
    } catch (h) {
      setHata(h.message);
    } finally {
      setGonderiliyor(false);
    }
  };

  return (
    <div className="form-sayfa">
      <div className="form-kutu">
        <Logo />
        <h1>Giriş yap</h1>
        <p className="form-kutu__alt">Üyeler cep telefonuyla, mağaza ve Genel Merkez kullanıcı adıyla girer.</p>

        <form onSubmit={gonder} noValidate>
          <label className="alan">
            <span>Cep telefonu veya kullanıcı adı</span>
            <input
              value={kimlik} onChange={(e) => setKimlik(e.target.value)}
              autoComplete="username" inputMode="text" required placeholder="05XX XXX XX XX"
            />
          </label>
          <label className="alan">
            <span>Şifre</span>
            <input type="password" value={sifre} onChange={(e) => setSifre(e.target.value)} autoComplete="current-password" required />
          </label>
          {hata && <p className="uyari" role="alert">{hata}</p>}
          <button className="dugme dugme--buyuk dugme--tam" disabled={gonderiliyor}>
            {gonderiliyor ? 'Giriş yapılıyor…' : 'Giriş yap'}
          </button>
        </form>

        <p className="form-kutu__gecis">
          Henüz üye değil misin? <Link to="/kayit">Ücretsiz üye ol</Link>
        </p>

        <aside className="demo-kutu" aria-label="Demo hesaplar">
          <p>Demo hesaplar (şifre hepsinde <code>Demo1234</code>). Birine dokununca bilgiler dolar:</p>
          <ul>
            {DEMO_HESAPLAR.map((d) => (
              <li key={d.kimlik}>
                <button type="button" onClick={() => { setKimlik(d.kimlik); setSifre('Demo1234'); setHata(''); }}>
                  <strong>{d.etiket}</strong>
                  <span>{d.aciklama}</span>
                </button>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}
