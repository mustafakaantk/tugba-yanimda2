// Hesabım: üyelik bilgileri, kampanya izni (İYS), KVKK, çıkış, hesap silme
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, sayi } from '../../api.js';
import { useOturum } from '../../oturum.jsx';
import { tarihMetni } from './veri.jsx';

const telefonBicim = (t) => (t ? `0${t.slice(0, 3)} ${t.slice(3, 6)} ${t.slice(6, 8)} ${t.slice(8)}` : '');

export default function Hesabim() {
  const { kullanici, cikis } = useOturum();
  const git = useNavigate();
  const [profil, setProfil] = useState(null);
  const [hata, setHata] = useState('');
  const [kaydediliyor, setKaydediliyor] = useState(false);

  useEffect(() => {
    api('/musteri/profil').then((d) => setProfil(d.profil)).catch((h) => setHata(h.message));
  }, []);

  const izinDegistir = async (etk) => {
    setKaydediliyor(true);
    setHata('');
    try {
      setProfil((await api('/musteri/profil', { yontem: 'POST', veri: { etk } })).profil);
    } catch (h) {
      setHata(h.message);
    } finally {
      setKaydediliyor(false);
    }
  };

  if (!profil) return hata ? <p className="uyari" role="alert">{hata}</p> : <p className="m-bos">Yükleniyor…</p>;

  return (
    <div className="m-hesap">
      <section className="m-kutu">
        <h2>Üyelik bilgilerin</h2>
        <dl className="m-bilgiler">
          <div><dt>Ad soyad</dt><dd>{profil.ad} {profil.soyad}</dd></div>
          <div><dt>Cep telefonu</dt><dd>{telefonBicim(profil.telefon)}</dd></div>
          {profil.eposta && <div><dt>E-posta</dt><dd>{profil.eposta}</dd></div>}
          {profil.dogumTarihi && <div><dt>Doğum tarihi</dt><dd>{tarihMetni(`${profil.dogumTarihi}T12:00:00`)}</dd></div>}
          <div><dt>Üyelik tarihi</dt><dd>{tarihMetni(profil.uyelikTarihi)}</dd></div>
          {profil.kayitMagaza && <div><dt>Mağazan</dt><dd>{profil.kayitMagaza}</dd></div>}
          <div><dt>Üye kodu</dt><dd>{kullanici.qrKodu}</dd></div>
        </dl>
        <p className="m-not">Bilgilerinde değişiklik için mağazamıza uğrayabilirsin.</p>
      </section>

      <section className="m-kutu">
        <h2>İletişim izni</h2>
        <label className="m-anahtar">
          <input type="checkbox" checked={profil.etk} disabled={kaydediliyor} onChange={(e) => izinDegistir(e.target.checked)} />
          <span className="m-anahtar__gorunum" aria-hidden="true" />
          <span>Kampanya ve fırsatlardan SMS ve e-posta ile haberdar olmak istiyorum.</span>
        </label>
        <p className="m-not">
          {profil.etk
            ? `İzin verdin (${tarihMetni(profil.etkTarihi)}). Dilediğin an kapatabilirsin.`
            : 'Kapalı. Puan kullanımındaki doğrulama kodları gibi işlem mesajları yine gönderilir.'}
        </p>
        {hata && <p className="uyari" role="alert">{hata}</p>}
      </section>

      <section className="m-kutu">
        <h2>Kişisel verilerin</h2>
        <p className="m-not">
          KVKK Aydınlatma Metni’ni {tarihMetni(profil.kvkkOnayTarihi)} tarihinde onayladın. <Link to="/kvkk">Metni oku</Link>
        </p>
        <button
          type="button" className="dugme dugme--cizgi"
          onClick={async () => { await cikis(); git('/giris'); }}
        >
          Çıkış yap
        </button>
      </section>

      <HesapSil puan={kullanici.puan} />
    </div>
  );
}

// KVKK: müşteri hesabını şifresiyle onaylayarak kalıcı olarak siler.
function HesapSil({ puan }) {
  const { yenile } = useOturum();
  const git = useNavigate();
  const [acik, setAcik] = useState(false);
  const [sifre, setSifre] = useState('');
  const [hata, setHata] = useState('');
  const [siliniyor, setSiliniyor] = useState(false);

  const sil = async (e) => {
    e.preventDefault();
    setHata('');
    setSiliniyor(true);
    try {
      await api('/hesap/sil', { yontem: 'POST', veri: { sifre } });
      // Önce ana sayfaya geç, sonra oturumu tazele; aksi halde korumalı sayfa giriş ekranına yönlendirir
      git('/', { replace: true, state: { hesapSilindi: true } });
      yenile();
    } catch (h) {
      setHata(h.message);
      setSiliniyor(false);
    }
  };

  return (
    <section className="hesap-sil" aria-labelledby="hesap-sil-baslik">
      <h2 id="hesap-sil-baslik">Hesabımı sil</h2>
      {!acik ? (
        <>
          <p>Hesabını sildiğinde kişisel bilgilerin kalıcı olarak silinir ve bu işlem geri alınamaz.</p>
          <button type="button" className="dugme dugme--tehlike" onClick={() => setAcik(true)}>Hesabımı sil</button>
        </>
      ) : (
        <form onSubmit={sil} noValidate>
          <p className="uyari">
            {puan > 0 ? `${sayi(puan)} puanın da silinecek. ` : ''}Adın, telefon numaran ve alışveriş geçmişinle
            bağlantın kaldırılır. Bu işlem geri alınamaz.
          </p>
          <label className="alan">
            <span>Onaylamak için şifreni gir</span>
            <input type="password" value={sifre} onChange={(e) => setSifre(e.target.value)} autoComplete="current-password" required />
          </label>
          {hata && <p className="uyari" role="alert">{hata}</p>}
          <div className="hesap-sil__eylem">
            <button className="dugme dugme--tehlike" disabled={siliniyor || !sifre}>
              {siliniyor ? 'Hesabın siliniyor…' : 'Hesabımı kalıcı olarak sil'}
            </button>
            <button type="button" className="dugme dugme--cizgi" onClick={() => { setAcik(false); setSifre(''); setHata(''); }}>
              Vazgeç
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
