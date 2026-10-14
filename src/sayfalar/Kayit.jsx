import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { Logo } from '../bilesenler.jsx';
import { useOturum } from '../oturum.jsx';

const BOS = { ad: '', soyad: '', telefon: '', sifre: '', ePosta: '', dogumTarihi: '', magazaId: '', kvkk: false, etk: false };

// 5321234567 -> 0532 123 45 67 (yazarken biçimlendirme)
const telefonBicimle = (v) => {
  let r = v.replace(/\D/g, '');
  if (r.startsWith('90')) r = r.slice(2);
  if (!r.startsWith('0') && r) r = '0' + r;
  r = r.slice(0, 11);
  const p = [r.slice(0, 4), r.slice(4, 7), r.slice(7, 9), r.slice(9, 11)].filter(Boolean);
  return p.join(' ');
};

// Mağazaları il adına göre Türkçe sıralayıp gruplar
const illereGore = (magazalar) => {
  const gruplar = new Map();
  [...magazalar]
    .sort((a, b) => a.il.localeCompare(b.il, 'tr') || a.ad.localeCompare(b.ad, 'tr'))
    .forEach((m) => gruplar.set(m.il, [...(gruplar.get(m.il) || []), m]));
  return [...gruplar];
};

export default function Kayit() {
  const { yenile } = useOturum();
  const git = useNavigate();
  const [f, setF] = useState(BOS);
  const [magazalar, setMagazalar] = useState([]);
  const [hata, setHata] = useState('');
  const [gonderiliyor, setGonderiliyor] = useState(false);

  useEffect(() => {
    api('/program').then((p) => setMagazalar(p.magazalar || [])).catch(() => {});
  }, []);

  const degistir = (alan) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setF((o) => ({ ...o, [alan]: alan === 'telefon' ? telefonBicimle(v) : v }));
  };

  const gonder = async (e) => {
    e.preventDefault();
    setHata('');
    if (!f.kvkk) {
      setHata('Devam etmek için KVKK Aydınlatma Metni’ni onaylaman gerekir.');
      return;
    }
    setGonderiliyor(true);
    try {
      const sonuc = await api('/kayit', { yontem: 'POST', veri: { ...f, magazaId: f.magazaId || null } });
      await yenile();
      git(sonuc.yonlendir, { replace: true, state: { hosgeldin: sonuc.hosgeldinPuani } });
    } catch (h) {
      setHata(h.message);
    } finally {
      setGonderiliyor(false);
    }
  };

  return (
    <div className="form-sayfa">
      <div className="form-kutu form-kutu--genis">
        <Logo />
        <h1>Ücretsiz üye ol</h1>
        <p className="form-kutu__alt">Puanların cep telefonu numarana tanımlanır.</p>

        <form onSubmit={gonder} noValidate className="form-izgara">
          <label className="alan">
            <span>Ad</span>
            <input value={f.ad} onChange={degistir('ad')} autoComplete="given-name" required />
          </label>
          <label className="alan">
            <span>Soyad</span>
            <input value={f.soyad} onChange={degistir('soyad')} autoComplete="family-name" required />
          </label>
          <label className="alan">
            <span>Cep telefonu</span>
            <input value={f.telefon} onChange={degistir('telefon')} inputMode="tel" autoComplete="tel-national" placeholder="05XX XXX XX XX" required />
          </label>
          <label className="alan">
            <span>Şifre</span>
            <input type="password" value={f.sifre} onChange={degistir('sifre')} autoComplete="new-password" required />
            <small>En az 6 karakter; harf ve rakam içermeli.</small>
          </label>
          <label className="alan">
            <span>E-posta <em>(isteğe bağlı)</em></span>
            <input type="email" value={f.ePosta} onChange={degistir('ePosta')} autoComplete="email" />
          </label>
          <label className="alan">
            <span>Doğum tarihi <em>(isteğe bağlı)</em></span>
            <input type="date" value={f.dogumTarihi} onChange={degistir('dogumTarihi')} autoComplete="bday" />
            <small>Doğum gününde sürpriz puan için.</small>
          </label>
          <label className="alan alan--genis">
            <span>En sık uğradığın mağaza <em>(isteğe bağlı)</em></span>
            <select value={f.magazaId} onChange={degistir('magazaId')}>
              <option value="">Seçmek istemiyorum</option>
              {illereGore(magazalar).map(([il, liste]) => (
                <optgroup key={il} label={il}>
                  {liste.map((m) => (
                    <option key={m.id} value={m.id}>{m.ad}{m.ilce && m.ilce !== m.ad ? ` (${m.ilce})` : ''}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>

          <label className="onay alan--genis">
            <input type="checkbox" checked={f.kvkk} onChange={degistir('kvkk')} />
            <span>
              <Link to="/kvkk" target="_blank" rel="noopener">KVKK Aydınlatma Metni</Link>’ni okudum, kişisel verilerimin
              sadakat programı kapsamında işlenmesini kabul ediyorum. <em>(zorunlu)</em>
            </span>
          </label>
          <label className="onay alan--genis">
            <input type="checkbox" checked={f.etk} onChange={degistir('etk')} />
            <span>Kampanya ve fırsatlardan SMS ve e-posta ile haberdar olmak istiyorum. <em>(isteğe bağlı)</em></span>
          </label>

          {hata && <p className="uyari alan--genis" role="alert">{hata}</p>}
          <button className="dugme dugme--buyuk dugme--tam alan--genis" disabled={gonderiliyor}>
            {gonderiliyor ? 'Üyeliğin oluşturuluyor…' : 'Üye ol'}
          </button>
        </form>

        <p className="form-kutu__gecis">
          Zaten üye misin? <Link to="/giris">Giriş yap</Link>
        </p>
      </div>
    </div>
  );
}
